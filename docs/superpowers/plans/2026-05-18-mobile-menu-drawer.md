# Mobile Menu Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile Profile screen with a sectioned Menu that opens as a native side drawer, swap the home app-bar icon to a hamburger, and show origin→destination + train number on train favorite rows.

**Architecture:** Wrap the existing flat expo-router `Stack` in an expo-router `Drawer` navigator. All current routes move into an `app/(app)/` route group (URLs unchanged — group segments are not part of the path) whose `_layout.tsx` is the existing Stack. The root `_layout.tsx` holds the providers + `<Drawer headerShown:false drawerType:'front'>` with a custom `drawerContent`. The drawer body is composed of small section components.

**Tech Stack:** React Native, Expo SDK 54, expo-router 6, `@react-navigation/drawer` 7 (new), react-native-gesture-handler + reanimated (already configured), Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-18-mobile-menu-drawer-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/mobile/app/_layout.tsx` | **Rewrite.** Providers + root `<Drawer>` (headerless, custom content) |
| `apps/mobile/app/(app)/_layout.tsx` | **New.** The Stack previously in root `_layout.tsx` |
| `apps/mobile/app/(app)/index.tsx` etc. | **Moved** (git mv) from `app/` — index, auth, apple-callback, privacy, terms, cta/, metra/ |
| `apps/mobile/app/profile.tsx` | **Deleted** |
| `apps/mobile/components/HeaderUserIcon.tsx` | **Deleted** (replaced by HeaderMenuButton) |
| `apps/mobile/components/HeaderMenuButton.tsx` | **New.** Hamburger header button → opens drawer |
| `apps/mobile/components/menu/MenuDrawerContent.tsx` | **New.** Drawer body: the four sections |
| `apps/mobile/components/menu/MenuSection.tsx` | **New.** Labeled section wrapper |
| `apps/mobile/components/menu/MenuNavRow.tsx` | **New.** Pressable nav row (icon+label) → close drawer + navigate |
| `apps/mobile/components/profile/ProfilePanel.tsx` | **New.** Profile card + ThemeToggle + Sign out/in (extracted from profile.tsx) |
| `apps/mobile/components/profile/FavoriteRow.tsx` | **Modify.** Train branch label |
| Tests under `apps/mobile/__tests__/` | New + updated as listed per task |

---

## Task 1: Add the drawer dependency

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install the compatible drawer package**

Run from repo root:
```bash
cd apps/mobile && npx expo install @react-navigation/drawer && cd ../..
```
Expected: `@react-navigation/drawer` (a `7.x` version, matching `@react-navigation/native@7.2.2`) added to `apps/mobile/package.json` dependencies; root `pnpm-lock.yaml` updated.

- [ ] **Step 2: Verify it resolves**

Run:
```bash
ls node_modules/@react-navigation/drawer/package.json
```
Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "build(mobile): add @react-navigation/drawer for the Menu drawer"
```

---

## Task 2: Move all routes into the `(app)` route group

This is a pure file move. URLs are unchanged because `(group)` segments are not part of the path; `router.push('/metra')` etc. keep working.

**Files:**
- Move: `apps/mobile/app/{index,auth,apple-callback,privacy,terms}.tsx` → `apps/mobile/app/(app)/`
- Move: `apps/mobile/app/cta/` and `apps/mobile/app/metra/` → `apps/mobile/app/(app)/`
- Delete: `apps/mobile/app/profile.tsx`

- [ ] **Step 1: Create the group dir and move routes**

```bash
cd apps/mobile/app
mkdir "(app)"
git mv index.tsx auth.tsx apple-callback.tsx privacy.tsx terms.tsx "(app)/"
git mv cta metra "(app)/"
git rm profile.tsx
cd ../../..
```

- [ ] **Step 2: Verify the move**

