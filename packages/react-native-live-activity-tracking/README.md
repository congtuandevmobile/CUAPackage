# react-native-live-activity-tracking

Shows a workout while it is being recorded: on the **lock screen and Dynamic Island** (iOS Live Activity, 16.2+) and as an
**ongoing notification** (Android; promoted ongoing on Android 16+). A [Nitro module](https://nitro.margelo.com).

**Status: 0.0.1-beta.1. Not built into an app or run on a device.** The Swift sources typecheck against the iOS 26 SDK
(the Nitro layer against stubs of its generated signatures), the Kotlin sources compile against the Nitro-generated
types, the TypeScript layer is unit-tested.

## Install

```sh
bun add react-native-live-activity-tracking react-native-nitro-modules
cd ios && pod install
```

### iOS

1. `Info.plist`: `NSSupportsLiveActivities` = `YES`.
2. Add a **Widget Extension** target (File > New > Target > Widget Extension).
3. Add these two files from the package to that target (Target Membership), and NOT the widget to the app:
   - `ios/Shared/LiveActivityTrackingAttributes.swift` (also compiled into the app by the pod; do not rename the type);
   - `ios/WidgetTemplate/LiveActivityTrackingWidget.swift` (the UI: edit it freely).
4. Optional, for remote updates (`enablePushUpdates`): the Push Notifications capability and your server.

The widget draws only what the app passes at start (title, labels, accent colour, deep link) and in each update, so
there are no resources or localization files to maintain.

### Android

Nothing to configure: the library manifest declares the permissions (`POST_NOTIFICATIONS`, foreground service,
`FOREGROUND_SERVICE_LOCATION`, `POST_PROMOTED_NOTIFICATIONS`) and the service. The module asks for the notification
permission itself (Android 13+) through the React activity. To change the small icon, define a white monochrome vector
drawable named `ic_live_activity_tracking` in your app.

The default service is of type `location` (API 34+ needs the location permission and an app in the foreground or with
background location when it starts; otherwise `start` resolves `success: false`). If another service of your app already
keeps the process alive (a recording service), pass `android: { foregroundService: false }`: the module then only posts
the notification, and `android: { notificationId }` set to that service's notification id replaces its content so only
one notification is shown.

## Use

```ts
import { LiveActivityTracking, WorkoutLiveActivity } from 'react-native-live-activity-tracking'

const sdk = new LiveActivityTracking() // ONE instance
if (!(await sdk.isSupported())) return

// A ViewModel-like helper: state + commands, no React, throttled, safe to call twice.
const live = new WorkoutLiveActivity({
  activity: sdk,
  options: {
    title: 'Soccer',                       // the sport as shown
    deepLinkUrl: 'myapp://record',         // opened on tap
    accentColor: '#0A84FF',
    labels: { distance: 'Distance (km)', time: 'Time', pace: 'Pace (min/km)', speed: 'Speed (km/h)', paused: 'Paused', pausedTitle: 'Paused' },
  },
})

const started = await live.start({ activityType: 'soccer', elapsedSeconds: 0 })
if (!started.success) console.log(started.error) // disabled in Settings, permission denied, ...

await live.update({ elapsedSeconds: 125, distanceMeters: 520.5, paceSecondsPerKm: 330 }) // about every 1-5 s
await live.pause()    // shows "Paused", freezes the timer
await live.resume()
await live.finish({ elapsedSeconds: 600, distanceMeters: 2000 }) // final numbers, then ends
```

The same calls exist on the facade (`sdk.start`, `update`, `end`, `endAll`, `isActive`, `getPushToken`) when you want to
drive the activity yourself. `activityType` is any sport name (`running`, `cycling`, `soccer`, ...): it picks the icon,
and `cycling` shows km/h instead of a pace. `sdk.getActiveActivityIds()` lists the activities that survived a previous
app session: reclaim them instead of starting a second one (`WorkoutLiveActivity.start` does it for you).

```ts
const off = sdk.onPushToken(({ activityId, token }) => sendToServer(activityId, token)) // iOS, enablePushUpdates
sdk.onStateChange(({ activityId, state }) => {}) // 'active' | 'ended' | 'dismissed' | 'stale' | 'unknown'
```

Failures reject with `LiveActivityError` (`code`: `NOT_FOUND`, `NOT_SUPPORTED`, `UNKNOWN`). A refused start is not an
error: `start` resolves `{ success: false, error }`.

## Data

| Field | Meaning |
|---|---|
| `activityType` | any sport name; icon and km/h for cycling |
| `elapsedSeconds`, `distanceMeters`, `paceSecondsPerKm`, `heartRate`, `calories`, `steps` | the numbers; send the whole state each time, unset shows as 0 |
| `startTimestamp` | workout start, epoch ms |
| `activeStartTimestamp` | virtual start (now - elapsed at the last resume): the live timer counts from it (`WorkoutLiveActivity` maintains it) |
| `status` | `active` ticks the timer, `paused` freezes it, `finished` is the last state before `end` |

Display: distance `0.52` km (under 10 km) / `12.3` km; pace `5'33"`-style `mm:ss` per km, km/h for cycling; the timer
is live while active and static when paused.

## Layout

```
src/specs/LiveActivityTracking.nitro.ts   the native contract (edit, then `bun run codegen`)
src/                                      LiveActivityTracking facade, WorkoutLiveActivity, types, errors
ios/                                      ActivityKit manager + HybridLiveActivityTracking (every .swift has a .md)
ios/Shared/                               attributes shared with the Widget Extension
ios/WidgetTemplate/                       the Live Activity UI (Widget Extension only)
android/                                  notification builder, foreground service, HybridLiveActivityTracking
nitrogen/generated                        generated: never edit
```
