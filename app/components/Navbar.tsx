import Link from 'next/link'
import MobileMenuToggle from './MobileMenuToggle'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/metra', label: 'Metra' },
  { href: '/cta', label: 'CTA' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Search' },
]

export default function Navbar() {
  return (
    <header className="bg-white border-b border-gray-200">
      <nav className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900">
          Chicago Transit Tracker
        </Link>

        {/* Desktop links — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile toggle island */}
        <MobileMenuToggle links={navLinks} />
      </nav>
    </header>
  )
}
