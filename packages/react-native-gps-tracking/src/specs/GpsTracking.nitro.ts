import type { HybridObject } from 'react-native-nitro-modules'

/**
 * The native contract of react-native-gps-tracking (a Nitro HybridObject).
 *
 * This is the RAW bridge: the public API lives in `src/api` and `src/domain`.
 * Contract:
 * the native side owns the session, the journal and the distance engine
 * (the shared Kotlin core `tracking-core`); JS sends commands and shows snapshots.
 *
 * Nitro has one number type (a double), so every integer travels as a `number`
 * (ms, counters, ids). All of them stay far below 2^53.
 */

export type NitroPermission =
  | 'granted'
  | 'denied'
  /** iOS only: restricted by parental controls / MDM. */
  | 'restricted'
  /** The user was not asked yet. */
  | 'notDetermined'
  /** Location services are switched off on the device. */
  | 'servicesDisabled'

export type NitroTrackingState =
  | 'idle'
  | 'running'
  | 'paused'
  /** `stop` was asked and is being finalized. Not final yet: wait for `stopped`. */
  | 'finishing'
  | 'stopped'
  /** Location permission is missing, so no fix can arrive. */
  | 'permissionDenied'
  /** The native layer failed to start (see `NitroSnapshot.error`). */
  | 'error'

/** Whether the native step sensor is feeding the engine. */
export type NitroStepsStatus =
  | 'off'
  | 'active'
  | 'permissionDenied'
  | 'unavailable'
  | 'failed'

/** Whether the native accelerometer is feeding the pedal-cadence estimator. */
export type NitroMotionStatus = 'off' | 'active' | 'unavailable' | 'failed'

/** Where `NitroSnapshot.pedalCadenceRpm` came from. */
export type NitroCadenceSource = 'none' | 'phone' | 'externalSensor'

/** What a restore found in the session's journal. */
export type NitroRestoreState =
  | 'notRestored'
  | 'complete'
  | 'tailRepaired'
  | 'partial'

export type NitroGpsQuality =
  | 'unknown'
  | 'good'
  | 'degraded'
  | 'unavailable'
  | 'recovering'

export type NitroCollection = 'collecting' | 'notCollecting' | 'blocked'

/**
 * One raw location reading, exactly as the platform produced it. No filter,
 * no smoothing, no odometer: the core decides what counts as distance.
 */
export interface NitroFix {
  sessionId: string
  /** 0 for the first segment, +1 on every resume. */
  segmentId: number
  /** Increases by one per fix within a session. */
  seq: number
  /** Time the position was measured, epoch ms. */
  timeMs: number
  /** Monotonic clock (ms since boot) at the measurement. */
  elapsedMs: number
  latitude: number
  longitude: number
  /** 1-sigma horizontal accuracy in metres; negative = unknown. */
  horizontalAccuracy: number
  /** Doppler speed in m/s; negative = unknown. */
  speed: number
  /** Negative = unknown. */
  speedAccuracy: number
  /** Degrees from true north; negative = unknown. */
  course: number
  /** Metres; undefined when the platform did not provide altitude. */
  altitude?: number
  verticalAccuracy: number
  /** `gps`, `fused`, `network`, `passive`, `unknown`. */
  provider: string
  /** The platform flags the fix as simulated by software. */
  isMock: boolean
}

/** How the native engine decides what counts as distance. Every number is an unmeasured starting value. */
export interface NitroEngineConfig {
  maxAccuracyMeters: number
  maxFixAgeMs: number
  silenceAfterMs: number
  maxSpeedMps: number
  minStepMeters: number
  accuracyNoiseFactor: number
  stationarySpeedMps: number
  maxBridgeMs: number
  reanchorAfterRejects: number
  rejectMock: boolean
  pdrEnabled: boolean
  pdrConfirmRatio: number
  kalman: boolean
  stopRadiusMeters: number
  stopMinDwellMs: number
  /** Metres per step to start from; zero or negative = none. */
  initialStrideMeters: number
  pdrTrustedWhenCalibrated: boolean
  /** Zero or negative disables the rule. */
  recoveryStepEvidenceAfterMs: number
}

