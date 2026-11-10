# TrackingErrors.kt

**Path:** `android/src/main/kotlin/io/github/congtuandevmobile/gps_tracking/TrackingErrors.kt` · **Layer:** Android native (error handling)

## Purpose
Implements the project rule "never swallow an error": every native failure becomes a `TrackingException` with a stable **code**, a short **message** and **details** (the stack trace), and is also logged.

## Members
| Member | Description |
|---|---|
| `TrackingErrorCode` (object) | String constants JS can switch on: `NO_ACTIVITY`, `PERMISSION_REQUEST_FAILED`, `PERMISSION_REQUEST_PENDING`, `START_FAILED`, `PAUSE_FAILED`, `RESUME_FAILED`, `STOP_FAILED`, `RESTORE_FAILED`, `CORE_REJECTED`, `STORE_READ_FAILED`, `STORE_CLEAR_FAILED`, `LOCATION_UPDATES_FAILED`, `STORE_WRITE_FAILED`. |
| `Throwable.toTrackingException(code, message)` | Logs with `Log.e` and returns `TrackingException(code, "message (ExceptionType: cause)", stackTrace)`. |
| `trackingException(code, message, details = null)` | Same for failures the code detects itself (no underlying exception). |

## Notes
`internal` to the plugin module. `TrackingException` is defined here; its code is the prefix of the JS error message (`CODE: message`).

## Used by
`GpsTrackingPlugin.kt`, `TrackingEngine.kt`.
