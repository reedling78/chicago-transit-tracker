import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

export function getFirestore(): admin.firestore.Firestore {
  if (admin.apps.length > 0) return admin.apps[0]!.firestore()

  const saPath = path.join(process.cwd(), 'service-account.json')
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf-8'))
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'chicago-transit-tracker',
    })
  }

  return admin.apps[0]!.firestore()
}

/** Lazy Firestore instance for API routes. Initialized on first access. */
let _db: admin.firestore.Firestore | null = null
export const db: admin.firestore.Firestore = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    if (!_db) _db = getFirestore()
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
