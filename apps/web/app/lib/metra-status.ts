export type {
  TripStop,
  TripUpdate,
  VehiclePosition,
  FeedMessage,
  FeedData,
  RealtimeState,
  StopStatus,
  DerivedStop,
  TripPhase,
  StatusTone,
  HeroStatus,
} from '@ctt/shared'
export {
  TONE_CLASSES,
  longToNumber,
  parseDisplayTimeToMinutes,
  minutesSinceMidnight,
  computeScheduledEpoch,
  formatClockTime,
  isTripScheduledEndPast,
  deriveStopState,
  computeHeroStatus,
} from '@ctt/shared'
