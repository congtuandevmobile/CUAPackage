# TrackingModels.kt

The enums and data classes the Android engine works on: `NativePermission`, `NativeTrackingState`,
`NativeStepsStatus`, `NativeMotionStatus`, `NativeCadenceSource`, `NativeRestoreState`, `NativeGpsQuality`,
`NativeCollection`, `NativeFix`, `EngineConfig`, `StartConfig`, `NativeDistance`, `NativeSnapshot`.

They are hand-maintained (integers are `Long`) because Nitro has only a double number type. The Nitro-generated `Nitro*` types are used only by `NitroMapping.kt`
and `HybridGpsTracking.kt`. When a field changes, change `GpsTracking.nitro.ts`, run `bun run codegen`, then this
file, the Swift twin `ios/TrackingModels.swift` and both mapping files.
