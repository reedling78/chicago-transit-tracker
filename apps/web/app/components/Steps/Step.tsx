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
  href,
  trailing,
  below,
  children,
  _color,
  _isFirst,
  _isLast,
  ...rest
}: InternalStepsItemProps) {
  return <div {...rest}>{children}</div>
}