Run:
```bash
ls "apps/mobile/app/(app)"
```
Expected: `index.tsx auth.tsx apple-callback.tsx privacy.tsx terms.tsx cta metra` — and `apps/mobile/app/` now contains only `_layout.tsx` and `(app)`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(mobile): move routes into (app) group ahead of Drawer wrap"
```

---

## Task 3: Add the `(app)` Stack layout

Move the Stack out of the old root layout into the group layout. This is the same Stack config that currently lives in `apps/mobile/app/_layout.tsx`'s `ThemedShell`.

**Files:**
- Create: `apps/mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: Create the group Stack layout**

```tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '../../lib/theme'
import HeaderBackButton from '../../components/HeaderBackButton'

export default function AppStackLayout() {
  const { resolvedMode } = useTheme()
  return (
    <>
      <StatusBar style={resolvedMode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <HeaderBackButton />,
        }}
      >
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/mobile/app/(app)/_layout.tsx"
git commit -m "refactor(mobile): add (app) group Stack layout"
```

---

## Task 4: Rewrite the root layout as a Drawer

**Files:**
- Modify (full rewrite): `apps/mobile/app/_layout.tsx`
- Test: `apps/mobile/__tests__/screens/root-layout.test.tsx` (update)

- [ ] **Step 1: Rewrite `app/_layout.tsx`**

```tsx
import { Drawer } from 'expo-router/drawer'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { AuthProvider } from '../lib/AuthContext'
import { ThemeProvider } from '../lib/theme'
import QueryProvider from '../components/QueryProvider'
import MenuDrawerContent from '../components/menu/MenuDrawerContent'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <Drawer
                  drawerContent={(props) => <MenuDrawerContent {...props} />}
                  screenOptions={{
                    headerShown: false,
                    drawerType: 'front',
                    drawerStyle: { width: '85%', maxWidth: 360 },
                    swipeEdgeWidth: 40,
                  }}
                >
                  <Drawer.Screen name="(app)" />
                </Drawer>
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
```

> Note: `StatusBar` moved into `(app)/_layout.tsx` (Task 3) because it needs `useTheme()`, which must be read inside `ThemeProvider`.

- [ ] **Step 2: Update the root-layout test**

Read `apps/mobile/__tests__/screens/root-layout.test.tsx` first. It currently asserts the `Stack` shell. Replace its navigator assertion so it mocks `expo-router/drawer` and asserts the `Drawer` renders with `MenuDrawerContent`. Use this test body (replace the file's `describe`):

```tsx
import { render } from '@testing-library/react-native'
import RootLayout from '../../app/_layout'

jest.mock('expo-router/drawer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native')
  const Drawer = ({ drawerContent }: { drawerContent: () => React.ReactNode }) => (
    <View testID="drawer">{drawerContent({ navigation: { closeDrawer: jest.fn() } })}</View>
  )
  Drawer.Screen = () => null
  return { Drawer }
})
jest.mock('../../components/menu/MenuDrawerContent', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>menu-drawer-content</Text> }
})

describe('RootLayout (mobile)', () => {
  it('renders a Drawer wrapping the app with MenuDrawerContent', () => {
    const { getByText } = render(<RootLayout />)
    expect(getByText('menu-drawer-content')).toBeTruthy()
  })
})
```

(If the existing file mocks providers differently, keep those provider mocks and only swap the navigator-related assertions.)

- [ ] **Step 3: Commit (defer running tests until MenuDrawerContent exists in Task 6)**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/__tests__/screens/root-layout.test.tsx
git commit -m "refactor(mobile): wrap app Stack in a Drawer navigator"
```

---

## Task 5: ProfilePanel — extract profile UI from the deleted screen

**Files:**
- Create: `apps/mobile/components/profile/ProfilePanel.tsx`
- Test: `apps/mobile/__tests__/components/profile/ProfilePanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import ProfilePanel from '../../../components/profile/ProfilePanel'

const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }))
const mockSignOut = jest.fn()
jest.mock('../../../lib/auth', () => ({ signOut: () => mockSignOut() }))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})

beforeEach(() => jest.clearAllMocks())

