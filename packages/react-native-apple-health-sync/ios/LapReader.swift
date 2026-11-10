import HealthKit

class LapReader {

    func readLaps(
        workoutUUID: String,
        completion: @escaping (Result<[HealthLapRecord], Error>) -> Void
    ) {
        guard let uuid = UUID(uuidString: workoutUUID) else {
            completion(.success([]))
            return
        }

        let predicate = HKQuery.predicateForObject(with: uuid)
        let query = HKSampleQuery(
            sampleType: .workoutType(),
            predicate: predicate,
            limit: 1,
            sortDescriptors: nil
        ) { [weak self] _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let self = self, let workout = samples?.first as? HKWorkout else {
                completion(.success([]))
                return
            }

            let lapEvents = workout.workoutEvents?.filter { $0.type == .lap } ?? []
            guard !lapEvents.isEmpty else {
                completion(.success([]))
                return
            }

            self.fetchLapsWithStats(
                events: lapEvents,
                workout: workout,
                completion: completion
            )
        }

        HealthKitManager.shared.healthStore.execute(query)
    }

    // Fetch BPM + SPM per lap async using DispatchGroup, maintain original order.
    private func fetchLapsWithStats(
        events: [HKWorkoutEvent],
        workout: HKWorkout,
        completion: @escaping (Result<[HealthLapRecord], Error>) -> Void
    ) {
        let outerGroup = DispatchGroup()
        let lock = NSLock()
        var records: [Int: HealthLapRecord] = [:]

        for (i, event) in events.enumerated() {
            outerGroup.enter()

            let pred = HKQuery.predicateForSamples(
                withStart: event.dateInterval.start,
                end:       event.dateInterval.end,
                options:   .strictStartDate
            )

            let startMs = Int64(event.dateInterval.start.timeIntervalSince1970 * 1000)
            let endMs   = Int64(event.dateInterval.end.timeIntervalSince1970 * 1000)
            let distanceM: Double = {
                if let qty = event.metadata?[HKMetadataKeyLapLength] as? HKQuantity {
                    return qty.doubleValue(for: .meter())
                }
                return -1.0
            }()

            let innerGroup = DispatchGroup()
            var lapBPM: Int64 = -1
            var lapMaxBPM: Int64 = -1
            var lapSPM: Int64 = -1
            var lapTotalSteps: Int64 = -1
            var lapTotalCalories: Double = -1.0

            // Avg + Max heart rate for this lap
            if let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) {
                innerGroup.enter()
                let q = HKStatisticsQuery(
                    quantityType: hrType,
                    quantitySamplePredicate: pred,
                    options: [.discreteAverage, .discreteMax]
                ) { _, result, _ in
                    if let avg = result?.averageQuantity()?
                        .doubleValue(for: HKUnit(from: "count/min")) {
                        lapBPM = Int64(avg.rounded())
                    }
                    if let max = result?.maximumQuantity()?
                        .doubleValue(for: HKUnit(from: "count/min")) {
                        lapMaxBPM = Int64(max.rounded())
                    }
                    innerGroup.leave()
                }
                HealthKitManager.shared.healthStore.execute(q)
            }

            // Steps (running / walking only) — total + SPM
            let actType = workout.workoutActivityType
            if (actType == .running || actType == .walking),
               let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount),
               event.dateInterval.duration > 0
            {
                innerGroup.enter()
                let q = HKStatisticsQuery(
                    quantityType: stepsType,
                    quantitySamplePredicate: pred,
                    options: .cumulativeSum
                ) { _, result, _ in
                    if let total = result?.sumQuantity()?.doubleValue(for: .count()) {
                        lapTotalSteps = Int64(total)
                        let minutes = event.dateInterval.duration / 60.0
                        lapSPM = Int64(total / minutes)
                    }
                    innerGroup.leave()
                }
                HealthKitManager.shared.healthStore.execute(q)
            }

            // Calories for this lap
            if let caloType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
                innerGroup.enter()
                let q = HKStatisticsQuery(
                    quantityType: caloType,
                    quantitySamplePredicate: pred,
                    options: .cumulativeSum
                ) { _, result, _ in
                    if let total = result?.sumQuantity()?.doubleValue(for: .kilocalorie()) {
                        lapTotalCalories = total
                    }
                    innerGroup.leave()
                }
                HealthKitManager.shared.healthStore.execute(q)
            }

            innerGroup.notify(queue: .global()) {
                let record = HealthLapRecord(
                    startTime:     startMs,
                    endTime:       endMs,
                    duration:      event.dateInterval.duration,
                    distance:      distanceM,
                    bpm:           lapBPM,
                    spm:           lapSPM,
                    maxBpm:        lapMaxBPM,
                    totalSteps:    lapTotalSteps,
                    totalCalories: lapTotalCalories
                )
                lock.lock()
                records[i] = record
                lock.unlock()
                outerGroup.leave()
            }
        }

        outerGroup.notify(queue: .global()) {
            let sorted = (0..<events.count).compactMap { records[$0] }
            completion(.success(sorted))
        }
    }
}
