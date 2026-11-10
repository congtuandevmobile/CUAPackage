import type { HybridObject } from 'react-native-nitro-modules'

/**
 * The native contract of react-native-live-activity-tracking (a Nitro HybridObject): an iOS Live Activity (lock
 * screen + Dynamic Island) and an Android ongoing notification for a workout being recorded.
 *
 * This is the RAW bridge: the public API lives in `src/liveActivityTracking.ts`. Nitro has one number type (a
 * double): every integer travels as a `number`.
 */

/** The workout numbers shown. Send the whole state on every update. */
export interface NitroLiveActivityData {
  /** Any sport name (`running`, `cycling`, `walking`, `swimming`, `soccer`...). Picks the icon. */
  activityType?: string
  elapsedSeconds?: number
  distanceMeters?: number
  /** Seconds per kilometre; shown as km/h for cycling. */
  paceSecondsPerKm?: number
  heartRate?: number
  calories?: number
  /** Workout start, epoch ms. */
  startTimestamp?: number
  steps?: number
  /** `active`, `paused` or `finished`. */
  status?: string
  /** Virtual start (= now - elapsed at the last resume), epoch ms: the live timer counts from it. */
  activeStartTimestamp?: number
}

/** The texts of the surface, in the language of the app (the SDK ships no translation). */
export interface NitroLiveActivityLabels {
  distance: string
  time: string
  pace: string
  speed: string
  paused: string
  pausedTitle: string
}

/** Fixed for the life of the activity: given once, to `startActivity`. */
export interface NitroLiveActivityOptions {
  /** Name of the sport as shown (`Running`); the SDK falls back to the capitalized `activityType`. */
  title?: string
  /** Opened when the person taps the activity / notification (`myapp://record`). */
  deepLinkUrl?: string
  /** `#RRGGBB`. */
  accentColor?: string
  labels: NitroLiveActivityLabels
  /** iOS: request a push token so a server can update the activity (`getPushToken`, `pushToken` events). */
  enablePushUpdates: boolean
  /** Android: id of the notification. Pass the id of another SDK's foreground notification to replace its content. */
  androidNotificationId?: number
  /** Android: run an own foreground service (true), or only post the notification (false: another service keeps the process alive). */
  androidForegroundService: boolean
  androidChannelName?: string
}

export interface NitroLiveActivityResult {
  /** `Activity.id` on iOS, the notification id as a string on Android. */
  activityId?: string
  success: boolean
  error?: string
}

export interface NitroLiveActivityEvent {
  /** `pushToken` | `stateChange`. */
  type: string
  activityId: string
  /** `pushToken`: the hex APNs token. */
  token?: string
  /** `stateChange`: `active` | `ended` | `dismissed` | `stale`. */
  state?: string
}

export interface LiveActivityTracking
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** iOS: Live Activities enabled (16.2+, not disabled in Settings). Android: always true. */
  isSupported(): Promise<boolean>
  startActivity(data: NitroLiveActivityData, options: NitroLiveActivityOptions): Promise<NitroLiveActivityResult>
  updateActivity(activityId: string, data: NitroLiveActivityData): Promise<boolean>
  endActivity(activityId: string): Promise<boolean>
  endAllActivities(): Promise<boolean>
  isActivityActive(activityId: string): Promise<boolean>
  /** iOS with `enablePushUpdates`: the hex APNs token; undefined otherwise. */
  getPushToken(activityId: string): Promise<string | undefined>
  /** Activities that survived a previous app session (iOS reclaims them first). Android: the running one. */
  getActiveActivityIds(): string[]
  /** Push-token and state events. One native listener; the JS layer fans out. */
  setEventListener(listener: ((event: NitroLiveActivityEvent) => void) | undefined): void
}
