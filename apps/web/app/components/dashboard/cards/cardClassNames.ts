/**
 * Shared Tailwind classNames for all dashboard favorite cards. Mirrors the
 * visual language of `LinkCard.tsx` so the new draggable cards drop into the
 * existing dashboard surface unchanged.
 */
export const cardRow =
  'group relative flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'

export const cardRowDragging = 'opacity-70 shadow-lg ring-2 ring-blue-400 cursor-grabbing'

// `touch-none` is mandatory: dnd-kit's TouchSensor with a 250ms `delay`
// activation constraint requires `touch-action: none` on the listener-bearing
// element so the browser does not preempt the gesture as a scroll. Without it,
// long-press-to-drag silently fails on mobile-web. Tradeoff: users cannot
// scroll the page while their finger is over a card; they scroll by touching
// outside the list (the page background, header, or hint footer).
export const cardLink = 'flex min-w-0 flex-1 items-center gap-3 outline-none touch-none'

export const cardTitle = 'truncate font-medium text-gray-900 dark:text-white'

export const cardSubtitle = 'truncate text-sm text-gray-500 dark:text-gray-400'

export const cardMeta = 'hidden text-sm text-gray-400 sm:inline dark:text-gray-500'

export const cardChip = 'shrink-0 rounded px-2 py-0.5 text-xs font-semibold'