describe('ProfilePanel (mobile)', () => {
  it('shows the Sign In CTA when signed out', () => {
    mockUseAuth.mockReturnValue({ profile: null, loading: false })
    const { getByLabelText } = render(<ProfilePanel />)
    fireEvent.press(getByLabelText('Sign In'))
    expect(mockReplace).toHaveBeenCalledWith('/auth')
  })

  it('shows email and Sign Out when signed in', () => {
    mockUseAuth.mockReturnValue({
      profile: { email: 'a@b.com', provider: 'password', createdAt: Date.now() },
      loading: false,
    })
    const { getByText, getByLabelText } = render(<ProfilePanel />)
    expect(getByText('a@b.com')).toBeTruthy()
    fireEvent.press(getByLabelText('Sign Out'))
    expect(mockSignOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest __tests__/components/profile/ProfilePanel.test.tsx`
Expected: FAIL — cannot find module `ProfilePanel`.

- [ ] **Step 3: Create `ProfilePanel.tsx`**

Move the profile card, `ThemeToggle`, and the Sign out / Sign in logic out of the old `profile.tsx` into this component. It renders inside a scroll view supplied by the drawer, so it owns no ScrollView and no `Stack.Screen` header.

```tsx
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/auth'
import { useTheme, type Theme, type ThemeModeSetting } from '../../lib/theme'
import PressableButton from '../PressableButton'

const THEME_MODES: { value: ThemeModeSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const providerLabels: Record<string, string> = {
  apple: 'Apple',
  google: 'Google',
  password: 'Email & Password',
}

function ThemeToggle() {
  const { mode, setMode, theme } = useTheme()
  const styles = useMemo(() => makeToggleStyles(theme), [theme])
  return (
    <View testID="theme-toggle" style={styles.container}>
      <Text style={styles.label}>Theme</Text>
      <View style={styles.row}>
        {THEME_MODES.map((opt) => {
          const active = mode === opt.value
          return (
            <PressableButton
              key={opt.value}
              onPress={() => setMode(opt.value)}
              feedback="subtle"
              accessibilityRole="button"
              accessibilityLabel={`Theme: ${opt.label}`}
              accessibilityState={{ selected: active }}
              style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}
            >
              <Text style={active ? styles.segmentTextActive : styles.segmentTextInactive}>
                {opt.label}
              </Text>
            </PressableButton>
          )
        })}
      </View>
    </View>
  )
}

export default function ProfilePanel() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])

  if (loading) {
    return <Text style={styles.loadingText}>Loading...</Text>
  }

  if (!profile) {
    return (
      <View style={styles.gap}>
        <Text style={styles.emptyText}>Sign in to view your profile.</Text>
        <PressableButton
          style={styles.signInButton}
          onPress={() => router.replace('/auth')}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Sign In"
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </PressableButton>
        <ThemeToggle />
      </View>
    )
  }

  return (
    <View style={styles.gap}>
      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile.email || 'Not set'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Sign-in Provider</Text>
          <Text style={styles.value}>{providerLabels[profile.provider] || profile.provider}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {new Date(profile.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <ThemeToggle />

      <PressableButton
        style={styles.signOutButton}
        onPress={async () => {
          await signOut()
          router.replace('/')
        }}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </PressableButton>
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    gap: { gap: theme.space[4] },
    loadingText: { color: theme.colors.text.secondary, fontSize: 16 },
    emptyText: { color: theme.colors.text.secondary, fontSize: 16 },
    signInButton: {
      backgroundColor: theme.colors.accent.primary,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      alignItems: 'center',
    },
    signInButtonText: { color: theme.colors.accent.primaryFg, fontSize: 16, fontWeight: '600' },
    card: {
      backgroundColor: theme.colors.bg.surface,
      borderRadius: theme.radius.md,
      padding: theme.space[5],
      gap: theme.space[4],
    },
    field: { gap: theme.space[1] },
    label: { fontSize: 13, fontWeight: '600', color: theme.colors.text.secondary },
    value: { fontSize: 16, color: theme.colors.text.primary },
    signOutButton: {
      backgroundColor: theme.colors.status.delayed,
      borderRadius: theme.radius.md - 2,
      padding: 14,
      alignItems: 'center',
    },
    signOutText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  })
}

function makeToggleStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.colors.bg.surface,
      borderColor: theme.colors.border.subtle,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.space[3],
      gap: theme.space[2],
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.colors.text.secondary,
    },
    row: { flexDirection: 'row', gap: theme.space[2] },
    segment: {
      flex: 1,
      paddingVertical: theme.space[2],
      paddingHorizontal: theme.space[3],
      borderRadius: theme.radius.sm + 2,
      borderWidth: 1,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: theme.colors.accent.primary,
      borderColor: theme.colors.accent.primary,
    },
    segmentInactive: { backgroundColor: 'transparent', borderColor: theme.colors.border.subtle },
    segmentTextActive: { color: theme.colors.accent.primaryFg, fontWeight: '600', fontSize: 13 },
    segmentTextInactive: { color: theme.colors.text.primary, fontWeight: '600', fontSize: 13 },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest __tests__/components/profile/ProfilePanel.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/profile/ProfilePanel.tsx apps/mobile/__tests__/components/profile/ProfilePanel.test.tsx
git commit -m "feat(mobile): extract ProfilePanel from the profile screen"
```

---

## Task 6: Menu primitives + drawer content

**Files:**
- Create: `apps/mobile/components/menu/MenuSection.tsx`
- Create: `apps/mobile/components/menu/MenuNavRow.tsx`
- Create: `apps/mobile/components/menu/MenuDrawerContent.tsx`
- Test: `apps/mobile/__tests__/components/menu/MenuNavRow.test.tsx`
- Test: `apps/mobile/__tests__/components/menu/MenuDrawerContent.test.tsx`

- [ ] **Step 1: Write failing tests**

`apps/mobile/__tests__/components/menu/MenuNavRow.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native'
import MenuNavRow from '../../../components/menu/MenuNavRow'

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})
beforeEach(() => jest.clearAllMocks())

