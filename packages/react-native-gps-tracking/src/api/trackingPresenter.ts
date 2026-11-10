import type { TrackingSnapshot } from '../domain/trackingSnapshot'

/**
 * A place to show the recording outside the app: an iOS Live Activity / Dynamic Island, an Android ongoing
 * notification, a watch, a home-screen widget.
 *
 * The SDK does not depend on any of these. An app adds one by giving `createSession({ presenter })` an adapter
 * around the library it already uses; the SDK calls it on every transition and about once per second while
 * recording. Without a presenter nothing extra is shown on iOS, and Android shows the SDK's own notification.
 *
 * Rules every presenter can rely on:
 *  - Lifecycle calls (start, pause, resume, finish) are made from the JS thread, in order, and never overlap;
 *    `onUpdate` calls are coalesced (only the newest is delivered) so a slow presenter never builds a backlog.
 *  - A throwing or slow presenter never affects the recording: every call has a time limit (`presenterTimeoutMs`),
 *    and errors and timeouts go to `onPresenterError`; the SDK carries on.
 *  - The snapshot is the same object the app receives from `session.subscribe`.
 *  - They stop being called when the JS runtime is gone. Native keeps recording and, on Android, the SDK's own
 *    notification stays; a presenter's surface does not update.
 */
export interface TrackingPresenter {
  /** The session started (state running). */
  onStart?(snapshot: TrackingSnapshot): void | Promise<void>
  /** About once per second while recording or paused, and on every change that is not a transition. */
  onUpdate?(snapshot: TrackingSnapshot): void | Promise<void>
  onPause?(snapshot: TrackingSnapshot): void | Promise<void>
  /** Paused session resumed (a new segment). */
  onResume?(snapshot: TrackingSnapshot): void | Promise<void>
  /** The final snapshot. Close the surface here. */
  onFinish?(snapshot: TrackingSnapshot): void | Promise<void>
}
