package com.gpstracking

// Mapping between the engine models (TrackingModels.kt) and the Nitro-generated types. Numbers cross as doubles.

internal fun NativePermission.toNitro(): com.margelo.nitro.gpstracking.NitroPermission = when (this) {
    NativePermission.GRANTED -> com.margelo.nitro.gpstracking.NitroPermission.GRANTED
    NativePermission.DENIED -> com.margelo.nitro.gpstracking.NitroPermission.DENIED
    NativePermission.RESTRICTED -> com.margelo.nitro.gpstracking.NitroPermission.RESTRICTED
    NativePermission.NOT_DETERMINED -> com.margelo.nitro.gpstracking.NitroPermission.NOTDETERMINED
    NativePermission.SERVICES_DISABLED -> com.margelo.nitro.gpstracking.NitroPermission.SERVICESDISABLED
}

internal fun NativeTrackingState.toNitro(): com.margelo.nitro.gpstracking.NitroTrackingState = when (this) {
    NativeTrackingState.IDLE -> com.margelo.nitro.gpstracking.NitroTrackingState.IDLE
    NativeTrackingState.RUNNING -> com.margelo.nitro.gpstracking.NitroTrackingState.RUNNING
    NativeTrackingState.PAUSED -> com.margelo.nitro.gpstracking.NitroTrackingState.PAUSED
    NativeTrackingState.FINISHING -> com.margelo.nitro.gpstracking.NitroTrackingState.FINISHING
    NativeTrackingState.STOPPED -> com.margelo.nitro.gpstracking.NitroTrackingState.STOPPED
    NativeTrackingState.PERMISSION_DENIED -> com.margelo.nitro.gpstracking.NitroTrackingState.PERMISSIONDENIED
    NativeTrackingState.ERROR -> com.margelo.nitro.gpstracking.NitroTrackingState.ERROR
}

internal fun NativeStepsStatus.toNitro(): com.margelo.nitro.gpstracking.NitroStepsStatus = when (this) {
    NativeStepsStatus.OFF -> com.margelo.nitro.gpstracking.NitroStepsStatus.OFF
    NativeStepsStatus.ACTIVE -> com.margelo.nitro.gpstracking.NitroStepsStatus.ACTIVE
    NativeStepsStatus.PERMISSION_DENIED -> com.margelo.nitro.gpstracking.NitroStepsStatus.PERMISSIONDENIED
    NativeStepsStatus.UNAVAILABLE -> com.margelo.nitro.gpstracking.NitroStepsStatus.UNAVAILABLE
    NativeStepsStatus.FAILED -> com.margelo.nitro.gpstracking.NitroStepsStatus.FAILED
}

internal fun NativeMotionStatus.toNitro(): com.margelo.nitro.gpstracking.NitroMotionStatus = when (this) {
    NativeMotionStatus.OFF -> com.margelo.nitro.gpstracking.NitroMotionStatus.OFF
    NativeMotionStatus.ACTIVE -> com.margelo.nitro.gpstracking.NitroMotionStatus.ACTIVE
    NativeMotionStatus.UNAVAILABLE -> com.margelo.nitro.gpstracking.NitroMotionStatus.UNAVAILABLE
    NativeMotionStatus.FAILED -> com.margelo.nitro.gpstracking.NitroMotionStatus.FAILED
}

internal fun NativeCadenceSource.toNitro(): com.margelo.nitro.gpstracking.NitroCadenceSource = when (this) {
    NativeCadenceSource.NONE -> com.margelo.nitro.gpstracking.NitroCadenceSource.NONE
    NativeCadenceSource.PHONE -> com.margelo.nitro.gpstracking.NitroCadenceSource.PHONE
    NativeCadenceSource.EXTERNAL_SENSOR -> com.margelo.nitro.gpstracking.NitroCadenceSource.EXTERNALSENSOR
}

internal fun NativeRestoreState.toNitro(): com.margelo.nitro.gpstracking.NitroRestoreState = when (this) {
    NativeRestoreState.NOT_RESTORED -> com.margelo.nitro.gpstracking.NitroRestoreState.NOTRESTORED
    NativeRestoreState.COMPLETE -> com.margelo.nitro.gpstracking.NitroRestoreState.COMPLETE
    NativeRestoreState.TAIL_REPAIRED -> com.margelo.nitro.gpstracking.NitroRestoreState.TAILREPAIRED
    NativeRestoreState.PARTIAL -> com.margelo.nitro.gpstracking.NitroRestoreState.PARTIAL
}

internal fun NativeGpsQuality.toNitro(): com.margelo.nitro.gpstracking.NitroGpsQuality = when (this) {
    NativeGpsQuality.UNKNOWN -> com.margelo.nitro.gpstracking.NitroGpsQuality.UNKNOWN
    NativeGpsQuality.GOOD -> com.margelo.nitro.gpstracking.NitroGpsQuality.GOOD
    NativeGpsQuality.DEGRADED -> com.margelo.nitro.gpstracking.NitroGpsQuality.DEGRADED
    NativeGpsQuality.UNAVAILABLE -> com.margelo.nitro.gpstracking.NitroGpsQuality.UNAVAILABLE
    NativeGpsQuality.RECOVERING -> com.margelo.nitro.gpstracking.NitroGpsQuality.RECOVERING
}

internal fun NativeCollection.toNitro(): com.margelo.nitro.gpstracking.NitroCollection = when (this) {
    NativeCollection.COLLECTING -> com.margelo.nitro.gpstracking.NitroCollection.COLLECTING
    NativeCollection.NOT_COLLECTING -> com.margelo.nitro.gpstracking.NitroCollection.NOTCOLLECTING
    NativeCollection.BLOCKED -> com.margelo.nitro.gpstracking.NitroCollection.BLOCKED
}