describe('MenuNavRow (mobile)', () => {
  it('closes the drawer then navigates on press', () => {
    const onNavigate = jest.fn()
    const { getByLabelText } = render(
      <MenuNavRow icon="home-outline" label="Dashboard" href="/" onNavigate={onNavigate} />,
    )
    fireEvent.press(getByLabelText('Dashboard'))
    expect(onNavigate).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
```

`apps/mobile/__tests__/components/menu/MenuDrawerContent.test.tsx`:
```tsx
import { render } from '@testing-library/react-native'
import MenuDrawerContent from '../../../components/menu/MenuDrawerContent'

jest.mock('@react-navigation/drawer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ScrollView } = require('react-native')
  return { DrawerContentScrollView: ({ children }: { children: React.ReactNode }) => <ScrollView>{children}</ScrollView> }
})
const mockUseAuth = jest.fn()
jest.mock('../../../lib/AuthContext', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('../../../components/profile/ProfilePanel', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>profile-panel</Text> }
})
jest.mock('../../../components/profile/FavoritesManager', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: () => <Text>favorites-manager</Text> }
})
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})
beforeEach(() => jest.clearAllMocks())

describe('MenuDrawerContent (mobile)', () => {
  const nav = { closeDrawer: jest.fn() } as never
  it('renders all four section headings and the dashboard + profile bodies', () => {
    mockUseAuth.mockReturnValue({ profile: { email: 'a@b.com' }, loading: false })
    const { getByText } = render(<MenuDrawerContent navigation={nav} />)
    expect(getByText('Menu')).toBeTruthy()
    expect(getByText('Dashboard')).toBeTruthy()
    expect(getByText('Profile')).toBeTruthy()
    expect(getByText('Legal')).toBeTruthy()
    expect(getByText('favorites-manager')).toBeTruthy()
    expect(getByText('profile-panel')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest __tests__/components/menu`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `MenuSection.tsx`**

```tsx
import { useMemo, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme, type Theme } from '../../lib/theme'

export default function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title.toUpperCase()}</Text>
      <View>{children}</View>
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    section: { marginBottom: theme.space[6] },
    heading: {
      color: theme.colors.text.secondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: theme.space[2],
    },
  })
}
```

- [ ] **Step 4: Create `MenuNavRow.tsx`**

```tsx
import { useMemo } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme, type Theme } from '../../lib/theme'
import PressableButton from '../PressableButton'

