# Native code rules

Mandatory for every change under `android/` and `ios/`.

## Android (Kotlin)

- **Concurrency:** Kotlin Coroutines and Flow, not Thread or RxJava. Heavy work on `Dispatchers.IO`; results go back
  on `Dispatchers.Main`.
- **Null safety:** use the type system (`?`, `let`, `run`). Never use `!!`.
- **Memory:** release what a `HybridGpsTracking` instance holds in `dispose()` (listeners, scope). The recording
  itself lives in `TrackingRuntime` and must outlive a JS reload. No `Context` / Activity leaks: only the
  application context is stored.

## iOS (Swift)

- **Concurrency:** Swift Concurrency (`async`/`await`) or GCD. Every result handed to JS is delivered on the main
  queue (`TrackingEngine.deliver`).
- **Protocol-oriented:** protocols and delegates for abstraction and tests (`LocationProviding`, `JournalStoring`,
  `StepProviding`).
- **Memory:** no strong reference cycles: `[weak self]` / `unowned self` in closures, especially listener callbacks.

## Nitro boundary

- Nitro has ONE number type (a double). The engines work on `TrackingModels.kt` / `TrackingModels.swift` (Int64/Long
  where the core needs integers); only `NitroMapping.kt` / `NitroMapping.swift` convert to and from the
  Nitro-generated `Nitro*` types. Never use a Nitro type inside an engine.
- Never edit `nitrogen/generated/**`. Change `src/specs/GpsTracking.nitro.ts`, run `bun run codegen`, then update
  the two mapping files (their `when`/`switch` are exhaustive: a new enum case fails to compile until mapped).
- Nitro enums are generated from the union: Kotlin `NOT_DETERMINED` becomes `NOTDETERMINED`, Swift `.notDetermined`
  becomes `.notdetermined`. The mapping files spell that out.

## Errors (both)

Never swallow an error. Every native failure is caught and turned into a rejected promise whose message is
`CODE: message` (Kotlin `TrackingException`, Swift `TrackingError`). The JS layer parses the code into
`TrackingError.code`. Codes live in `TrackingErrors.kt` and `TrackingErrors.swift`. A failure that must not stop the
recording (a fix that could not be written) is logged and shown in `NitroSnapshot.error`; it is still never silent.

## Where the code follows them

| Rule | Android | iOS |
|---|---|---|
| Async work off the main thread | `TrackingEngine` (`scope.launch`, `Dispatchers.IO` writes) | `TrackingEngine.queue` / `storeQueue` |
| Results on main | `HybridGpsTracking.command` (`Dispatchers.Main.immediate`) | `TrackingEngine.deliver` |
| No `!!` / no cycles | none used | `[weak self]` in every closure |
| Release on teardown | `HybridGpsTracking.dispose` | observers are replaced by the next instance |
| Errors | `Throwable.toTrackingException` | `trackingError(code:message:underlying:)` |
