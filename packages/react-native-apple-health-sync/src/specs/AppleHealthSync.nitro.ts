import type { HybridObject } from 'react-native-nitro-modules'

/**
 * The native contract of react-native-apple-health-sync (a Nitro HybridObject, iOS only).
 *
 * This is the RAW bridge: the public API lives in `src/appleHealthSync.ts`. Times are epoch milliseconds, Nitro has
 * one number type (a double), so every integer travels as a `number`.
 */

/** One quantity sample (`readData`). */
export interface NitroHealthDataRecord {
  type?: string
  value?: number
  unit?: string
  startTime?: number
  endTime?: number
}

/** One workout, whatever its sport. */
export interface NitroHealthWorkoutRecord {
  uuid?: string
  /**
   * LEGACY coarse type, kept for apps written against the previous plugin: `running`, `running_indoor`, `walking`,
   * `cycling`, `cycling_indoor`, `swimming_pool`, `swimming_open_water`, and `activity` for EVERY other sport.
   * Use `sport` / `sportId` instead.
   */
  activityType?: string
  /** The exact sport, lower camel case (`soccer`, `americanFootball`...); `unknown` when newer than the catalog. */
  sport: string
  /** The exact sport as the Apple raw value of `HKWorkoutActivityType` (`soccer` = 41). Always the real number. */
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
  /** Steps counted inside the workout (iOS 16+); negative = not available. */
  embeddedSteps?: number
  /** Metres; negative = not available. */
  elevationAscended?: number
  isManual?: boolean
  deviceName?: string
}

/** Heart-rate statistics of ONE workout. Both undefined when HealthKit has no heart rate for it. */
export interface NitroHealthHeartRateStats {
  averageBpm?: number
  maxBpm?: number
}

export interface NitroHealthRouteLocation {
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

export interface NitroHealthLapRecord {
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

/** A point of a time series (heart rate, cadence, distance, km splits). */
export interface NitroHealthChartPoint {
  /** Epoch ms. */
  timestamp?: number
  value?: number
  /** End of the sample interval, epoch ms; only for interval samples (distance). */
  endTimestamp?: number
}

export interface AppleHealthSync
  extends HybridObject<{ ios: 'swift' }> {
  /** `HKHealthStore.isHealthDataAvailable()`. False on an iPad without Health and on the simulator without it. */
  isHealthDataAvailable(): boolean

  /** Asks for READ access to every type the module reads. Resolves with whether the request was processed. */
  requestPermissions(): Promise<boolean>

  readData(type: string, startTime: number, endTime: number): Promise<NitroHealthDataRecord[]>

  /**
   * Workouts of EVERY sport in the range, newest first. `onlyAppleSources` keeps only workouts recorded by an app
   * whose bundle id starts with `com.apple.` (the Watch, the Workout app), which is what a "real" recording means
   * for anti-cheat; pass false to also read workouts written by other apps.
   */
  readWorkouts(
    startTime: number,
    endTime: number,
    onlyAppleSources: boolean
  ): Promise<NitroHealthWorkoutRecord[]>

  readRoute(workoutUUID: string): Promise<NitroHealthRouteLocation[]>
  readStatistics(type: string, startTime: number, endTime: number): Promise<number>
  readLaps(workoutUUID: string): Promise<NitroHealthLapRecord[]>
  readWorkoutHeartRateStats(workoutUUID: string): Promise<NitroHealthHeartRateStats>
  readHeartRateSamples(workoutUUID: string): Promise<NitroHealthChartPoint[]>
  /** Cadence of the workout in the unit that fits ITS sport (steps/min, rpm, strokes/min); empty when it has none. */
  readCadenceSamples(workoutUUID: string): Promise<NitroHealthChartPoint[]>
  /** Incremental distance samples (metres) from the distance type that fits the workout's sport. */
  readDistanceSamples(workoutUUID: string): Promise<NitroHealthChartPoint[]>
  /** Per-km splits with the pause time excluded (value = moving seconds of the km). */
  readKmSplits(workoutUUID: string): Promise<NitroHealthChartPoint[]>

  /**
   * Calls the listener every time HealthKit has a new workout (foreground and, with background delivery enabled,
   * background). Pass undefined to stop observing.
   */
  setObserverListener(listener: (() => void) | undefined): void
}
