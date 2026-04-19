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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        const profileRef = doc(db, 'profiles', firebaseUser.uid)
        const snap = await getDoc(profileRef)

        if (snap.exists()) {
          setProfile(snap.data() as UserProfile)
        } else {
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoUrl: firebaseUser.photoURL,
            provider: resolveProvider(firebaseUser),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
          await setDoc(profileRef, newProfile)
          setProfile({
            ...newProfile,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}
