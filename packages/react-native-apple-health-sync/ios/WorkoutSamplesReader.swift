import HealthKit

/// Reads time-series samples (heart rate and cadence) scoped to a specific HKWorkout.
/// Used to populate workout-detail charts in the app.
///
/// Apple HealthKit may condense older workout samples into HKQuantitySeries.
/// This reader transparently expands condensed series via HKQuantitySeriesSampleQuery
/// so callers always receive individual time-stamped data points.
class WorkoutSamplesReader {

    // MARK: - Public API

    func readHeartRateSamples(
        workoutUUID: String,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let mainCompletion: (Result<[HealthChartPoint], Error>) -> Void = { result in
            DispatchQueue.main.async { completion(result) }
        }
        findWorkout(by: workoutUUID) { [weak self] result in
            switch result {
            case .failure(let error):
                mainCompletion(.failure(error))
            case .success(let workout):
                self?.queryHeartRate(from: workout, completion: mainCompletion)
            }
        }
    }

    /// Returns incremental distance samples for a workout.
    /// Each HealthChartPoint: timestamp = sample startDate ms, endTimestamp = sample endDate ms,
    /// value = meters for that interval.
    /// Source: distanceWalkingRunning / distanceCycling / distanceSwimming
    /// (GPS + accelerometer fusion — same source Apple uses for workout.totalDistance).
    func readDistanceSamples(
        workoutUUID: String,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let mainCompletion: (Result<[HealthChartPoint], Error>) -> Void = { result in
            DispatchQueue.main.async { completion(result) }
        }
        findWorkout(by: workoutUUID) { [weak self] result in
            switch result {
            case .failure(let error):
                mainCompletion(.failure(error))
            case .success(let workout):
                self?.queryDistance(from: workout, completion: mainCompletion)
            }
        }
    }

    func readCadenceSamples(
        workoutUUID: String,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let mainCompletion: (Result<[HealthChartPoint], Error>) -> Void = { result in
            DispatchQueue.main.async { completion(result) }
        }
        findWorkout(by: workoutUUID) { [weak self] result in
            switch result {
            case .failure(let error):
                mainCompletion(.failure(error))
            case .success(let workout):
                self?.queryCadence(from: workout, completion: mainCompletion)
            }
        }
    }

    // MARK: - Workout Lookup

