import type { TrackingFix } from '../domain/trackingFix'
import type { PermissionStatus } from '../domain/trackingState'
import type { PlatformSnapshot, StartRequest, TrackingPlatform, Unsubscribe } from '../platform/trackingPlatform'

export function platformSnapshot(overrides: Partial<PlatformSnapshot> = {}): PlatformSnapshot {
  return {
    sessionId: 's1',
    state: 'idle',
    segmentId: 0,
    fixCount: 0,
    distance: {
      quality: 'unknown',
      totalMeters: 0,
      gpsMeters: 0,
      gapBridgeMeters: 0,
      pdrMeters: 0,
      pendingPdrMeters: 0,
      movingTimeMs: 0,
      isStopped: false,
      steps: 0,
      activeTimeMs: 0,
      bridgedGapMs: 0,
      uncreditedGapMs: 0,
      uncreditedGaps: 0,
      ambiguousSteps: 0,
      distanceEligibleSteps: 0,
    },
    stepsStatus: 'off',
    stepsFinal: false,
    journalPending: 0,
    journalFailed: false,
    restoreState: 'notRestored',
    engineChanged: false,
    elapsedTimeMs: 0,
    recoveredGapMs: 0,
    clockAnomaly: false,
    collection: 'notCollecting',
    cadenceStatus: 'off',
    cadenceSource: 'none',
    ...overrides,
  }
}

/** A scripted platform: records the commands, lets a test push native snapshots and fixes. */
export class FakePlatform implements TrackingPlatform {
  permission: PermissionStatus = 'granted'
  calls: string[] = []
  requests: StartRequest[] = []
  nextState: PlatformSnapshot['state'] = 'running'
  private fixListeners = new Set<(f: TrackingFix) => void>()
  private snapshotListeners = new Set<(s: PlatformSnapshot) => void>()
  nativeFixListeners = 0
  nativeSnapshotListeners = 0

  emitSnapshot(s: PlatformSnapshot) {
    for (const l of [...this.snapshotListeners]) l(s)
  }
  emitFix(f: TrackingFix) {
    for (const l of [...this.fixListeners]) l(f)
  }

  onFix(l: (f: TrackingFix) => void): Unsubscribe {
    this.fixListeners.add(l)
    this.nativeFixListeners = this.fixListeners.size
    return () => {
      this.fixListeners.delete(l)
      this.nativeFixListeners = this.fixListeners.size
    }
  }
  onSnapshot(l: (s: PlatformSnapshot) => void): Unsubscribe {
    this.snapshotListeners.add(l)
    this.nativeSnapshotListeners = this.snapshotListeners.size
    return () => {
      this.snapshotListeners.delete(l)
      this.nativeSnapshotListeners = this.snapshotListeners.size
    }
  }

  permissionStatus = () => this.permission
  stepsPermissionStatus = () => this.permission
  requestPermission = async () => this.permission
  requestStepsPermission = async () => this.permission
  start = async (r: StartRequest) => {
    this.calls.push('start')
    this.requests.push(r)
    return platformSnapshot({ sessionId: r.sessionId, state: this.nextState })
  }
  restoreSession = async (r: StartRequest) => {
    this.calls.push('restore')
    this.requests.push(r)
    return platformSnapshot({ sessionId: r.sessionId, state: 'paused' })
  }
  pause = async (id: string) => {
    this.calls.push('pause')
    return platformSnapshot({ sessionId: id, state: 'paused' })
  }
  resume = async (id: string) => {
    this.calls.push('resume')
    return platformSnapshot({ sessionId: id, state: 'running', segmentId: 1 })
  }
  stop = async (id: string) => {
    this.calls.push('stop')
    return platformSnapshot({ sessionId: id, state: 'stopped', stepsFinal: true })
  }
  snapshot = () => platformSnapshot()
  activeSessionId = async (): Promise<string | undefined> => undefined
  listSessions = async () => []
  submitPdr = (id: string, segment: number, meters: number) => {
    this.calls.push(`pdr:${id}:${segment}:${meters}`)
  }
  pushCscMeasurement = () => {
    this.calls.push('csc')
  }
  pushExternalCadence = () => {
    this.calls.push('rpm')
  }
  setExternalCadenceConnected = () => {
    this.calls.push('connected')
  }
  report = () => 'TIMELINE'
  readPersistedFixes = async () => []
  clearSession = async () => {
    this.calls.push('clear')
  }
  updateNotification = () => {
    this.calls.push('notify')
  }
}
