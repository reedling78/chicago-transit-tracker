import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import StepsItem, { type StepsItemProps } from './Step'

export interface StepsProps {
  /** CTA/Metra route hex; drives the rail + bullet borders. */
  color: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

function Steps({ color, children, style }: StepsProps) {
  const items = Children.toArray(children).filter(isValidElement)
  const lastIdx = items.length - 1
  return (
    <View style={style}>
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
    </View>
  )
}

Steps.Item = StepsItem

export { Steps }
export type { StepsItemProps } from './Step'
