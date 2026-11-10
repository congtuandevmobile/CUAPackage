import { NitroTrackingPlatform } from '../platform/nitroTrackingPlatform'
import type { TrackingPlatform } from '../platform/trackingPlatform'
import { defaultTrackingConfig, type TrackingConfig } from '../domain/trackingConfig'
import type { PermissionStatus } from '../domain/trackingState'
import {
  DEFAULT_NOTIFICATION_TEXT,
  DEFAULT_NOTIFICATION_TITLE,
  TrackingSession,
  type TrackingSessionOptions,
} from './trackingSession'

export type CreateSessionOptions = Omit<TrackingSessionOptions, 'platform'>

export interface AttachOrRecoverOptions extends Omit<CreateSessionOptions, 'initialSteps'> {
  /** Asked with the open session's id; return false to leave it alone (another account's session). */
  accept?: (sessionId: string) => boolean
}

/** Entry point. Use ONE instance: the native session is global. */
export class GpsTracking {
  private readonly platform: TrackingPlatform

  constructor(platform?: TrackingPlatform) {
    this.platform = platform ?? new NitroTrackingPlatform()
  }

  permissionStatus(): PermissionStatus {
    return this.platform.permissionStatus()
  }

  /** Asks while the app is in the foreground ("when in use" is enough to record a workout). */
  requestPermission(): Promise<PermissionStatus> {
    return this.platform.requestPermission()
  }

  /**
   * Motion permission of the step sensor (`ACTIVITY_RECOGNITION` on Android 10+, Motion & Fitness on iOS). Only
   * needed with `createSession({ stepsEnabled: true })`.
   */
  stepsPermissionStatus(): PermissionStatus {
    return this.platform.stepsPermissionStatus()
  }

  /** Asks while the app is in the foreground. Recording works without it. */
  requestStepsPermission(): Promise<PermissionStatus> {
    return this.platform.requestStepsPermission()
  }

  /** The ids of the sessions persisted on this device (for example after the process was killed mid-recording). */
  listSessions(): Promise<string[]> {
    return this.platform.listSessions()
  }

  /**
   * The id of the session that was recording or paused when it was last seen (the open-session pointer), or
   * undefined. It is per DEVICE: decide whether it is yours before restoring it.
   */
  activeSessionId(): Promise<string | undefined> {
    return this.platform.activeSessionId()
  }

  /**
   * Brings the open session back, if there is one: the session that was recording or paused when it was last seen
   * (typically after the process died). Returns undefined when there is none.
   *
   * When native already holds it (a service or the app launch recovered it before JS was ready) nothing is replayed
   * twice: the returned session simply attaches to it. A session that was RECORDING continues; the dead interval is
   * credited to the clock, never to the distance. Do NOT call `start` on it, and do not add the dead time yourself.
   */
  async attachOrRecover(options: AttachOrRecoverOptions = {}): Promise<TrackingSession | undefined> {
    const id = await this.platform.activeSessionId()
    if (id === undefined) return undefined
    // The open-session pointer is per device, not per user: the app decides whether this session is its to restore.
    if (options.accept && !options.accept(id)) return undefined
    const { accept: _accept, ...sessionOptions } = options
    const session = this.createSession(sessionOptions)
    try {
      await session.restore({ sessionId: id, recoverRunning: true })
      return session
    } catch (error) {
      // Nothing may keep listening to a session that could not be restored.
      await session.dispose()
      throw error
    }
  }

  /** A recording. Create one per activity. */
  createSession(options: CreateSessionOptions = {}): TrackingSession {
    return new TrackingSession({
      config: defaultTrackingConfig as TrackingConfig,
      notificationTitle: DEFAULT_NOTIFICATION_TITLE,
      notificationText: DEFAULT_NOTIFICATION_TEXT,
      ...options,
      platform: this.platform,
    })
  }
}
