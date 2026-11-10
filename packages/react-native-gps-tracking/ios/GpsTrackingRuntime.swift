import CoreLocation
import Foundation

/// The process-wide owner of the tracking engine, and the host app's door for bringing a recording back when the
/// process is started again by the system, BEFORE React Native exists.
///
/// ```swift
/// // AppDelegate.application(_:didFinishLaunchingWithOptions:), before the React Native host starts:
/// GpsTrackingRuntime.bootstrapAtLaunch()
/// ```
///
/// What `bootstrapAtLaunch` does: if a session was recording or paused when the process died, it replays the
/// journal, credits the calendar time that passed (see `SessionRecorder.recoverAfterProcessDeath`), and, when the
/// person had not paused, collects location again. Nothing here makes iOS start the app: that is up to the system
/// (see the options below).
public enum GpsTrackingRuntime {
    /// Use the modern Core Location sequence (`CLLocationUpdate.liveUpdates`, `CLBackgroundActivitySession`, and
    /// `CLServiceSession` on iOS 18) instead of `CLLocationManager`. Apple describes the modern API as continuing
    /// across a system termination and being relaunched into the background; recreate the session immediately at
    /// launch (which `bootstrapAtLaunch` does). OFF by default: not verified on a physical device. Set before the first
    /// use of the engine (`bootstrapAtLaunch` or plugin registration).
    public static var useLiveUpdates = false

    /// With `CLLocationManager` and "Always" authorization, also monitor significant location changes while recording,
    /// so the system can relaunch the app into the background after it was terminated. Apple does not promise a
    /// relaunch after the user force-quits the app. OFF by default: not verified on a physical device.
    public static var wakeOnSignificantChange = false

    /// The engine. Created on first use, on the main thread (Core Location needs a run loop).
    static let engine: TrackingEngine = {
        let directory = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("gps_tracking/journal", isDirectory: true)
        let provider: LocationProviding
        if useLiveUpdates, #available(iOS 17.0, *) {
            provider = LiveUpdatesLocationProvider()
        } else {
            provider = CoreLocationProvider(monitorSignificantChanges: wakeOnSignificantChange)
        }
        return TrackingEngine(provider: provider, store: FileJournalStore(directory: directory))
    }()

    /// Call from `application(_:didFinishLaunchingWithOptions:)`. Safe to call when nothing is open (it does
    /// nothing) and more than once (an open session is never replayed twice). Must run on the main thread.
    public static func bootstrapAtLaunch() {
        engine.recoverActive { result in
            if case .failure(let error) = result {
                NSLog("[GpsTracking] recovery at launch failed: %@", String(describing: error))
            }
        }
    }
}

/// Objective-C door to `GpsTrackingRuntime.bootstrapAtLaunch()` for an `AppDelegate.mm`:
/// `[GpsTrackingBootstrap bootstrapAtLaunch];` (import `<NitroGpsTracking/NitroGpsTracking-Swift.h>`).
@objc(GpsTrackingBootstrap)
public final class GpsTrackingBootstrap: NSObject {
    @objc public static func bootstrapAtLaunch() {
        GpsTrackingRuntime.bootstrapAtLaunch()
    }
}
