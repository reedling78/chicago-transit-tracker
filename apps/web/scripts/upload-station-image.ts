/**
 * upload-station-image.ts
 *
 * Helper for the /station-image skill. Three modes:
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
 *   --upload-variants <slug> <desktop-path> <mobile-path> <og-path>
 *     Uploads three pre-sized variants to stations/<slug>/hero-{desktop,mobile,og}.jpg,
 *     makes each public, writes both photoUrl (mirrored from desktop) and the
 *     photoUrls object back to Firestore, and prints a JSON summary.
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

export interface VariantBuffers {
  desktop: Buffer
  mobile: Buffer
  og: Buffer
}

export interface VariantUrls {
  desktop: string
  mobile: string
  og: string
  photoUrl: string
}

const VARIANT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export async function uploadStationVariants(
  slug: string,
  buffers: VariantBuffers,
  db: Firestore,
  bucket: Bucket,
  bucketName: string = BUCKET_NAME,
): Promise<VariantUrls> {
  const check = await checkStation(slug, db)
  if (!check.exists) {
    throw new Error(`station "${slug}" not found in Firestore`)
  }

  const variants: Array<{ key: keyof VariantBuffers; path: string }> = [
    { key: 'desktop', path: `stations/${slug}/hero-desktop.jpg` },
    { key: 'mobile', path: `stations/${slug}/hero-mobile.jpg` },
    { key: 'og', path: `stations/${slug}/hero-og.jpg` },
  ]

  for (const { key, path: storagePath } of variants) {
    const file = bucket.file(storagePath)
    await file.save(buffers[key], {
      contentType: 'image/jpeg',
      metadata: { cacheControl: VARIANT_CACHE_CONTROL },
    })
    await file.makePublic()
  }

  const urlFor = (storagePath: string) =>
    `https://storage.googleapis.com/${bucketName}/${storagePath}`
  const photoUrls = {
    desktop: urlFor(variants[0].path),
    mobile: urlFor(variants[1].path),
    og: urlFor(variants[2].path),
  }

  await db.collection('stations').doc(slug).update({
    photoUrl: photoUrls.desktop,
    photoUrls,
  })

  return { ...photoUrls, photoUrl: photoUrls.desktop }
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
  const args = process.argv.slice(2)
  const [mode, slug, filePath] = args

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

  if (mode === '--upload-variants') {
    const [, , desktopPath, mobilePath, ogPath] = args
    if (!slug || !desktopPath || !mobilePath || !ogPath) {
      console.error(
        'usage: upload-station-image.ts --upload-variants <slug> <desktop-path> <mobile-path> <og-path>',
      )
      process.exit(2)
    }
    const missing = [desktopPath, mobilePath, ogPath].filter((p) => !fs.existsSync(p))
    if (missing.length > 0) {
      for (const p of missing) console.error(`file not found: ${p}`)
      process.exit(1)
    }
    const { db, bucket } = initFirebase()
    const buffers = {
      desktop: fs.readFileSync(desktopPath),
      mobile: fs.readFileSync(mobilePath),
      og: fs.readFileSync(ogPath),
    }
    try {
      const result = await uploadStationVariants(slug, buffers, db, bucket)
      console.log(JSON.stringify(result))
      process.exit(0)
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  }

  console.error('usage:')
  console.error('  upload-station-image.ts --check <slug>')
  console.error('  upload-station-image.ts --upload <slug> <file-path>')
  console.error(
    '  upload-station-image.ts --upload-variants <slug> <desktop-path> <mobile-path> <og-path>',
  )
  process.exit(2)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
