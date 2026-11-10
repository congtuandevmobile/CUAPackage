import HealthKit
import CoreLocation

class RouteReader {
    
    func getRouteLocations(
        from workoutUUID: String,
        completion: @escaping (Result<[HealthRouteLocation], Error>) -> Void
    ) {
        findWorkout(by: workoutUUID) { [weak self] result in
            switch result {
            case .success(let workout):
                self?.readRoute(from: workout, completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    private func findWorkout(by uuidString: String, completion: @escaping (Result<HKWorkout, Error>) -> Void) {
        guard let uuid = UUID(uuidString: uuidString) else {
             completion(.failure(NSError(domain: "HealthKit", code: 400, userInfo: [NSLocalizedDescriptionKey: "Invalid UUID"])))
             return
        }
        
        let predicate = HKQuery.predicateForObject(with: uuid)
        let query = HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: 1, sortDescriptors: nil) { (query, samples, error) in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let workout = samples?.first as? HKWorkout {
                completion(.success(workout))
            } else {
                completion(.failure(NSError(domain: "HealthKit", code: 404, userInfo: [NSLocalizedDescriptionKey: "Workout not found"])))
            }
        }
        HealthKitManager.shared.healthStore.execute(query)
    }
    
    private func readRoute(
        from workout: HKWorkout,
        completion: @escaping (Result<[HealthRouteLocation], Error>) -> Void
    ) {
        let runningObjectQuery = HKQuery.predicateForObjects(from: workout)
        
        let routeQuery = HKSampleQuery(
            sampleType: HKSeriesType.workoutRoute(),
            predicate: runningObjectQuery,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: nil
        ) { [weak self] (_, samples, error) in

            if let error = error {
                print("[RouteReader] ❌ Route query error: \(error.localizedDescription)")
                completion(.failure(error))
                return
            }

            guard let routes = samples as? [HKWorkoutRoute], let firstRoute = routes.first else {
                print("[RouteReader] ⚠️ No HKWorkoutRoute linked to workout (activityType=\(workout.workoutActivityType.rawValue), isIndoor=\(workout.metadata?[HKMetadataKeyIndoorWorkout] ?? "nil"))")
                completion(.success([]))
                return
            }

            print("[RouteReader] ✅ HKWorkoutRoute found (activityType=\(workout.workoutActivityType.rawValue), routeCount=\(routes.count))")
            self?.loadRouteLocations(route: firstRoute, completion: completion)
        }

        HealthKitManager.shared.healthStore.execute(routeQuery)
    }
    
    private func loadRouteLocations(
        route: HKWorkoutRoute,
        completion: @escaping (Result<[HealthRouteLocation], Error>) -> Void
    ) {
        var locations: [HealthRouteLocation] = []
        
        let query = HKWorkoutRouteQuery(route: route) { (query, routeLocations, done, error) in
            
            if let error = error {
                completion(.failure(error))
                return
            }
            
            if let routeLocations = routeLocations {
                let mapped = routeLocations.map { loc -> HealthRouteLocation in
                    var ellipsoidal: Double? = nil
                    if #available(iOS 15.0, *) {
                        ellipsoidal = loc.ellipsoidalAltitude
                    }
                    return HealthRouteLocation(
                        latitude: loc.coordinate.latitude,
                        longitude: loc.coordinate.longitude,
                        altitude: loc.altitude,
                        speed: loc.speed,
                        course: loc.course,
                        horizontalAccuracy: loc.horizontalAccuracy,
                        verticalAccuracy: loc.verticalAccuracy,
                        timestamp: Int64(loc.timestamp.timeIntervalSince1970 * 1000),
                        ellipsoidalAltitude: ellipsoidal
                    )
                }
                locations.append(contentsOf: mapped)
            }
            
            if done {
                print("[RouteReader] 📍 Route loaded: \(locations.count) points")
                if let first = locations.first {
                    print("[RouteReader] 📍 First point: lat=\(first.latitude ?? 0), lng=\(first.longitude ?? 0)")
                }
                completion(.success(locations))
            }
        }
        
        HealthKitManager.shared.healthStore.execute(query)
    }
}
