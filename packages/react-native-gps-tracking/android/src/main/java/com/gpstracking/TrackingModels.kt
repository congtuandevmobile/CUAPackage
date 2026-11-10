package com.gpstracking

// The models the native engines work on (Nitro has only a double number type, so integers are Long here);
// the Nitro-generated types (Nitro*) are only touched in the mapping file. See TrackingModels.md.

enum class NativePermission { GRANTED, DENIED, RESTRICTED, NOT_DETERMINED, SERVICES_DISABLED }

enum class NativeTrackingState { IDLE, RUNNING, PAUSED, FINISHING, STOPPED, PERMISSION_DENIED, ERROR }

enum class NativeStepsStatus { OFF, ACTIVE, PERMISSION_DENIED, UNAVAILABLE, FAILED }

enum class NativeMotionStatus { OFF, ACTIVE, UNAVAILABLE, FAILED }

enum class NativeCadenceSource { NONE, PHONE, EXTERNAL_SENSOR }

enum class NativeRestoreState { NOT_RESTORED, COMPLETE, TAIL_REPAIRED, PARTIAL }

enum class NativeGpsQuality { UNKNOWN, GOOD, DEGRADED, UNAVAILABLE, RECOVERING }

enum class NativeCollection { COLLECTING, NOT_COLLECTING, BLOCKED }

data class NativeFix(
    val sessionId: String,
    val segmentId: Long,
    val seq: Long,
    val timeMs: Long,
    val elapsedMs: Long,
    val latitude: Double,
    val longitude: Double,
    val horizontalAccuracy: Double,
    val speed: Double,
    val speedAccuracy: Double,
    val course: Double,
    val altitude: Double? = null,
    val verticalAccuracy: Double,
    val provider: String,
    val isMock: Boolean
)

data class EngineConfig(
    val maxAccuracyMeters: Double,
    val maxFixAgeMs: Long,
    val silenceAfterMs: Long,
    val maxSpeedMps: Double,
    val minStepMeters: Double,
    val accuracyNoiseFactor: Double,
    val stationarySpeedMps: Double,
    val maxBridgeMs: Long,
    val reanchorAfterRejects: Long,
    val rejectMock: Boolean,
    val pdrEnabled: Boolean,
    val pdrConfirmRatio: Double,
    val kalman: Boolean,
    val stopRadiusMeters: Double,
    val stopMinDwellMs: Long,
    val initialStrideMeters: Double,
    val pdrTrustedWhenCalibrated: Boolean,
    val recoveryStepEvidenceAfterMs: Long
)

data class StartConfig(
    val pedalCadence: Boolean,
    val recoverRunning: Boolean,
    val maxRecoverGapMs: Long,
    val stepsEnabled: Boolean,
    val initialSteps: Long,
    val engine: EngineConfig,
    val adaptiveSampling: Boolean,
    val batterySaver: Boolean,
    val sessionId: String,
    val startSeq: Long,
    val startSegmentId: Long,
    val intervalMs: Long,
    val minDistanceMeters: Double,
    val notificationTitle: String,
    val notificationText: String
)

data class NativeDistance(
    val quality: NativeGpsQuality,
    val totalMeters: Double,
    val gpsMeters: Double,
    val gapBridgeMeters: Double,
    val pdrMeters: Double,
    val pendingPdrMeters: Double,
    val movingTimeMs: Long,
    val isStopped: Boolean,
    val speedMps: Double,
    val lastAcceptedFixAtMs: Long,
    val steps: Long,
    val strideMeters: Double,
    val activeTimeMs: Long,
    val bridgedGapMs: Long,
    val uncreditedGapMs: Long,
    val uncreditedGaps: Long,
    val ambiguousSteps: Long,
    val distanceEligibleSteps: Long
)

data class NativeSnapshot(
    val stepsStatus: NativeStepsStatus,
    val restoreState: NativeRestoreState,
    val engineChanged: Boolean,
    val journalPending: Long,
    val journalFailed: Boolean,
    val elapsedTimeMs: Long,
    val recoveredGapMs: Long,
    val clockAnomaly: Boolean,
    val collection: NativeCollection,
    val pedalCadenceRpm: Double,
    val cadenceSource: NativeCadenceSource,
    val cadenceStatus: NativeMotionStatus,
    val stepsFinal: Boolean,
    val sessionId: String? = null,
    val state: NativeTrackingState,
    val segmentId: Long,
    val distance: NativeDistance,
    val fixCount: Long,
    val lastFixTimeMs: Long? = null,
    val updatedAtMs: Long,
    val error: String? = null
)
