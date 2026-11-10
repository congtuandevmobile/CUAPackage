# AppleHealthSyncRuntime.swift

Owner of the shared `HealthObserver` and the host app's early door: `AppleHealthSyncRuntime.startObservingAtLaunch()` (Swift) or `[AppleHealthSyncBootstrap startObservingAtLaunch]` (Objective-C) from `application(_:didFinishLaunchingWithOptions:)`, so a background launch caused by a new workout registers the observer in time.
