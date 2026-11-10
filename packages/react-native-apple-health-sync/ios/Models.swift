import Foundation

// Native models the readers work on (all fields optional with defaults, times as Int64 epoch ms). The Nitro-generated
// `Nitro*` types are used only by NitroMapping.swift and HybridAppleHealthSync.swift: Nitro numbers are doubles and
// its structs have no default values. See Models.md.

struct HealthDataRecord: Hashable {
    var type: String? = nil
    var value: Double? = nil
    var unit: String? = nil
    var startTime: Int64? = nil
    var endTime: Int64? = nil
}

struct HealthWorkoutRecord: Hashable {
    var uuid: String? = nil
    var activityType: String? = nil
    var sport: String = SportCatalog.unknownName
    var sportId: Int64 = -1
    var startTime: Int64? = nil
    var endTime: Int64? = nil
    var duration: Double? = nil
    var totalDistance: Double? = nil
    var totalEnergyBurned: Double? = nil
    var sourceName: String? = nil
    var sourceId: String? = nil
    var isIndoor: Bool? = nil
    var embeddedSteps: Int64? = nil
    var elevationAscended: Double? = nil
    var isManual: Bool? = nil
    var deviceName: String? = nil
}

struct HealthHeartRateStats: Hashable {
    var averageBpm: Double? = nil
    var maxBpm: Double? = nil
}

struct HealthRouteLocation: Hashable {
    var latitude: Double? = nil
    var longitude: Double? = nil
    var altitude: Double? = nil
    var speed: Double? = nil
    var course: Double? = nil
    var horizontalAccuracy: Double? = nil
    var verticalAccuracy: Double? = nil
    var timestamp: Int64? = nil
    var ellipsoidalAltitude: Double? = nil
}

struct HealthLapRecord: Hashable {
    var startTime: Int64? = nil
    var endTime: Int64? = nil
    var duration: Double? = nil
    var distance: Double? = nil
    var bpm: Int64? = nil
    var spm: Int64? = nil
    var maxBpm: Int64? = nil
    var totalSteps: Int64? = nil
    var totalCalories: Double? = nil
}

struct HealthChartPoint: Hashable {
    var timestamp: Int64? = nil
    var value: Double? = nil
    var endTimestamp: Int64? = nil
}
