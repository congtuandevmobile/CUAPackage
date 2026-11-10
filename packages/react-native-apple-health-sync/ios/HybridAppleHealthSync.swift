import Foundation
import HealthKit
import NitroModules

/// React Native entry point (a Nitro HybridObject). Thin on purpose: it forwards to the readers and turns each
/// completion into a `Promise`. The readers keep their own queries; HealthKit calls back on its own queues.
final class HybridAppleHealthSync: HybridAppleHealthSyncSpec {
    private let permissionMgr = HealthPermissionMgr()
    private let reader = HealthReader()
    private let statisticsReader = HealthStatisticsReader()
    private let workoutReader = WorkoutReader()
    private let routeReader = RouteReader()
    private let lapReader = LapReader()
    private let heartRateReader = WorkoutHeartRateReader()
    private let samplesReader = WorkoutSamplesReader()

    func isHealthDataAvailable() throws -> Bool {
        HealthKitManager.shared.isAvailable()
    }

    func requestPermissions() throws -> Promise<Bool> {
        promise { done in self.permissionMgr.requestPermissions(completion: done) }
    }

    func readData(type: String, startTime: Double, endTime: Double) throws -> Promise<[NitroHealthDataRecord]> {
        promise { done in
            self.reader.readData(typeKey: type, startTime: Int64(startTime), endTime: Int64(endTime)) {
                done($0.map { $0.map { $0.toNitro() } })
            }
        }
    }

    func readWorkouts(startTime: Double, endTime: Double, onlyAppleSources: Bool) throws
        -> Promise<[NitroHealthWorkoutRecord]>
    {
        promise { done in
            self.workoutReader.readWorkouts(
                startTime: Int64(startTime), endTime: Int64(endTime), onlyAppleSources: onlyAppleSources
            ) { done($0.map { $0.map { $0.toNitro() } }) }
        }
    }

    func readRoute(workoutUUID: String) throws -> Promise<[NitroHealthRouteLocation]> {
        promise { done in
            self.routeReader.getRouteLocations(from: workoutUUID) { done($0.map { $0.map { $0.toNitro() } }) }
        }
    }

    func readStatistics(type: String, startTime: Double, endTime: Double) throws -> Promise<Double> {
        promise { done in
            self.statisticsReader.readCumulativeSum(
                typeKey: type, startTime: Int64(startTime), endTime: Int64(endTime), completion: done)
        }
    }

    func readLaps(workoutUUID: String) throws -> Promise<[NitroHealthLapRecord]> {
        promise { done in
            self.lapReader.readLaps(workoutUUID: workoutUUID) { done($0.map { $0.map { $0.toNitro() } }) }
        }
    }

    func readWorkoutHeartRateStats(workoutUUID: String) throws -> Promise<NitroHealthHeartRateStats> {
        promise { done in
            self.heartRateReader.read(workoutUUID: workoutUUID) { done($0.map { $0.toNitro() }) }
        }
    }

    func readHeartRateSamples(workoutUUID: String) throws -> Promise<[NitroHealthChartPoint]> {
        promise { done in
            self.samplesReader.readHeartRateSamples(workoutUUID: workoutUUID) {
                done($0.map { $0.map { $0.toNitro() } })
            }
        }
    }

    func readCadenceSamples(workoutUUID: String) throws -> Promise<[NitroHealthChartPoint]> {
        promise { done in
            self.samplesReader.readCadenceSamples(workoutUUID: workoutUUID) {
                done($0.map { $0.map { $0.toNitro() } })
            }
        }
    }

    func readDistanceSamples(workoutUUID: String) throws -> Promise<[NitroHealthChartPoint]> {
        promise { done in
            self.samplesReader.readDistanceSamples(workoutUUID: workoutUUID) {
                done($0.map { $0.map { $0.toNitro() } })
            }
        }
    }

    func readKmSplits(workoutUUID: String) throws -> Promise<[NitroHealthChartPoint]> {
        promise { done in
            self.samplesReader.readKmSplits(workoutUUID: workoutUUID) {
                done($0.map { $0.map { $0.toNitro() } })
            }
        }
    }

    func setObserverListener(listener: (() -> Void)?) throws {
        let observer = AppleHealthSyncRuntime.observer
        guard let listener = listener else {
            // Stop telling JS; the query itself keeps running so iOS background delivery is still acknowledged.
            observer.onNewWorkout = nil
            return
        }
        observer.onNewWorkout = { listener() }
        observer.start()
    }

    // MARK: - Internals

    /// Turns a reader completion into a promise.
    private func promise<T>(_ run: (@escaping (Result<T, Error>) -> Void) -> Void) -> Promise<T> {
        let promise = Promise<T>()
        run { result in
            switch result {
            case .success(let value): promise.resolve(withResult: value)
            case .failure(let error): promise.reject(withError: error)
            }
        }
        return promise
    }
}
