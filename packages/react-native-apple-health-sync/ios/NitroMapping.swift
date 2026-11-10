import Foundation
import NitroModules

// Native models -> Nitro-generated structs. Int64 -> Double. Keep in step with src/specs/AppleHealthSync.nitro.ts.

extension HealthDataRecord {
    func toNitro() -> NitroHealthDataRecord {
        return NitroHealthDataRecord(
            type: type,
            value: value,
            unit: unit,
            startTime: startTime.map { Double($0) },
            endTime: endTime.map { Double($0) }
        )
    }
}

extension HealthWorkoutRecord {
    func toNitro() -> NitroHealthWorkoutRecord {
        return NitroHealthWorkoutRecord(
            uuid: uuid,
            activityType: activityType,
            sport: sport,
            sportId: Double(sportId),
            startTime: startTime.map { Double($0) },
            endTime: endTime.map { Double($0) },
            duration: duration,
            totalDistance: totalDistance,
            totalEnergyBurned: totalEnergyBurned,
            sourceName: sourceName,
            sourceId: sourceId,
            isIndoor: isIndoor,
            embeddedSteps: embeddedSteps.map { Double($0) },
            elevationAscended: elevationAscended,
            isManual: isManual,
            deviceName: deviceName
        )
    }
}

extension HealthHeartRateStats {
    func toNitro() -> NitroHealthHeartRateStats {
        return NitroHealthHeartRateStats(
            averageBpm: averageBpm,
            maxBpm: maxBpm
        )
    }
}

extension HealthRouteLocation {
    func toNitro() -> NitroHealthRouteLocation {
        return NitroHealthRouteLocation(
            latitude: latitude,
            longitude: longitude,
            altitude: altitude,
            speed: speed,
            course: course,
            horizontalAccuracy: horizontalAccuracy,
            verticalAccuracy: verticalAccuracy,
            timestamp: timestamp.map { Double($0) },
            ellipsoidalAltitude: ellipsoidalAltitude
        )
    }
}

extension HealthLapRecord {
    func toNitro() -> NitroHealthLapRecord {
        return NitroHealthLapRecord(
            startTime: startTime.map { Double($0) },
            endTime: endTime.map { Double($0) },
            duration: duration,
            distance: distance,
            bpm: bpm.map { Double($0) },
            spm: spm.map { Double($0) },
            maxBpm: maxBpm.map { Double($0) },
            totalSteps: totalSteps.map { Double($0) },
            totalCalories: totalCalories
        )
    }
}

extension HealthChartPoint {
    func toNitro() -> NitroHealthChartPoint {
        return NitroHealthChartPoint(
            timestamp: timestamp.map { Double($0) },
            value: value,
            endTimestamp: endTimestamp.map { Double($0) }
        )
    }
}
