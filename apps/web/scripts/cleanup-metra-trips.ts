/**
 * cleanup-metra-trips.ts
 *
 * One-time cleanup for the metra-trips Firestore collection.
 *
 * Before the train-number URL migration, docs were keyed by safeTripId
 * (e.g. `bnsf_bn1200_v4_a`) with one doc per GTFS trip_id variant. After
 * the migration, docs are keyed as `{lineSlug}_{trainNumber}` (e.g.
 * `bnsf_1200`) with one doc per train number. Because batchWrite is an
 * upsert, the old-format docs still sit alongside the new ones. This
 * script deletes any doc whose ID does not match the new format.
 *
 * Runs in dry-run mode by default — pass --confirm to actually delete.
 *
 * Auth: same as other scripts — service-account.json at the project root,
 * or GOOGLE_APPLICATION_CREDENTIALS pointing at a service account JSON.
 *
 * Usage:
 *   ts-node --project scripts/tsconfig.json scripts/cleanup-metra-trips.ts
 *   ts-node --project scripts/tsconfig.json scripts/cleanup-metra-trips.ts --confirm
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

const PROJECT_ID = 'chicago-transit-tracker'

/**
 * Partition a list of metra-trips doc IDs into those that match the new
 * `{lineSlug}_{trainNumber}` format and those that don't. Exported for
 * unit testing.
 */
export function partitionMetraTripDocIds(
  docIds: string[],
  lineSlugs: string[],
): { kept: string[]; stale: string[] } {
  const patterns = lineSlugs.map(
    (slug) => new RegExp(`^${slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}_\\d+$`),
  )
  const isValid = (id: string): boolean => patterns.some((re) => re.test(id))

  const kept: string[] = []
  const stale: string[] = []
  for (const id of docIds) {
    if (isValid(id)) kept.push(id)
    else stale.push(id)
  }
  return { kept, stale }
}

function initFirebase(): admin.firestore.Firestore {
  const saPath = path.join(__dirname, '..', 'service-account.json')
  if (fs.existsSync(saPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(saPath)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID,
    })
  }
  return admin.firestore()
}

async function main(): Promise<void> {
  const confirm = process.argv.includes('--confirm')
  const db = initFirebase()

  // Load Metra line slugs so we can match doc IDs against them exactly.
  const linesSnap = await db.collection('lines').where('service', '==', 'metra').get()
  const lineSlugs = linesSnap.docs.map((d) => d.id)
  console.log(`Loaded ${lineSlugs.length} Metra line slugs: ${lineSlugs.join(', ')}\n`)

  // Scan metra-trips and partition into kept vs stale.
  const snap = await db.collection('metra-trips').get()
  console.log(`Found ${snap.size} docs in metra-trips`)

  const { kept, stale } = partitionMetraTripDocIds(
    snap.docs.map((d) => d.id),
    lineSlugs,
  )

  console.log(`  ${kept.length} match the new format and will be kept`)
  console.log(`  ${stale.length} are stale and will be deleted\n`)

  if (stale.length === 0) {
    console.log('Nothing to clean up.')
    process.exit(0)
  }

  // Show a sample so the user can sanity-check before running with --confirm.
  const sample = stale.slice(0, 10)
  console.log('Sample of stale doc IDs:')
  for (const id of sample) console.log(`  ${id}`)
  if (stale.length > sample.length) {
    console.log(`  ... and ${stale.length - sample.length} more`)
  }
  console.log()

  if (!confirm) {
    console.log('DRY RUN — no deletions performed. Re-run with --confirm to delete.')
    process.exit(0)
  }

  // Delete in batches of 500 (Firestore batch limit).
  const BATCH_SIZE = 500
  let deleted = 0
  for (let i = 0; i < stale.length; i += BATCH_SIZE) {
    const chunk = stale.slice(i, i + BATCH_SIZE)
    const batch = db.batch()
    for (const id of chunk) {
      batch.delete(db.collection('metra-trips').doc(id))
    }
    await batch.commit()
    deleted += chunk.length
    console.log(`Deleted ${deleted} / ${stale.length}`)
  }

  console.log(`\nCleanup complete. Removed ${deleted} stale docs from metra-trips.`)
  process.exit(0)
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
