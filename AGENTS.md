# Agent instructions for RNPackage

## Mission

RNPackage is a generic React Native SDK monorepo built with Nitro modules. The packages are portable libraries, not
application code. Keep all public APIs app-agnostic: do not introduce product names, app-specific models, screens,
URLs, analytics, or business rules into a package.

The authoritative porting references are:

- `../FlutterSdk/flutter_sport_sdk/packages/flutter_tracking_gps` for `packages/react-native-gps-tracking`.
- `../UPRACE/UpRacePackage/packages/uprace_health_kit` for the baseline behavior of
  `packages/react-native-apple-health-sync`.

When a reference and the current RN contract disagree, document the difference in the package README or design docs;
never silently change semantics.

## Repository rules

- Use Bun workspaces. Run commands from the repository root unless a package command is explicitly required.
- Run `bun run codegen`, `bun run typecheck`, and `bun run test` after relevant changes.
- Never edit `nitrogen/generated/**` by hand. Change `src/specs/*.nitro.ts`, then regenerate.
- Keep dependencies directed downward: public API -> application/domain -> platform adapter/core.
- Keep algorithms in the shared core where one exists. Native layers collect platform data and forward it; they do not
  duplicate business calculations.
- Every native Swift/Kotlin source file must have a neighboring English `.md` explaining purpose, API, invariants,
  lifecycle, limits, and platform availability.
- Use monotonic time for elapsed-time and tracking decisions. Use wall-clock time only for persisted/user-facing dates.
- Treat thresholds as measured-or-unmeasured configuration. If a threshold changes without a benchmark, say so in the
  review and add a regression fixture.
- Do not commit, push, publish, or release without explicit owner approval.

## Architecture: Clean Architecture + MVVM-compatible boundaries

The SDK is a library, so it does not need screens. Apply MVVM terminology to the consumer-facing adapter layer:

- Domain: pure models, policies, errors, and use-case contracts; no React Native, HealthKit, CoreLocation, UIKit, or
  Android framework imports.
- Application: orchestration/use cases, lifecycle state, cancellation, deduplication, and mapping from domain results
  to the public contract.
- Infrastructure: Kotlin core and iOS/Android platform adapters. This is the only layer allowed to talk to native
  frameworks.
- Presentation/adapter: Nitro specs, generated bindings, hooks/view-model helpers if present, and event conversion.
  It must stay thin and must not contain tracking or HealthKit algorithms.

Any ViewModel-like object must expose state and commands, be deterministic under repeated start/stop, and be testable
without mounting a React component. Do not place business logic in React hooks or native bridge callbacks.

## SDK contracts

### `react-native-gps-tracking`

This package ports the behavior of `flutter_tracking_gps`:

- native location providers collect fixes and lifecycle events;
- the shared Kotlin `tracking-core` decides distance, acceptance/rejection, pause/resume, stationary drift,
  outlier recovery, and related tracking policy;
- Android compiles `commonMain` into the module; iOS consumes the package-owned XCFramework;
- TypeScript/Nitro exposes stable models and events, but does not recompute distance;
- parity work must use the Flutter fixtures and API/engine tests as behavioral evidence.

For GPS changes, inspect the Flutter docs/tests and create or update equivalent RN/core fixtures for clean runs,
stationary drift, weak fixes, GPS loss/recovery, old-anchor jumps, urban jumps, pause/resume, and cycling tunnels.
Review background permissions, foreground/background transitions, one active session, listener cleanup, and battery use.

### `react-native-apple-health-sync`

This package ports the HealthKit behavior of `uprace_health_kit` and extends it as follows:

- read/request permission for all supported HealthKit data exposed by the package, including workouts and routes where
  supported by the API;
- observe new workouts and acknowledge every HealthKit observer completion callback;
- read workout metadata, routes, laps, quantity samples, series, and statistics through explicit typed contracts;
- expose every `HKWorkoutActivityType` available to the target SDK, not a hard-coded list of seven sports;
- map each HealthKit activity to a stable numeric id and a string name;
- JS must map the complete activity set to the public `Workout` shape. Unknown/future activity values must preserve the
  raw id/name or use an explicit `unknown` value; never silently drop them;
