import { defaultTrackingConfig, type TrackingConfig } from '../domain/trackingConfig'
import type { TrackingFix } from '../domain/trackingFix'
import { hasNativeFailure, idleSnapshot, snapshotsEqual, type TrackingSnapshot } from '../domain/trackingSnapshot'
import type { RecordingState } from '../domain/trackingState'
import type { PlatformSnapshot, StartRequest, TrackingPlatform, Unsubscribe } from '../platform/trackingPlatform'
import { TrackingStateError } from './errors'
import { PresenterDispatcher, type PresenterEvent } from './presenterDispatcher'
import type { TrackingPresenter } from './trackingPresenter'

export const DEFAULT_NOTIFICATION_TITLE = 'Recording'
export const DEFAULT_NOTIFICATION_TEXT = 'Tracking your activity. Tap to return to the app.'

export interface TrackingSessionOptions {
  platform: TrackingPlatform
  config?: TrackingConfig
  /** Let native change the update interval with the speed. Starting value, not measured on devices. */
  adaptiveSampling?: boolean
  batterySaver?: boolean
  /** Android notification of the SDK's foreground service (ignored on iOS). No live data is shown in it. */
  notificationTitle?: string
  notificationText?: string
  /**
   * Count steps natively and let the engine turn them into a PENDING distance estimate while GPS is weak (it only
   * counts if the GPS that returns confirms it). Needs the motion permission; without it the recording goes on and
   * `snapshot.stepsStatus` says so.
   */
  stepsEnabled?: boolean
  /** Session steps to restore after a process death (the device counter is never added to it). */
  initialSteps?: number
  /** Estimate the pedalling cadence from a phone carried ON THE LEG. Live only: not journaled, no effect on distance. */
  pedalCadence?: boolean
  /** Shows the recording outside the app (a Live Activity, an ongoing notification...). null/undefined = none. */
  presenter?: TrackingPresenter
  /** Called when the presenter throws or times out; the recording is not affected. Defaults to a console warning. */
  onPresenterError?: (error: unknown) => void
  /** Longest a single presenter call may take before it is reported and skipped. */
  presenterTimeoutMs?: number
}

/** Presenter updates are throttled to about once per second. */
const PRESENT_EVERY_MS = 1000

/**
 * One recording. The NATIVE side owns the session and the distance engine (it keeps recording and keeps measuring
 * when the JS runtime is gone); this class sends the commands and turns what native reports into snapshots.
 *
 * start → pause/resume → finish, plus `restore` after the process died.
 */
export class TrackingSession {
  private readonly platform: TrackingPlatform
  readonly config: TrackingConfig
  readonly adaptiveSampling: boolean
  readonly batterySaver: boolean
  readonly notificationTitle: string
  readonly notificationText: string
  readonly stepsEnabled: boolean
  readonly initialSteps: number
  readonly pedalCadence: boolean

  private readonly dispatcher?: PresenterDispatcher
  private unsubscribeSnapshots?: Unsubscribe
  private currentSessionId?: string
  private last: TrackingSnapshot = idleSnapshot
  private readonly listeners = new Set<(snapshot: TrackingSnapshot) => void>()
  private readonly fixSubscriptions = new Set<Unsubscribe>()
  private lastPresentedAt?: number
  private disposed = false

  constructor(options: TrackingSessionOptions) {
    this.platform = options.platform
    this.config = options.config ?? defaultTrackingConfig
    this.adaptiveSampling = options.adaptiveSampling ?? false
    this.batterySaver = options.batterySaver ?? false
    this.notificationTitle = options.notificationTitle ?? DEFAULT_NOTIFICATION_TITLE
    this.notificationText = options.notificationText ?? DEFAULT_NOTIFICATION_TEXT
    this.stepsEnabled = options.stepsEnabled ?? false
    this.initialSteps = options.initialSteps ?? 0
    this.pedalCadence = options.pedalCadence ?? false
    this.dispatcher = options.presenter
      ? new PresenterDispatcher(options.presenter, {
          onError: options.onPresenterError,
          callTimeoutMs: options.presenterTimeoutMs,
        })
      : undefined
  }