interface MenuNavRowProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  href: string
  onNavigate: () => void
}

export default function MenuNavRow({ icon, label, href, onNavigate }: MenuNavRowProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  return (
    <PressableButton
      onPress={() => {
        onNavigate()
        router.push(href as never)
      }}
      feedback="subtle"
      accessibilityRole="link"
      accessibilityLabel={label}
      style={styles.row}
    >
      <Ionicons name={icon} size={20} color={theme.colors.text.primary} />
      <Text style={styles.label}>{label}</Text>
    </PressableButton>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[2],
      minHeight: 44,
    },
    label: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '600' },
  })
}
```

- [ ] **Step 5: Create `MenuDrawerContent.tsx`**

```tsx
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { DrawerContentScrollView } from '@react-navigation/drawer'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { useTheme, type Theme } from '../../lib/theme'
import MenuSection from './MenuSection'
import MenuNavRow from './MenuNavRow'
import ProfilePanel from '../profile/ProfilePanel'
import FavoritesManager from '../profile/FavoritesManager'

export default function MenuDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme()
  const styles = useMemo(() => makeStyles(theme), [theme])
  const close = () => props.navigation.closeDrawer()

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: theme.colors.bg.canvas }}
      contentContainerStyle={styles.content}
    >
      <MenuSection title="Menu">
        <MenuNavRow icon="grid-outline" label="Dashboard" href="/" onNavigate={close} />
        <MenuNavRow icon="train-outline" label="Metra" href="/metra" onNavigate={close} />
        <MenuNavRow icon="subway-outline" label="CTA" href="/cta" onNavigate={close} />
      </MenuSection>

      <MenuSection title="Dashboard">
        <FavoritesManager />
      </MenuSection>

      <MenuSection title="Profile">
        <ProfilePanel />
      </MenuSection>

      <MenuSection title="Legal">
        <MenuNavRow icon="shield-outline" label="Privacy" href="/privacy" onNavigate={close} />
        <MenuNavRow icon="document-text-outline" label="Terms" href="/terms" onNavigate={close} />
      </MenuSection>

      <View style={styles.spacer} />
    </DrawerContentScrollView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    content: { paddingHorizontal: theme.space[5], paddingTop: theme.space[4] },
    spacer: { height: theme.space[8] },
  })
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest __tests__/components/menu __tests__/screens/root-layout.test.tsx`
Expected: PASS (MenuNavRow, MenuDrawerContent, root-layout).

> Note: `FavoritesManager` inside `MenuSection title="Dashboard"` adds its own "Favorites" sub-heading and section list — that nested duplication is acceptable per spec ("current favorites ui" reused unchanged).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/components/menu apps/mobile/__tests__/components/menu
git commit -m "feat(mobile): add Menu drawer content with Menu/Dashboard/Profile/Legal sections"
```

---

## Task 7: Hamburger header button + home screen swap

**Files:**
- Create: `apps/mobile/components/HeaderMenuButton.tsx`
- Modify: `apps/mobile/app/(app)/index.tsx`
- Delete: `apps/mobile/components/HeaderUserIcon.tsx`
- Delete: `apps/mobile/__tests__/components/HeaderUserIcon.test.tsx`
- Test: `apps/mobile/__tests__/components/HeaderMenuButton.test.tsx`
- Test: `apps/mobile/__tests__/screens/home.test.tsx` (update)

