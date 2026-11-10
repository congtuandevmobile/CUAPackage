# HybridGpsTracking.kt

The Android implementation of the Nitro HybridObject `GpsTracking` (`src/specs/GpsTracking.nitro.ts`). It is the
React Native entry point and stays thin: it validates, forwards to the process-wide `TrackingEngine`, and turns every
failure into a rejected promise whose message starts with a stable code (`CODE: message`).

## API

Every method of `HybridGpsTrackingSpec`: `permissionStatus`, `stepsPermissionStatus`, `requestPermission`,
`requestStepsPermission`, `start`, `pause`, `resume`, `stop`, `getSnapshot`, `submitPdr`, `restoreSession`,
`activeSessionId`, `pushCscMeasurement`, `pushExternalCadence`, `setExternalCadenceConnected`, `getReport`,
`readPersistedFixes`, `clearSession`, `updateNotification`, `listSessions`, `setFixListener`, `setSnapshotListener`.

## Rules

- Commands run on a `Dispatchers.Main.immediate` scope owned by the instance (`command`); the engine does its heavy
  work on `Dispatchers.IO`. Cancellation is rethrown, never reported as an error.
- Start, resume and a running restore first start the foreground service and wait for its handshake
  (`startForegroundAndWait`); if the OS refuses, recording does not start (`FOREGROUND_START_FAILED`).
- Permission results come back through React Native's `PermissionAwareActivity` (the host activity must be a
  `ReactActivity`); one request may be open at a time (`PERMISSION_REQUEST_PENDING`).
- Numbers cross as doubles; the engine works on `TrackingModels.kt`, converted by `NitroMapping.kt`.
- `dispose()` cancels the listeners and the scope only. The recording lives in `TrackingRuntime` and survives a
  JS reload.

## Limits

Not built into an app and not run on a device. Uses `NitroModules.applicationContext` for the context and activity.

Used by: Nitro (autolinked through `nitro.json`).
