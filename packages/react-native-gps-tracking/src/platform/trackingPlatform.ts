import type { TrackingConfig } from '../domain/trackingConfig'
import type { TrackingFix } from '../domain/trackingFix'
import type {
  GpsQuality,
  PermissionStatus,
  PlatformState,
  RestoreState,
  StepsStatus,
  CadenceSource,
  CollectionState,
  PedalCadenceStatus,
} from '../domain/trackingState'

export type Unsubscribe = () => void

/** What the native distance engine has decided. `undefined` = unknown. */
export interface PlatformDistance {
  readonly quality: GpsQuality
  readonly totalMeters: number
  readonly gpsMeters: number
  readonly gapBridgeMeters: number
  readonly pdrMeters: number
  readonly pendingPdrMeters: number
  readonly movingTimeMs: number
  readonly isStopped: boolean
  readonly speedMps?: number
  readonly lastAcceptedFixAt?: Date
  readonly steps: number
  readonly strideMeters?: number
  readonly activeTimeMs: number
  readonly bridgedGapMs: number
  readonly uncreditedGapMs: number
  readonly uncreditedGaps: number
  readonly ambiguousSteps: number
  readonly distanceEligibleSteps: number
}

/** The native snapshot, with the platform's "negative = unknown" turned into `undefined`. */
export interface PlatformSnapshot {
  readonly sessionId?: string
  readonly state: PlatformState
  readonly segmentId: number
  readonly fixCount: number
  readonly distance: PlatformDistance
  readonly stepsStatus: StepsStatus
  readonly stepsFinal: boolean
  readonly journalPending: number
  readonly journalFailed: boolean
  readonly restoreState: RestoreState
  readonly engineChanged: boolean
  readonly elapsedTimeMs: number
  readonly recoveredGapMs: number
  readonly clockAnomaly: boolean
  readonly collection: CollectionState
  readonly pedalCadenceRpm?: number
  readonly cadenceStatus: PedalCadenceStatus
  readonly cadenceSource: CadenceSource
  readonly error?: string
}

export interface StartRequest {
  readonly sessionId: string
  readonly startSeq: number
  readonly startSegmentId: number
  readonly config: TrackingConfig
  readonly adaptiveSampling: boolean
  readonly batterySaver: boolean
  readonly notificationTitle: string
  readonly notificationText: string
  readonly stepsEnabled: boolean
  readonly initialSteps: number
  readonly pedalCadence: boolean
  readonly recoverRunning?: boolean
  /** A restore without its own limit inherits the one stored in the journal. */
  readonly inheritRecoverGap?: boolean
}

/** The seam between the session and the native module: the real one is Nitro, tests use a fake. */
export interface TrackingPlatform {
  /** Raw fixes of any session; the listener is attached natively while at least one subscriber exists. */
  onFix(listener: (fix: TrackingFix) => void): Unsubscribe
  /** The engine state, about once per second and on every change. */
  onSnapshot(listener: (snapshot: PlatformSnapshot) => void): Unsubscribe

  permissionStatus(): PermissionStatus
  requestPermission(): Promise<PermissionStatus>
  stepsPermissionStatus(): PermissionStatus
  requestStepsPermission(): Promise<PermissionStatus>

  start(request: StartRequest): Promise<PlatformSnapshot>
  restoreSession(request: StartRequest): Promise<PlatformSnapshot>
  pause(sessionId: string): Promise<PlatformSnapshot>
  resume(sessionId: string): Promise<PlatformSnapshot>
  stop(sessionId: string): Promise<PlatformSnapshot>
  snapshot(): PlatformSnapshot

  activeSessionId(): Promise<string | undefined>
  listSessions(): Promise<string[]>
  submitPdr(sessionId: string, segmentId: number, meters: number): void
  pushCscMeasurement(sessionId: string, sourceId: string, connectionId: number, data: Uint8Array): void
  pushExternalCadence(sessionId: string, sourceId: string, connectionId: number, rpm: number): void
  setExternalCadenceConnected(sessionId: string, sourceId: string, connectionId: number, connected: boolean): void

  report(): string
  readPersistedFixes(sessionId: string, afterSeq: number): Promise<TrackingFix[]>
  clearSession(sessionId: string): Promise<void>
  updateNotification(title: string, text: string): void
}
