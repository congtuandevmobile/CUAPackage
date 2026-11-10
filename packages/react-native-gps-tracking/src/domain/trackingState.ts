/** The recording lifecycle. Not the same thing as GPS quality or movement. */
export type RecordingState =
  | 'idle'
  | 'running'
  | 'paused'
  /** `finish` was asked and is being finalized. NOT final: wait for `finished`. */
  | 'finishing'
  | 'finished'

/**
 * Whether the platform is actually collecting location, separate from what the person asked for. A recovered
 * session can have its clock back while collection is blocked: never show such a recording as measuring.
 */
export type CollectionState =
  /** Location is being collected. */
  | 'collecting'
  /** The session is not recording (idle, paused, finished). */
  | 'notCollecting'
  /** The session should be recording but location cannot be collected. */
  | 'blocked'

export type TrackingFailureState = 'none' | 'permissionDenied' | 'error'

/** What a restore found in the session's journal. */
export type RestoreState =
  /** The snapshot was not produced by a restore. */
  | 'notRestored'
  /** Every record was intact. */
  | 'complete'
  /** Only the last record was incomplete (a kill mid-write) and was dropped. */
  | 'tailRepaired'
  /** A record before the last was damaged: ONLY the part before it was restored. The result is partial. */
  | 'partial'

/** State of the native step sensor. */
export type StepsStatus =
  /** Not requested (`stepsEnabled` is false) or not started yet. */
  | 'off'
  | 'active'
  /** The motion permission is missing: the recording goes on without steps. */
  | 'permissionDenied'
  /** The device has no step sensor. */
  | 'unavailable'
  /** The sensor reported a runtime or setup error (see `TrackingSnapshot.error`). */
  | 'failed'

/** State of the native accelerometer feeding the pedal-cadence estimate. */
export type PedalCadenceStatus = 'off' | 'active' | 'unavailable' | 'failed'

/** Where `TrackingSnapshot.pedalCadenceRpm` came from. */
export type CadenceSource =
  | 'none'
  /** The phone accelerometer estimate (phone on the leg). */
  | 'phone'
  /** A sensor outside the phone that the host app feeds (a crank cadence sensor, a power meter). */
  | 'externalSensor'

export type GpsQuality =
  /** Nothing known yet (just started / resumed). */
  | 'unknown'
  /** Recent good fixes. */
  | 'good'
  /** Fixes arrive but too inaccurate to measure distance. */
  | 'degraded'
  /** No fix for longer than the silence limit. */
  | 'unavailable'
  /** The first good fix after a gap: the gap was just reconciled. */
  | 'recovering'

/** The permission status of location or motion. */
export type PermissionStatus =
  | 'granted'
  | 'denied'
  /** iOS only: restricted by parental controls / MDM. */
  | 'restricted'
  /** The user was not asked yet. */
  | 'notDetermined'
  /** Location services are switched off on the device. */
  | 'servicesDisabled'

/** The native session state (the platform's own view, richer than [RecordingState]). */
export type PlatformState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'finishing'
  | 'stopped'
  | 'permissionDenied'
  | 'error'
