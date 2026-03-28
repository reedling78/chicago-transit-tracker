import Link from 'next/link'
import { siteConfig } from '../lib/siteConfig'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {siteConfig.name}
            </p>
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
                  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
