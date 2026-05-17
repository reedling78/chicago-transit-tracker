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
      <PageHeader title="Privacy Statement" description="Effective date: May 2026" />

      <Section title="Overview">
        <p>
          Chicago Transit Tracker respects your privacy. This statement explains what information is
          collected when you visit this site or use the companion mobile app, how it is used, and
          your choices. We do not sell, rent, or share personal data with third parties for
          marketing purposes.
        </p>
      </Section>

      <Section title="Account Data">
        <p>
          You can browse all transit information without creating an account. If you choose to sign
          in to save favorites, we collect the following from your sign-in provider (Apple, Google,
          or email and password) and store it in Firebase Authentication and Firestore:
        </p>
        <ul className="list-inside list-disc space-y-1 pl-2">
          <li>
            Email address — used to identify your account and send password-reset links if you chose
            email sign-in.
          </li>
          <li>
            Display name and profile photo URL — supplied by Apple or Google during social sign-in.
            Used only inside the app to label your account.
          </li>
          <li>
            Sign-in provider (e.g. <em>apple.com</em>, <em>google.com</em>) and a Firebase user ID.
          </li>
          <li>
            Your favorites map (saved lines, stations, and trains) and the timestamps when your
            account was created and last updated.
          </li>
        </ul>
        <p>
          We do not collect names, email addresses, or photos from people who do not sign in. We
          never collect payment details.
        </p>
        <p>
          Account data is stored in Firebase Firestore under owner-only access rules — only you can
          read or write your own profile document.
        </p>
      </Section>

      <Section title="Analytics">
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

      <Section title="Cookies and Local Storage">
        <p>
          GA4 uses first-party cookies to distinguish visits and sessions. These are analytics
          cookies only — we do not use advertising, retargeting, or cross-site tracking cookies.
        </p>
        <p>
          This site also uses{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">
            localStorage
          </code>{' '}
          in your browser to remember your light/dark mode preference and your favorites list while
          signed out. This data never leaves your device.
        </p>
      </Section>

      <Section title="How We Use Data">
        <p>
          Analytics data is used solely to understand which pages and features are most useful, so
          we can improve the site. Aggregate, anonymized analytics are never sold or shared with
          third parties.
        </p>
        <p>
          Account data (email, profile, favorites) is used only to provide the favorites feature
          across your devices. It is not used for marketing, sold, or shared with third parties.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Firebase Authentication</strong> —
          stores account credentials and the email/profile fields described above. Apple and Google
          social sign-in uses each provider&rsquo;s OAuth flow under their respective privacy
          policies.
        </p>
        <p>
          <strong className="text-gray-700 dark:text-gray-300">Firebase Firestore</strong> — stores
          your profile document and favorites map. Firebase Hosting and Firebase App Hosting serve
          the site and may log standard server request data (IP address, timestamp, URL). See{' '}
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
      </Section>

      <Section title="Your Choices">
        <p>
          You can sign out at any time from the Profile page. Signing out clears the active session
          on this device but does not delete your stored profile.
        </p>
        <p>
          To delete your account and all associated data (email, profile, favorites), email{' '}
          <a
            href="mailto:reed.rizzo@gmail.com?subject=Chicago%20Transit%20Tracker%20account%20deletion"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            reed.rizzo@gmail.com
          </a>{' '}
          from the address on the account. We will remove the account and its profile document from
          Firebase within a reasonable period.
        </p>
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
