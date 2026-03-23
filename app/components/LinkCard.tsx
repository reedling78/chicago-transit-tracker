import Link from 'next/link'

interface LinkCardProps {
  href: string
  title: string
  subtitle?: string
  meta?: string
  badge?: string
  badgeColor?: string
  badgeTextColor?: string
  /** Optional icon element rendered to the left of the title (replaces badge when provided) */
  icon?: React.ReactNode
}

export default function LinkCard({
  href,
  title,
  subtitle,
  meta,
  badge,
  badgeColor,
  badgeTextColor = '#ffffff',
  icon,
}: LinkCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 px-5 py-4 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:hover:border-gray-600"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <span className="shrink-0">{icon}</span>}
        {!icon && badge && (
          <span
            className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: badgeColor, color: badgeTextColor }}
          >
            {badge}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900 dark:text-white">{title}</p>
          {subtitle && (
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {meta && <span className="text-sm text-gray-400 dark:text-gray-500">{meta}</span>}
        <span className="text-gray-300 dark:text-gray-600 transition group-hover:text-gray-500 dark:group-hover:text-gray-400">→</span>
      </div>
    </Link>
  )
}
