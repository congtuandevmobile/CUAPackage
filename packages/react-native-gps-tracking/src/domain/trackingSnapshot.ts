import type {
  CadenceSource,
  CollectionState,
  GpsQuality,
  PedalCadenceStatus,
  RecordingState,
  RestoreState,
  StepsStatus,
  TrackingFailureState,
} from './trackingState'

/** What the app shows. Immutable. Durations are milliseconds; `undefined` means unknown. */
export interface TrackingSnapshot {
  readonly sessionId?: string
  readonly state: RecordingState
  readonly quality: GpsQuality

  /** Accepted distance. Never decreases while recording. */
  readonly totalMeters: number
  readonly gpsMeters: number
  readonly gapBridgeMeters: number
  readonly pdrMeters: number
  /** Step estimates waiting for GPS to confirm them: NOT part of `totalMeters`. */
  readonly pendingPdrMeters: number
  readonly segmentId: number
  readonly fixCount: number

  /** Doppler speed of the latest accepted fix, when known. */
  readonly speedMps?: number
  readonly lastFixAt?: Date

  /** Time spent moving (not standing at one place for 30 s or more), computed by the native engine. */
  readonly movingTimeMs: number
  /** The phone has stayed in one place long enough to count as stopped. */
  readonly isStopped: boolean

  /** Accepted steps of the session (native step sensor). */
  readonly steps: number
  /** Learned (or configured) metres per step; undefined while unknown. */
  readonly strideMeters?: number

  /**
   * Pedalling cadence in rpm from the best available source (`cadenceSource`); undefined = unknown. A healthy
   * external sensor that the host feeds wins (0 means the cranks are still); otherwise the phone accelerometer
   * estimate, which only means something with the phone on the leg. Live only: not journaled, no effect on distance.
   */
  readonly pedalCadenceRpm?: number
  readonly cadenceStatus: PedalCadenceStatus
  readonly cadenceSource: CadenceSource

  /** State of the native step sensor (off unless `stepsEnabled` was asked for). */
  readonly stepsStatus: StepsStatus

  /** Check this before treating a running recording as operational. */
  readonly failureState: TrackingFailureState
  readonly error?: string

  /** True when the step total is final: after `finish` the platform's exact count was obtained. */
  readonly stepsFinal: boolean

  /** Events the engine accepted that are NOT on disk yet. A crash while this is above zero can lose them. */
  readonly journalPending: number
  /** A journal write or sync FAILED (sticky for the session): those events are not on disk and never will be. */
  readonly journalFailed: boolean

  /** What the last restore found. `partial` means ONLY the part before a damaged record was restored. */
  readonly restoreState: RestoreState

  /** Start to finish, PAUSES INCLUDED (`activeTimeMs` is the workout clock without the pauses). */
  readonly elapsedTimeMs: number
  /** Calendar time credited after the process died and came back (summed). No distance was invented for it. */
  readonly recoveredGapMs: number
  /** The calendar clock went backwards across a recovery: that gap could not be measured and counted as zero. */
  readonly clockAnomaly: boolean
  /** Whether location is actually being collected now. */
  readonly collection: CollectionState
  /** The journal was recorded with other engine rules than this code's: restored numbers may differ from live. */
  readonly engineChanged: boolean

  /** Steps that taught the stride or became a pending estimate (the part ELIGIBLE to be used for distance). */
  readonly distanceEligibleSteps: number
  /** Workout time: the running legs only, pauses excluded. The headline timer. */
  readonly activeTimeMs: number
  /** Time of GPS gaps that were credited (a bridge or an estimate). */
  readonly bridgedGapMs: number
  /**
   * TIME (not a distance) of GPS gaps and unmeasured intervals that were NOT credited. It is part of
   * `activeTimeMs`. The distance in it is unknown, not zero and not "lost".
   */
  readonly uncreditedGapMs: number
  readonly uncreditedGaps: number
  /** Steps measured in a batch that straddles a GPS-quality change: used for nothing. */
  readonly ambiguousSteps: number
}

export const idleSnapshot: TrackingSnapshot = Object.freeze({
  state: 'idle',
  quality: 'unknown',
  totalMeters: 0,
  gpsMeters: 0,
  gapBridgeMeters: 0,
  pdrMeters: 0,
  pendingPdrMeters: 0,
  segmentId: 0,
  fixCount: 0,
  movingTimeMs: 0,
  isStopped: false,
  steps: 0,
  cadenceStatus: 'off',
  cadenceSource: 'none',
  stepsStatus: 'off',
  failureState: 'none',
  stepsFinal: false,
  journalPending: 0,
  journalFailed: false,
  restoreState: 'notRestored',
  elapsedTimeMs: 0,
  recoveredGapMs: 0,
  clockAnomaly: false,
  collection: 'notCollecting',
  engineChanged: false,
  distanceEligibleSteps: 0,
  activeTimeMs: 0,
  bridgedGapMs: 0,
  uncreditedGapMs: 0,
  uncreditedGaps: 0,
  ambiguousSteps: 0,
})

/** The native layer reported a failure (permission or error). */
export function hasNativeFailure(s: TrackingSnapshot): boolean {
  return s.failureState !== 'none'
}

/** Everything this snapshot shows has reached the disk: nothing pending AND no write ever failed. */
export function isDurable(s: TrackingSnapshot): boolean {
  return s.journalPending === 0 && !s.journalFailed
}

/** Whole-snapshot equality: a field added later can never be forgotten here. */
export function snapshotsEqual(a: TrackingSnapshot, b: TrackingSnapshot): boolean {
  const ra = a as unknown as Record<string, unknown>
  const rb = b as unknown as Record<string, unknown>
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)])
  for (const key of keys) {
    const x = ra[key]
    const y = rb[key]
    if (x instanceof Date || y instanceof Date) {
      if (!(x instanceof Date && y instanceof Date && x.getTime() === y.getTime())) return false
    } else if (x !== y) {
      return false
    }
  }
  return true
}
