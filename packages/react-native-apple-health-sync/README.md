# react-native-apple-health-sync

Apple HealthKit sync for React Native, built as a [Nitro module](https://nitro.margelo.com) (**iOS only**). It reads
workouts, their GPS route, laps, heart-rate / cadence / distance series and per-km splits, and observes new workouts
(also in the background).

> **Every HealthKit sport is reported by its exact name and a stable id**, so your app can map football to football,
> tennis to tennis, and so on. Nothing is folded into a generic "workout".

**Status: 0.0.1-beta.1. Not built into an app and not run on a device.** The Swift sources typecheck against the iOS
26 SDK (the Nitro layer against stubs of its generated signatures), the TypeScript layer is unit-tested.

## Install

```sh
bun add react-native-apple-health-sync react-native-nitro-modules
cd ios && pod install
```

Info.plist: `NSHealthShareUsageDescription`. Xcode → Signing & Capabilities: **HealthKit** (with *Background Delivery*
for background wake-ups). To be woken by a new workout while the app is terminated, start the observer early, in
`application(_:didFinishLaunchingWithOptions:)`: Swift `AppleHealthSyncRuntime.startObservingAtLaunch()`, Objective-C
`[AppleHealthSyncBootstrap startObservingAtLaunch]`.

## Sports: map by name or by id

Every workout has:

| field | meaning | example |
|---|---|---|
| `sport` | exact sport, lower camel case | `'soccer'` |
| `sportId` | the Apple raw value of `HKWorkoutActivityType` (stable, persisted by Apple) | `41` (`HealthSport.SOCCER`) |
| `activityType` | LEGACY coarse type of the old plugin (`running`, `cycling_indoor`, ..., `activity` for all else) | `'activity'` |

```ts
import { HealthSport, healthSportName, healthSportId } from 'react-native-apple-health-sync'

// 1. by name (readable, no import needed)
const APP_SPORT_BY_NAME: Record<string, number> = { running: 1, cycling: 2, soccer: 9, basketball: 10 /* ... */ }
const mine = APP_SPORT_BY_NAME[workout.sport] ?? APP_GENERIC_WORKOUT

// 2. by id (typo-proof)
switch (workout.sportId) {
  case HealthSport.SOCCER:     return MY_SOCCER   // your own enum value (8, 9, ... whatever you chose)
  case HealthSport.BASKETBALL: return MY_BASKETBALL
}

healthSportName(41)      // 'soccer'
healthSportId('SOCCER')  // 41   (name, camelCase name or UPPER_SNAKE key)
```

The table `HEALTH_SPORTS` lists all 84 sports of the iOS 26 SDK (`id`, `name`, `key`, `deprecated`, `minIos`),
including `HealthSport.OTHER` (3000). A sport added by Apple later is NOT folded into another one: it arrives as
`sport: 'unknown'` with its real `sportId`, so you can still map it. The ids are Apple's, so they never change; the
table only grows.

## Use

```ts
import { AppleHealthSync } from 'react-native-apple-health-sync'

const health = new AppleHealthSync() // ONE instance
if (!health.isAvailable()) return
await health.requestPermissions() // READ access only

const workouts = await health.readWorkouts(from, to) // every sport, newest first
// readWorkouts(from, to, { onlyAppleSources: false }) also returns workouts other apps wrote

const [hr, cadence, distance, splits, route, laps, stats] = await Promise.all([
  health.readHeartRateSamples(w.uuid!),
  health.readCadenceSamples(w.uuid!),
  health.readDistanceSamples(w.uuid!),
  health.readKmSplits(w.uuid!),
  health.readRoute(w.uuid!),
  health.readLaps(w.uuid!),
  health.readWorkoutHeartRateStats(w.uuid!),
])

const off = health.onNewDataAvailable(() => health.readWorkouts(from, new Date())) // new workout
```

Failures reject with `AppleHealthSyncError` (`code`: `UNSUPPORTED_PLATFORM` off iOS, `INVALID_UUID`,
`WORKOUT_NOT_FOUND`, `UNKNOWN`).

## Behaviour

| Topic | Behaviour |
|---|---|
| Sports | **all** `HKWorkoutActivityType` values: `sport` + `sportId`; the coarse `activityType` (`running`, `cycling_indoor`, ..., `activity` for the rest) is kept for compatibility |
| Workout query | **no type filter**: nothing is dropped, sports added by Apple later are included |
| Cadence / distance / km splits | chosen from the workout's REAL sport (rowing, paddle, skating, skiing, wheelchair... get their own distance type); an `activityType` argument is accepted and ignored |
| Sources | only `com.apple.*` workouts by default; `onlyAppleSources: false` to widen |
| Missing numbers | `embeddedSteps` / `elevationAscended` are `undefined` when not available |
| Km splits | pause intervals are subtracted, so the value is moving time |
| API shape | `Date \| number` arguments; `onNewDataAvailable(listener)` returns an unsubscribe function; one native listener fanned out in JS |

Also requested for reading now: the sport-specific distance types (wheelchair, downhill snow sports; rowing, paddle,
skating, cross-country skiing on iOS 18+).

## Layout

```
src/specs/AppleHealthSync.nitro.ts   the native contract (edit, then `bun run codegen`)
src/sports.ts                        the sport table: HEALTH_SPORTS, HealthSport, helpers
src/appleHealthSync.ts               public API
ios/                                 Swift readers + HybridAppleHealthSync (every .swift has a .md)
nitrogen/generated                   generated: never edit
```

`ios/SportCatalog.swift` and `src/sports.ts` carry the same table (a test compares them): change both, only append.
