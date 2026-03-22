// app/search/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Chicago transit routes, lines, and schedules.',
  openGraph: {
    title: 'Search | Chicago Transit Tracker',
    description: 'Search Chicago transit routes, lines, and schedules.',
    url: 'https://chicago-transit-tracker.com/search',
    type: 'website',
  },
}

export default function SearchPage() {
  return <></>
}
