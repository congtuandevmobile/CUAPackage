# SportProfile.swift

Which data series fits which sport, decided from the workout's real `HKWorkoutActivityType`: `cadenceKind(for:)` (steps/min for running, walking, hiking, track and field; rpm for cycling; strokes/min for swimming; none otherwise) and `distanceIdentifier(for:)` (cycling, swimming, wheelchair, downhill snow sports, and on iOS 18+ rowing, paddle sports, skating, cross-country skiing; walking/running distance for everything else). Also defines `HealthKitSyncError` (`CODE: message`).
