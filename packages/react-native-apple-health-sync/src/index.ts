/**
 * Apple HealthKit sync for React Native (a Nitro module, iOS only).
 *
 * Reads workouts of EVERY sport (`HealthSport`), their routes, laps and heart-rate / cadence / distance series, and
 * observes new workouts. Each workout names its exact sport and carries a stable id, so the app maps
 * `'soccer'` / `HealthSport.SOCCER` to its own sport type instead of receiving a generic "workout".
 */
export { AppleHealthSync, toWorkout, type AppleHealthSyncOptions, type ReadWorkoutsOptions, type TimeLike } from './appleHealthSync'
export { AppleHealthSyncError, parseAppleHealthSyncError } from './errors'
export {
  HEALTH_SPORTS,
  HealthSport,
  healthSportId,
  healthSportName,
  isKnownHealthSportId,
  type HealthSportId,
  type HealthSportKey,
  type HealthSportName,
  type HealthSportRow,
} from './sports'
export type {
  HealthChartPoint,
  HealthDataRecord,
  HealthHeartRateStats,
  HealthLapRecord,
  HealthRouteLocation,
  HealthWorkoutRecord,
  Unsubscribe,
} from './types'
