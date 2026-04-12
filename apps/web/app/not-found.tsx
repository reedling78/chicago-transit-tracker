import type { Metadata } from 'next'
import LinkCard from '@components/LinkCard'
import { siteConfig } from '@lib/siteConfig'

const description =
  'The page you are looking for does not exist. Browse CTA and Metra transit lines, stations, and service alerts.'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description,
  openGraph: {
    title: `Page Not Found | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/404`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Page Not Found | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: false,
  },
}

const destinations = [
  {
    href: '/',
    title: 'Home',
    subtitle: 'Back to the main station',
    accentColor: '#c60c30',
  },
  {
    href: '/cta',
    title: 'CTA Lines',
    subtitle: '8 rapid transit rail lines',
    accentColor: '#00a1de',
  },
  {
    href: '/metra',
    title: 'Metra Lines',
    subtitle: '11 commuter rail lines',
    accentColor: '#009b3a',
  },
  {
    href: '/cta/alerts',
    title: 'Service Alerts',
    subtitle: 'Live CTA & Metra alerts',
    accentColor: '#f9461c',
  },
]

export default function NotFound() {
  return (
    <div>
      <div className="mb-10 text-center">
        <p className="text-8xl font-extrabold tracking-tighter text-[#c60c30]">404</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
          You&apos;ve reached the end of the line
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-base text-gray-500 dark:text-gray-400">
          All passengers must exit. The page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>
      </div>

      <div className="border-t border-gray-200 pt-8 dark:border-gray-800">
        <p className="mb-4 text-xs font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
          Popular Destinations
        </p>
        <div className="flex flex-col gap-3">
          {destinations.map((dest) => (
            <LinkCard
              key={dest.href}
              href={dest.href}
              title={dest.title}
              subtitle={dest.subtitle}
              accentColor={dest.accentColor}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
