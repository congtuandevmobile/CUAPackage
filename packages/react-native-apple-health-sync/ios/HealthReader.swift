import HealthKit

class HealthReader {

    func readData(
        typeKey: String, startTime: Int64, endTime: Int64,
        completion: @escaping (Result<[HealthDataRecord], Error>) -> Void
    ) {

        guard let typeId = HealthTypeUtils.getTypeIdentifier(from: typeKey),
            let sampleType = HKSampleType.quantityType(forIdentifier: typeId)
        else {
            completion(
                .failure(
                    NSError(
                        domain: "HealthKit", code: 400,
                        userInfo: [NSLocalizedDescriptionKey: "Type \(typeKey) not supported"])))
            return
        }

        let startDate = Date(timeIntervalSince1970: TimeInterval(startTime) / 1000)
        let endDate = Date(timeIntervalSince1970: TimeInterval(endTime) / 1000)

        let predicate = HKQuery.predicateForSamples(
            withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(
            key: HKSampleSortIdentifierStartDate, ascending: false) 

        let query = HKSampleQuery(
            sampleType: sampleType, predicate: predicate, limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { [weak self] (query, samples, error) in

            if let error = error {
                completion(.failure(error))
                return
            }

            guard let quantitySamples = samples as? [HKQuantitySample] else {
                completion(.success([]))
                return
            }

            // 4. Map Data
            let records = quantitySamples.map { sample -> HealthDataRecord in
                return self?.mapToRecord(sample: sample, typeKey: typeKey, typeId: typeId)
                    ?? HealthDataRecord()
            }

            completion(.success(records))
        }

        HealthKitManager.shared.healthStore.execute(query)
    }

    private func mapToRecord(
        sample: HKQuantitySample, typeKey: String, typeId: HKQuantityTypeIdentifier
    ) -> HealthDataRecord {
        let unit = HealthTypeUtils.getUnit(for: typeId)
        let value = sample.quantity.doubleValue(for: unit)

        return HealthDataRecord(
            type: typeKey,
            value: value,
            unit: unit.unitString,
            startTime: Int64(sample.startDate.timeIntervalSince1970 * 1000),
            endTime: Int64(sample.endDate.timeIntervalSince1970 * 1000)
        )
    }
}