# Plan: Mobile PageHeader Component

## Context

The mobile app currently has no hero/header component on its list pages — CTA and Metra lines screens jump straight into the FlatList. The web app has a polished `PageHeader` component with a background image, dark overlays, and bottom-pinned content. This plan creates a mobile equivalent and deploys it on the CTA and Metra lines pages for visual parity with the web.

---

## Step 1: Install `expo-linear-gradient`

React Native has no CSS gradients. `expo-linear-gradient` is the standard Expo-maintained solution.

```bash
cd apps/mobile && npx expo install expo-linear-gradient
```

---

## Step 2: Copy hero images to mobile assets

```bash
cp apps/web/public/hero-header.jpg apps/mobile/assets/hero-header.jpg
cp apps/web/public/hero-header-metra.jpg apps/mobile/assets/hero-header-metra.jpg
```

Consider optimizing for mobile bundle size (resize to ~750px width) but this is optional for initial implementation.

---

## Step 3: Create `apps/mobile/components/PageHeader.tsx`

**Props interface** (matches web, adapted for RN):

```typescript
interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbItems?: { label: string; href?: string }[]  // accepted for API parity, not rendered
  badges?: ReactNode
  icon?: ReactNode
  imageSrc?: ImageSourcePropType  // require() result; defaults to CTA hero
  children?: ReactNode
}
```

**Component structure** — four layers inside a 200px `overflow: 'hidden'` container:

1. **Background image** — `Image` with `resizeMode="cover"`, absolutely positioned to fill
2. **Flat tint** — `View` with `backgroundColor: 'rgba(0,0,0,0.40)'`, absolutely positioned
3. **Gradient** — `LinearGradient` from bottom (black/85) to top (transparent), absolutely positioned
4. **Content** — `View` with `flex: 1`, `justifyContent: 'flex-end'`, `padding: 16`:
   - Badges row (conditional): `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: 8`
   - Title row: icon (optional, `shrink: 0`) + `Text` (white, bold, fontSize 22, textShadow)
   - Description (conditional): `Text` white/85, fontSize 14
   - Children (conditional)

**Key RN-specific adaptations:**
- `textShadowColor`, `textShadowOffset: { width: 0, height: 1 }`, `textShadowRadius: 3` for title
- `breadcrumbItems` prop accepted but not rendered (mobile uses stack nav back button)
- `marginBottom: 16` on the outer container to space from list items below

---

## Step 4: Integrate into CTA lines page

**File:** `apps/mobile/app/cta/index.tsx`

- Import `PageHeader`
- Add `ListHeaderComponent` to FlatList:
  ```tsx
  ListHeaderComponent={
    <PageHeader
      title="CTA Lines"
      description="Chicago 'L' rapid transit lines"
    />
  }
  ```
- Uses default `imageSrc` (CTA hero)
- Change `contentContainerStyle` from `{ padding: 16, gap: 12 }` to `{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }` so the PageHeader renders full-bleed while list items keep horizontal padding. The PageHeader will use negative horizontal margins (`marginHorizontal: -16`) or we restructure padding — simplest: keep `padding: 16` on list and apply `marginHorizontal: -16` on PageHeader to go edge-to-edge.

---

## Step 5: Integrate into Metra lines page

**File:** `apps/mobile/app/metra/index.tsx`

Same pattern, with Metra hero image:
```tsx
ListHeaderComponent={
  <PageHeader
    title="Metra Lines"
    description="Chicagoland commuter rail lines"
    imageSrc={require('../../assets/hero-header-metra.jpg')}
  />
}
```

---

## Step 6: Add Jest mock for `expo-linear-gradient`

**File:** `apps/mobile/__mocks__/expo-linear-gradient.tsx`

```tsx
import { View } from 'react-native'
export const LinearGradient = (props: any) => <View {...props} />
```

Add to `apps/mobile/jest.config.js` moduleNameMapper:
```js
'^expo-linear-gradient$': '<rootDir>/__mocks__/expo-linear-gradient',
```

---

## Step 7: Write tests

**File:** `apps/mobile/__tests__/components/PageHeader.test.tsx`

Follow `LineListItem.test.tsx` patterns. Test cases:

1. Renders title text
2. Renders description when provided
3. Does not render description when omitted
4. Renders badges when provided
5. Renders icon inline with title
6. Renders children
7. Accepts breadcrumbItems without crashing (API parity)

---

## Files Changed

| File | Action |
|------|--------|
| `apps/mobile/assets/hero-header.jpg` | Create (copy from web) |
| `apps/mobile/assets/hero-header-metra.jpg` | Create (copy from web) |
| `apps/mobile/components/PageHeader.tsx` | Create |
| `apps/mobile/app/cta/index.tsx` | Modify (add ListHeaderComponent) |
| `apps/mobile/app/metra/index.tsx` | Modify (add ListHeaderComponent) |
| `apps/mobile/__mocks__/expo-linear-gradient.tsx` | Create |
| `apps/mobile/jest.config.js` | Modify (add moduleNameMapper entry) |
| `apps/mobile/__tests__/components/PageHeader.test.tsx` | Create |
| `apps/mobile/package.json` | Auto-modified by expo install |

---

## Verification

1. `cd apps/mobile && npx expo start --ios` — verify CTA and Metra pages show the hero header with image, overlays, and text
2. `pnpm test:mobile` — all tests pass with zero warnings
3. `pnpm lint:mobile` — lint is clean
4. Visually confirm: image covers full width, gradient fades from bottom, title is white and legible, description shows below title
