import { NitroModules } from 'react-native-nitro-modules'
import type {
  GpsTracking,
  NitroDistance,
  NitroFix,
  NitroSnapshot,
  NitroStartConfig,
} from '../specs/GpsTracking.nitro'
import type { TrackingFix } from '../domain/trackingFix'
import type { PermissionStatus } from '../domain/trackingState'
import type {
  PlatformDistance,
  PlatformSnapshot,
  StartRequest,
  TrackingPlatform,
  Unsubscribe,
} from './trackingPlatform'
import { parseTrackingError } from '../api/errors'

/** The platform uses a negative number for "unknown". */
const known = (v: number): number | undefined => (Number.isNaN(v) || v < 0 ? undefined : v)

export function toFix(f: NitroFix): TrackingFix {
  return {
    sessionId: f.sessionId,
    segmentId: f.segmentId,
    seq: f.seq,
    time: new Date(f.timeMs),
    elapsedMs: f.elapsedMs,
    latitude: f.latitude,
    longitude: f.longitude,
    horizontalAccuracy: known(f.horizontalAccuracy),
    speed: known(f.speed),
    speedAccuracy: known(f.speedAccuracy),
    course: known(f.course),
    altitude: f.altitude,
    verticalAccuracy: known(f.verticalAccuracy),
    provider: f.provider,
    isMock: f.isMock,
  }
}

function toDistance(d: NitroDistance): PlatformDistance {
  return {
    quality: d.quality,
    totalMeters: d.totalMeters,
    gpsMeters: d.gpsMeters,
    gapBridgeMeters: d.gapBridgeMeters,
    pdrMeters: d.pdrMeters,
    pendingPdrMeters: d.pendingPdrMeters,
    movingTimeMs: d.movingTimeMs,
    isStopped: d.isStopped,
    speedMps: known(d.speedMps),
    lastAcceptedFixAt: d.lastAcceptedFixAtMs < 0 ? undefined : new Date(d.lastAcceptedFixAtMs),
    steps: d.steps,
    strideMeters: known(d.strideMeters),
    activeTimeMs: d.activeTimeMs,
    bridgedGapMs: d.bridgedGapMs,
    uncreditedGapMs: d.uncreditedGapMs,
    uncreditedGaps: d.uncreditedGaps,
    ambiguousSteps: d.ambiguousSteps,
    distanceEligibleSteps: d.distanceEligibleSteps,
  }
}

export function toSnapshot(s: NitroSnapshot): PlatformSnapshot {
  return {
    sessionId: s.sessionId,
    state: s.state,
    segmentId: s.segmentId,
    fixCount: s.fixCount,
    distance: toDistance(s.distance),
    stepsStatus: s.stepsStatus,
    stepsFinal: s.stepsFinal,
    journalPending: s.journalPending,
    journalFailed: s.journalFailed,
    restoreState: s.restoreState,
    engineChanged: s.engineChanged,
    elapsedTimeMs: s.elapsedTimeMs,
    recoveredGapMs: s.recoveredGapMs,
    clockAnomaly: s.clockAnomaly,
    collection: s.collection,
    pedalCadenceRpm: known(s.pedalCadenceRpm),
    cadenceStatus: s.cadenceStatus,
    cadenceSource: s.cadenceSource,
    error: s.error,
  }
}

export function toStartConfig(r: StartRequest): NitroStartConfig {
  const c = r.config
  return {
    pedalCadence: r.pedalCadence,
    recoverRunning: r.recoverRunning ?? false,
    // A restore without its own limit inherits the one stored in the journal (-1), so the same journal recovers
    // the same way whoever runs first (this call, or the Android service without JS).
    maxRecoverGapMs: c.maxRecoverGapMs ?? (r.inheritRecoverGap ? -1 : 0),
    stepsEnabled: r.stepsEnabled,
    initialSteps: r.initialSteps,
    engine: {
      maxAccuracyMeters: c.maxAccuracyMeters,
      maxFixAgeMs: c.maxFixAgeMs,
      silenceAfterMs: c.silenceAfterMs,
      maxSpeedMps: c.maxSpeedMps,
      minStepMeters: c.minStepMeters,
      accuracyNoiseFactor: c.accuracyNoiseFactor,
      stationarySpeedMps: c.stationarySpeedMps,
      maxBridgeMs: c.maxBridgeMs,
      reanchorAfterRejects: c.reanchorAfterRejects,
      rejectMock: c.rejectMock,
      pdrEnabled: c.pdrPolicy !== 'off',
      pdrConfirmRatio: c.pdrConfirmRatio,
      kalman: c.smoothing === 'kalman',
      stopRadiusMeters: c.stopRadiusMeters,
      stopMinDwellMs: c.stopMinDwellMs,
      initialStrideMeters: c.initialStrideMeters ?? -1,
      pdrTrustedWhenCalibrated: c.pdrPolicy === 'trustedWhenCalibrated',
      recoveryStepEvidenceAfterMs: c.recoveryStepEvidenceAfterMs,
    },
    adaptiveSampling: r.adaptiveSampling,
    batterySaver: r.batterySaver,
    sessionId: r.sessionId,
    startSeq: r.startSeq,
    startSegmentId: r.startSegmentId,
    intervalMs: c.updateIntervalMs,
    minDistanceMeters: c.minDistanceMeters,
    notificationTitle: r.notificationTitle,
    notificationText: r.notificationText,
  }
}

