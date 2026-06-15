import { render, screen, fireEvent } from '@testing-library/react-native'
import LineTabs from '../../components/LineTabs'

describe('LineTabs', () => {
  const tabs = [
    { key: 'live', label: 'Live' },
    { key: 'stations', label: 'Stations' },
  ]

  afterEach(() => jest.clearAllMocks())

  it('renders all tab labels', () => {
    render(<LineTabs tabs={tabs} activeKey="live" onChange={jest.fn()} />)
    expect(screen.getByText('Live')).toBeOnTheScreen()
    expect(screen.getByText('Stations')).toBeOnTheScreen()
  })

  it('marks the active tab as selected and others as unselected', () => {
    render(<LineTabs tabs={tabs} activeKey="live" onChange={jest.fn()} />)
    const [liveTab, stationsTab] = screen.getAllByRole('tab')
    expect(liveTab.props.accessibilityState.selected).toBe(true)
    expect(stationsTab.props.accessibilityState.selected).toBe(false)
  })

  it('calls onChange with the tab key when an inactive tab is pressed', () => {
    const onChange = jest.fn()
    render(<LineTabs tabs={tabs} activeKey="live" onChange={onChange} />)
    fireEvent.press(screen.getByText('Stations'))
    expect(onChange).toHaveBeenCalledWith('stations')
  })
})
