import type { Metadata } from 'next'
import Link from 'next/link'
import PageHeader from '@components/PageHeader'
import { siteConfig } from '@lib/siteConfig'

const description =
  'Privacy statement for Chicago Transit Tracker — what data we collect and how we use it.'

export const metadata: Metadata = {
  title: 'Privacy Statement',
  description,
  openGraph: {
    title: `Privacy Statement | ${siteConfig.name}`,
    description,
    url: `${siteConfig.url}/privacy`,
    images: [siteConfig.ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Privacy Statement | ${siteConfig.name}`,
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

export default function PrivacyPage() {
  return (
    <main>
      <PageHeader title="Privacy Statement" description="Effective date: March 2025" />

      <Section title="Overview">
        <p>
          Chicago Transit Tracker respects your privacy. This statement explains what information is
          collected when you visit this site, how it is used, and your choices. We do not sell,
          rent, or share personal data with third parties for marketing purposes.
        </p>
      </Section>

      <Section title="Information We Collect">
        <p>
          This site does not require you to create an account or provide any personal information.
          We do not collect names, email addresses, or payment details.
        </p>
        <p>
          We use{' '}
          <strong className="text-gray-700 dark:text-gray-300">Google Analytics 4 (GA4)</strong> to
          understand how visitors use the site. GA4 collects anonymized data including:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>Pages visited and time spent on each page</li>
          <li>General geographic region (city/country level, not precise location)</li>
          <li>Device type, browser, and operating system</li>
          <li>Referring website or search engine</li>
        </ul>
        <p>
          IP addresses are anonymized by default in GA4. We do not use this data to identify
          individual users.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          GA4 uses first-party cookies to distinguish visits and sessions. These are analytics
          cookies only — we do not use advertising, retargeting, or cross-site tracking cookies.
        </p>
        <p>
          This site also uses{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
            localStorage
          </code>{' '}
          in your browser to remember your light/dark mode preference. This data never leaves your
          device.
        </p>
      </Section>

      <Section title="How We Use Data">
        <p>
          Analytics data is used solely to understand which pages and features are most useful, so
          we can improve the site. Aggregate, anonymized analytics are never sold or shared with
          third parties.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Google Analytics 4</strong> —
          analytics provider. Data is processed under Google&rsquo;s privacy policy at{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            policies.google.com/privacy
          </a>
          .
        </p>
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Firebase Hosting</strong> — used to
          serve the site. Firebase may log standard server request data (IP address, timestamp,
          URL). See{' '}
          <a
            href="https://firebase.google.com/support/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Firebase&rsquo;s privacy information
          </a>
          .
        </p>
      </Section>

      <Section title="Your Choices">
        <p>
          You can opt out of Google Analytics tracking by installing the{' '}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Google Analytics Opt-out Browser Add-on
          </a>{' '}
          or by disabling cookies in your browser settings.
        </p>
      </Section>

      <Section title="Children's Privacy">
        <p>
          This site is not directed at children under 13 and we do not knowingly collect information
          from children.
        </p>
      </Section>

      <Section title="Changes to This Statement">
        <p>
          We may update this privacy statement from time to time. The effective date at the top of
          this page will reflect the most recent revision. Continued use of the site after changes
          are posted constitutes acceptance of the updated statement.
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