  /** The latest snapshot. */
  get snapshot(): TrackingSnapshot {
    return this.last
  }

  get sessionId(): string | undefined {
    return this.currentSessionId
  }

  /** The state, about once per second and on every change. Returns the function that stops listening. */
  subscribe(listener: (snapshot: TrackingSnapshot) => void): Unsubscribe {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The raw fixes of THIS session, for drawing the route live. Returns the function that stops listening. */
  onFix(listener: (fix: TrackingFix) => void): Unsubscribe {
    const off = this.platform.onFix((fix) => {
      if (fix.sessionId === this.currentSessionId) listener(fix)
    })
    this.fixSubscriptions.add(off)
    return () => {
      this.fixSubscriptions.delete(off)
      off()
    }
  }

  /** Coordinate-free timeline of what the native engine decided. */
  report(): string {
    return this.platform.report()
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async start(options: { sessionId: string }): Promise<void> {
    const state = this.last.state
    if (state === 'running' || state === 'paused' || state === 'finishing') {
      throw new TrackingStateError('a recording is already open')
    }
    if (state === 'finished') {
      // One session, one recording: the presenter and the final snapshot belong to it.
      throw new TrackingStateError('this TrackingSession already finished; create a new one for the next recording')
    }
    const permission = this.platform.permissionStatus()
    if (permission !== 'granted') throw new TrackingStateError(`location permission: ${permission}`)
    this.currentSessionId = options.sessionId
    this.listen()
    const native = await this.platform.start(this.request(options.sessionId))
    this.requireRunning(native)
    this.apply(native)
    this.present('start')
  }

  async pause(): Promise<void> {
    const id = this.requireOpen('running')
    this.apply(await this.platform.pause(id))
    this.present('pause')
  }

  async resume(): Promise<void> {
    const id = this.requireOpen('paused')
    const native = await this.platform.resume(id)
    this.requireRunning(native)
    this.apply(native)
    this.present('resume')
  }

  /**
   * Ends the recording. Native answers only after its journal is durable and the step count was finalized
   * (see `TrackingSnapshot.stepsFinal`), so the returned snapshot is final.
   */
  async finish(): Promise<TrackingSnapshot> {
    const id = this.currentSessionId
    if (id === undefined || this.last.state === 'idle') throw new TrackingStateError('no recording to finish')
    const native = await this.platform.stop(id)
    if (native.state !== 'stopped') {
      // Not final (still finishing, or native failed): say so, keep the session as it is.
      this.apply(native)
      throw new TrackingStateError(
        `finish did not complete: native state is ${native.state}${native.error ? ` (${native.error})` : ''}`
      )
    }
    this.stopListening()
    this.apply(native)
    this.present('finish')
    return this.last
  }

  /**
   * The raw fixes persisted for this session, oldest first (after the writer reached the disk): the route to draw
   * or export once the recording is over, or after a restore.
   */
  async persistedFixes(afterSeq = -1): Promise<TrackingFix[]> {
    const id = this.currentSessionId
    if (id === undefined) return []
    return this.platform.readPersistedFixes(id, afterSeq)
  }

  /** Frees what the platform persisted for this session (it holds coordinates). Call after the activity was saved. */
  async clearPersisted(): Promise<void> {
    const id = this.currentSessionId
    if (id !== undefined) await this.platform.clearSession(id)
  }

  /**
   * After a process death: native replays the session's journal with the configuration it ran with (steps, pending
   * estimates, stride, gaps and times come back exactly; segments are never joined). The session comes back PAUSED;
   * `resume` continues it in a new segment. If native still runs it, nothing is replayed. A damaged last record is
   * dropped and reported in `snapshot.error`; an unusable journal throws.
   *
   * With `recoverRunning` a session that was RECORDING when its process died continues: the calendar time that
   * passed is credited to the clock (see `snapshot.recoveredGapMs`), the recording continues in a NEW segment, and
   * no distance is invented for the dead interval. A dead interval longer than `config.maxRecoverGapMs` is not
   * credited and the session comes back paused.
   */
  async restore(options: { sessionId: string; recoverRunning?: boolean }): Promise<void> {
    this.currentSessionId = options.sessionId
    this.listen()
    const native = await this.platform.restoreSession({
      ...this.request(options.sessionId),
      recoverRunning: options.recoverRunning ?? false,
      inheritRecoverGap: true,
    })
    this.apply(native)
  }

  /**
   * Android: replaces the text of the SDK's foreground notification (iOS: no-op). The SDK keeps the channel, the tap
   * action and the lifecycle; a presenter that wants a richer notification calls this instead of posting its own.
   */
  updateNotification(options: { title: string; text: string }): void {
    this.platform.updateNotification(options.title, options.text)
  }

  /** A step-based estimate for a stretch without GPS; held as pending by native until the GPS that returns confirms it. */
  submitPdr(meters: number): void {
    const id = this.currentSessionId
    if (id === undefined) return
    // Tagged with the segment it was measured in: native refuses one that arrives after a resume.
    this.platform.submitPdr(id, this.last.segmentId, meters)
  }

  /**
   * Tells the SDK that the HOST connected to (or lost) an external cadence sensor. The SDK does not scan, pair or
   * reconnect: a BLE component of the app does, and reports here. `connectionId` is a number the app increases for
   * every new connection to the device. Losing the sensor makes `pedalCadenceRpm` fall back to the phone at once.
   */
  setExternalCadenceConnected(options: { sourceId: string; connectionId: number; connected: boolean }): void {
    const id = this.currentSessionId
    if (id === undefined) return
    this.platform.setExternalCadenceConnected(id, options.sourceId, options.connectionId, options.connected)
  }

  /**
   * One raw Bluetooth CSC Measurement (characteristic 0x2A5B, the bytes of the notification) from the external
   * sensor. The SDK decodes it and handles the 16-bit rollover, wheel-only packets and a reset sensor. Not
   * journaled; no effect on distance. Dropped when `sourceId`/`connectionId` are not the open connection.
   */
  pushCscMeasurement(data: Uint8Array, options: { sourceId: string; connectionId: number }): void {
    const id = this.currentSessionId
    if (id === undefined) return
    this.platform.pushCscMeasurement(id, options.sourceId, options.connectionId, data)
  }

  /** A cadence already in rpm from a source that is not CSC. 0 means the cranks are still; never send "missing" as 0. */
  pushExternalCadence(rpm: number, options: { sourceId: string; connectionId: number }): void {
    const id = this.currentSessionId
    if (id === undefined) return
    this.platform.pushExternalCadence(id, options.sourceId, options.connectionId, rpm)
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.stopListening()
    for (const off of [...this.fixSubscriptions]) off()
    this.fixSubscriptions.clear()
    await this.dispatcher?.close() // bounded: never hangs on a presenter that does not answer
    this.listeners.clear()
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private request(sessionId: string): StartRequest {
    return {
      sessionId,
      startSeq: 0,
      startSegmentId: 0,
      config: this.config,
      adaptiveSampling: this.adaptiveSampling,
      batterySaver: this.batterySaver,
      notificationTitle: this.notificationTitle,
      notificationText: this.notificationText,
      stepsEnabled: this.stepsEnabled,
      initialSteps: this.initialSteps,
      pedalCadence: this.pedalCadence,
    }
  }

  private listen(): void {
    if (this.unsubscribeSnapshots) return
    this.unsubscribeSnapshots = this.platform.onSnapshot((native) => {
      if (native.sessionId !== this.currentSessionId) return
      this.apply(native)
      if (!hasNativeFailure(this.last) && (this.last.state === 'running' || this.last.state === 'paused')) {
        this.presentUpdate()
      }
    })
  }

  private stopListening(): void {
    this.unsubscribeSnapshots?.()
    this.unsubscribeSnapshots = undefined
  }

  private apply(native: PlatformSnapshot): void {
    const d = native.distance
    const next: TrackingSnapshot = {
      sessionId: native.sessionId,
      state: recordingStateOf(native, this.last.state),
      quality: d.quality,
      totalMeters: d.totalMeters,
      gpsMeters: d.gpsMeters,
      gapBridgeMeters: d.gapBridgeMeters,
      pdrMeters: d.pdrMeters,
      pendingPdrMeters: d.pendingPdrMeters,
      segmentId: native.segmentId,
      fixCount: native.fixCount,
      speedMps: d.speedMps,
      lastFixAt: d.lastAcceptedFixAt,
      movingTimeMs: d.movingTimeMs,
      isStopped: d.isStopped,
      steps: d.steps,
      strideMeters: d.strideMeters,
      stepsStatus: native.stepsStatus,
      stepsFinal: native.stepsFinal,
      journalPending: native.journalPending,
      // The error text is a second signal: a write failure can never look durable.
      journalFailed: native.journalFailed || (native.error?.startsWith('STORE_WRITE_FAILED') ?? false),
      restoreState: native.restoreState,
      engineChanged: native.engineChanged,
      elapsedTimeMs: native.elapsedTimeMs,
      recoveredGapMs: native.recoveredGapMs,
      clockAnomaly: native.clockAnomaly,
      collection: native.collection,
      pedalCadenceRpm: native.pedalCadenceRpm,
      cadenceStatus: native.cadenceStatus,
      cadenceSource: native.cadenceSource,
      distanceEligibleSteps: d.distanceEligibleSteps,
      activeTimeMs: d.activeTimeMs,
      bridgedGapMs: d.bridgedGapMs,
      uncreditedGapMs: d.uncreditedGapMs,
      uncreditedGaps: d.uncreditedGaps,
      ambiguousSteps: d.ambiguousSteps,
      failureState:
        native.state === 'permissionDenied' ? 'permissionDenied' : native.state === 'error' ? 'error' : 'none',
      error: native.error,
    }
    const changed = !snapshotsEqual(next, this.last)
    this.last = next
    if (changed && !this.disposed) for (const l of [...this.listeners]) l(next)
  }

  // ── Presenter ───────────────────────────────────────────────────────────

  private presentUpdate(): void {
    const target = this.dispatcher
    if (!target) return
    const now = Date.now()
    if (this.lastPresentedAt !== undefined && now - this.lastPresentedAt < PRESENT_EVERY_MS) return
    this.lastPresentedAt = now
    target.update(this.last)
  }

  private present(event: PresenterEvent): void {
    const target = this.dispatcher
    if (!target) return
    this.lastPresentedAt = Date.now()
    target.lifecycle(event, this.last)
  }

  private requireOpen(expected: RecordingState): string {
    const id = this.currentSessionId
    if (id === undefined || this.last.state !== expected) {
      throw new TrackingStateError(`expected ${expected}, was ${this.last.state}`)
    }
    return id
  }

  private requireRunning(native: PlatformSnapshot): void {
    if (native.state !== 'running') {
      throw new TrackingStateError(`native did not start: ${native.state}${native.error ? ` (${native.error})` : ''}`)
    }
  }
}

function recordingStateOf(native: PlatformSnapshot, previous: RecordingState): RecordingState {
  switch (native.state) {
    case 'idle':
      return 'idle'
    case 'running':
      return 'running'
    case 'paused':
      return 'paused'
    case 'finishing':
      return 'finishing'
    case 'stopped':
      return 'finished'
    case 'permissionDenied':
    case 'error':
      return previous
  }
}
