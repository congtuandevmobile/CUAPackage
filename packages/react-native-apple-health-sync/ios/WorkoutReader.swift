import HealthKit

class WorkoutReader {

    /// Reads the workouts of EVERY sport in the range, newest first.
    ///
    /// There is deliberately no activity-type predicate: a list of sports would silently drop every sport that is not
    /// on it (and every sport Apple adds later). Each record carries its exact sport (`sport` / `sportId`, see
    /// `SportCatalog`); the legacy coarse `activityType` is still filled for apps that use it.
    ///
    /// - Parameter onlyAppleSources: keep only workouts written by an app whose bundle id starts with `com.apple.`.
    func readWorkouts(
        startTime: Int64,
        endTime: Int64,
        onlyAppleSources: Bool,
        completion: @escaping (Result<[HealthWorkoutRecord], Error>) -> Void
    ) {
        let startDate = Date(timeIntervalSince1970: TimeInterval(startTime) / 1000)
        let endDate = Date(timeIntervalSince1970: TimeInterval(endTime) / 1000)

        let predicate = HKQuery.predicateForSamples(
            withStart: startDate, end: endDate, options: .strictStartDate)

        let sortDescriptor = NSSortDescriptor(
            key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: .workoutType(),
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] (query, samples, error) in

            if let error = error {
                completion(.failure(error))
                return
            }

            guard let self = self, let workouts = samples as? [HKWorkout] else {
                completion(.success([]))
                return
            }

            let kept = onlyAppleSources
                ? workouts.filter { $0.sourceRevision.source.bundleIdentifier.hasPrefix("com.apple.") }
                : workouts
            completion(.success(kept.map { self.mapToRecord($0) }))
        }

