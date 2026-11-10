# WorkoutSamplesReader.swift

Time series scoped to a workout: heart rate (expanding Apple's condensed series), cadence, incremental distance and per-km splits. Cadence kind and distance type come from `SportProfile` using the workout's real sport. Km splits subtract the pause intervals (`.pause/.motionPaused` to `.resume/.motionResumed`), as documented.
