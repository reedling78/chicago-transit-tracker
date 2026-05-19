/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { TripStop } from '@ctt/shared'
import TrainStopPickerModal from '@components/dashboard/TrainStopPickerModal'

const stops: TripStop[] = [
  {
    sequence: 1,
    stationName: 'Big Timber',
    slug: 'big-timber',
    arrival: '6:00 AM',
    departure: '6:00 AM',
  },
  {
    sequence: 5,
    stationName: 'Schaumburg',
    slug: 'schaumburg',
    arrival: '6:25 AM',
    departure: '6:25 AM',
  },
  {
    sequence: 10,
    stationName: 'Chicago Union Station',
    slug: 'union-station-metra',
    arrival: '7:05 AM',
    departure: '7:05 AM',
  },
]

describe('TrainStopPickerModal', () => {
  it('renders eligible origin stops in a scrollable list', () => {
    const { container } = render(
      <TrainStopPickerModal
        mode="origin"
        stops={stops}
        originSequence={1}
        destinationSequence={10}
        currentSlug="big-timber"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('Big Timber')).toBeInTheDocument()
    expect(screen.getByText('Schaumburg')).toBeInTheDocument()
    // The list container must be able to scroll and shrink within the flex column.
    const list = container.querySelector('ul')!
    expect(list.className).toContain('overflow-y-auto')
    expect(list.className).toContain('min-h-0')
  })

  it('invokes onSelect with the chosen stop slug', () => {
    const onSelect = jest.fn()
    render(
      <TrainStopPickerModal
        mode="origin"
        stops={stops}
        originSequence={1}
        destinationSequence={10}
        currentSlug="big-timber"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    )
    fireEvent.click(screen.getByText('Schaumburg'))
    expect(onSelect).toHaveBeenCalledWith('schaumburg')
  })
})
