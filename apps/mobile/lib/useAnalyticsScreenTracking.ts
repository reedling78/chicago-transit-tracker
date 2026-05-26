import { useEffect } from 'react'
import { usePathname } from 'expo-router'
import { trackScreenView } from './analytics'

/**
 * Subscribes to pathname changes from expo-router and emits a Firebase
 * Analytics screen_view event each time the user navigates. Call once from
 * the root Stack layout — multiple call sites would multiply events.
 */
export function useAnalyticsScreenTracking(): void {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname) return
    void trackScreenView({ screen_name: pathname, screen_class: pathname })
  }, [pathname])
}