export interface NitroStartConfig {
  /** Estimate the pedalling cadence from the phone accelerometer. Live only. */
  pedalCadence: boolean
  /** Restore only: continue a session that was RECORDING when its process died. */
  recoverRunning: boolean
  /** Restore with `recoverRunning`: a longer dead interval is not credited. 0 = no limit. */
  maxRecoverGapMs: number
  stepsEnabled: boolean
  initialSteps: number
  engine: NitroEngineConfig
  adaptiveSampling: boolean
  batterySaver: boolean
  sessionId: string
  /** First fix seq / segment id: 0 for a new session. */
  startSeq: number
  startSegmentId: number
  intervalMs: number
  /** Minimum displacement between updates; 0 = none. */
  minDistanceMeters: number
  /** Android foreground-service notification (ignored on iOS). */
  notificationTitle: string
  notificationText: string
}

/** What the native distance engine has decided so far. */
export interface NitroDistance {
  quality: NitroGpsQuality
  totalMeters: number
  gpsMeters: number
  gapBridgeMeters: number
  pdrMeters: number
  pendingPdrMeters: number
  movingTimeMs: number
  isStopped: boolean
  speedMps: number
  /** Epoch ms of the latest accepted fix; negative = none yet. */
  lastAcceptedFixAtMs: number
  steps: number
  /** Negative = unknown. */
  strideMeters: number
  activeTimeMs: number
  bridgedGapMs: number
  uncreditedGapMs: number
  uncreditedGaps: number
  ambiguousSteps: number
  distanceEligibleSteps: number
}

export interface NitroSnapshot {
  stepsStatus: NitroStepsStatus
  restoreState: NitroRestoreState
  engineChanged: boolean
  journalPending: number
  journalFailed: boolean
  elapsedTimeMs: number
  recoveredGapMs: number
  clockAnomaly: boolean
  collection: NitroCollection
  /** Negative = unknown. */
  pedalCadenceRpm: number
  cadenceSource: NitroCadenceSource
  cadenceStatus: NitroMotionStatus
  stepsFinal: boolean
  sessionId?: string
  state: NitroTrackingState
  segmentId: number
  distance: NitroDistance
  fixCount: number
  lastFixTimeMs?: number
  updatedAtMs: number
  error?: string
}

export interface GpsTracking
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  permissionStatus(): NitroPermission
  stepsPermissionStatus(): NitroPermission
  requestStepsPermission(): Promise<NitroPermission>
  requestPermission(): Promise<NitroPermission>

  /** Starts a session and its first segment. Replaces a running session. */
  start(config: NitroStartConfig): Promise<NitroSnapshot>
  pause(sessionId: string): Promise<NitroSnapshot>
  resume(sessionId: string): Promise<NitroSnapshot>
  stop(sessionId: string): Promise<NitroSnapshot>
  getSnapshot(): NitroSnapshot

  /** A step-based estimate for a stretch without GPS; held as pending until GPS confirms it. */
  submitPdr(sessionId: string, segmentId: number, meters: number): void

  /** Rebuilds the engine of `config.sessionId` after a process death. The session comes back PAUSED. */
  restoreSession(config: NitroStartConfig): Promise<NitroSnapshot>
  activeSessionId(): Promise<string | undefined>

  /** A raw Bluetooth CSC Measurement (0x2A5B) from a sensor the HOST app connected to. */
  pushCscMeasurement(
    sessionId: string,
    sourceId: string,
    connectionId: number,
    data: ArrayBuffer
  ): void
  pushExternalCadence(
    sessionId: string,
    sourceId: string,
    connectionId: number,
    rpm: number
  ): void
  setExternalCadenceConnected(
    sessionId: string,
    sourceId: string,
    connectionId: number,
    connected: boolean
  ): void

  /** Coordinate-free timeline of what the native engine decided. */
  getReport(): string
  /** Persisted fixes of `sessionId` with `seq > afterSeq`, oldest first. */
  readPersistedFixes(sessionId: string, afterSeq: number): Promise<NitroFix[]>
  clearSession(sessionId: string): Promise<void>
  /** Android only: replaces the text of the SDK's foreground notification. */
  updateNotification(title: string, text: string): void
  listSessions(): Promise<string[]>

  /** Raw fixes while a listener is set (one native listener; the JS layer fans out). */
  setFixListener(listener: ((fix: NitroFix) => void) | undefined): void
  /** The engine state, about once per second and on every change. */
  setSnapshotListener(
    listener: ((snapshot: NitroSnapshot) => void) | undefined
  ): void
}
