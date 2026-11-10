# TrackingRuntime.kt

**Path:** `android/src/main/kotlin/io/github/congtuandevmobile/gps_tracking/TrackingRuntime.kt` · **Layer:** Android native (process-wide holder)

## Purpose
Holds the single `TrackingEngine` of the process. The engine deliberately outlives the JS runtime and the module instance: a recording must not stop because the JS runtime was reloaded or destroyed.

## Members
| Member | Description |
|---|---|
| `TrackingRuntime.engine(context): TrackingEngine` | Lazily creates (thread-safe) and returns the engine, using only the application context. |
| `createEngine` | Builds the engine with `FusedLocationSource`, `FileJournalStore(filesDir/gps_tracking/journal)` and a process-wide `CoroutineScope(SupervisorJob() + Dispatchers.Default)`. |

## Memory
The scope is process-wide by design. Nothing here holds an Activity, a module or a JS runtime, so there is no leak.

## Used by
`GpsTrackingPlugin.kt`.

Also passes `SensorStepSource(appContext)` to the engine.

The journal directory is `gps_tracking/journal` under `filesDir`.
