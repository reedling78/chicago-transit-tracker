import Link from 'next/link'
import MobileMenuToggle from './MobileMenuToggle'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '/cta', label: 'CTA' },
  { href: '/metra', label: 'Metra' },
]

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" width={32} height={32} className="shrink-0" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Chicago Transit Tracker
          </span>
        </Link>

        {/* Desktop links — hidden on mobile */}
        <ul className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MobileMenuToggle links={navLinks} />
        </div>
      </nav>
    </header>
  )
}
