/**
 * Pure helpers for the MetraCurrentService component.
 *
 * The implementation now lives in `@ctt/shared` so web and mobile share one
 * copy. This module re-exports it to preserve the existing `@lib/...` import
 * paths used by the web component and its tests.
 */

export type {
  ServiceType,
  MetraLineTrip,
  CurrentServiceTrain,
  TripWithDepartureMinutes,
} from '@ctt/shared'
export {
  MAX_TRAINS_SHOWN,
  UPCOMING_WINDOW_MINUTES,
  currentServiceType,
  formatEta,
  extractMatchedRealtime,
  buildTrainRow,
  annotate,
  selectTrainsForDisplay,
} from '@ctt/shared'
