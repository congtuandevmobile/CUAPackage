#!/usr/bin/env bash
# Builds the shared Kotlin core (tracking-core) as an XCFramework for iOS and copies it where the podspec expects it.
# Android needs no step: android/build.gradle compiles tracking-core/src/commonMain directly.
#
# Usage: tool/build_core.sh [debug|release]   (default: debug)
set -euo pipefail

flavor="${1:-debug}"
root="$(cd "$(dirname "$0")/.." && pwd)"
pkg="$root/packages/react-native-gps-tracking"
cd "$pkg/tracking-core"

case "$flavor" in
  debug)   task="assembleTrackingCoreDebugXCFramework" ;;
  release) task="assembleTrackingCoreReleaseXCFramework" ;;
  *) echo "usage: $0 [debug|release]" >&2; exit 64 ;;
esac

./gradlew --no-daemon "$task"

destination="$pkg/ios/Frameworks"
rm -rf "$destination/TrackingCore.xcframework"
mkdir -p "$destination"
cp -R "build/XCFrameworks/$flavor/TrackingCore.xcframework" "$destination/"
echo "TrackingCore.xcframework ($flavor) -> packages/react-native-gps-tracking/ios/Frameworks"
