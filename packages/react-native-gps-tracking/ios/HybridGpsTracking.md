# HybridGpsTracking.swift

The iOS implementation of the Nitro HybridObject `GpsTracking`. Thin on purpose: it forwards to the process-wide
`TrackingEngine` (owned by `GpsTrackingRuntime`) and turns each engine completion into a `Promise` (`promise(_:)`).
The engine delivers on the main thread and reports every failure as a `TrackingError` (`CODE: message`).

`setFixListener` / `setSnapshotListener` install (or clear) the engine's observers; the JS layer fans out to its own
subscribers. A new instance after a JS reload simply replaces the observers; the recording is untouched.

Numbers cross as doubles (`Int64(...)` on the way in); the engine works on `TrackingModels.swift`, converted by
`NitroMapping.swift`. `updateNotification` is a no-op on iOS.

Limits: not built into an app and not run on a device.