/** Every rejected native promise is rethrown as a `TrackingError` carrying the stable code. */
async function guarded<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    throw parseTrackingError(error)
  }
}

/** [TrackingPlatform] over the Nitro HybridObject. */
export class NitroTrackingPlatform implements TrackingPlatform {
  private hybrid?: GpsTracking
  private readonly fixListeners = new Set<(fix: TrackingFix) => void>()
  private readonly snapshotListeners = new Set<(s: PlatformSnapshot) => void>()

  constructor(hybrid?: GpsTracking) {
    this.hybrid = hybrid
  }

  private get native(): GpsTracking {
    return (this.hybrid ??= NitroModules.createHybridObject<GpsTracking>('GpsTracking'))
  }

  onFix(listener: (fix: TrackingFix) => void): Unsubscribe {
    this.fixListeners.add(listener)
    if (this.fixListeners.size === 1) {
      this.native.setFixListener((fix) => {
        const mapped = toFix(fix)
        for (const l of [...this.fixListeners]) l(mapped)
      })
    }
    return () => {
      if (!this.fixListeners.delete(listener)) return
      if (this.fixListeners.size === 0) this.native.setFixListener(undefined)
    }
  }

  onSnapshot(listener: (snapshot: PlatformSnapshot) => void): Unsubscribe {
    this.snapshotListeners.add(listener)
    if (this.snapshotListeners.size === 1) {
      this.native.setSnapshotListener((snapshot) => {
        const mapped = toSnapshot(snapshot)
        for (const l of [...this.snapshotListeners]) l(mapped)
      })
    }
    return () => {
      if (!this.snapshotListeners.delete(listener)) return
      if (this.snapshotListeners.size === 0) this.native.setSnapshotListener(undefined)
    }
  }

  permissionStatus = (): PermissionStatus => this.native.permissionStatus()
  stepsPermissionStatus = (): PermissionStatus => this.native.stepsPermissionStatus()
  requestPermission = () => guarded(this.native.requestPermission())
  requestStepsPermission = () => guarded(this.native.requestStepsPermission())

  start = async (r: StartRequest) => toSnapshot(await guarded(this.native.start(toStartConfig(r))))
  restoreSession = async (r: StartRequest) =>
    toSnapshot(await guarded(this.native.restoreSession(toStartConfig(r))))
  pause = async (id: string) => toSnapshot(await guarded(this.native.pause(id)))
  resume = async (id: string) => toSnapshot(await guarded(this.native.resume(id)))
  stop = async (id: string) => toSnapshot(await guarded(this.native.stop(id)))
  snapshot = () => toSnapshot(this.native.getSnapshot())

  activeSessionId = () => guarded(this.native.activeSessionId())
  listSessions = () => guarded(this.native.listSessions())

  submitPdr = (sessionId: string, segmentId: number, meters: number) =>
    this.native.submitPdr(sessionId, segmentId, meters)

  pushCscMeasurement = (sessionId: string, sourceId: string, connectionId: number, data: Uint8Array) => {
    // Copy exactly the bytes of the view: a Uint8Array may be a window on a larger buffer.
    const copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
    this.native.pushCscMeasurement(sessionId, sourceId, connectionId, copy)
  }
  pushExternalCadence = (sessionId: string, sourceId: string, connectionId: number, rpm: number) =>
    this.native.pushExternalCadence(sessionId, sourceId, connectionId, rpm)
  setExternalCadenceConnected = (sessionId: string, sourceId: string, connectionId: number, connected: boolean) =>
    this.native.setExternalCadenceConnected(sessionId, sourceId, connectionId, connected)

  report = () => this.native.getReport()
  readPersistedFixes = async (sessionId: string, afterSeq: number) =>
    (await guarded(this.native.readPersistedFixes(sessionId, afterSeq))).map(toFix)
  clearSession = (sessionId: string) => guarded(this.native.clearSession(sessionId))
  updateNotification = (title: string, text: string) => this.native.updateNotification(title, text)
}
