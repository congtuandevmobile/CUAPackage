# HealthPermissionMgr.swift

`requestPermissions`: asks READ access (nothing is shared) for every type in `HealthTypeUtils.getAllSupportedTypes()`; fails with code 404 when HealthKit is unavailable.
