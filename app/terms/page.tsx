import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '../components/PageHeader'
import { siteConfig } from '../lib/siteConfig'

const description =
  'Terms of use for Chicago Transit Tracker, an independent transit information resource.'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description,
  openGraph: {
    title: `Terms of Use | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/terms`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Terms of Use | ${siteConfig.name}`,
    description,
    images: [siteConfig.ogImage],
  },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <main>
      <PageHeader
        title="Terms of Use"
        description="Please read these terms before using Chicago Transit Tracker."
      />

      <Section title="Overview">
        <p>
          Chicago Transit Tracker is an independent, unofficial web application. It is not
          affiliated with, endorsed by, sponsored by, or operated by the Chicago Transit Authority
          (CTA), Metra, or any other transit agency. Use of this site does not create any
          relationship between you and those agencies.
        </p>
        <p>
          By accessing or using this site, you agree to these Terms of Use. If you do not agree,
          please do not use the site.
        </p>
      </Section>

      <Section title="Accuracy of Information">
        <p>
          Transit schedules, station details, route information, and other data displayed on this
          site are sourced from publicly available data provided by CTA and Metra. This information
          is provided for general reference purposes only.
        </p>
        <p>
          We make no guarantee that the information displayed is accurate, complete, current, or
          suitable for trip planning. Service disruptions, schedule changes, and accessibility
          conditions may not be reflected in real time.
        </p>
        <p>
          Always verify travel information directly with the{' '}
          <a
            href="https://www.transitchicago.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Chicago Transit Authority
          </a>{' '}
          or{' '}
          <a
            href="https://metra.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Metra
          </a>{' '}
          before making travel decisions.
        </p>
      </Section>

      <Section title="No Warranty">
        <p>
          This site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty
          of any kind, express or implied. We do not warrant that the site will be uninterrupted,
          error-free, or free of harmful components. Your use of this site is at your own risk.
        </p>
      </Section>

      <Section title="Intellectual Property">
        <p>
          CTA, Metra, and their respective logos, route names, and branding are trademarks of their
          respective owners. CTA &lsquo;L&rsquo; route colors used on this site are sourced from the
          official CTA Developer Trademark Guidelines and are used solely to identify transit
          routes.
        </p>
        <p>
          Chicago Transit Tracker is not the first word of &ldquo;CTA&rdquo; and is not intended to
          imply any official affiliation. No CTA or Metra agency logos are reproduced on this site.
        </p>
      </Section>

      <Section title="External Links">
        <p>
          This site links to official CTA and Metra websites and other third-party resources for
          your convenience. We have no control over the content or availability of those sites and
          accept no responsibility for them.
        </p>
      </Section>

      <Section title="Changes to These Terms">
        <p>
          We may update these terms at any time without prior notice. Continued use of the site
          after changes are posted constitutes your acceptance of the revised terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions?{' '}
          <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
            Return to the home page.
          </Link>
        </p>
      </Section>
    </main>
  )
}
