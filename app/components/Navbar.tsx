import Link from 'next/link'
import MobileMenuToggle from './MobileMenuToggle'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '/cta', label: 'CTA' },
  { href: '/metra', label: 'Metra' },
]

export default function Navbar() {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="" width={32} height={32} className="shrink-0" />
          <span className="font-bold text-lg text-gray-900 dark:text-white">Chicago Transit Tracker</span>
        </Link>

        {/* Desktop links — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm font-medium"
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
