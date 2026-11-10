# Models.swift

The structs the readers fill (`HealthDataRecord`, `HealthWorkoutRecord`, `HealthHeartRateStats`, `HealthRouteLocation`, `HealthLapRecord`, `HealthChartPoint`): every field optional with a default, times as `Int64` epoch ms. `HealthWorkoutRecord` also carries `sport` (catalog name) and `sportId` (Apple raw value). They exist because Nitro structs have no defaults and only a double number type; only `NitroMapping.swift` converts them. Generated from the spec once; keep in step with it.
