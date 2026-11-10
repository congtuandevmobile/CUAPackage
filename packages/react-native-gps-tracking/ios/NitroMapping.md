# NitroMapping.swift

`toNitro()` for every enum, `NativeFix`, `NativeDistance`, `NativeSnapshot`; `toNative()` for `NitroEngineConfig` and
`NitroStartConfig`. `Int64` ↔ `Double`; the enum `switch`es are exhaustive. Nitro's Swift enum cases are the lowercase
concatenation of the union value (`notDetermined` → `.notdetermined`). Keep in step with
`android/.../NitroMapping.kt`.
