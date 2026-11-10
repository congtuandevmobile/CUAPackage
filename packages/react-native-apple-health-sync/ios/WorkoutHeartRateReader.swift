import Foundation
import HealthKit

/// Reads average and maximum heart rate associated with a single workout.
/// Never queries a global startDate → endDate range, which would mix in samples
/// recorded during pauses or by other sources.
final class WorkoutHeartRateReader {
    private let healthStore = HealthKitManager.shared.healthStore

    func read(
        workoutUUID: String,
        completion: @escaping (Result<HealthHeartRateStats, Error>) -> Void
    ) {
        guard let uuid = UUID(uuidString: workoutUUID) else {
            completion(.failure(NSError(
                domain: "HealthKit", code: 400,
                userInfo: [NSLocalizedDescriptionKey: "Invalid workout UUID"])))
            return
        }

        let query = HKSampleQuery(
            sampleType: .workoutType(),
            predicate: HKQuery.predicateForObject(with: uuid),
            limit: 1,
            sortDescriptors: nil
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let workout = samples?.first as? HKWorkout else {
                completion(.failure(NSError(
                    domain: "HealthKit", code: 404,
                    userInfo: [NSLocalizedDescriptionKey: "Workout not found"])))
                return
            }
            self.readStatistics(from: workout, completion: completion)
        }
        healthStore.execute(query)
    }

    private func readStatistics(
        from workout: HKWorkout,
        completion: @escaping (Result<HealthHeartRateStats, Error>) -> Void
    ) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(.success(HealthHeartRateStats(averageBpm: nil, maxBpm: nil)))
            return
        }

        let unit = HKUnit.count().unitDivided(by: .minute())

        @Sendable func validBpm(_ value: Double?) -> Double? {
            guard let value = value, value.isFinite, value > 0 else { return nil }
            return value
        }

        // Query the individual samples associated with this workout. Workout-level
        // statistics are not guaranteed to exclude samples recorded while paused.
        let query = HKSampleQuery(
            sampleType: heartRateType,
            predicate: HKQuery.predicateForObjects(from: workout),
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            let pausedIntervals = self.buildPausedIntervals(
                from: workout.workoutEvents ?? [],
                workoutEnd: workout.endDate
            )
            let values = (samples as? [HKQuantitySample] ?? []).compactMap { sample -> Double? in
                guard sample.startDate >= workout.startDate,
                      sample.startDate <= workout.endDate,
                      !pausedIntervals.contains(where: { sample.startDate >= $0.start && sample.startDate < $0.end })
                else { return nil }
                return validBpm(sample.quantity.doubleValue(for: unit))
            }

            guard !values.isEmpty else {
                // A few HealthKit stores expose older heart-rate data as a quantity
                // series rather than individual samples. Only use the aggregate
                // fallback when there are no pause intervals; otherwise it could
                // reintroduce the paused-time bias this reader is intended to avoid.
                if pausedIntervals.isEmpty {
                    let statisticsQuery = HKStatisticsQuery(
                        quantityType: heartRateType,
                        quantitySamplePredicate: HKQuery.predicateForObjects(from: workout),
                        options: [.discreteAverage, .discreteMax]
                    ) { _, statistics, statisticsError in
                        if let statisticsError = statisticsError {
                            completion(.failure(statisticsError))
                            return
                        }
                        completion(.success(HealthHeartRateStats(
                            averageBpm: validBpm(statistics?.averageQuantity()?.doubleValue(for: unit)),
                            maxBpm: validBpm(statistics?.maximumQuantity()?.doubleValue(for: unit))
                        )))
                    }
                    self.healthStore.execute(statisticsQuery)
                    return
                }
                completion(.success(HealthHeartRateStats(averageBpm: nil, maxBpm: nil)))
                return
            }

            completion(.success(HealthHeartRateStats(
                averageBpm: values.reduce(0, +) / Double(values.count),
                maxBpm: values.max())))
        }
        healthStore.execute(query)
    }

    private func buildPausedIntervals(
        from events: [HKWorkoutEvent],
        workoutEnd: Date
    ) -> [(start: Date, end: Date)] {
        let sorted = events.sorted { $0.dateInterval.start < $1.dateInterval.start }
        var intervals: [(start: Date, end: Date)] = []
        var pauseStart: Date?

        for event in sorted {
            switch event.type {
            case .pause, .motionPaused:
                if pauseStart == nil { pauseStart = event.dateInterval.start }
            case .resume, .motionResumed:
                if let start = pauseStart {
                    intervals.append((start: start, end: event.dateInterval.start))
                    pauseStart = nil
                }
            default:
                break
            }
        }

        if let start = pauseStart, start < workoutEnd {
            intervals.append((start: start, end: workoutEnd))
        }

        return intervals
    }
}
