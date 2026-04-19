import type { Metadata } from 'next'
import { siteConfig } from '@lib/siteConfig'
import ProfileContent from './ProfileContent'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Manage your Chicago Transit Tracker account and profile settings.',
  openGraph: {
    title: 'Profile',
    description: 'Manage your Chicago Transit Tracker account and profile settings.',
    url: `${siteConfig.url}/profile`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Profile',
    description: 'Manage your Chicago Transit Tracker account and profile settings.',
    images: [siteConfig.ogImage],
  },
}

export default function ProfilePage() {
  return <ProfileContent />
}
