import { NitroModules } from 'react-native-nitro-modules'
import { Platform } from 'react-native'
import type { AppleHealthSync as NativeAppleHealthSync, NitroHealthWorkoutRecord } from './specs/AppleHealthSync.nitro'
import { AppleHealthSyncError, parseAppleHealthSyncError } from './errors'
import { healthSportName } from './sports'
import type {
  HealthChartPoint,
  HealthDataRecord,
  HealthHeartRateStats,
  HealthLapRecord,
  HealthRouteLocation,
  HealthWorkoutRecord,
  Unsubscribe,
} from './types'

export type TimeLike = Date | number

export interface AppleHealthSyncOptions {
  /** A native module to use instead of the Nitro one (tests). */
  native?: NativeAppleHealthSync
  /** The platform to assume (tests); defaults to `Platform.OS`. */
  platformOS?: string
}

export interface ReadWorkoutsOptions {
  /**
   * Keep only workouts written by an app whose bundle id starts with `com.apple.` (the Watch, the Workout app).
   * Default true, as in the plugin this module replaces; pass false to also read workouts other apps wrote.
   */
  onlyAppleSources?: boolean
}

const ms = (t: TimeLike): number => (t instanceof Date ? t.getTime() : t)

/** HealthKit reports "not available" as a negative number in these two fields. */
const available = (v: number | undefined): number | undefined => (v === undefined || v < 0 ? undefined : v)

/** Maps a native workout: the sport name comes from the id, so JS and Swift can never disagree. */
export function toWorkout(w: NitroHealthWorkoutRecord): HealthWorkoutRecord {
  const sportId = w.sportId
  const known = healthSportName(sportId)
  return {
    ...w,
    sport: known,
    sportId,
    embeddedSteps: available(w.embeddedSteps),
    elevationAscended: available(w.elevationAscended),
  }
}

/**
 * Apple HealthKit sync. Use ONE instance. iOS only: on any other platform every read throws
 * `AppleHealthSyncError('UNSUPPORTED_PLATFORM')` and `isAvailable()` is false.
 */
export class AppleHealthSync {
  private nativeModule?: NativeAppleHealthSync
  private readonly os: string
  private readonly observers = new Set<() => void>()

  constructor(options: AppleHealthSyncOptions = {}) {
    this.nativeModule = options.native
    this.os = options.platformOS ?? Platform.OS
  }

  private get native(): NativeAppleHealthSync {
    if (this.os !== 'ios') {
      throw new AppleHealthSyncError('UNSUPPORTED_PLATFORM', `Apple Health is only available on iOS (platform: ${this.os})`)
    }
    return (this.nativeModule ??= NitroModules.createHybridObject<NativeAppleHealthSync>('AppleHealthSync'))
  }

  private async guarded<T>(run: (native: NativeAppleHealthSync) => Promise<T>): Promise<T> {
    const native = this.native
    try {
      return await run(native)
    } catch (error) {
      throw parseAppleHealthSyncError(error)
    }
  }

  /** True on an iOS device where Health data can be read. Never throws. */
  isAvailable(): boolean {
    if (this.os !== 'ios') return false
    try {
      return this.native.isHealthDataAvailable()
    } catch {
      return false
    }
  }

  /** Asks for READ access to every type the module reads. Resolves with whether the request was processed. */
  requestPermissions(): Promise<boolean> {
    return this.guarded((n) => n.requestPermissions())
  }

  readData(type: string, from: TimeLike, to: TimeLike): Promise<HealthDataRecord[]> {
    return this.guarded((n) => n.readData(type, ms(from), ms(to)))
  }

  /**
   * Workouts of EVERY sport in the range, newest first. Each one carries its exact sport: `sport` (`'soccer'`) and
   * `sportId` (`HealthSport.SOCCER`). Map those to your own sport types in your app.
   */
  async readWorkouts(from: TimeLike, to: TimeLike, options: ReadWorkoutsOptions = {}): Promise<HealthWorkoutRecord[]> {
    const rows = await this.guarded((n) => n.readWorkouts(ms(from), ms(to), options.onlyAppleSources ?? true))
    return rows.map(toWorkout)
  }

  readRoute(workoutUUID: string): Promise<HealthRouteLocation[]> {
    return this.guarded((n) => n.readRoute(workoutUUID))
  }

  readStatistics(type: string, from: TimeLike, to: TimeLike): Promise<number> {
    return this.guarded((n) => n.readStatistics(type, ms(from), ms(to)))
  }

  /** Average and max heart rate of a specific workout (undefined values when unavailable). */
  readWorkoutHeartRateStats(workoutUUID: string): Promise<HealthHeartRateStats> {
    return this.guarded((n) => n.readWorkoutHeartRateStats(workoutUUID))
  }

  readLaps(workoutUUID: string): Promise<HealthLapRecord[]> {
    return this.guarded((n) => n.readLaps(workoutUUID))
  }

  /** Heart-rate series of a workout, ascending by time (bpm). Empty when there is no heart-rate data. */
  readHeartRateSamples(workoutUUID: string): Promise<HealthChartPoint[]> {
    return this.guarded((n) => n.readHeartRateSamples(workoutUUID))
  }

  /**
   * Cadence series of a workout in the unit of ITS sport: steps/min (running, walking, hiking), rpm (cycling,
   * iOS 17+), strokes/min (swimming); empty for a sport with no cadence. `_activityType` is accepted for
   * compatibility with the previous plugin and ignored: the sport is read from the workout itself.
   */
  readCadenceSamples(workoutUUID: string, _activityType?: string): Promise<HealthChartPoint[]> {
    return this.guarded((n) => n.readCadenceSamples(workoutUUID))
  }

  /**
   * Incremental distance samples (metres, with `endTimestamp`) from the distance type that fits the workout's sport.
   * `_activityType` is ignored (see `readCadenceSamples`).
   */
  readDistanceSamples(workoutUUID: string, _activityType?: string): Promise<HealthChartPoint[]> {
    return this.guarded((n) => n.readDistanceSamples(workoutUUID))
  }

  /** Per-km splits with the pause time excluded (value = moving seconds of the km). `_activityType` is ignored. */
  readKmSplits(workoutUUID: string, _activityType?: string): Promise<HealthChartPoint[]> {
    return this.guarded((n) => n.readKmSplits(workoutUUID))
  }

  /**
   * Calls `listener` every time HealthKit has a new workout (foreground and, with background delivery, background):
   * then call `readWorkouts` to get it. Returns the function that stops listening.
   */
  onNewDataAvailable(listener: () => void): Unsubscribe {
    const native = this.native
    this.observers.add(listener)
    if (this.observers.size === 1) {
      native.setObserverListener(() => {
        for (const l of [...this.observers]) l()
      })
    }
    return () => {
      if (!this.observers.delete(listener)) return
      if (this.observers.size === 0) native.setObserverListener(undefined)
    }
  }
}
