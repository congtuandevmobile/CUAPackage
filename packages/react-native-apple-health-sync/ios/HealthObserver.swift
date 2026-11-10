import HealthKit

/// Observes new workouts in HealthKit and tells a listener. With background delivery enabled iOS can wake the app
/// when a workout is added while it is in the background or was terminated: the observer must therefore be created
/// as early as possible (the module does it as soon as JS sets a listener; a host that wants it earlier can call
/// `AppleHealthSyncRuntime.startObservingAtLaunch()` from `application(_:didFinishLaunchingWithOptions:)`).
class HealthObserver {
    private let healthStore = HealthKitManager.shared.healthStore
    private var observerQuery: HKObserverQuery?

    /// Called on the main queue. nil = nobody listens right now (a notification is still acknowledged to iOS).
    var onNewWorkout: (() -> Void)?

    var isObserving: Bool { observerQuery != nil }

    func start() {
        guard observerQuery == nil, HealthKitManager.shared.isAvailable() else { return }
        let workoutType = HKObjectType.workoutType()

        let query = HKObserverQuery(sampleType: workoutType, predicate: nil) { [weak self] _, completionHandler, error in
            defer { completionHandler() }  // Required: otherwise iOS stops delivering and may kill the app
            guard error == nil else { return }
            DispatchQueue.main.async {
                self?.onNewWorkout?()
            }
        }

        observerQuery = query
        healthStore.execute(query)

        // Allow iOS to wake the app when there is a new workout even if the app is in the background/terminated.
        healthStore.enableBackgroundDelivery(for: workoutType, frequency: .immediate) { _, _ in }
    }

    func stop() {
        if let query = observerQuery {
            healthStore.stop(query)
            observerQuery = nil
        }
    }
}
