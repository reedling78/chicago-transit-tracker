/**
 * seed-storage.ts
 *
 * Creates placeholder folder structure in Firebase Storage:
 *   stations/{station-slug}/.keep
 *   lines/{line-slug}/.keep
 *
 * Firebase Storage has no real folders — a .keep file at each path is the
 * conventional way to establish the structure before real images are uploaded.
 *
 * Auth:
 *   1. Place a Firebase service account JSON at the project root as `service-account.json`, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON.
 *
 * Usage:
 *   npm run seed:storage
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

const PROJECT_ID  = 'chicago-transit-tracker'
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEEP_CONTENT = Buffer.from('')

async function createFolder(
  bucket: ReturnType<admin.storage.Storage['bucket']>,
  folderPath: string,
): Promise<void> {
  const file = bucket.file(`${folderPath}/.keep`)
  await file.save(KEEP_CONTENT, { contentType: 'application/octet-stream' })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { db, bucket } = initFirebase()

  // --- Lines ---
  console.log('Fetching line slugs from Firestore...')
  const linesSnap = await db.collection('lines').get()
  const lineSlugs = linesSnap.docs.map((d) => d.id)
  console.log(`  ${lineSlugs.length} lines`)

  console.log('Creating lines/ folders in Storage...')
  for (const slug of lineSlugs) {
    await createFolder(bucket, `lines/${slug}`)
    console.log(`  lines/${slug}/`)
  }

  // --- Stations ---
  console.log('\nFetching station slugs from Firestore...')
  const stationsSnap = await db.collection('stations').get()
  const stationSlugs = stationsSnap.docs.map((d) => d.id)
  console.log(`  ${stationSlugs.length} stations`)

  console.log('Creating stations/ folders in Storage...')
  let count = 0
  for (const slug of stationSlugs) {
    await createFolder(bucket, `stations/${slug}`)
    count++
    if (count % 50 === 0) console.log(`  ${count} / ${stationSlugs.length}`)
  }
  console.log(`  ${stationSlugs.length} / ${stationSlugs.length}`)

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
