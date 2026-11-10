import type { HealthSportName } from './sports'

/** One quantity sample. Times are epoch milliseconds. */
export interface HealthDataRecord {
  type?: string
  value?: number
  unit?: string
  startTime?: number
  endTime?: number
}

/** One workout, whatever its sport. Times are epoch milliseconds. */
export interface HealthWorkoutRecord {
  uuid?: string
  /**
   * LEGACY coarse type: `running`, `running_indoor`, `walking`, `cycling`, `cycling_indoor`, `swimming_pool`,
   * `swimming_open_water`, and `activity` for EVERY other sport. Prefer `sport` / `sportId`.
   */
  activityType?: string
  /** The exact sport, lower camel case: `'soccer'`, `'americanFootball'`... (`'unknown'` when newer than the table). */
  sport: HealthSportName
  /** The exact sport as the Apple raw value (`HealthSport.SOCCER` = 41). Always the real number. */
  sportId: number
  startTime?: number
  endTime?: number
  /** Seconds. */
  duration?: number
  /** Metres. */
  totalDistance?: number
  /** Active energy, kcal. */
  totalEnergyBurned?: number
  sourceName?: string
  sourceId?: string
  isIndoor?: boolean
  /** Steps counted inside the workout (iOS 16+); undefined when not available. */
  embeddedSteps?: number
  /** Metres climbed; undefined when not available. */
  elevationAscended?: number
  isManual?: boolean
  deviceName?: string
}

/** Heart-rate statistics of ONE workout. Both undefined when HealthKit has no heart rate for it. */
export interface HealthHeartRateStats {
  averageBpm?: number
  maxBpm?: number
}

export interface HealthRouteLocation {
  latitude?: number
  longitude?: number
  altitude?: number
  speed?: number
  course?: number
  horizontalAccuracy?: number
  verticalAccuracy?: number
  timestamp?: number
  ellipsoidalAltitude?: number
}

export interface HealthLapRecord {
  startTime?: number
  endTime?: number
  duration?: number
  distance?: number
  bpm?: number
  spm?: number
  maxBpm?: number
  totalSteps?: number
  totalCalories?: number
}

/** A point of a time series. */
export interface HealthChartPoint {
  /** Epoch ms. */
  timestamp?: number
  /** Heart rate: bpm. Cadence: steps/min, rpm or strokes/min. Distance: metres. Km split: moving seconds. */
  value?: number
  /** End of the sample interval, epoch ms; only for interval samples (distance). */
  endTimestamp?: number
}

export type Unsubscribe = () => void
