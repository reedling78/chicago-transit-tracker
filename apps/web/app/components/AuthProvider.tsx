'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { auth, db } from '@lib/firebase-client'
import type { Favorite, UserProfile } from '@ctt/shared'
import { mapToArray } from '@ctt/shared'
import { useFavoritesStore } from '@lib/store/favorites'

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

function toIso(value: Timestamp | string | undefined): string {
  if (!value) return new Date(0).toISOString()
  if (typeof value === 'string') return value
  if (typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString()
  }
  return String(value)
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub: (() => void) | undefined
    let activeUid: string | null = null

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const uid = firebaseUser?.uid ?? null
      activeUid = uid
      setUser(firebaseUser)

      profileUnsub?.()
      profileUnsub = undefined

      if (!firebaseUser) {
        setProfile(null)
        useFavoritesStore.getState().clear()
        setLoading(false)
        return
      }

      const profileRef = doc(db, 'profiles', firebaseUser.uid)

      try {
        const snap = await getDoc(profileRef)
        if (activeUid !== uid) return

        if (!snap.exists()) {
          await setDoc(profileRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoUrl: firebaseUser.photoURL,
            provider: resolveProvider(firebaseUser),
            favorites: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          if (activeUid !== uid) return
        }
      } catch (err) {
        console.error('Failed to load/create profile:', err)
        if (activeUid === uid) {
          setProfile(null)
          setLoading(false)
        }
        return
      }

      profileUnsub = onSnapshot(
        profileRef,
        (snapshot) => {
          if (activeUid !== uid) return
          if (!snapshot.exists()) {
            setLoading(false)
            return
          }
          const data = snapshot.data()
          const favoritesMap = (data.favorites ?? {}) as Record<string, Favorite>
          const favorites = mapToArray(favoritesMap)
          setProfile({
            uid: data.uid,
            email: data.email ?? null,
            displayName: data.displayName ?? null,
            photoUrl: data.photoUrl ?? null,
            provider: data.provider,
            createdAt: toIso(data.createdAt),
            updatedAt: toIso(data.updatedAt),
            favorites,
          })
          // Skip hydrate while local writes are in flight — otherwise a stale
          // snapshot can clobber an unconfirmed reorder. Pending writes settle
          // via Firestore and the next snapshot reconciles.
          if (useFavoritesStore.getState().pendingWrites === 0) {
            useFavoritesStore.getState().hydrate(favorites)
          }
          setLoading(false)
        },
        (error) => {
          if (activeUid !== uid) return
          console.error('Profile snapshot error:', error)
          setLoading(false)
        },
      )
    })

    return () => {
      unsubscribeAuth()
      profileUnsub?.()
    }
  }, [])

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>
}