    private func findWorkout(
        by uuidString: String,
        completion: @escaping (Result<HKWorkout, Error>) -> Void
    ) {
        guard let uuid = UUID(uuidString: uuidString) else {
            completion(.failure(HealthKitSyncError(
                code: "INVALID_UUID",
                message: "Invalid workout UUID: \(uuidString)"
            )))
            return
        }

        let predicate = HKQuery.predicateForObject(with: uuid)
        let query = HKSampleQuery(
            sampleType: .workoutType(),
            predicate: predicate,
            limit: 1,
            sortDescriptors: nil
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let workout = samples?.first as? HKWorkout else {
                completion(.failure(HealthKitSyncError(
                    code: "WORKOUT_NOT_FOUND",
                    message: "No workout found for UUID: \(uuidString)"
                    )))
                return
            }
            completion(.success(workout))
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    // MARK: - Heart Rate

    private func queryHeartRate(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
            completion(.success([]))
            return
        }

        // predicateForObjects(from:) is the canonical Apple-recommended approach to scope
        // samples to a specific workout. More reliable than a time-range predicate.
        let predicate = HKQuery.predicateForObjects(from: workout)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: hrType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let self = self else {
                completion(.success([]))
                return
            }
            let discreteSamples = samples as? [HKDiscreteQuantitySample] ?? []
            if !discreteSamples.isEmpty {
                self.expandHeartRateSamples(discreteSamples, hrType: hrType, completion: completion)
            } else {
                self.queryHeartRateByTimeRange(workout: workout, hrType: hrType, completion: completion)
            }
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    private func queryHeartRateByTimeRange(
        workout: HKWorkout,
        hrType: HKQuantityType,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: hrType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let self = self else {
                completion(.success([]))
                return
            }
            let discreteSamples = samples as? [HKDiscreteQuantitySample] ?? []
            self.expandHeartRateSamples(discreteSamples, hrType: hrType, completion: completion)
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    /// Apple may condense older workout heart-rate samples into HKQuantitySeries.
    /// A condensed sample has count > 1 and must be expanded via HKQuantitySeriesSampleQuery
    /// to recover the original individual measurements.
    private func expandHeartRateSamples(
        _ samples: [HKDiscreteQuantitySample],
        hrType: HKQuantityType,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let hrUnit = HKUnit(from: "count/min")
        var points: [HealthChartPoint] = []
        let group = DispatchGroup()
        let lock = NSLock()

        for sample in samples {
            if sample.count == 1 {
                // Regular (non-condensed) sample. Use startDate as the measurement instant.
                let ts = Int64(sample.startDate.timeIntervalSince1970 * 1000)
                let bpm = sample.quantity.doubleValue(for: hrUnit)
                lock.lock()
                points.append(HealthChartPoint(timestamp: ts, value: bpm))
                lock.unlock()
            } else {
                // Condensed series: expand to get each original measurement + its exact timestamp.
                group.enter()
                let seriesPredicate = HKQuery.predicateForObject(with: sample.uuid)
                let detailQuery = HKQuantitySeriesSampleQuery(
                    quantityType: hrType,
                    predicate: seriesPredicate
                ) { _, quantity, dateInterval, _, done, error in
                    if let quantity = quantity, let interval = dateInterval {
                        let ts = Int64(interval.start.timeIntervalSince1970 * 1000)
                        let bpm = quantity.doubleValue(for: hrUnit)
                        lock.lock()
                        points.append(HealthChartPoint(timestamp: ts, value: bpm))
                        lock.unlock()
                    }
                    if done { group.leave() }
                }
                HealthKitManager.shared.healthStore.execute(detailQuery)
            }
        }

        group.notify(queue: .global()) {
            let sorted = points.sorted { ($0.timestamp ?? 0) < ($1.timestamp ?? 0) }
            completion(.success(sorted))
        }
    }

    // MARK: - Cadence (activity-aware)

    private func queryCadence(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        // The kind of cadence comes from the workout's real sport, not from a caller-supplied label.
        switch SportProfile.cadenceKind(for: workout.workoutActivityType) {
        case .stepsPerMinute:
            queryRunningCadence(from: workout, completion: completion)
        case .cyclingRpm:
            queryCyclingCadence(from: workout, completion: completion)
        case .swimmingStrokes:
            querySwimmingCadence(from: workout, completion: completion)
        case .none:
            // A sport with no cadence concept (e.g. yoga, strength training, soccer).
            completion(.success([]))
        }
    }

    // MARK: Running / Walking: derive SPM from stepCount samples

    /// HealthKit does not expose a dedicated "running cadence" quantity type.
    /// Each stepCount HKQuantitySample associated with a workout has a startDate
    /// and endDate. We compute steps-per-minute for that interval and plot it at
    /// the sample midpoint so the chart aligns correctly on the time axis.
    private func queryRunningCadence(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        guard let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(.success([]))
            return
        }

        let predicate = HKQuery.predicateForObjects(from: workout)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: stepsType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            let points: [HealthChartPoint] = (samples as? [HKQuantitySample] ?? []).compactMap { sample in
                let durationSec = sample.endDate.timeIntervalSince(sample.startDate)
                guard durationSec > 0 else { return nil }
                let steps = sample.quantity.doubleValue(for: .count())
                let spm = (steps / (durationSec / 60.0)).rounded()
                // Plot at the midpoint of the sample's time interval.
                let midMs = Int64((sample.startDate.timeIntervalSince1970 + durationSec / 2) * 1000)
                return HealthChartPoint(timestamp: midMs, value: spm)
            }
            completion(.success(points))
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    // MARK: Cycling: cyclingCadence (iOS 17+)

    /// cyclingCadence is only available from iOS 17 onward. On older OS versions
    /// we return an empty list rather than a fatal error — the UI should handle this
    /// by simply not rendering the cadence chart.
    private func queryCyclingCadence(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        guard #available(iOS 17.0, *),
              let cadenceType = HKQuantityType.quantityType(forIdentifier: .cyclingCadence)
        else {
            completion(.success([]))
            return
        }

        let predicate = HKQuery.predicateForObjects(from: workout)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        // cyclingCadence unit is revolutions/min (count/min in HealthKit terms).
        let unit = HKUnit.count().unitDivided(by: .minute())

        let query = HKSampleQuery(
            sampleType: cadenceType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            let points: [HealthChartPoint] = (samples as? [HKQuantitySample] ?? []).map { sample in
                let ts = Int64(sample.startDate.timeIntervalSince1970 * 1000)
                let rpm = sample.quantity.doubleValue(for: unit)
                return HealthChartPoint(timestamp: ts, value: rpm)
            }
            completion(.success(points))
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    // MARK: Swimming: derive strokes/min from swimmingStrokeCount samples

    private func querySwimmingCadence(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        guard let strokeType = HKQuantityType.quantityType(forIdentifier: .swimmingStrokeCount) else {
            completion(.success([]))
            return
        }

        let predicate = HKQuery.predicateForObjects(from: workout)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: strokeType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            let quantitySamples = samples as? [HKQuantitySample] ?? []
            if !quantitySamples.isEmpty {
                let points = self?.strokeSamplesToChartPoints(quantitySamples) ?? []
                completion(.success(points))
            } else {
                self?.querySwimmingCadenceByTimeRange(workout: workout, strokeType: strokeType, completion: completion)
            }
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    private func querySwimmingCadenceByTimeRange(
        workout: HKWorkout,
        strokeType: HKQuantityType,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: .strictStartDate
        )
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: strokeType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            let points = self?.strokeSamplesToChartPoints(samples as? [HKQuantitySample] ?? []) ?? []
            completion(.success(points))
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    private func strokeSamplesToChartPoints(_ samples: [HKQuantitySample]) -> [HealthChartPoint] {
        return samples.compactMap { sample in
            let durationSec = sample.endDate.timeIntervalSince(sample.startDate)
            guard durationSec > 0 else { return nil }
            let strokes = sample.quantity.doubleValue(for: .count())
            let spm = (strokes / (durationSec / 60.0)).rounded()
            let midMs = Int64((sample.startDate.timeIntervalSince1970 + durationSec / 2) * 1000)
            return HealthChartPoint(timestamp: midMs, value: spm)
        }
    }

    // MARK: - Per-km splits (pause-aware)

    /// Returns per-km splits with active duration (pause time excluded).
    /// Each HealthChartPoint: timestamp = approx split end ms, value = active seconds for that km.
    /// The last point may be a partial km; its distance is encoded as a fractional km in timestamp
    ///.
    func readKmSplits(
        workoutUUID: String,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let mainCompletion: (Result<[HealthChartPoint], Error>) -> Void = { result in
            DispatchQueue.main.async { completion(result) }
        }
        findWorkout(by: workoutUUID) { [weak self] result in
            switch result {
            case .failure(let error):
                mainCompletion(.failure(error))
            case .success(let workout):
                self?.computeKmSplits(from: workout, completion: mainCompletion)
            }
        }
    }

    private func computeKmSplits(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let quantityIdentifier = SportProfile.distanceIdentifier(for: workout.workoutActivityType)

        guard let distanceType = HKQuantityType.quantityType(forIdentifier: quantityIdentifier) else {
            completion(.success([]))
            return
        }

        // Build paused intervals from workout events (.pause/.motionPaused → .resume/.motionResumed).
        let pausedIntervals = buildPausedIntervals(from: workout.workoutEvents ?? [])

        let predicate = HKQuery.predicateForObjects(from: workout)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: distanceType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { [weak self] _, samples, error in
            guard let self = self else { completion(.success([])); return }
            if let error = error { completion(.failure(error)); return }

            let quantitySamples = samples as? [HKQuantitySample] ?? []
            guard !quantitySamples.isEmpty else { completion(.success([])); return }

            var splits: [HealthChartPoint] = []
            var cumMeters = 0.0
            var lapStartCumMeters = 0.0
            // kmStartDate tracks the timestamp where the current km began.
            // Use workout.startDate (not first sample) to match Apple Fitness lap timing.
            var kmStartDate = workout.startDate

            for sample in quantitySamples {
                let meters = sample.quantity.doubleValue(for: .meter())
                guard meters > 0 else { continue }

                cumMeters += meters

                // Check if we crossed a km boundary.
                while cumMeters - lapStartCumMeters >= 1000.0 {
                    // Fraction of this sample that lands us exactly on the km boundary.
                    let needed = 1000.0 - (cumMeters - lapStartCumMeters - meters)
                    let fraction = meters > 0 ? needed / meters : 0.0
                    let sampleDuration = sample.endDate.timeIntervalSince(sample.startDate)
                    let splitEndDate = sample.startDate.addingTimeInterval(sampleDuration * fraction)

                    // Moving duration of this km: wall-clock time minus the pauses that overlap it.
                    let elapsedSec = max(
                        splitEndDate.timeIntervalSince(kmStartDate)
                            - self.pausedSeconds(from: kmStartDate, to: splitEndDate, intervals: pausedIntervals),
                        1.0)

                    let splitEndMs = Int64(splitEndDate.timeIntervalSince1970 * 1000)
                    splits.append(HealthChartPoint(timestamp: splitEndMs, value: elapsedSec))

                    lapStartCumMeters += 1000.0
                    kmStartDate = splitEndDate
                }
            }

            // Partial last km (>50 m to avoid noise from rounding).
            let partial = cumMeters - lapStartCumMeters
            if partial > 50 {
                let kmEndDate = quantitySamples.last!.endDate
                let elapsedSec = max(
                    kmEndDate.timeIntervalSince(kmStartDate)
                        - self.pausedSeconds(from: kmStartDate, to: kmEndDate, intervals: pausedIntervals),
                    1.0)
                let endMs = Int64(kmEndDate.timeIntervalSince1970 * 1000)
                splits.append(HealthChartPoint(timestamp: endMs, value: elapsedSec))
            }

            completion(.success(splits))
        }
        HealthKitManager.shared.healthStore.execute(query)
    }

    // MARK: - Pause interval helpers

    /// Reads workout.workoutEvents and returns a list of (pauseStart, resumeEnd) intervals.
    /// Handles both manual pause (.pause/.resume) and auto-pause (.motionPaused/.motionResumed).
    private func buildPausedIntervals(from events: [HKWorkoutEvent]) -> [(start: Date, end: Date)] {
        let sorted = events.sorted { $0.dateInterval.start < $1.dateInterval.start }
        var intervals: [(start: Date, end: Date)] = []
        var pauseStart: Date? = nil

        for event in sorted {
            switch event.type {
            case .pause, .motionPaused:
                if pauseStart == nil {
                    pauseStart = event.dateInterval.start
                }
            case .resume, .motionResumed:
                if let start = pauseStart {
                    intervals.append((start: start, end: event.dateInterval.start))
                    pauseStart = nil
                }
            default:
                break
            }
        }
        return intervals
    }

    /// Returns the total seconds of paused time that overlap with the given [from, to] range.
    private func pausedSeconds(
        from rangeStart: Date,
        to rangeEnd: Date,
        intervals: [(start: Date, end: Date)]
    ) -> TimeInterval {
        return intervals.reduce(0.0) { total, pause in
            let overlapStart = max(rangeStart, pause.start)
            let overlapEnd = min(rangeEnd, pause.end)
            return overlapStart < overlapEnd ? total + overlapEnd.timeIntervalSince(overlapStart) : total
        }
    }

    // MARK: - Distance samples (GPS + accelerometer fusion)

    private func queryDistance(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthChartPoint], Error>) -> Void
    ) {
        let quantityIdentifier = SportProfile.distanceIdentifier(for: workout.workoutActivityType)

        guard let distanceType = HKQuantityType.quantityType(forIdentifier: quantityIdentifier) else {
            completion(.success([]))
            return
        }

        // predicateForObjects(from:) scopes samples to exactly this workout's recorded data.
        let predicate = HKQuery.predicateForObjects(from: workout)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: distanceType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            let points: [HealthChartPoint] = (samples as? [HKQuantitySample] ?? []).compactMap { sample in
                let meters = sample.quantity.doubleValue(for: .meter())
                guard meters > 0 else { return nil }
                let startMs = Int64(sample.startDate.timeIntervalSince1970 * 1000)
                let endMs = Int64(sample.endDate.timeIntervalSince1970 * 1000)
                return HealthChartPoint(timestamp: startMs, value: meters, endTimestamp: endMs)
            }
            completion(.success(points))
        }
        HealthKitManager.shared.healthStore.execute(query)
    }
}
