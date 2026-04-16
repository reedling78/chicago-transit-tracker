import { render, screen } from '@testing-library/react-native'
import type { StationSchedule } from '@ctt/shared'
import { ScheduleTable } from '../../components/ScheduleTable'
import { mockSchedule } from '../fixtures'

describe('ScheduleTable', () => {
  it('renders each direction headsign', () => {
    render(<ScheduleTable schedule={mockSchedule} />)
    expect(screen.getByText('To Howard')).toBeOnTheScreen()
    expect(screen.getByText('To 95th/Dan Ryan')).toBeOnTheScreen()
  })

  it('renders weekday, saturday, and sunday service labels when times exist', () => {
    render(<ScheduleTable schedule={mockSchedule} />)
    expect(screen.getAllByText('Weekday').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Saturday').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sunday').length).toBeGreaterThan(0)
  })

  it('omits a service block when the times array is empty', () => {
    const schedule: StationSchedule = {
      directions: [{ headsign: 'Loop', line: 'Red', weekday: [480], saturday: [], sunday: [] }],
    }
    render(<ScheduleTable schedule={schedule} />)
    expect(screen.getByText('Weekday')).toBeOnTheScreen()
    expect(screen.queryByText('Saturday')).toBeNull()
    expect(screen.queryByText('Sunday')).toBeNull()
  })

  it('formats times in 12-hour clock with AM/PM and handles midnight + noon', () => {
    const schedule: StationSchedule = {
      directions: [
        {
          headsign: 'Test',
          line: 'Red',
          weekday: [0, 392, 720, 1425],
          saturday: [],
          sunday: [],
        },
      ],
    }
    render(<ScheduleTable schedule={schedule} />)
    expect(screen.getByText('12:00 AM')).toBeOnTheScreen()
    expect(screen.getByText('6:32 AM')).toBeOnTheScreen()
    expect(screen.getByText('12:00 PM')).toBeOnTheScreen()
    expect(screen.getByText('11:45 PM')).toBeOnTheScreen()
  })

  it('truncates the list at 12 times and shows a "+N more" label', () => {
    const times = Array.from({ length: 15 }, (_, i) => 480 + i * 5)
    const schedule: StationSchedule = {
      directions: [{ headsign: 'Test', line: 'Red', weekday: times, saturday: [], sunday: [] }],
    }
    render(<ScheduleTable schedule={schedule} />)
    expect(screen.getByText('+3 more')).toBeOnTheScreen()
  })

  it('renders an empty message when the schedule has no directions', () => {
    render(<ScheduleTable schedule={{ directions: [] }} />)
    expect(screen.getByText('No schedule data available')).toBeOnTheScreen()
  })

  it('matches snapshot', () => {
    const tree = render(<ScheduleTable schedule={mockSchedule} />).toJSON()
    expect(tree).toMatchSnapshot()
  })
})
