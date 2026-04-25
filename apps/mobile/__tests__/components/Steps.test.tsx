import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { render, screen } from '@testing-library/react-native'
import { Steps } from '../../components/Steps'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}))

const RED = '#c60c30'

describe('Steps', () => {
  it('renders one row per Steps.Item child with its children content', () => {
    render(
      <Steps color={RED}>
        <Steps.Item>
          <Text>Howard</Text>
        </Steps.Item>
        <Steps.Item>
          <Text>Jarvis</Text>
        </Steps.Item>
        <Steps.Item>
          <Text>95th</Text>
        </Steps.Item>
      </Steps>,
    )
    expect(screen.getByText('Howard')).toBeOnTheScreen()
    expect(screen.getByText('Jarvis')).toBeOnTheScreen()
    expect(screen.getByText('95th')).toBeOnTheScreen()
  })

  it('makes first/last terminal segments transparent and middle segments colored', () => {
    render(
      <Steps color={RED}>
        <Steps.Item testID="r-0">
          <Text>A</Text>
        </Steps.Item>
        <Steps.Item testID="r-1">
          <Text>B</Text>
        </Steps.Item>
        <Steps.Item testID="r-2">
          <Text>C</Text>
        </Steps.Item>
      </Steps>,
    )
    const tops = screen.getAllByTestId('steps-rail-top')
    const bottoms = screen.getAllByTestId('steps-rail-bottom')
    expect(tops).toHaveLength(3)
    expect(bottoms).toHaveLength(3)

    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s as Record<string, unknown>)
    const colorOf = (el: { props: { style?: unknown } }) => flatten(el.props.style).backgroundColor

    expect(colorOf(tops[0])).toBe('transparent')
    expect(colorOf(bottoms[0])).toBe(RED)
    expect(colorOf(tops[1])).toBe(RED)
    expect(colorOf(bottoms[1])).toBe(RED)
    expect(colorOf(tops[2])).toBe(RED)
    expect(colorOf(bottoms[2])).toBe('transparent')
  })

  it('renders an open bullet by default', () => {
    render(
      <Steps color={RED}>
        <Steps.Item>
          <Text>A</Text>
        </Steps.Item>
      </Steps>,
    )
    expect(screen.getByTestId('steps-bullet-open')).toBeOnTheScreen()
    expect(screen.queryByTestId('steps-bullet-filled')).toBeNull()
    expect(screen.queryByTestId('steps-bullet-halo')).toBeNull()
  })

  it('renders a filled bullet when bullet="filled"', () => {
    render(
      <Steps color={RED}>
        <Steps.Item bullet="filled">
          <Text>A</Text>
        </Steps.Item>
      </Steps>,
    )
    expect(screen.getByTestId('steps-bullet-filled')).toBeOnTheScreen()
    expect(screen.queryByTestId('steps-bullet-open')).toBeNull()
  })

  it('renders the halo bullet when status="current" — and the halo overrides bullet="filled"', () => {
    render(
      <Steps color={RED}>
        <Steps.Item bullet="filled" status="current">
          <Text>A</Text>
        </Steps.Item>
      </Steps>,
    )
    expect(screen.getByTestId('steps-bullet-halo')).toBeOnTheScreen()
    expect(screen.queryByTestId('steps-bullet-filled')).toBeNull()
    expect(screen.queryByTestId('steps-bullet-open')).toBeNull()
  })

  it('applies a row tint when status="current"', () => {
    render(
      <Steps color={RED}>
        <Steps.Item testID="row" status="current">
          <Text>A</Text>
        </Steps.Item>
      </Steps>,
    )
    const row = screen.getByTestId('row')
    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s as Record<string, unknown>)
    const flat = flatten(row.props.style)
    expect(flat.backgroundColor).toMatch(/^rgba\(198,\s*12,\s*48,\s*0\.08\)$/)
  })

  it('applies opacity 0.6 when status="past" or "skipped"', () => {
    render(
      <Steps color={RED}>
        <Steps.Item testID="past" status="past">
          <Text>P</Text>
        </Steps.Item>
        <Steps.Item testID="skipped" status="skipped">
          <Text>S</Text>
        </Steps.Item>
      </Steps>,
    )
    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s as Record<string, unknown>)
    expect(flatten(screen.getByTestId('past').props.style).opacity).toBe(0.6)
    expect(flatten(screen.getByTestId('skipped').props.style).opacity).toBe(0.6)
  })

  it('renders trailing content alongside children, and below content underneath', () => {
    render(
      <Steps color={RED}>
        <Steps.Item
          trailing={<Text testID="trailing">6:30 AM</Text>}
          below={<Text testID="below">Transfers</Text>}
        >
          <Text>Aurora</Text>
        </Steps.Item>
      </Steps>,
    )
    expect(screen.getByTestId('trailing')).toBeOnTheScreen()
    expect(screen.getByTestId('below')).toBeOnTheScreen()
    expect(screen.getByText('Aurora')).toBeOnTheScreen()
  })

  it('passes testID through to the row root', () => {
    render(
      <Steps color={RED}>
        <Steps.Item testID="my-row">
          <Text>X</Text>
        </Steps.Item>
      </Steps>,
    )
    expect(screen.getByTestId('my-row')).toBeOnTheScreen()
  })

  it('lays out the row as a flex row even when wrapped in a Link via href', () => {
    // Regression: when href is set, Pressable inside Link asChild was
    // dropping the style array, so flexDirection: 'row' didn't apply
    // and the bullet stacked above the station name.
    render(
      <Steps color={RED}>
        <Steps.Item testID="row" href="/some/route">
          <Text>A</Text>
        </Steps.Item>
      </Steps>,
    )
    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s as Record<string, unknown>)
    const flat = flatten(screen.getByTestId('row').props.style)
    expect(flat.flexDirection).toBe('row')
    expect(flat.alignItems).toBe('center')
  })

  it('vertically centers row contents with a minHeight so the bullet aligns with the station name', () => {
    // Regression: with alignItems: 'stretch' and no minHeight, the bullet
    // ended up centered in a tall row while the station name pinned to the
    // top, leaving the bullet visually adrift between rows.
    render(
      <Steps color={RED}>
        <Steps.Item testID="row">
          <Text>A</Text>
        </Steps.Item>
      </Steps>,
    )
    const flatten = (s: unknown): Record<string, unknown> =>
      Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : (s as Record<string, unknown>)
    const flat = flatten(screen.getByTestId('row').props.style)
    expect(flat.alignItems).toBe('center')
    expect(flat.minHeight).toBeGreaterThanOrEqual(48)
  })
})
