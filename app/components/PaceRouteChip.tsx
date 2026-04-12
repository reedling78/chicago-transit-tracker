import Link from 'next/link'

interface Props {
  shortName: string
  color: string
  textColor: string
  href?: string
  className?: string
}

export default function PaceRouteChip({ shortName, color, textColor, href, className }: Props) {
  const base = `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className ?? ''}`
  const style = { backgroundColor: color, color: textColor }

  if (href) {
    return (
      <Link href={href} className={base} style={style}>
        {shortName}
      </Link>
    )
  }

  return (
    <span className={base} style={style}>
      {shortName}
    </span>
  )
}