        HealthKitManager.shared.healthStore.execute(query)
    }

    private func mapToRecord(_ workout: HKWorkout) -> HealthWorkoutRecord {
        // Read step count embedded in the workout object (iOS 16+).
        // This is more accurate than a separate HKStatisticsQuery because it
        // only counts steps recorded by the same source as the workout.
        var embeddedSteps: Int64 = -1
        if #available(iOS 16.0, *),
           let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount),
           let stepStats = workout.statistics(for: stepType),
           let sum = stepStats.sumQuantity()
        {
            embeddedSteps = Int64(sum.doubleValue(for: .count()).rounded())
        }

        let activeEnergyKcal: Double? = {
            if #available(iOS 16.0, *),
               let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned),
               let stats = workout.statistics(for: energyType),
               let sum = stats.sumQuantity()
            {
                return sum.doubleValue(for: .kilocalorie())
            }
            return workout.totalEnergyBurned?.doubleValue(for: .kilocalorie())
        }()

        let elevationAscended: Double = (workout.metadata?[HKMetadataKeyElevationAscended] as? HKQuantity)
            .map { $0.doubleValue(for: .meter()) } ?? -1.0

        let isManual = workout.metadata?[HKMetadataKeyWasUserEntered] as? Bool ?? false
        let deviceName = isManual ? nil : Self.resolveDeviceName(workout: workout)

        return HealthWorkoutRecord(
            uuid: workout.uuid.uuidString,
            activityType: mapActivityType(workout),
            sport: SportCatalog.name(of: workout.workoutActivityType),
            sportId: Int64(workout.workoutActivityType.rawValue),
            startTime: Int64(workout.startDate.timeIntervalSince1970 * 1000),
            endTime: Int64(workout.endDate.timeIntervalSince1970 * 1000),
            duration: workout.duration,
            totalDistance: workout.totalDistance?.doubleValue(for: .meter()),
            totalEnergyBurned: activeEnergyKcal,
            sourceName: workout.sourceRevision.source.name,
            sourceId: workout.sourceRevision.source.bundleIdentifier,
            isIndoor: (workout.metadata?[HKMetadataKeyIndoorWorkout] as? Bool),
            embeddedSteps: embeddedSteps,
            elevationAscended: elevationAscended,
            isManual: isManual,
            deviceName: deviceName
        )
    }

    // MARK: - Device name resolution

    /// Maps workout.sourceRevision.productType (e.g. "Watch5,4") to a human-readable
    /// model name (e.g. "Apple Watch Series 5"), mirroring how Strava resolves device names.
    /// Falls back to workout.device?.name when no mapping is found.
    private static func resolveDeviceName(workout: HKWorkout) -> String? {
        if let productType = workout.sourceRevision.productType {
            if let name = appleWatchModelNames[productType] { return name }
            if let name = iPhoneModelNames[productType] { return name }
        }
        return workout.device?.name
    }

    /// productType → human-readable device name.
    /// Source: github.com/adamawolf/Apple_mobile_device_types (community-maintained).
    private static let appleWatchModelNames: [String: String] = [
        // Apple Watch (1st generation, 2015)
        "Watch1,1": "Apple Watch",
        "Watch1,2": "Apple Watch",
        // Apple Watch Series 1 (2016)
        "Watch2,6": "Apple Watch Series 1",
        "Watch2,7": "Apple Watch Series 1",
        // Apple Watch Series 2 (2016)
        "Watch2,3": "Apple Watch Series 2",
        "Watch2,4": "Apple Watch Series 2",
        // Apple Watch Series 3 (2017)
        "Watch3,1": "Apple Watch Series 3",
        "Watch3,2": "Apple Watch Series 3",
        "Watch3,3": "Apple Watch Series 3",
        "Watch3,4": "Apple Watch Series 3",
        // Apple Watch Series 4 (2018)
        "Watch4,1": "Apple Watch Series 4",
        "Watch4,2": "Apple Watch Series 4",
        "Watch4,3": "Apple Watch Series 4",
        "Watch4,4": "Apple Watch Series 4",
        // Apple Watch Series 5 (2019)
        "Watch5,1": "Apple Watch Series 5",
        "Watch5,2": "Apple Watch Series 5",
        "Watch5,3": "Apple Watch Series 5",
        "Watch5,4": "Apple Watch Series 5",
        // Apple Watch SE 1st generation (2020)
        "Watch5,9":  "Apple Watch SE",
        "Watch5,10": "Apple Watch SE",
        "Watch5,11": "Apple Watch SE",
        "Watch5,12": "Apple Watch SE",
        // Apple Watch Series 6 (2020)
        "Watch6,1": "Apple Watch Series 6",
        "Watch6,2": "Apple Watch Series 6",
        "Watch6,3": "Apple Watch Series 6",
        "Watch6,4": "Apple Watch Series 6",
        // Apple Watch Series 7 (2021)
        "Watch6,6": "Apple Watch Series 7",
        "Watch6,7": "Apple Watch Series 7",
        "Watch6,8": "Apple Watch Series 7",
        "Watch6,9": "Apple Watch Series 7",
        // Apple Watch SE 2nd generation (2022)
        "Watch6,10": "Apple Watch SE (2nd Gen)",
        "Watch6,11": "Apple Watch SE (2nd Gen)",
        "Watch6,12": "Apple Watch SE (2nd Gen)",
        "Watch6,13": "Apple Watch SE (2nd Gen)",
        // Apple Watch Series 8 (2022)
        "Watch6,14": "Apple Watch Series 8",
        "Watch6,15": "Apple Watch Series 8",
        "Watch6,16": "Apple Watch Series 8",
        "Watch6,17": "Apple Watch Series 8",
        // Apple Watch Ultra (2022)
        "Watch6,18": "Apple Watch Ultra",
        // Apple Watch Series 9 (2023)
        "Watch7,1": "Apple Watch Series 9",
        "Watch7,2": "Apple Watch Series 9",
        "Watch7,3": "Apple Watch Series 9",
        "Watch7,4": "Apple Watch Series 9",
        // Apple Watch Ultra 2 (2023)
        "Watch7,5": "Apple Watch Ultra 2",
        // Apple Watch Series 10 (2024)
        "Watch7,8":  "Apple Watch Series 10",
        "Watch7,9":  "Apple Watch Series 10",
        "Watch7,10": "Apple Watch Series 10",
        "Watch7,11": "Apple Watch Series 10",
        // Apple Watch Ultra 3 (2025)
        "Watch7,12": "Apple Watch Ultra 3",
        // Apple Watch SE 3 (2025)
        "Watch7,13": "Apple Watch SE 3",
        "Watch7,14": "Apple Watch SE 3",
        "Watch7,15": "Apple Watch SE 3",
        "Watch7,16": "Apple Watch SE 3",
        // Apple Watch Series 11 (2025)
        "Watch7,17": "Apple Watch Series 11",
        "Watch7,18": "Apple Watch Series 11",
        "Watch7,19": "Apple Watch Series 11",
        "Watch7,20": "Apple Watch Series 11",
        // Apple Watch Ultra 4 (2026)
        "Watch8,1": "Apple Watch Ultra 4",
        // Apple Watch Series 12 (2026)
        "Watch8,2": "Apple Watch Series 12",
        "Watch8,3": "Apple Watch Series 12",
        "Watch8,4": "Apple Watch Series 12",
        "Watch8,5": "Apple Watch Series 12",
    ]

    /// productType → human-readable iPhone model name.
    /// Source: github.com/adamawolf/Apple_mobile_device_types (community-maintained).
    private static let iPhoneModelNames: [String: String] = [
        // Simulators
        "i386": "iPhone Simulator",
        "x86_64": "iPhone Simulator",
        "arm64": "iPhone Simulator",
        // iPhone (2007)
        "iPhone1,1": "iPhone",
        "iPhone1,2": "iPhone 3G",
        "iPhone2,1": "iPhone 3GS",
        // iPhone 4
        "iPhone3,1": "iPhone 4",
        "iPhone3,2": "iPhone 4",
        "iPhone3,3": "iPhone 4",
        "iPhone4,1": "iPhone 4S",
        // iPhone 5 series
        "iPhone5,1": "iPhone 5",
        "iPhone5,2": "iPhone 5",
        "iPhone5,3": "iPhone 5c",
        "iPhone5,4": "iPhone 5c",
        "iPhone6,1": "iPhone 5s",
        "iPhone6,2": "iPhone 5s",
        // iPhone 6 series
        "iPhone7,1": "iPhone 6 Plus",
        "iPhone7,2": "iPhone 6",
        "iPhone8,1": "iPhone 6s",
        "iPhone8,2": "iPhone 6s Plus",
        "iPhone8,4": "iPhone SE",
        // iPhone 7 series
        "iPhone9,1": "iPhone 7",
        "iPhone9,2": "iPhone 7 Plus",
        "iPhone9,3": "iPhone 7",
        "iPhone9,4": "iPhone 7 Plus",
        // iPhone 8 / X series
        "iPhone10,1": "iPhone 8",
        "iPhone10,2": "iPhone 8 Plus",
        "iPhone10,3": "iPhone X",
        "iPhone10,4": "iPhone 8",
        "iPhone10,5": "iPhone 8 Plus",
        "iPhone10,6": "iPhone X",
        // iPhone XS / XR
        "iPhone11,2": "iPhone XS",
        "iPhone11,4": "iPhone XS Max",
        "iPhone11,6": "iPhone XS Max",
        "iPhone11,8": "iPhone XR",
        // iPhone 11 series
        "iPhone12,1": "iPhone 11",
        "iPhone12,3": "iPhone 11 Pro",
        "iPhone12,5": "iPhone 11 Pro Max",
        "iPhone12,8": "iPhone SE (2nd Gen)",
        // iPhone 12 series
        "iPhone13,1": "iPhone 12 mini",
        "iPhone13,2": "iPhone 12",
        "iPhone13,3": "iPhone 12 Pro",
        "iPhone13,4": "iPhone 12 Pro Max",
        // iPhone 13 series
        "iPhone14,2": "iPhone 13 Pro",
        "iPhone14,3": "iPhone 13 Pro Max",
        "iPhone14,4": "iPhone 13 mini",
        "iPhone14,5": "iPhone 13",
        "iPhone14,6": "iPhone SE (3rd Gen)",
        // iPhone 14 series
        "iPhone14,7": "iPhone 14",
        "iPhone14,8": "iPhone 14 Plus",
        "iPhone15,2": "iPhone 14 Pro",
        "iPhone15,3": "iPhone 14 Pro Max",
        // iPhone 15 series
        "iPhone15,4": "iPhone 15",
        "iPhone15,5": "iPhone 15 Plus",
        "iPhone16,1": "iPhone 15 Pro",
        "iPhone16,2": "iPhone 15 Pro Max",
        // iPhone 16 series
        "iPhone17,1": "iPhone 16 Pro",
        "iPhone17,2": "iPhone 16 Pro Max",
        "iPhone17,3": "iPhone 16",
        "iPhone17,4": "iPhone 16 Plus",
        "iPhone17,5": "iPhone 16e",
        // iPhone 17 series
        "iPhone18,1": "iPhone 17 Pro",
        "iPhone18,2": "iPhone 17 Pro Max",
        "iPhone18,3": "iPhone 17",
        "iPhone18,4": "iPhone Air",
        "iPhone18,5": "iPhone 17e",
        // iPhone 18 series (community-confirmed from Xcode 27.1 beta)
        "iPhone19,2": "iPhone 18 Pro",
        "iPhone19,3": "iPhone 18 Pro Max",
        "iPhone19,4": "iPhone Duo",
        "iPhone19,7": "iPhone 18 Pro Max",
    ]

    private func mapActivityType(_ workout: HKWorkout) -> String {
        let isIndoor = workout.metadata?[HKMetadataKeyIndoorWorkout] as? Bool ?? false
        switch workout.workoutActivityType {
        case .running, .trackAndField:
            return isIndoor ? "running_indoor" : "running"
        case .walking, .hiking:
            return isIndoor ? "running_indoor" : "walking"
        case .swimming:
            if let locationType = workout.metadata?[HKMetadataKeySwimmingLocationType] as? Int {
                return locationType == 1 ? "swimming_pool" : "swimming_open_water"
            }
            return isIndoor ? "swimming_pool" : "swimming_open_water"
        case .cycling, .handCycling:
            return isIndoor ? "cycling_indoor" : "cycling"
        default:
            return "activity"
        }
    }
}
