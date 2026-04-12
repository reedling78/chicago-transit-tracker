'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { siteConfig } from '@lib/siteConfig'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
  }
}

export default function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window.gtag !== 'function') return
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    window.gtag('config', siteConfig.gaId, { page_path: url })
  }, [pathname, searchParams])

  return null
}
