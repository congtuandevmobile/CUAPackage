/**
 * Own GPS tracking engine for React Native (a Nitro module).
 *
 * Native code collects raw fixes (iOS CoreLocation, Android Fused location in a foreground service) and journals
 * them; a shared Kotlin core (the same code on both platforms) decides what counts as distance. JS sends commands
 * and shows the result.
 */
export { GpsTracking, type AttachOrRecoverOptions, type CreateSessionOptions } from './api/gpsTracking'
export { TrackingSession, type TrackingSessionOptions } from './api/trackingSession'
export { TrackingError, TrackingStateError, parseTrackingError } from './api/errors'
export type { TrackingPresenter } from './api/trackingPresenter'
export { PresenterDispatcher, type PresenterEvent, type PresenterDispatcherOptions } from './api/presenterDispatcher'
export {
  createTrackingConfig,
  defaultTrackingConfig,
  trackingConfigForSport,
  type PdrPolicy,
  type PositionSmoothing,
  type TrackingConfig,
  type TrackingSport,
} from './domain/trackingConfig'
export type { TrackingFix } from './domain/trackingFix'
export { hasNativeFailure, idleSnapshot, isDurable, snapshotsEqual, type TrackingSnapshot } from './domain/trackingSnapshot'
export type {
  CadenceSource,
  CollectionState,
  GpsQuality,
  PedalCadenceStatus,
  PermissionStatus,
  PlatformState,
  RecordingState,
  RestoreState,
  StepsStatus,
  TrackingFailureState,
} from './domain/trackingState'
export type {
  PlatformDistance,
  PlatformSnapshot,
  StartRequest,
  TrackingPlatform,
  Unsubscribe,
} from './platform/trackingPlatform'
export { NitroTrackingPlatform } from './platform/nitroTrackingPlatform'
