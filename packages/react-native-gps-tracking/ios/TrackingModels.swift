import Foundation

// The models the native engines work on (Nitro has only a double number type, so integers are Int64 here);
// the Nitro-generated types (Nitro*) are only touched in the mapping file. See TrackingModels.md.

enum NativePermission: Int {
  case granted
  case denied
  case restricted
  case notDetermined
  case servicesDisabled
}

enum NativeTrackingState: Int {
  case idle
  case running
  case paused
  case finishing
  case stopped
  case permissionDenied
  case error
}

enum NativeStepsStatus: Int {
  case off
  case active
  case permissionDenied
  case unavailable
  case failed
}

enum NativeMotionStatus: Int {
  case off
  case active
  case unavailable
  case failed
}

enum NativeCadenceSource: Int {
  case none
  case phone
  case externalSensor
}

enum NativeRestoreState: Int {
  case notRestored
  case complete
  case tailRepaired
  case partial
}

enum NativeGpsQuality: Int {
  case unknown
  case good
  case degraded
  case unavailable
  case recovering
}

enum NativeCollection: Int {
  case collecting
  case notCollecting
  case blocked
}

struct NativeFix: Hashable {
  var sessionId: String
  var segmentId: Int64
  var seq: Int64
  var timeMs: Int64
  var elapsedMs: Int64
  var latitude: Double
  var longitude: Double
  var horizontalAccuracy: Double
  var speed: Double
  var speedAccuracy: Double
  var course: Double
  var altitude: Double? = nil
  var verticalAccuracy: Double
  var provider: String
  var isMock: Bool
}

struct EngineConfig: Hashable {
  var maxAccuracyMeters: Double
  var maxFixAgeMs: Int64
  var silenceAfterMs: Int64
  var maxSpeedMps: Double
  var minStepMeters: Double
  var accuracyNoiseFactor: Double
  var stationarySpeedMps: Double
  var maxBridgeMs: Int64
  var reanchorAfterRejects: Int64
  var rejectMock: Bool
  var pdrEnabled: Bool
  var pdrConfirmRatio: Double
  var kalman: Bool
  var stopRadiusMeters: Double
  var stopMinDwellMs: Int64
  var initialStrideMeters: Double
  var pdrTrustedWhenCalibrated: Bool
  var recoveryStepEvidenceAfterMs: Int64
}

struct StartConfig: Hashable {
  var pedalCadence: Bool
  var recoverRunning: Bool
  var maxRecoverGapMs: Int64
  var stepsEnabled: Bool
  var initialSteps: Int64
  var engine: EngineConfig
  var adaptiveSampling: Bool
  var batterySaver: Bool
  var sessionId: String
  var startSeq: Int64
  var startSegmentId: Int64
  var intervalMs: Int64
  var minDistanceMeters: Double
  var notificationTitle: String
  var notificationText: String
}

struct NativeDistance: Hashable {
  var quality: NativeGpsQuality
  var totalMeters: Double
  var gpsMeters: Double
  var gapBridgeMeters: Double
  var pdrMeters: Double
  var pendingPdrMeters: Double
  var movingTimeMs: Int64
  var isStopped: Bool
  var speedMps: Double
  var lastAcceptedFixAtMs: Int64
  var steps: Int64
  var strideMeters: Double
  var activeTimeMs: Int64
  var bridgedGapMs: Int64
  var uncreditedGapMs: Int64
  var uncreditedGaps: Int64
  var ambiguousSteps: Int64
  var distanceEligibleSteps: Int64
}

struct NativeSnapshot: Hashable {
  var stepsStatus: NativeStepsStatus
  var restoreState: NativeRestoreState
  var engineChanged: Bool
  var journalPending: Int64
  var journalFailed: Bool
  var elapsedTimeMs: Int64
  var recoveredGapMs: Int64
  var clockAnomaly: Bool
  var collection: NativeCollection
  var pedalCadenceRpm: Double
  var cadenceSource: NativeCadenceSource
  var cadenceStatus: NativeMotionStatus
  var stepsFinal: Bool
  var sessionId: String? = nil
  var state: NativeTrackingState
  var segmentId: Int64
  var distance: NativeDistance
  var fixCount: Int64
  var lastFixTimeMs: Int64? = nil
  var updatedAtMs: Int64
  var error: String? = nil
}
