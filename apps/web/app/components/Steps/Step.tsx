import Link from 'next/link'
import type { ReactNode } from 'react'

// Converts a 6-digit hex color to rgba(r, g, b, alpha) for use in inline styles.
function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type StepStatus = 'default' | 'past' | 'current' | 'skipped'
export type StepBullet = 'open' | 'filled'

export interface StepsItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  status?: StepStatus
  bullet?: StepBullet
  href?: string
  trailing?: ReactNode
  below?: ReactNode
  children: ReactNode
}

// Internal props injected by <Steps>. Not part of the public API.
interface InternalStepsItemProps extends StepsItemProps {
  _color?: string
  _isFirst?: boolean
  _isLast?: boolean
}

export default function StepsItem({
  status = 'default',
  bullet = 'open',
  href,
  trailing,
  below,
  children,
  _color,
  _isFirst,
  _isLast,
  ...rest
}: InternalStepsItemProps) {
  const topSegmentColor = _isFirst ? 'transparent' : (_color ?? 'transparent')
  const bottomSegmentColor = _isLast ? 'transparent' : (_color ?? 'transparent')

  const rowStyle: React.CSSProperties = {}
  let rowClass = 'relative flex items-stretch gap-4'
  if (status === 'past' || status === 'skipped') rowClass += ' opacity-60'
  if (status === 'current' && _color) {
    // 8% alpha tint via 8-digit hex; requires _color to be a 6-digit hex (#RRGGBB).
    rowStyle.backgroundColor = `${_color}14`
  }

  const leftClass = 'min-w-0 flex-1' + (status === 'skipped' ? ' line-through' : '')

  const innerContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div data-steps-left="" className={leftClass}>
          {children}
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
      {below && <div className="mt-1.5">{below}</div>}
    </>
  )

  return (
    <div
      data-steps-item=""
      data-steps-status={status}
      {...rest}
      className={rowClass}
      style={rowStyle}
    >
      <div className="flex w-6 shrink-0 flex-col items-center">
        <div
          data-steps-rail-top
          aria-hidden
          className="w-[3px] flex-1"
          style={{ backgroundColor: topSegmentColor }}
        />
        {(() => {
          const isCurrent = status === 'current'
          const isFilled = bullet === 'filled'
          const variant = isCurrent ? 'halo' : bullet
          const bulletClass = (() => {
            if (isCurrent) return 'h-3 w-3 shrink-0 rounded-full'
            if (isFilled) return 'h-5 w-5 shrink-0 rounded-full border-2'
            return 'h-3 w-3 shrink-0 rounded-full border-2 bg-white dark:bg-gray-950'
          })()
          const bulletStyle: React.CSSProperties = { borderColor: _color }
          if (isCurrent) {
            bulletStyle.backgroundColor = _color
            bulletStyle.borderColor = undefined
            // Halo: 4px outer ring at ~30% alpha.
            bulletStyle.boxShadow = _color ? `0 0 0 4px ${hexWithAlpha(_color, 0.3)}` : undefined
          } else if (isFilled) {
            bulletStyle.backgroundColor = _color
          }
          return <div data-steps-bullet={variant} className={bulletClass} style={bulletStyle} />
        })()}
        <div
          data-steps-rail-bottom
          aria-hidden
          className="w-[3px] flex-1"
          style={{ backgroundColor: bottomSegmentColor }}
        />
      </div>

      {href ? (
        <Link href={href} className="group flex min-w-0 flex-1 flex-col py-4">
          {innerContent}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col py-4">{innerContent}</div>
      )}
    </div>
  )
}
