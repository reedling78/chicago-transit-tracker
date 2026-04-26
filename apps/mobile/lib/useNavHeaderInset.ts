import { useHeaderHeight } from '@react-navigation/elements'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const ESTIMATED_NAV_BAR_HEIGHT = 44

// Top inset for screens with a transparent navigator header. Use as paddingTop
// (or to extend a hero's height) so content always sits below the back button.
//
// Why not just useHeaderHeight()? On Android with `headerTransparent: true`,
// the navigator under-reports the header height (often returning just the
// action-bar height without the status bar), which puts content under the
// status bar. The safe-area fallback guarantees a sane minimum on both
// platforms.
export function useNavHeaderInset() {
  const headerHeight = useHeaderHeight()
  const insets = useSafeAreaInsets()
  return Math.max(headerHeight, insets.top + ESTIMATED_NAV_BAR_HEIGHT)
}
