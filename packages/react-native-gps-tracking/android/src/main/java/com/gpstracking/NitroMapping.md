# NitroMapping.kt

Conversions between the engine models (`TrackingModels.kt`) and the Nitro-generated types:
`X.toNitro()` for every enum, `NativeFix`, `NativeDistance`, `NativeSnapshot`; `NitroEngineConfig.toNative()` and
`NitroStartConfig.toNative()` for the start request.

Rules: `Long` ↔ `Double`; enum `when`s are exhaustive, so a new case fails to compile until mapped. Nitro drops the
underscores of an enum case (`NOT_DETERMINED` → `NOTDETERMINED`). Keep in step with `ios/NitroMapping.swift`.