- availability and OS checks must be explicit, and unsupported types must return a typed error or an empty capability
  result according to the public contract;
- do not request write access when the package only reads data.

When adding a HealthKit activity, update the native identifier map, stable id/name mapping, JS `Workout` mapping,
availability rules, permission set, tests, and documentation in the same change. Verify that an activity is not lost
when it is newer than the current iOS SDK or unknown to the JS enum.

## Required sub-agents

The concrete Claude Code definitions are stored in `.claude/agents/`. `.agents/README.md` contains the role index for
tools or workflows that scan `.agents/`. These are real delegatable agent prompts, not only suggested role names.

The orchestrator should delegate independent review passes to these roles. Each role must report file/line evidence,
severity (`P0`-`P3`), reproduction or reasoning, and a concrete fix recommendation. Agents may not broaden scope.

1. **orchestrator** — builds a change map, identifies impacted package/reference contract, assigns reviewers, and
   blocks completion until required checks and parity evidence are present.
2. **sdk-parity-agent** — compares public API, lifecycle, errors, models, fixtures, and edge cases with the matching
   Flutter package. It must distinguish intentional RN/Nitro differences from regressions.
3. **clean-architecture-mvvm-agent** — checks dependency direction, domain purity, thin adapters, testable
   ViewModel-like state/commands, single responsibility, and absence of business logic in React/native bridge code.
4. **security-privacy-agent** — reviews HealthKit/location permission minimization, Info.plist and Android permission
   declarations, sensitive-data logging, secrets, data retention, authorization failure paths, observer lifecycle, and
   unsafe deserialization. It must treat health and location data as sensitive.
5. **code-review-agent** — checks correctness, nullability, concurrency, cancellation, error propagation, API
   compatibility, generated-code boundaries, naming, dead code, and documentation consistency across TS/Swift/Kotlin.
6. **gps-tracking-agent** — reviews GPS provider lifecycle, background behavior, monotonic timestamps, one-session
   ownership, core/native parity, distance double-counting, outlier handling, and battery-sensitive sampling.
7. **healthkit-completeness-agent** — enumerates all supported `HKWorkoutActivityType` cases for the deployment SDK,
   verifies stable id/name coverage and JS `Workout` conversion, checks unknown/future values, routes/laps/series,
   statistics semantics, and observer completion.
8. **performance-agent** — checks bridge payload size, event frequency, allocations, query limits, pagination, repeated
   authorization/observer setup, O(n²) mapping, battery impact, and main-thread work. It must request or add a
   benchmark instead of claiming an unmeasured improvement.
9. **test-reliability-agent** — checks unit, contract, fixture, native availability, lifecycle, race, regression, and
   negative tests. It must test empty/error/permission-denied/unsupported/new-OS cases and generated API shape.
10. **docs-release-agent** — checks README/API docs, platform requirements, changelog guidance, package `files`, codegen
    output, examples, and whether the change is release-safe without exposing app-specific details.

For a small docs-only change, `orchestrator`, `code-review-agent`, and `docs-release-agent` are sufficient. For any
native, API, or data-path change, run all relevant specialist agents; security, performance, parity, and tests are
mandatory for GPS or HealthKit changes.

## Review gates

Before declaring a change complete:

1. Read the relevant package README/specs and the corresponding Flutter reference.
2. Confirm no generated file was hand-edited.
3. Run the narrowest package tests first, then root `bun run typecheck` and `bun run test`; run codegen when specs or
   native contracts changed.
4. For GPS, attach parity fixtures and lifecycle/battery reasoning.
5. For HealthKit, attach a complete activity mapping matrix and prove the JS output is not limited to seven sports.
6. Report known device-only limitations separately from code failures.

## Output format for agent reviews

Use this compact format:

```text
Role: <agent>
Status: PASS | NEEDS_CHANGES | BLOCKED
Findings:
- [P1] path:line — finding; evidence; recommended fix
Checks: <commands/tests/fixtures>
Open questions: <only if blocking>
```
