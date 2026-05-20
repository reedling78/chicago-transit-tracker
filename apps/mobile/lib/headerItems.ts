import { Platform } from 'react-native'
import type { ReactElement } from 'react'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

export function headerLeftItem(
  element: ReactElement | null,
): Pick<NativeStackNavigationOptions, 'headerLeft' | 'unstable_headerLeftItems'> {
  if (element === null) {
    return Platform.OS === 'ios'
      ? { unstable_headerLeftItems: () => [], headerLeft: () => null }
      : { headerLeft: () => null }
  }
  return Platform.OS === 'ios'
    ? {
        unstable_headerLeftItems: () => [{ type: 'custom', element, hidesSharedBackground: true }],
      }
    : { headerLeft: () => element }
}

export function headerRightItem(
  element: ReactElement,
): Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'> {
  return Platform.OS === 'ios'
    ? {
        unstable_headerRightItems: () => [{ type: 'custom', element, hidesSharedBackground: true }],
      }
    : { headerRight: () => element }
}
