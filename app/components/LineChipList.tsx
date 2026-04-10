import Link from 'next/link'
import { LINE_COLORS } from './StationDetail'

export interface LineLinkInfo {
  slug: string
  service: 'cta' | 'metra'
}

interface LineChipListProps {
  /** Line short names to render (e.g. "Red", "Blue", "UP-N") */
  lineNames: string[]
  /** Map from short name to the info needed to build a link. Missing entries render as plain spans. */
  lineLookup: Record<string, LineLinkInfo>
}

export default function LineChipList({ lineNames, lineLookup }: LineChipListProps) {
  if (lineNames.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {lineNames.map((name) => {
        const colors = LINE_COLORS[name]
        const link = lineLookup[name]
        const href = link ? `/${link.service}/${link.slug}` : null

        const baseClass = colors
          ? 'rounded-full px-3 py-1 text-xs font-semibold'
          : 'rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        const style = colors ? { backgroundColor: colors.bg, color: colors.text } : undefined

        if (href) {
          return (
            <Link
              key={name}
              href={href}
              className={`${baseClass} transition-opacity hover:opacity-80`}
              style={style}
              aria-label={`${name} line`}
            >
              {name}
            </Link>
          )
        }

        return (
          <span key={name} className={baseClass} style={style}>
            {name}
          </span>
        )
      })}
    </div>
  )
}
