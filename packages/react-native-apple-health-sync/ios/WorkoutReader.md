# WorkoutReader.swift

`readWorkouts`: workouts of EVERY sport in a range, newest first (no activity-type predicate, so no sport is dropped and future sports are included), optionally only those written by `com.apple.*` sources. `mapToRecord` fills the exact sport (`sport`, `sportId`) and the legacy coarse `activityType`, energy, steps (iOS 16+), elevation, manual flag, and a readable device name (product type tables).
