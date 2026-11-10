import HealthKit

class HealthTypeUtils {
    
    static func getTypeIdentifier(from key: String) -> HKQuantityTypeIdentifier? {
        switch key {
        case "steps": return .stepCount
        case "distance_walking_running": return .distanceWalkingRunning
        case "distance_cycling": return .distanceCycling
        case "distance_swimming": return .distanceSwimming
        case "flights_climbed": return .flightsClimbed
        case "active_energy": return .activeEnergyBurned
        case "basal_energy": return .basalEnergyBurned
            
        case "heart_rate": return .heartRate
        case "oxygen_saturation": return .oxygenSaturation 
        case "blood_pressure_systolic": return .bloodPressureSystolic
        case "body_temperature": return .bodyTemperature

        case "vo2_max": return .vo2Max

        case "cycling_cadence":
            if #available(iOS 17.0, *) { return .cyclingCadence } else { return nil }
        case "swimming_stroke_count": return .swimmingStrokeCount
        case "distance_wheelchair": return .distanceWheelchair
        case "distance_downhill_snow_sports": return .distanceDownhillSnowSports
        case "distance_rowing":
            if #available(iOS 18.0, *) { return .distanceRowing } else { return nil }
        case "distance_paddle_sports":
            if #available(iOS 18.0, *) { return .distancePaddleSports } else { return nil }
        case "distance_skating_sports":
            if #available(iOS 18.0, *) { return .distanceSkatingSports } else { return nil }
        case "distance_cross_country_skiing":
            if #available(iOS 18.0, *) { return .distanceCrossCountrySkiing } else { return nil }

        case "running_speed":
            if #available(iOS 16.0, *) { return .runningSpeed } else { return nil }
        case "running_power":
            if #available(iOS 16.0, *) { return .runningPower } else { return nil }

        default: return nil
        }
    }

    static func getUnit(for type: HKQuantityTypeIdentifier) -> HKUnit {
        switch type {
        case .heartRate: return HKUnit.count().unitDivided(by: .minute())
        case .oxygenSaturation: return HKUnit.percent()
        case .activeEnergyBurned, .basalEnergyBurned: return HKUnit.kilocalorie()
        case .distanceWalkingRunning, .distanceCycling, .distanceSwimming, .distanceWheelchair,
            .distanceDownhillSnowSports: return HKUnit.meter()
        case .bodyTemperature: return HKUnit.degreeCelsius()
        case .vo2Max: return HKUnit.literUnit(with: .milli).unitDivided(by: HKUnit.gramUnit(with: .kilo).unitMultiplied(by: .minute()))
        case .swimmingStrokeCount: return HKUnit.count()
        default:
            if #available(iOS 18.0, *),
                type == .distanceRowing || type == .distancePaddleSports || type == .distanceSkatingSports
                    || type == .distanceCrossCountrySkiing
            { return HKUnit.meter() }
            if #available(iOS 17.0, *), type == .cyclingCadence { return HKUnit.count().unitDivided(by: .minute()) }
            if #available(iOS 16.0, *), type == .runningPower   { return HKUnit.watt() }
            if #available(iOS 16.0, *), type == .runningSpeed   { return HKUnit.meter().unitDivided(by: .second()) }
            return HKUnit.count()
        }
    }
    
    static func getAllSupportedTypes() -> Set<HKObjectType> {
        let identifiers: [HKQuantityTypeIdentifier] = [
            .stepCount,
            .distanceWalkingRunning,
            .distanceCycling,
            .distanceSwimming,
            .distanceWheelchair,
            .distanceDownhillSnowSports,
            .flightsClimbed,
            .activeEnergyBurned,
            .heartRate,
            .oxygenSaturation,
            .bodyTemperature,
            .vo2Max
        ]
        
        let types = identifiers.compactMap { HKObjectType.quantityType(forIdentifier: $0) }
        var typeSet = Set<HKObjectType>(types)

        typeSet.insert(HKObjectType.workoutType())
        
        typeSet.insert(HKSeriesType.workoutRoute())

        if let strokes = HKObjectType.quantityType(forIdentifier: .swimmingStrokeCount) {
            typeSet.insert(strokes)
        }
        if #available(iOS 18.0, *) {
            let sportDistances: [HKQuantityTypeIdentifier] = [
                .distanceRowing, .distancePaddleSports, .distanceSkatingSports, .distanceCrossCountrySkiing,
            ]
            for id in sportDistances {
                if let type = HKObjectType.quantityType(forIdentifier: id) { typeSet.insert(type) }
            }
        }
        if #available(iOS 16.0, *) {
            if let speed = HKObjectType.quantityType(forIdentifier: .runningSpeed) { typeSet.insert(speed) }
            if let power = HKObjectType.quantityType(forIdentifier: .runningPower) { typeSet.insert(power) }
        }
        if #available(iOS 17.0, *) {
            if let cycling = HKObjectType.quantityType(forIdentifier: .cyclingCadence) { typeSet.insert(cycling) }
        }

        return typeSet
    }
}