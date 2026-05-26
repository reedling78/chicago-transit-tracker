'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { trackPageView } from '@lib/analytics'

export default function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = searchParams.toString()
    const page_path = pathname + (query ? `?${query}` : '')
    void trackPageView({
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [pathname, searchParams])

  return null
}
