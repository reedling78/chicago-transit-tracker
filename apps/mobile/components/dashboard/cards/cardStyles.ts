import { StyleSheet } from 'react-native'

/**
 * Shared row styling for all dashboard favorite cards. Keeping this in one
 * file prevents drift across StationCard / TrainCard / LineCard.
 */
export const cardStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  rowDragging: {
    opacity: 0.7,
    transform: [{ scale: 1.02 }],
  },
  content: {
    flex: 1,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  subtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  meta: { color: '#9ca3af', fontSize: 12 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
})
