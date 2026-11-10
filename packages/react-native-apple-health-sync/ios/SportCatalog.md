# SportCatalog.swift

Generated from the iOS 26 SDK header (`HKWorkout.h`): the Apple raw value of every `HKWorkoutActivityType` and its lower-camel name. `SportCatalog.name(of:)` / `name(forRaw:)` return `"unknown"` for a sport newer than the table (the raw value still travels as `sportId`). Matching on the raw value keeps this independent of SDK availability annotations. A Jest test compares this table with `src/sports.ts`: change both together, only ever append.
