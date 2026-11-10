import Foundation

/// The process-wide owner of the HealthKit observer, and the host app's door for starting it before React Native is
/// ready.
///
/// HealthKit background delivery wakes a terminated app only if an `HKObserverQuery` is registered EARLY in the launch.
/// The module registers it when JS sets its first listener, which is too late for a cold background launch, so a host
/// that wants those wake-ups calls this from `application(_:didFinishLaunchingWithOptions:)`:
///
/// ```swift
/// AppleHealthSyncRuntime.startObservingAtLaunch()
/// ```
///
/// Objective-C: `[AppleHealthSyncBootstrap startObservingAtLaunch];`.
public enum AppleHealthSyncRuntime {
    /// Shared by the module and the launch hook, so there is exactly one observer query.
    static let observer = HealthObserver()

    /// Starts the observer (and background delivery). Safe to call more than once.
    public static func startObservingAtLaunch() {
        observer.start()
    }
}

/// Objective-C door to `AppleHealthSyncRuntime`.
@objc(AppleHealthSyncBootstrap)
public final class AppleHealthSyncBootstrap: NSObject {
    @objc public static func startObservingAtLaunch() {
        AppleHealthSyncRuntime.startObservingAtLaunch()
    }
}
