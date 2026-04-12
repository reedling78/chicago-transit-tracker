import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBQpOxvCkCxHfiMjJFUVb_IjNksBMTfN2U',
  authDomain: 'chicago-transit-tracker.firebaseapp.com',
  projectId: 'chicago-transit-tracker',
  storageBucket: 'chicago-transit-tracker.firebasestorage.app',
  messagingSenderId: '276375652722',
  appId: '1:276375652722:web:5b8a9a3f3b3b3b3b3b3b3b',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
