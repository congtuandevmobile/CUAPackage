# NitroGpsTrackingPackage.kt

The React Native package class the host app's autolinking picks up. It registers no native module: its `init` only
loads the Nitro C++ library (`NitroGpsTrackingOnLoad.initializeNative()`), which registers `GpsTracking`.