- [ ] **Step 1: Write the failing test**

`apps/mobile/__tests__/components/HeaderMenuButton.test.tsx`:
```tsx
import { render, fireEvent } from '@testing-library/react-native'
import HeaderMenuButton from '../../components/HeaderMenuButton'

const mockDispatch = jest.fn()
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }) }))
jest.mock('@react-navigation/native', () => ({
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
}))
jest.mock('@expo/vector-icons/Ionicons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native')
  return { __esModule: true, default: ({ name }: { name: string }) => <Text>{name}</Text> }
})
beforeEach(() => jest.clearAllMocks())

describe('HeaderMenuButton (mobile)', () => {
  it('opens the drawer on press', () => {
    const { getByLabelText, getByText } = render(<HeaderMenuButton />)
    expect(getByText('menu')).toBeTruthy()
    fireEvent.press(getByLabelText('Open menu'))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest __tests__/components/HeaderMenuButton.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `HeaderMenuButton.tsx`** (mirrors HeaderUserIcon's flat+shadow styling)

```tsx
import { StyleSheet } from 'react-native'
import { useNavigation } from 'expo-router'
import { DrawerActions } from '@react-navigation/native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTheme } from '../lib/theme'
import PressableButton from './PressableButton'

export default function HeaderMenuButton() {
  const navigation = useNavigation()
  const { theme } = useTheme()
  return (
    <PressableButton
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      hitSlop={8}
      feedback="subtle"
      style={styles.touchable}
    >
      <Ionicons name="menu" size={28} color={theme.colors.text.primary} style={styles.icon} />
    </PressableButton>
  )
}

