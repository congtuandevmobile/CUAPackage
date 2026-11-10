# HealthObserver.swift

An `HKObserverQuery` on workouts plus background delivery (`.immediate`). `start()` is idempotent; `onNewWorkout` is called on the main queue; the completion handler is ALWAYS called so iOS keeps delivering. Shared through `AppleHealthSyncRuntime.observer` so the launch hook and the module use one query.
