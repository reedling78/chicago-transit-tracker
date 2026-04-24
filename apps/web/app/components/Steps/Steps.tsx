import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import StepsItem, { type StepsItemProps } from './Step'

export interface StepsProps {
  color: string
  children: ReactNode
  className?: string
}

function Steps({ color, children, className }: StepsProps) {
  const items = Children.toArray(children).filter(isValidElement)
  const lastIdx = items.length - 1

  return (
    <div className={className}>
      {items.map((child, idx) =>
        cloneElement(
          child as React.ReactElement<StepsItemProps>,
          {
            // Internal props — cast through `as never` to bypass the public prop type.
            _color: color,
            _isFirst: idx === 0,
            _isLast: idx === lastIdx,
            key: child.key ?? idx,
          } as never,
        ),
      )}
    </div>
  )
}

Steps.Item = StepsItem

export { Steps }
export type { StepsItemProps } from './Step'
