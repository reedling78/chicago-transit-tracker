import Link from 'next/link'
import { siteConfig } from '@lib/siteConfig'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{siteConfig.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              &copy; {year} {siteConfig.name}. Not affiliated with CTA or Metra.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Transit data provided by Chicago Transit Authority and Metra.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex items-center gap-5">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Site Map
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
