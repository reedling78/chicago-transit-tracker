/**
 * Batched Firestore writer for GTFS schedule data.
 *
 * Firestore limits batch operations to 500. This module handles chunking
 * automatically so callers can pass arbitrarily large data sets.
 */

import { getFirestore } from 'firebase-admin/firestore'

const BATCH_LIMIT = 100

/**
 * Write a map of documents to a Firestore collection using batched writes.
 * Each entry's key is used as the document ID.
 */
export async function batchWrite(
  collection: string,
  docs: Map<string, Record<string, unknown>>,
): Promise<number> {
  const db = getFirestore()
  const entries = [...docs.entries()]
  let written = 0

  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    const chunk = entries.slice(i, i + BATCH_LIMIT)

    for (const [id, data] of chunk) {
      batch.set(db.collection(collection).doc(id), data)
    }

    await batch.commit()
    written += chunk.length
  }

  return written
}
