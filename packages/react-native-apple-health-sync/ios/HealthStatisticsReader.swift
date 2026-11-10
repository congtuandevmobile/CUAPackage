import HealthKit

class HealthStatisticsReader {

    func readCumulativeSum(
        typeKey: String,
        startTime: Int64,
        endTime: Int64,
        completion: @escaping (Result<Double, Error>) -> Void
    ) {
        guard let typeId = HealthTypeUtils.getTypeIdentifier(from: typeKey),
              let quantityType = HKObjectType.quantityType(forIdentifier: typeId)
        else {
            completion(.failure(NSError(
                domain: "HealthKit", code: 400,
                userInfo: [NSLocalizedDescriptionKey: "Type \(typeKey) not supported"])))
            return
        }

        let startDate = Date(timeIntervalSince1970: TimeInterval(startTime) / 1000)
        let endDate   = Date(timeIntervalSince1970: TimeInterval(endTime) / 1000)
        let predicate = HKQuery.predicateForSamples(
            withStart: startDate, end: endDate, options: .strictStartDate)

        let options = statisticsOptions(for: typeId)

        let query = HKStatisticsQuery(
            quantityType: quantityType,
            quantitySamplePredicate: predicate,
            options: options
        ) { _, statistics, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            let unit = HealthTypeUtils.getUnit(for: typeId)
            let value: Double
            if options == .discreteAverage {
                value = statistics?.averageQuantity()?.doubleValue(for: unit) ?? 0.0
            } else {
                value = statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0.0
            }
            completion(.success(value))
        }

        HealthKitManager.shared.healthStore.execute(query)
    }

    private func statisticsOptions(for typeId: HKQuantityTypeIdentifier) -> HKStatisticsOptions {
        switch typeId {
        case .heartRate,
             .oxygenSaturation,
             .bloodPressureSystolic,
             .bloodPressureDiastolic,
             .bodyTemperature,
             .vo2Max:
            return .discreteAverage
        default:
            if #available(iOS 17.0, *), typeId == .cyclingCadence { return .discreteAverage }
            if #available(iOS 16.0, *), typeId == .runningSpeed || typeId == .runningPower {
                return .discreteAverage
            }
            return .cumulativeSum
        }
    }
}
