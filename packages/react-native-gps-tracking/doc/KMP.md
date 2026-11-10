# Shared Kotlin core (`tracking-core`)

Pure algorithms written once in Kotlin Multiplatform, used by both platforms, so there is never a second Kalman /
fusion implementation that disagrees with the first. This package owns its core so it can be versioned,
tested and released alone.

```
tracking-core/src/commonMain/kotlin/tracker/   plain Kotlin, no platform API, no third-party library
  algorithms/ engine/ journal/ model/ auxiliary/ bridge/   (see the .md next to each file)
tracking-core/src/commonTest/kotlin/tracker/   tests, run on the JVM (fast)
```

## How each platform uses it

- **Android:** `android/build.gradle` adds `tracking-core/src/commonMain/kotlin` to the module's source dirs. No second
  Gradle project to wire into the host app.
- **iOS:** `tool/build_core.sh [debug|release]` (or `bun run build:core` in the package) builds
  `TrackingCore.xcframework` and copies it to `ios/Frameworks/` (git-ignored); the podspec vendors it from there.
  Swift calls it as `GeoMath.shared.haversineMeters(lat1:lon1:lat2:lon2:)`.
- **Tests:** `cd packages/react-native-gps-tracking/tracking-core && ./gradlew jvmTest`.

JavaScript never decides a distance: it sends commands and shows snapshots. Do not re-implement an algorithm in
TypeScript, Swift or Kotlin-Android.
