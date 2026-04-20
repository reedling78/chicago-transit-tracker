import { render, screen, fireEvent } from '@testing-library/react-native'
import { TimetableFilterBar, todayServiceType } from '../../components/TimetableFilterBar'
import type { ServiceType } from '@ctt/shared'

describe('TimetableFilterBar', () => {
  const directions = [
    { key: 'all', label: 'All' },
    { key: 'inbound', label: 'Inbound' },
    { key: 'outbound', label: 'Outbound' },
  ]

  const defaultProps = {
    directions,
    activeDirection: 'all' as string,
    onDirectionChange: jest.fn(),
    activeServiceType: 'weekday' as ServiceType,
    onServiceTypeChange: jest.fn(),
  }

  afterEach(() => jest.clearAllMocks())

  it('renders service type buttons', () => {
    render(<TimetableFilterBar {...defaultProps} />)
    expect(screen.getByText('Weekday')).toBeOnTheScreen()
    expect(screen.getByText('Saturday')).toBeOnTheScreen()
    expect(screen.getByText('Sunday')).toBeOnTheScreen()
  })

  it('renders direction buttons when more than one direction', () => {
    render(<TimetableFilterBar {...defaultProps} />)
    expect(screen.getByText('All')).toBeOnTheScreen()
    expect(screen.getByText('Inbound')).toBeOnTheScreen()
    expect(screen.getByText('Outbound')).toBeOnTheScreen()
  })

  it('hides direction row when only one direction', () => {
    render(<TimetableFilterBar {...defaultProps} directions={[{ key: 'all', label: 'All' }]} />)
    expect(screen.queryByText('Inbound')).toBeNull()
    expect(screen.queryByText('Outbound')).toBeNull()
  })

  it('calls onServiceTypeChange when a service type button is pressed', () => {
    render(<TimetableFilterBar {...defaultProps} />)
    fireEvent.press(screen.getByText('Saturday'))
    expect(defaultProps.onServiceTypeChange).toHaveBeenCalledWith('saturday')
  })

  it('calls onDirectionChange when a direction button is pressed', () => {
    render(<TimetableFilterBar {...defaultProps} />)
    fireEvent.press(screen.getByText('Inbound'))
    expect(defaultProps.onDirectionChange).toHaveBeenCalledWith('inbound')
  })
})

describe('todayServiceType', () => {
  afterEach(() => jest.restoreAllMocks())

  it('returns weekday on a Monday', () => {
    jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1)
    expect(todayServiceType()).toBe('weekday')
  })

  it('returns saturday on Saturday', () => {
    jest.spyOn(Date.prototype, 'getDay').mockReturnValue(6)
    expect(todayServiceType()).toBe('saturday')
  })

  it('returns sunday on Sunday', () => {
    jest.spyOn(Date.prototype, 'getDay').mockReturnValue(0)
    expect(todayServiceType()).toBe('sunday')
  })
})
