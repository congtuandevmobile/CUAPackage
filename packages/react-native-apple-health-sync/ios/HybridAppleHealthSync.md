# HybridAppleHealthSync.swift

The Nitro HybridObject `AppleHealthSync`. Thin: forwards every call to a reader and turns the completion into a `Promise` (`promise(_:)`). `setObserverListener` sets or clears the callback of the shared `HealthObserver` and starts it. Errors from HealthKit are passed through; `HealthKitSyncError` carries `CODE: message`. Methods follow `src/specs/AppleHealthSync.nitro.ts` one to one. Limits: not built into an app and not run on a device.
