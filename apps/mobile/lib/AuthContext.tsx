import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { UserProfile } from '@ctt/shared'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

function resolveProvider(user: User): UserProfile['provider'] {
  const providerId = user.providerData[0]?.providerId
  if (providerId === 'apple.com') return 'apple'
  if (providerId === 'google.com') return 'google'
  if (providerId === 'facebook.com') return 'facebook'
  return 'password'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let currentUid: string | null = null

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const uid = firebaseUser?.uid ?? null
      currentUid = uid
      setUser(firebaseUser)

      try {
        if (firebaseUser) {
          const profileRef = doc(db, 'profiles', firebaseUser.uid)
          const snap = await getDoc(profileRef)

          if (currentUid !== uid) return

          if (snap.exists()) {
            const data = snap.data()
            setProfile({
              ...data,
              createdAt: data.createdAt?.toDate?.()
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt,
            } as UserProfile)
          } else {
            const now = new Date().toISOString()
            await setDoc(profileRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoUrl: firebaseUser.photoURL,
              provider: resolveProvider(firebaseUser),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })

            if (currentUid !== uid) return

            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoUrl: firebaseUser.photoURL,
              provider: resolveProvider(firebaseUser),
              createdAt: now,
              updatedAt: now,
            })
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Failed to load/create profile:', err)
        setProfile(null)
      } finally {
        if (currentUid === uid) {
          setLoading(false)
        }
      }
    })

    return unsubscribe
  }, [])

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}
