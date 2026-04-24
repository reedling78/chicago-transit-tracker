import type { ReactNode } from 'react'

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
  // Destructured to prevent leaking into ...rest — wired in later tasks
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  href,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  trailing,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  below,
  children,
  _color,
  _isFirst,
  _isLast,
  ...rest
}: InternalStepsItemProps) {
  const topSegmentColor = _isFirst ? 'transparent' : (_color ?? 'transparent')
  const bottomSegmentColor = _isLast ? 'transparent' : (_color ?? 'transparent')

  return (
    <div
      data-steps-item=""
      data-steps-status={status}
      {...rest}
      className="relative flex items-stretch gap-4"
    >
      <div className="flex w-6 shrink-0 flex-col items-center">
        <div
          data-steps-rail-top
          aria-hidden
          className="w-[3px] flex-1"
          style={{ backgroundColor: topSegmentColor }}
        />
        {(() => {
          const isFilled = bullet === 'filled'
          const bulletClass = isFilled
            ? 'h-5 w-5 shrink-0 rounded-full border-2'
            : 'h-3 w-3 shrink-0 rounded-full border-2 bg-white dark:bg-gray-950'
          const bulletStyle: React.CSSProperties = { borderColor: _color }
          if (isFilled) bulletStyle.backgroundColor = _color
          return <div data-steps-bullet={bullet} className={bulletClass} style={bulletStyle} />
        })()}
        <div
          data-steps-rail-bottom
          aria-hidden
          className="w-[3px] flex-1"
          style={{ backgroundColor: bottomSegmentColor }}
        />
      </div>

      <div className="min-w-0 flex-1 py-4">{children}</div>
    </div>
  )
}
