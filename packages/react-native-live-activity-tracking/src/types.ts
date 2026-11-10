/** `active` ticks the timer; `paused` freezes it; `finished` is the last state before `end`. */
export type LiveActivityStatus = 'active' | 'paused' | 'finished'

/** The workout numbers shown. Send the whole state on every update. Unset numbers show as zero. */
export interface LiveActivityData {
  /** Any sport name (`running`, `cycling`, `walking`, `swimming`, `soccer`...). Picks the icon; `cycling` shows km/h. */
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
  status?: LiveActivityStatus
  /** Virtual start (= now - elapsed at the last resume), epoch ms: the live timer counts from it. */
  activeStartTimestamp?: number
}

/** The texts of the surface, in the language of the app. The SDK ships no translation; these are the English defaults. */
export interface LiveActivityLabels {
  distance: string
  time: string
  pace: string
  speed: string
  paused: string
  pausedTitle: string
}

export const defaultLiveActivityLabels: LiveActivityLabels = Object.freeze({
  distance: 'Distance (km)',
  time: 'Time',
  pace: 'Pace (min/km)',
  speed: 'Speed (km/h)',
  paused: 'Paused',
  pausedTitle: 'Paused',
})

export interface LiveActivityAndroidOptions {
  /** Id of the notification (default 2000). Give the id of another SDK's foreground notification to replace its content. */
  notificationId?: number
  /** true (default): an own foreground service owns the notification. false: only post it; another service keeps the process alive. */
  foregroundService?: boolean
  channelName?: string
}

/** Fixed for the life of the activity: given once, to `start`. */
export interface LiveActivityOptions {
  /** The sport as shown (`Running`); defaults to the capitalized `activityType`. */
  title?: string
  /** Opened when the person taps the activity / notification (`myapp://record`). */
  deepLinkUrl?: string
  /** `#RRGGBB` (default `#0A84FF`). */
  accentColor?: string
  labels?: Partial<LiveActivityLabels>
  /** iOS: request a push token so a server can update the activity. */
  enablePushUpdates?: boolean
  android?: LiveActivityAndroidOptions
}

export interface LiveActivityResult {
  /** `Activity.id` on iOS, the notification id as a string on Android. */
  activityId?: string
  success: boolean
  error?: string
}

export type LiveActivityState = 'active' | 'ended' | 'dismissed' | 'stale' | 'unknown'

export interface LiveActivityPushTokenEvent {
  activityId: string
  /** Hex APNs token. */
  token: string
}

export interface LiveActivityStateEvent {
  activityId: string
  state: LiveActivityState
}

export type Unsubscribe = () => void
