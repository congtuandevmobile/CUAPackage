/** What the engine is recording; only used to pick the speed ceiling. */
export type TrackingSport = 'running' | 'walking' | 'cycling' | 'other'

/** Whether positions are smoothed before distance is measured. */
export type PositionSmoothing =
  /** Raw positions (default). */
  | 'off'
  /** A Kalman filter: smoother track, but sharp turns and loops are cut short. Not validated on devices. */
  | 'kalman'

/** How steps estimated while GPS is silent (PDR) may become distance. */
export type PdrPolicy =
  /** Estimates submitted with `submitPdr` are ignored. */
  | 'off'
  /**
   * An estimate is held as PENDING and only counts when the GPS that returns corroborates it
   * (see `TrackingConfig.pdrConfirmRatio`). Without GPS, or when the returning GPS shows the phone did not
   * travel, it counts as 0 m. This is what stops a phone shaken in the hand from becoming distance.
   */
  | 'confirmedByGps'
  /**
   * Like `confirmedByGps`, but once the stride has been calibrated on good GPS the estimate for a gap is credited
   * as ESTIMATED distance even when the gap is long or the route curves, bounded by the speed ceiling. Opt-in.
   */
  | 'trustedWhenCalibrated'

/**
 * Every number here is a STARTING VALUE chosen by reasoning, not measured on devices. Tune from real recordings,
 * never by feel. Durations are milliseconds.
 */
export interface TrackingConfig {
  /** A fix with a worse horizontal accuracy (or an unknown one) is DEGRADED: it tells the quality, never distance. */
  readonly maxAccuracyMeters: number
  /** A fix measured longer ago than this when it arrives is dropped. */
  readonly maxFixAgeMs: number
  /** No fix for this long = GPS unavailable. */
  readonly silenceAfterMs: number
  /** Implied speed above this between two good fixes is a jump: rejected. */
  readonly maxSpeedMps: number
  /**
   * Displacement below `max(minStepMeters, accuracyNoiseFactor * accuracy)` is noise: not counted and the anchor
   * does not move, so drift cannot accumulate step by step.
   */
  readonly minStepMeters: number
  readonly accuracyNoiseFactor: number
  /** A Doppler speed below this means "not moving": no distance, whatever the positions say. */
  readonly stationarySpeedMps: number
  /** Longest GPS gap that may be bridged with the straight line between its ends. A longer one starts over. */
  readonly maxBridgeMs: number
  /** After this many consecutive jump rejections the engine re-anchors on the latest good fix (no distance). */
  readonly reanchorAfterRejects: number
  readonly rejectMock: boolean
  readonly pdrPolicy: PdrPolicy
  /** A pending PDR estimate P is confirmed when the straight-line distance across the gap is at least ratio * P. */
  readonly pdrConfirmRatio: number
  readonly smoothing: PositionSmoothing
  /** The phone counts as stopped (moving time pauses) once it stayed within this radius of one point... */
  readonly stopRadiusMeters: number
  /** ...for this long. */
  readonly stopMinDwellMs: number
  /** Native request: update interval. */
  readonly updateIntervalMs: number
  /** Native request: minimum displacement between updates (0 = none). */
  readonly minDistanceMeters: number
  /** Metres per step to start from. undefined = none: steps are not turned into a distance until GPS taught one. */
  readonly initialStrideMeters?: number
  /**
   * With a working step sensor and a pedestrian policy, a GPS gap at least this long in which the sensor measured
   * NO steps is credited 0 m. Shorter gaps are not judged. 0 disables the rule.
   */
  readonly recoveryStepEvidenceAfterMs: number
  /**
   * After a process death the calendar time that passed is credited to the session's clock. A dead interval LONGER
   * than this is not credited: the session is parked paused instead. undefined = no limit.
   */
  readonly maxRecoverGapMs?: number
}

export const defaultTrackingConfig: TrackingConfig = Object.freeze({
  maxAccuracyMeters: 40,
  maxFixAgeMs: 30_000,
  silenceAfterMs: 10_000,
  maxSpeedMps: 10,
  minStepMeters: 2,
  accuracyNoiseFactor: 0.5,
  stationarySpeedMps: 0.4,
  maxBridgeMs: 120_000,
  reanchorAfterRejects: 3,
  rejectMock: true,
  pdrPolicy: 'confirmedByGps',
  pdrConfirmRatio: 0.5,
  smoothing: 'off',
  stopRadiusMeters: 15,
  stopMinDwellMs: 30_000,
  updateIntervalMs: 1000,
  minDistanceMeters: 0,
  recoveryStepEvidenceAfterMs: 30_000,
})

/** The default config with [overrides] applied. */
export function createTrackingConfig(overrides: Partial<TrackingConfig> = {}): TrackingConfig {
  return Object.freeze({ ...defaultTrackingConfig, ...overrides })
}

/** Speed ceiling per sport (m/s): running/walking 10, cycling 25, other 12 (starting values, not measured). */
export function trackingConfigForSport(
  sport: TrackingSport,
  overrides: Partial<TrackingConfig> = {}
): TrackingConfig {
  const maxSpeedMps = sport === 'cycling' ? 25 : sport === 'other' ? 12 : 10
  const pdrPolicy: PdrPolicy = sport === 'cycling' ? 'off' : 'confirmedByGps'
  return createTrackingConfig({ maxSpeedMps, pdrPolicy, ...overrides })
}