internal fun NativeFix.toNitro(): com.margelo.nitro.gpstracking.NitroFix = com.margelo.nitro.gpstracking.NitroFix(
    sessionId = this.sessionId,
    segmentId = this.segmentId.toDouble(),
    seq = this.seq.toDouble(),
    timeMs = this.timeMs.toDouble(),
    elapsedMs = this.elapsedMs.toDouble(),
    latitude = this.latitude,
    longitude = this.longitude,
    horizontalAccuracy = this.horizontalAccuracy,
    speed = this.speed,
    speedAccuracy = this.speedAccuracy,
    course = this.course,
    altitude = this.altitude,
    verticalAccuracy = this.verticalAccuracy,
    provider = this.provider,
    isMock = this.isMock
)

internal fun NativeDistance.toNitro(): com.margelo.nitro.gpstracking.NitroDistance = com.margelo.nitro.gpstracking.NitroDistance(
    quality = this.quality.toNitro(),
    totalMeters = this.totalMeters,
    gpsMeters = this.gpsMeters,
    gapBridgeMeters = this.gapBridgeMeters,
    pdrMeters = this.pdrMeters,
    pendingPdrMeters = this.pendingPdrMeters,
    movingTimeMs = this.movingTimeMs.toDouble(),
    isStopped = this.isStopped,
    speedMps = this.speedMps,
    lastAcceptedFixAtMs = this.lastAcceptedFixAtMs.toDouble(),
    steps = this.steps.toDouble(),
    strideMeters = this.strideMeters,
    activeTimeMs = this.activeTimeMs.toDouble(),
    bridgedGapMs = this.bridgedGapMs.toDouble(),
    uncreditedGapMs = this.uncreditedGapMs.toDouble(),
    uncreditedGaps = this.uncreditedGaps.toDouble(),
    ambiguousSteps = this.ambiguousSteps.toDouble(),
    distanceEligibleSteps = this.distanceEligibleSteps.toDouble()
)

internal fun NativeSnapshot.toNitro(): com.margelo.nitro.gpstracking.NitroSnapshot = com.margelo.nitro.gpstracking.NitroSnapshot(
    stepsStatus = this.stepsStatus.toNitro(),
    restoreState = this.restoreState.toNitro(),
    engineChanged = this.engineChanged,
    journalPending = this.journalPending.toDouble(),
    journalFailed = this.journalFailed,
    elapsedTimeMs = this.elapsedTimeMs.toDouble(),
    recoveredGapMs = this.recoveredGapMs.toDouble(),
    clockAnomaly = this.clockAnomaly,
    collection = this.collection.toNitro(),
    pedalCadenceRpm = this.pedalCadenceRpm,
    cadenceSource = this.cadenceSource.toNitro(),
    cadenceStatus = this.cadenceStatus.toNitro(),
    stepsFinal = this.stepsFinal,
    sessionId = this.sessionId,
    state = this.state.toNitro(),
    segmentId = this.segmentId.toDouble(),
    distance = this.distance.toNitro(),
    fixCount = this.fixCount.toDouble(),
    lastFixTimeMs = this.lastFixTimeMs?.toDouble(),
    updatedAtMs = this.updatedAtMs.toDouble(),
    error = this.error
)

internal fun com.margelo.nitro.gpstracking.NitroEngineConfig.toNative(): EngineConfig = EngineConfig(
    maxAccuracyMeters = this.maxAccuracyMeters,
    maxFixAgeMs = this.maxFixAgeMs.toLong(),
    silenceAfterMs = this.silenceAfterMs.toLong(),
    maxSpeedMps = this.maxSpeedMps,
    minStepMeters = this.minStepMeters,
    accuracyNoiseFactor = this.accuracyNoiseFactor,
    stationarySpeedMps = this.stationarySpeedMps,
    maxBridgeMs = this.maxBridgeMs.toLong(),
    reanchorAfterRejects = this.reanchorAfterRejects.toLong(),
    rejectMock = this.rejectMock,
    pdrEnabled = this.pdrEnabled,
    pdrConfirmRatio = this.pdrConfirmRatio,
    kalman = this.kalman,
    stopRadiusMeters = this.stopRadiusMeters,
    stopMinDwellMs = this.stopMinDwellMs.toLong(),
    initialStrideMeters = this.initialStrideMeters,
    pdrTrustedWhenCalibrated = this.pdrTrustedWhenCalibrated,
    recoveryStepEvidenceAfterMs = this.recoveryStepEvidenceAfterMs.toLong()
)

internal fun com.margelo.nitro.gpstracking.NitroStartConfig.toNative(): StartConfig = StartConfig(
    pedalCadence = this.pedalCadence,
    recoverRunning = this.recoverRunning,
    maxRecoverGapMs = this.maxRecoverGapMs.toLong(),
    stepsEnabled = this.stepsEnabled,
    initialSteps = this.initialSteps.toLong(),
    engine = this.engine.toNative(),
    adaptiveSampling = this.adaptiveSampling,
    batterySaver = this.batterySaver,
    sessionId = this.sessionId,
    startSeq = this.startSeq.toLong(),
    startSegmentId = this.startSegmentId.toLong(),
    intervalMs = this.intervalMs.toLong(),
    minDistanceMeters = this.minDistanceMeters,
    notificationTitle = this.notificationTitle,
    notificationText = this.notificationText
)
