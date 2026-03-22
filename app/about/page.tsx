// app/about/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about Chicago Transit Tracker and our mission.',
  openGraph: {
    title: 'About Us | Chicago Transit Tracker',
    description: 'Learn about Chicago Transit Tracker and our mission.',
    url: 'https://chicago-transit-tracker.com/about',
    type: 'website',
  },
}

export default function AboutPage() {
  return <></>
}
