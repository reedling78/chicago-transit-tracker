/**
 * add-metra-links.ts
 *
 * One-time migration: adds a `metraLink` field to every Metra station document
 * in Firestore. The URL is constructed from the station name using the same
 * slugify logic Metra uses on their public site:
 *   https://www.metra.com/train-lines/stations/{slug}
 *
 * NOTE: metra.com blocks automated requests (403), so URLs are generated
 * programmatically rather than verified live. Spot-check the logged output
 * against metra.com in a browser and manually correct any edge cases in
 * Firestore if needed.
 *
 * Auth:
 *   1. Place a Firebase service account JSON at the project root as `service-account.json`, OR
 *   2. Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON.
 *
 * Usage:
 *   npm run add:metra-links
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

function initFirebase(): admin.firestore.Firestore {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    const serviceAccount = require(saPath)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'chicago-transit-tracker',
    })
  }
  return admin.firestore()
}

// ---------------------------------------------------------------------------
// Slug construction
// ---------------------------------------------------------------------------

function metraSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const db = initFirebase()

  const snap = await db
    .collection('stations')
    .where('service', 'in', ['metra', 'both'])
    .get()

  if (snap.empty) {
    console.log('No Metra stations found.')
    return
  }

  const BATCH_LIMIT = 499
  let batch = db.batch()
  let opCount = 0
  let batchCount = 0
  let totalUpdated = 0

  for (const doc of snap.docs) {
    const name: string = doc.data().name ?? ''
    const slug = metraSlug(name)
    const metraLink = `https://www.metra.com/train-lines/stations/${slug}`

    console.log(`${name.padEnd(35)} → ${metraLink}`)

    batch.update(doc.ref, { metraLink })
    opCount++
    totalUpdated++

    if (opCount >= BATCH_LIMIT) {
      await batch.commit()
      batchCount++
      console.log(`  [batch ${batchCount} committed — ${opCount} writes]`)
      batch = db.batch()
      opCount = 0
    }
  }

  if (opCount > 0) {
    await batch.commit()
    batchCount++
  }

  console.log(`\nDone. ${totalUpdated} station(s) updated across ${batchCount} batch(es).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
