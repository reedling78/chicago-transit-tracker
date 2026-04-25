import { Steps } from '@components/Steps'
import type { Station } from '@lib/types'
import { LINE_COLORS } from '@lib/constants'

interface StationListProps {
  stations: Station[]
  lineColor: string
  stationHrefPrefix: string
  /** Short name of the current line — excluded from transfer chips */
  currentLine: string
}

function WheelchairIcon() {
  return (
    <svg
      aria-label="ADA Accessible"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline-block h-3.5 w-3.5 shrink-0 text-blue-500"
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M10 7.5a2 2 0 0 0-2 2V14l-2.5 4.5A1 1 0 0 0 6.4 20h.2a1 1 0 0 0 .88-.52L10 15h2v4a1 1 0 0 0 2 0v-4.5A1.5 1.5 0 0 0 12.5 13H11V9.5H14a1 1 0 0 0 0-2h-4z" />
    </svg>
  )
}

function TransferChips({ lines }: { lines: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {lines.map((line) => {
        const colors = LINE_COLORS[line]
        return colors ? (
          <span
            key={line}
            className="rounded px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {line}
          </span>
        ) : (
          <span
            key={line}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {line}
          </span>
        )
      })}
    </div>
  )
}

function Arrow() {
  return (
    <span className="mt-0.5 text-gray-300 transition group-hover:text-gray-500 dark:text-gray-600 dark:group-hover:text-gray-400">
      →
    </span>
  )
}

export default function StationList({
  stations,
  lineColor,
  stationHrefPrefix,
  currentLine,
}: StationListProps) {
  return (
    <div>
      <Steps color={lineColor}>
        {stations.map((station) => {
          const otherLines = station.lines.filter((l) => l !== currentLine)
          return (
            <Steps.Item
              key={station.slug}
              bullet={station.terminal ? 'filled' : 'open'}
              href={`${stationHrefPrefix}/${station.slug}`}
              trailing={<Arrow />}
              below={otherLines.length > 0 ? <TransferChips lines={otherLines} /> : undefined}
            >
              <p className="flex items-center gap-1.5 font-semibold text-gray-900 group-hover:underline dark:text-white">
                {station.name}
                {station.accessibility.ada && <WheelchairIcon />}
              </p>
            </Steps.Item>
          )
        })}
      </Steps>
    </div>
  )
}
