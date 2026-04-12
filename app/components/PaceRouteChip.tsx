import Link from 'next/link'

interface Props {
  shortName: string
  color: string
  textColor: string
  href?: string
  className?: string
}

export default function PaceRouteChip({ shortName, color, textColor, href, className }: Props) {
  const style = { backgroundColor: color, color: textColor }

  if (href) {
    // Standalone-link variant: meets 44×44 touch target minimum
    return (
      <Link
        href={href}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${className ?? ''}`}
        style={style}
      >
        {shortName}
      </Link>
    )
  }

  // Visual-badge variant: compact, used inside larger interactive containers
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className ?? ''}`}
      style={style}
    >
      {shortName}
    </span>
  )
}
