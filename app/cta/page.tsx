import type { Metadata } from 'next'
import { getLinesForService } from '../lib/transit'
import LinkCard from '../components/LinkCard'
import PageHeader from '../components/PageHeader'
import CTALineIcon from '../components/CTALineIcon'
import { siteConfig } from '../lib/siteConfig'

const description = 'CTA bus and rail schedules, routes, and real-time tracking.'

export const metadata: Metadata = {
  title: 'CTA',
  description,
  openGraph: {
    title: `CTA | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/cta`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `CTA | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

export default async function CTAPage() {
  const lines = await getLinesForService('cta')

  return (
    <main>
      <PageHeader
        title="CTA Lines"
        description="8 colour-coded rapid transit lines serving Chicago and the inner suburbs."
      />
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <LinkCard
            key={line.id}
            href={`/cta/${line.slug}`}
            title={line.name}
            subtitle={line.termini.join(' → ')}
            meta={`${line.stationCount} stations · ${line.routeMiles} mi`}
            icon={<CTALineIcon line={line.shortName} size={40} />}
          />
        ))}
      </div>
    </main>
  )
}
