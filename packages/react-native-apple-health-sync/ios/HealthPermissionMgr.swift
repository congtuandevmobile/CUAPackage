import HealthKit

class HealthPermissionMgr {

    func requestPermissions(completion: @escaping (Result<Bool, Error>) -> Void) {
        guard HealthKitManager.shared.isAvailable() else {
            completion(
                .failure(
                    NSError(
                        domain: "HealthKit", code: 404,
                        userInfo: [NSLocalizedDescriptionKey: "HealthKit not available on device"]))
            )
            return
        }

        let allTypes = HealthTypeUtils.getAllSupportedTypes()

        HealthKitManager.shared.healthStore.requestAuthorization(toShare: nil, read: allTypes) {
            success, error in
            if let error = error {
                completion(.failure(error))
            } else {
                completion(.success(success))
            }
        }
    }
}