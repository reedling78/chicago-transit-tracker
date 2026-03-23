/**
 * upload-schedules.ts
 *
 * Uploads Metra schedule PDFs from docs/schedules/metra/ to Firebase Storage
 * under lines/{slug}/schedule.pdf, makes each file publicly readable, then
 * writes the public download URL back to the corresponding Firestore line doc
 * as `scheduleUrl`.
 *
 * Auth:
 *   1. Place a Firebase service account JSON at the project root as `service-account.json`, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON.
 *
 * Usage:
 *   npm run upload:schedules
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

const PROJECT_ID  = 'chicago-transit-tracker'
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`
const SCHEDULES_DIR = path.join(__dirname, '..', 'docs', 'schedules', 'metra')

function initFirebase(): { db: admin.firestore.Firestore; bucket: ReturnType<admin.storage.Storage['bucket']> } {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
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
  return {
    db: admin.firestore(),
    bucket: admin.storage().bucket(),
  }
}

// Derive Firestore doc slug from PDF filename: "MD-N.pdf" → "md-n"
function fileNameToSlug(filename: string): string {
  return filename.replace(/\.pdf$/i, '').toLowerCase()
}

// Public URL for a file made public via makePublic()
function publicUrl(bucketName: string, filePath: string): string {
  return `https://storage.googleapis.com/${bucketName}/${filePath}`
}

async function main(): Promise<void> {
  const { db, bucket } = initFirebase()

  const files = fs.readdirSync(SCHEDULES_DIR).filter((f) => f.endsWith('.pdf'))
  console.log(`Found ${files.length} schedule PDFs\n`)

  for (const filename of files) {
    const slug = fileNameToSlug(filename)
    const localPath = path.join(SCHEDULES_DIR, filename)
    const storagePath = `lines/${slug}/schedule.pdf`

    // Upload
    process.stdout.write(`Uploading ${filename} → ${storagePath} ... `)
    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: { contentType: 'application/pdf' },
    })

    // Make publicly readable
    const file = bucket.file(storagePath)
    await file.makePublic()

    const url = publicUrl(BUCKET_NAME, storagePath)

    // Write URL back to Firestore line doc
    const lineRef = db.collection('lines').doc(slug)
    const lineDoc = await lineRef.get()
    if (!lineDoc.exists) {
      console.log(`SKIP — no Firestore doc for slug "${slug}"`)
      continue
    }
    await lineRef.update({ scheduleUrl: url })
    console.log(`done\n  ${url}`)
  }

  console.log('\nAll schedules uploaded.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
