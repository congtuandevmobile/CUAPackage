# RNPackage (monorepo)

Read `AGENTS.md` first. It is the canonical repository policy for all coding and review agents. This file adds Claude
workflow guidance and package context; when wording overlaps, follow the stricter rule.

A family of generic React Native SDKs for sport apps, built as Nitro modules. Every package here is independent of any
application: no README, doc, code comment or config may name an app or an app-specific class.

## Layout

```
packages/react-native-gps-tracking   GPS recording; owns tracking-core/ (Kotlin Multiplatform, pure)
packages/react-native-apple-health-sync  Apple HealthKit sync (iOS only, no Kotlin core); every HKWorkoutActivityType mapped by name and id
packages/react-native-live-activity-tracking  Workout Live Activity (iOS) / ongoing notification (Android); no core
examples/                            demo apps (none yet)
doc/                                 monorepo notes
tool/build_core.sh                   builds the iOS TrackingCore.xcframework from the package's tracking-core
```

- Bun workspaces (root `package.json`): `bun install` at the root, `bun run codegen | typecheck | test`.
- Every package OWNS its core (`tracking-core/` inside it) so it can be versioned, tested and released alone. A core
  never imports another product's core. Dependencies only point DOWN.
- Android compiles the core's `commonMain` straight into the module (`java.srcDirs`); iOS vendors its own XCFramework.
- Algorithms live once, in the Kotlin core with a test in `commonTest`; never re-implement one in Swift, Kotlin-Android
  or TypeScript. Native code collects and forwards; it never decides a value.
- Nitro: edit `src/specs/*.nitro.ts`, run `bun run codegen` in the package. Never edit `nitrogen/generated/**`.
  Engines work on hand-kept models (`TrackingModels.*`) and convert to the generated `Nitro*` types only in
  `NitroMapping.*` (Nitro numbers are doubles).
- Every Swift and Kotlin file has an English `.md` next to it with the same base name (purpose, API, rules, limits).
- Every time the core sees (`nowMs`, `atMs`) comes from ONE monotonic clock of the phone, never the wall clock.
- Every threshold is an unmeasured starting value; say so when you change one.
- Do not commit or push without the owner's approval.

See `packages/react-native-gps-tracking/doc/` (`FLOW`, `JOURNAL`, `KMP`, `NATIVE_RULES`).

## Claude workflow

Start by identifying the affected package, public spec, native entry points, generated bindings, tests, and matching
Flutter reference. Use the sub-agent roles and review gates in `AGENTS.md`; do not treat a single green TypeScript
check as proof of native correctness.

For implementation tasks, prefer this sequence:

1. Contract/parity analysis.
2. Domain/core implementation and tests.
3. Native adapter and lifecycle implementation.
4. Nitro spec/codegen and thin JS mapping.
5. Security, performance, architecture, and completeness review.
6. Typecheck, tests, docs, and final diff review.

The HealthKit contract is intentionally broader than the original seven-sport behavior: all supported
`HKWorkoutActivityType` values must survive native discovery and JS conversion as a `Workout`. A reviewer must reject
any new switch, enum, filter, or fixture that silently drops an activity merely because it is not in the old seven.

The GPS contract is behavior parity with `flutter_tracking_gps`, especially the shared-core decisions around distance,
noise, pause/resume, timestamps, and recovery. Native code must remain a collector/adapter, not a second algorithm.

Do not use app names or app-specific types in public package source, documentation, examples, or comments. References to
the external Flutter package are allowed in engineering notes when needed to explain parity.
