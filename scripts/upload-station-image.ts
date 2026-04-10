/**
 * upload-station-image.ts
 *
 * Helper for the /station-image skill. Two modes:
 *
 *   --check <slug>
 *     Reads stations/<slug> from Firestore. Prints the current photoUrl (or
 *     the literal string "null"). Exits non-zero if the station doesn't exist.
 *
 *   --upload <slug> <file-path>
 *     Uploads <file-path> to stations/<slug>/hero.jpg in Firebase Storage,
 *     makes it public, writes the resulting URL back to the station's
 *     photoUrl field, and prints the URL.
 *
 * Auth: service-account.json at the project root OR GOOGLE_APPLICATION_CREDENTIALS.
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ID = 'chicago-transit-tracker'
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`

type Firestore = admin.firestore.Firestore
type Bucket = ReturnType<admin.storage.Storage['bucket']>

export interface CheckResult {
  exists: boolean
  photoUrl: string | null
}

export async function checkStation(slug: string, db: Firestore): Promise<CheckResult> {
  const snap = await db.collection('stations').doc(slug).get()
  if (!snap.exists) return { exists: false, photoUrl: null }
  const data = snap.data() as { photoUrl?: string | null } | undefined
  return { exists: true, photoUrl: data?.photoUrl ?? null }
}

export async function uploadStationImage(
  slug: string,
  imageBuffer: Buffer,
  db: Firestore,
  bucket: Bucket,
  bucketName: string = BUCKET_NAME,
): Promise<string> {
  const storagePath = `stations/${slug}/hero.jpg`
  const file = bucket.file(storagePath)
  await file.save(imageBuffer, { contentType: 'image/jpeg' })
  await file.makePublic()
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`
  await db.collection('stations').doc(slug).update({ photoUrl: publicUrl })
  return publicUrl
}

function initFirebase(): { db: Firestore; bucket: Bucket } {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(saPath)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: BUCKET_NAME,
    })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: BUCKET_NAME,
    })
  }
  return { db: admin.firestore(), bucket: admin.storage().bucket() }
}

async function main(): Promise<void> {
  const [mode, slug, filePath] = process.argv.slice(2)

  if (mode === '--check') {
    if (!slug) {
      console.error('usage: upload-station-image.ts --check <slug>')
      process.exit(2)
    }
    const { db } = initFirebase()
    const result = await checkStation(slug, db)
    if (!result.exists) {
      console.error(`station "${slug}" not found in Firestore`)
      process.exit(1)
    }
    console.log(result.photoUrl ?? 'null')
    process.exit(0)
  }

  if (mode === '--upload') {
    if (!slug || !filePath) {
      console.error('usage: upload-station-image.ts --upload <slug> <file-path>')
      process.exit(2)
    }
    if (!fs.existsSync(filePath)) {
      console.error(`file not found: ${filePath}`)
      process.exit(1)
    }
    const { db, bucket } = initFirebase()
    const check = await checkStation(slug, db)
    if (!check.exists) {
      console.error(`station "${slug}" not found in Firestore`)
      process.exit(1)
    }
    const buffer = fs.readFileSync(filePath)
    const url = await uploadStationImage(slug, buffer, db, bucket)
    console.log(url)
    process.exit(0)
  }

  console.error('usage:')
  console.error('  upload-station-image.ts --check <slug>')
  console.error('  upload-station-image.ts --upload <slug> <file-path>')
  process.exit(2)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
