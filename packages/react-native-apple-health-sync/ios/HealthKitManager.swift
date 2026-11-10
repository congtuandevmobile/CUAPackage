import HealthKit

class HealthKitManager {
    static let shared = HealthKitManager()

    let healthStore = HKHealthStore()

    func isAvailable() -> Bool {
        return HKHealthStore.isHealthDataAvailable()
    }
}