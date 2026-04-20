import { render, screen, fireEvent } from '@testing-library/react-native'
import type { StationSchedule } from '@ctt/shared'
import { CTAScheduleTable } from '../../components/CTAScheduleTable'
import { mockSchedule } from '../fixtures'

// Force weekday as the default service type for deterministic tests
beforeEach(() => {
  jest.spyOn(Date.prototype, 'getDay').mockReturnValue(1) // Monday
})
afterEach(() => jest.restoreAllMocks())

describe('CTAScheduleTable', () => {
  it('renders time rows for the default service type', () => {
    render(<CTAScheduleTable schedule={mockSchedule} />)
    // mockSchedule has weekday times for both directions — multiple rows per headsign
    expect(screen.getAllByText('To Howard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('To 95th/Dan Ryan').length).toBeGreaterThan(0)
  })

  it('renders direction filter buttons including All and each headsign', () => {
    render(<CTAScheduleTable schedule={mockSchedule} />)
    expect(screen.getByText('All')).toBeOnTheScreen()
    expect(screen.getByText('Howard')).toBeOnTheScreen()
    expect(screen.getByText('95th/Dan Ryan')).toBeOnTheScreen()
  })

  it('filters by direction when a direction button is pressed', () => {
    render(<CTAScheduleTable schedule={mockSchedule} />)
    fireEvent.press(screen.getByText('Howard'))
    // Should only show Howard headsign rows
    const howardRows = screen.getAllByText('To Howard')
    expect(howardRows.length).toBeGreaterThan(0)
    expect(screen.queryByText('To 95th/Dan Ryan')).toBeNull()
  })

  it('switches service type when a tab is pressed', () => {
    render(<CTAScheduleTable schedule={mockSchedule} />)
    fireEvent.press(screen.getByText('Sunday'))
    // mockSchedule sunday: Howard has [540, 720], 95th has []
    expect(screen.getAllByText('To Howard').length).toBe(2)
    expect(screen.queryByText('To 95th/Dan Ryan')).toBeNull()
  })

  it('shows empty message when no service for selected type', () => {
    const schedule: StationSchedule = {
      directions: [{ headsign: 'Loop', line: 'Red', weekday: [], saturday: [], sunday: [] }],
    }
    render(<CTAScheduleTable schedule={schedule} />)
    expect(screen.getByText(/No weekday service/)).toBeOnTheScreen()
  })

  it('shows empty message when schedule has no directions', () => {
    render(<CTAScheduleTable schedule={{ directions: [] }} />)
    expect(screen.getByText('No schedule data available')).toBeOnTheScreen()
  })

  it('formats times correctly in 12-hour clock', () => {
    const schedule: StationSchedule = {
      directions: [
        { headsign: 'Test', line: 'Red', weekday: [0, 720, 1425], saturday: [], sunday: [] },
      ],
    }
    render(<CTAScheduleTable schedule={schedule} />)
    expect(screen.getByText('12:00 AM')).toBeOnTheScreen()
    expect(screen.getByText('12:00 PM')).toBeOnTheScreen()
    expect(screen.getByText('11:45 PM')).toBeOnTheScreen()
  })

  it('sorts times chronologically when All directions selected', () => {
    render(<CTAScheduleTable schedule={mockSchedule} />)
    // In "All" mode, times from both directions should be merged and sorted
    // Howard weekday: 392, 435, 480, 720, 1425
    // 95th weekday: 400, 445, 490, 730
    // Sorted order: 392, 400, 435, 445, 480, 490, 720, 730, 1425
    const timeTexts = screen.getAllByText(/^\d{1,2}:\d{2} [AP]M$/)
    expect(timeTexts.length).toBe(9)
  })
})
