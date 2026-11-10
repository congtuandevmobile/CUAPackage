import { NitroModules } from 'react-native-nitro-modules'
import type {
  LiveActivityTracking as NativeLiveActivityTracking,
  NitroLiveActivityData,
  NitroLiveActivityEvent,
  NitroLiveActivityOptions,
} from './specs/LiveActivityTracking.nitro'
import { parseLiveActivityError } from './errors'
import {
  defaultLiveActivityLabels,
  type LiveActivityData,
  type LiveActivityOptions,
  type LiveActivityPushTokenEvent,
  type LiveActivityResult,
  type LiveActivityState,
  type LiveActivityStateEvent,
  type Unsubscribe,
} from './types'

export interface LiveActivityTrackingOptions {
  /** A native module to use instead of the Nitro one (tests). */
  native?: NativeLiveActivityTracking
}

const STATES: readonly LiveActivityState[] = ['active', 'ended', 'dismissed', 'stale']

export function toNativeData(d: LiveActivityData): NitroLiveActivityData {
  return { ...d }
}

export function toNativeOptions(o: LiveActivityOptions = {}): NitroLiveActivityOptions {
  return {
    title: o.title,
    deepLinkUrl: o.deepLinkUrl,
    accentColor: o.accentColor,
    labels: { ...defaultLiveActivityLabels, ...o.labels },
    enablePushUpdates: o.enablePushUpdates ?? false,
    androidNotificationId: o.android?.notificationId,
    androidForegroundService: o.android?.foregroundService ?? true,
    androidChannelName: o.android?.channelName,
  }
}

/**
 * A workout on the lock screen and Dynamic Island (iOS Live Activity, 16.2+) and as an ongoing notification (Android).
 * Use ONE instance.
 */
export class LiveActivityTracking {
  private nativeModule?: NativeLiveActivityTracking
  private readonly tokenListeners = new Set<(e: LiveActivityPushTokenEvent) => void>()
  private readonly stateListeners = new Set<(e: LiveActivityStateEvent) => void>()
  private nativeListening = false

  constructor(options: LiveActivityTrackingOptions = {}) {
    this.nativeModule = options.native
  }

  private get native(): NativeLiveActivityTracking {
    return (this.nativeModule ??= NitroModules.createHybridObject<NativeLiveActivityTracking>('LiveActivityTracking'))
  }

  private async guarded<T>(run: (native: NativeLiveActivityTracking) => Promise<T>): Promise<T> {
    try {
      return await run(this.native)
    } catch (error) {
      throw parseLiveActivityError(error)
    }
  }

  /** iOS: Live Activities are available and enabled. Android: always true. */
  isSupported(): Promise<boolean> {
    return this.guarded((n) => n.isSupported())
  }

  /**
   * Starts the activity. Never rejects for "not allowed": it resolves with `success: false` and the reason (Live
   * Activities disabled, notification permission denied, foreground service not allowed now).
   */
  start(data: LiveActivityData, options?: LiveActivityOptions): Promise<LiveActivityResult> {
    return this.guarded((n) => n.startActivity(toNativeData(data), toNativeOptions(options)))
  }

  /** Pushes fresh numbers (send the whole state). Resolves false when the activity is not the open one. */
  update(activityId: string, data: LiveActivityData): Promise<boolean> {
    return this.guarded((n) => n.updateActivity(activityId, toNativeData(data)))
  }

  end(activityId: string): Promise<boolean> {
    return this.guarded((n) => n.endActivity(activityId))
  }

  endAll(): Promise<boolean> {
    return this.guarded((n) => n.endAllActivities())
  }

  isActive(activityId: string): Promise<boolean> {
    return this.guarded((n) => n.isActivityActive(activityId))
  }

  /** iOS with `enablePushUpdates`: the hex APNs token to give your server; undefined otherwise. */
  getPushToken(activityId: string): Promise<string | undefined> {
    return this.guarded((n) => n.getPushToken(activityId))
  }

  /** The activities that survived a previous app session (reclaim them instead of starting a second one). */
  getActiveActivityIds(): string[] {
    return this.native.getActiveActivityIds()
  }

  /** The APNs push token of an activity was issued or rotated (iOS). */
  onPushToken(listener: (event: LiveActivityPushTokenEvent) => void): Unsubscribe {
    return this.subscribe(this.tokenListeners, listener)
  }

  /** An activity changed state: `active`, `ended`, `dismissed`, `stale`. */
  onStateChange(listener: (event: LiveActivityStateEvent) => void): Unsubscribe {
    return this.subscribe(this.stateListeners, listener)
  }

  private subscribe<T>(set: Set<(e: T) => void>, listener: (e: T) => void): Unsubscribe {
    const native = this.native
    set.add(listener)
    this.syncNativeListener(native)
    return () => {
      if (!set.delete(listener)) return
      this.syncNativeListener(native)
    }
  }

  /** One native listener while anyone listens; none otherwise. */
  private syncNativeListener(native: NativeLiveActivityTracking): void {
    const wanted = this.tokenListeners.size + this.stateListeners.size > 0
    if (wanted === this.nativeListening) return
    this.nativeListening = wanted
    native.setEventListener(wanted ? (event) => this.dispatch(event) : undefined)
  }

  private dispatch(event: NitroLiveActivityEvent): void {
    if (event.type === 'pushToken' && event.token !== undefined) {
      const mapped = { activityId: event.activityId, token: event.token }
      for (const l of [...this.tokenListeners]) l(mapped)
    } else if (event.type === 'stateChange') {
      const state = STATES.find((s) => s === event.state) ?? 'unknown'
      for (const l of [...this.stateListeners]) l({ activityId: event.activityId, state })
    }
  }
}
