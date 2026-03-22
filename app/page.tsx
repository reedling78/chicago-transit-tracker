// app/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Track Chicago-area transit routes and schedules in real time.',
  openGraph: {
    title: 'Home | Chicago Transit Tracker',
    description: 'Track Chicago-area transit routes and schedules in real time.',
    url: 'https://chicago-transit-tracker.com',
    type: 'website',
  },
}

export default function HomePage() {
  return <></>
}