const styles = StyleSheet.create({
  touchable: { width: 44, height: 44, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})
```

- [ ] **Step 4: Swap the icon in `app/(app)/index.tsx`**

Replace the `HeaderUserIcon` import with `HeaderMenuButton` and the `headerRight` to use it:

```tsx
import { Stack } from 'expo-router'
import Dashboard from '../../components/dashboard/Dashboard'
import HeaderMenuButton from '../../components/HeaderMenuButton'
import { useTheme } from '../../lib/theme'

export default function HomeScreen() {
  const { theme } = useTheme()
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerStyle: { backgroundColor: theme.colors.bg.canvas },
          headerShadowVisible: false,
          headerTitle: 'Chicago Transit Tracker',
          headerTitleAlign: 'left',
          headerTitleStyle: { color: theme.colors.text.primary, fontWeight: '700' },
          headerLeft: () => null,
          headerRight: () => <HeaderMenuButton />,
        }}
      />
      <Dashboard />
    </>
  )
}
```

(Note relative import depth changed to `../../` because the file moved into `(app)/`.)

- [ ] **Step 5: Delete HeaderUserIcon + its test**

```bash
git rm apps/mobile/components/HeaderUserIcon.tsx apps/mobile/__tests__/components/HeaderUserIcon.test.tsx
```

- [ ] **Step 6: Update `__tests__/screens/home.test.tsx`**

Read the file. Replace any `HeaderUserIcon` mock/assertion with `HeaderMenuButton`. The screen test mocks `Stack.Screen`; assert it renders `Dashboard` and that the `headerRight` produces the `HeaderMenuButton`. Mock `HeaderMenuButton` as a `Text` returning `menu-button` and assert presence, mirroring the existing mock pattern in that file (keep all other mocks intact).

- [ ] **Step 7: Run the affected tests**

Run: `cd apps/mobile && npx jest __tests__/components/HeaderMenuButton.test.tsx __tests__/screens/home.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(mobile): replace home profile icon with a hamburger that opens the Menu drawer"
```

---

## Task 8: Train favorite label (origin → destination + number)

**Files:**
- Modify: `apps/mobile/components/profile/FavoriteRow.tsx:60-90` (the `useRowContent` train branch)
- Test: `apps/mobile/__tests__/components/profile/FavoriteRow.test.tsx` (add cases)

- [ ] **Step 1: Add failing test cases**

Append to `apps/mobile/__tests__/components/profile/FavoriteRow.test.tsx` a `describe('FavoriteRow train label')` block. It must mock `../../../lib/useDashboardQueries`'s `useFavoriteTripQuery` to return a trip and assert the rendered title. Use this block (adjust the existing import block at top of file if `useFavoriteTripQuery` is not yet mocked there — keep existing mocks):

```tsx
describe('FavoriteRow train label', () => {
  it('shows origin to destination plus the train number when the trip is loaded', () => {
    const { useFavoriteTripQuery } = require('../../../lib/useDashboardQueries')
    ;(useFavoriteTripQuery as jest.Mock).mockReturnValue({
      data: {
        trainNumber: '1224',
        line: 'BNSF',
        stops: [
          { slug: 'union-station-metra', stationName: 'Chicago Union Station', departure: '5:00 PM' },
          { slug: 'naperville', stationName: 'Naperville', departure: '5:45 PM' },
        ],
      },
    })
    const { getByText } = renderRow({ type: 'train', id: 'bnsf_1224', addedAt: 0 })
    expect(getByText(/Chicago Union Station to Naperville/)).toBeTruthy()
    expect(getByText(/#1224/)).toBeTruthy()
  })

  it('falls back to "Train {n}" when the trip is not loaded', () => {
    const { useFavoriteTripQuery } = require('../../../lib/useDashboardQueries')
    ;(useFavoriteTripQuery as jest.Mock).mockReturnValue({ data: null })
    const { getByText } = renderRow({ type: 'train', id: 'bnsf_1224', addedAt: 0 })
    expect(getByText('Train 1224')).toBeTruthy()
  })
})
```

> If the existing test file has no `renderRow` helper or doesn't mock `useDashboardQueries`, add at the top: `jest.mock('../../../lib/useDashboardQueries')` and a `renderRow(fav)` helper that renders `<FavoriteRow favorite={fav} lines={[]} stations={[]} />` with the file's existing provider/router mocks. Reuse `shortenStationName` real behavior (no mock needed — `Chicago Union Station` shortens predictably; the regex `/Chicago Union Station to Naperville/` tolerates shortening only if it does not alter these names — if `shortenStationName` rewrites "Chicago Union Station", change the expected regex to the shortened form by importing `shortenStationName` from `@ctt/shared` in the test and building the expected string).

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/mobile && npx jest __tests__/components/profile/FavoriteRow.test.tsx`
Expected: FAIL — current code renders `Train 1224`, not `Chicago Union Station to Naperville`.

- [ ] **Step 3: Update the train branch in `FavoriteRow.tsx`**

Add the `shortenStationName` import and a stop-picker, and replace the train branch of `useRowContent`. Replace lines 1-11 import block additions and lines 82-89:

Change the `@ctt/shared` import line (currently `import { displayStationName } from '@ctt/shared'`) to:
```tsx
import { displayStationName, shortenStationName } from '@ctt/shared'
import type { Favorite, Line, Station, TripStop } from '@ctt/shared'
```
(Keep the existing separate `import type { Favorite, Line, Station } from '@ctt/shared'` line removed/merged — do not duplicate the type import.)

Add this helper above `useRowContent`:
```tsx
function pickStop(
  stops: TripStop[] | undefined,
  slug: string | undefined,
  fallback: TripStop | undefined,
): TripStop | undefined {
  if (!stops?.length) return fallback
  if (slug) {
    const match = stops.find((s) => s.slug === slug)
    if (match) return match
  }
  return fallback
}
```

Replace the current train branch (the last 8 lines of `useRowContent`, from `const [lineSlug, trainNumberFromId] = favorite.id.split('_')` through `return { title: \`Train ${trainNumber}\`, subtitle }`) with:
```tsx
  const [lineSlug, trainNumberFromId] = favorite.id.split('_')
  const trainNumber = trip?.trainNumber ?? trainNumberFromId ?? favorite.id
  const firstStop = trip?.stops?.[0]
  const lastStop = trip?.stops?.[trip.stops.length - 1]
  const originStop = pickStop(trip?.stops, favorite.trainOriginStopSlug, firstStop)
  const destStop = pickStop(trip?.stops, favorite.trainDestinationStopSlug, lastStop)
  const title =
    trip && originStop && destStop
      ? `${shortenStationName(originStop.stationName)} to ${shortenStationName(destStop.stationName)}`
      : `Train ${trainNumber}`
  const subtitle = trip
    ? `${trip.line ? `${trip.line} ` : ''}#${trainNumber}`
    : 'Trip not currently scheduled'
  return { title, subtitle }
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/mobile && npx jest __tests__/components/profile/FavoriteRow.test.tsx`
Expected: PASS (existing + 2 new cases).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/profile/FavoriteRow.tsx apps/mobile/__tests__/components/profile/FavoriteRow.test.tsx
git commit -m "feat(mobile): show origin/destination + number on train favorite rows"
```

---

## Task 9: Clean up the deleted profile screen test + full suite/lint

**Files:**
- Delete: `apps/mobile/__tests__/screens/profile.test.tsx`
- Verify: no remaining references to `app/profile`, `HeaderUserIcon`

- [ ] **Step 1: Delete the obsolete profile screen test**

```bash
git rm apps/mobile/__tests__/screens/profile.test.tsx
```

- [ ] **Step 2: Grep for dangling references**

Run:
```bash
cd apps/mobile && grep -rn "HeaderUserIcon\|app/profile\|'/profile'\|\"/profile\"" app components __tests__ lib 2>/dev/null; echo "exit:$?"
```
Expected: no matches (grep exit 1 / "exit:1"). If any match remains, fix it (a stray `/profile` push should point at opening the drawer or `/`).

- [ ] **Step 3: Run the full mobile suite + lint**

Run:
```bash
cd /Users/reedrizzo/Documents/cowork/chicago-transit-tracker/repos/chicago-transit-tracker && pnpm -w run test && pnpm -w run lint
```
Expected: all suites pass, zero lint errors. Fix any fallout (most likely: relative-import depth in moved route files, or screen tests importing from the old `app/` paths — update those import paths to `app/(app)/...`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(mobile): drop obsolete profile screen test; suite green for Menu drawer"
```

---

## Task 10: Manual simulator verification

Not automatable — Jest does not exercise the real Drawer navigator or photo headers.

- [ ] **Step 1: iOS**

Run: `pnpm run:ios`
Verify: home shows a hamburger (top-right); tapping it opens a left side drawer with Menu/Dashboard/Profile/Legal; edge-swipe from the left opens it; Menu rows navigate and close the drawer; on a CTA/Metra detail screen the full-bleed photo header and the back chevron still render correctly and the drawer edge-swipe does not fight the screen content.

- [ ] **Step 2: Android**

Run: `pnpm run:android`
Verify: same checklist as iOS.

- [ ] **Step 3: Record the result**

If a simulator is unavailable in this environment, state that explicitly in the PR description (manual verification deferred) rather than claiming it passed.

---

## Self-Review Notes

- **Spec coverage:** rename→Menu (Tasks 4/6), hamburger icon (Task 7), drawer not on nav stack (Tasks 1–4), four sections (Task 6), train label (Task 8) — all mapped.
- **Type consistency:** `MenuNavRow` prop `onNavigate` + `href` used identically in test and impl; `DrawerContentComponentProps` used in impl and mocked in tests; `pickStop`/`TripStop` mirror `TrainCard`.
- **Placeholders:** none — every code step has full code; the two "read the existing file then adjust" steps (root-layout, home, FavoriteRow test scaffold) name the exact file, the exact change, and the fallback.
- **Risk:** the route-group move (Task 2) + Drawer wrap (Task 4) is the regression surface; Task 9 step 3 (full suite + lint) and Task 10 (manual) are the safety net.
