import HealthKit

/// Which HealthKit data series fits which sport. Decided from the workout's real `HKWorkoutActivityType`, so every
/// sport is handled (a label chosen by the caller can never send a rowing workout to a walking distance series).
enum CadenceKind {
    /// Steps per minute, derived from `stepCount` samples (running, walking, hiking, track and field).
    case stepsPerMinute
    /// Pedal revolutions per minute from `cyclingCadence` (iOS 17+).
    case cyclingRpm
    /// Strokes per minute from `swimmingStrokeCount`.
    case swimmingStrokes
    /// The sport has no cadence series.
    case none
}

enum SportProfile {
    static func cadenceKind(for type: HKWorkoutActivityType) -> CadenceKind {
        switch type {
        case .running, .trackAndField, .walking, .hiking:
            return .stepsPerMinute
        case .cycling, .handCycling:
            return .cyclingRpm
        case .swimming:
            return .swimmingStrokes
        default:
            return .none
        }
    }

    /// The cumulative distance type HealthKit records for the sport. Sports without their own type (soccer, tennis...)
    /// use `distanceWalkingRunning`, which is what the Watch records on foot; the series is simply empty when the
    /// workout has none.
    static func distanceIdentifier(for type: HKWorkoutActivityType) -> HKQuantityTypeIdentifier {
        switch type {
        case .cycling, .handCycling:
            return .distanceCycling
        case .swimming:
            return .distanceSwimming
        case .wheelchairWalkPace, .wheelchairRunPace:
            return .distanceWheelchair
        case .downhillSkiing, .snowboarding, .snowSports:
            return .distanceDownhillSnowSports
        case .crossCountrySkiing:
            if #available(iOS 18.0, *) { return .distanceCrossCountrySkiing }
            return .distanceWalkingRunning
        case .rowing:
            if #available(iOS 18.0, *) { return .distanceRowing }
            return .distanceWalkingRunning
        case .paddleSports:
            if #available(iOS 18.0, *) { return .distancePaddleSports }
            return .distanceWalkingRunning
        case .skatingSports:
            if #available(iOS 18.0, *) { return .distanceSkatingSports }
            return .distanceWalkingRunning
        default:
            return .distanceWalkingRunning
        }
    }
}

/// A failure that reaches JS as a rejected promise; its description is `CODE: message`.
final class HealthKitSyncError: Error, LocalizedError, CustomStringConvertible, @unchecked Sendable {
    let code: String
    let message: String

    init(code: String, message: String) {
        self.code = code
        self.message = message
    }

    var errorDescription: String? { "\(code): \(message)" }
    var description: String { "\(code): \(message)" }
}
