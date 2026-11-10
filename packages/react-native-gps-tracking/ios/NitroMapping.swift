import Foundation
import NitroModules

// Mapping between the engine models (TrackingModels.swift) and the Nitro-generated types. Numbers cross as doubles.

extension NativePermission {
  func toNitro() -> NitroPermission {
    switch self {
    case .granted: return .granted
    case .denied: return .denied
    case .restricted: return .restricted
    case .notDetermined: return .notdetermined
    case .servicesDisabled: return .servicesdisabled
    }
  }
}

extension NativeTrackingState {
  func toNitro() -> NitroTrackingState {
    switch self {
    case .idle: return .idle
    case .running: return .running
    case .paused: return .paused
    case .finishing: return .finishing
    case .stopped: return .stopped
    case .permissionDenied: return .permissiondenied
    case .error: return .error
    }
  }
}

extension NativeStepsStatus {
  func toNitro() -> NitroStepsStatus {
    switch self {
    case .off: return .off
    case .active: return .active
    case .permissionDenied: return .permissiondenied
    case .unavailable: return .unavailable
    case .failed: return .failed
    }
  }
}

extension NativeMotionStatus {
  func toNitro() -> NitroMotionStatus {
    switch self {
    case .off: return .off
    case .active: return .active
    case .unavailable: return .unavailable
    case .failed: return .failed
    }
  }
}

extension NativeCadenceSource {
  func toNitro() -> NitroCadenceSource {
    switch self {
    case .none: return .none
    case .phone: return .phone
    case .externalSensor: return .externalsensor
    }
  }
}

extension NativeRestoreState {
  func toNitro() -> NitroRestoreState {
    switch self {
    case .notRestored: return .notrestored
    case .complete: return .complete
    case .tailRepaired: return .tailrepaired
    case .partial: return .partial
    }
  }
}

extension NativeGpsQuality {
  func toNitro() -> NitroGpsQuality {
    switch self {
    case .unknown: return .unknown
    case .good: return .good
    case .degraded: return .degraded
    case .unavailable: return .unavailable
    case .recovering: return .recovering
    }
  }
}

extension NativeCollection {
  func toNitro() -> NitroCollection {
    switch self {
    case .collecting: return .collecting
    case .notCollecting: return .notcollecting
    case .blocked: return .blocked
    }
  }
}

extension NativeFix {
  func toNitro() -> NitroFix {
    return NitroFix(
      sessionId: self.sessionId,
      segmentId: Double(self.segmentId),
      seq: Double(self.seq),
      timeMs: Double(self.timeMs),
      elapsedMs: Double(self.elapsedMs),
      latitude: self.latitude,
      longitude: self.longitude,
      horizontalAccuracy: self.horizontalAccuracy,
      speed: self.speed,
      speedAccuracy: self.speedAccuracy,
      course: self.course,
      altitude: self.altitude,
      verticalAccuracy: self.verticalAccuracy,
      provider: self.provider,
      isMock: self.isMock
    )
  }
}

extension NativeDistance {
  func toNitro() -> NitroDistance {
    return NitroDistance(
      quality: self.quality.toNitro(),
      totalMeters: self.totalMeters,
      gpsMeters: self.gpsMeters,
      gapBridgeMeters: self.gapBridgeMeters,
      pdrMeters: self.pdrMeters,
      pendingPdrMeters: self.pendingPdrMeters,
      movingTimeMs: Double(self.movingTimeMs),
      isStopped: self.isStopped,
      speedMps: self.speedMps,
      lastAcceptedFixAtMs: Double(self.lastAcceptedFixAtMs),
      steps: Double(self.steps),
      strideMeters: self.strideMeters,
      activeTimeMs: Double(self.activeTimeMs),
      bridgedGapMs: Double(self.bridgedGapMs),
      uncreditedGapMs: Double(self.uncreditedGapMs),
      uncreditedGaps: Double(self.uncreditedGaps),
      ambiguousSteps: Double(self.ambiguousSteps),
      distanceEligibleSteps: Double(self.distanceEligibleSteps)
    )
  }
}

extension NativeSnapshot {
  func toNitro() -> NitroSnapshot {
    return NitroSnapshot(
      stepsStatus: self.stepsStatus.toNitro(),
      restoreState: self.restoreState.toNitro(),
      engineChanged: self.engineChanged,
      journalPending: Double(self.journalPending),
      journalFailed: self.journalFailed,
      elapsedTimeMs: Double(self.elapsedTimeMs),
      recoveredGapMs: Double(self.recoveredGapMs),
      clockAnomaly: self.clockAnomaly,
      collection: self.collection.toNitro(),
      pedalCadenceRpm: self.pedalCadenceRpm,
      cadenceSource: self.cadenceSource.toNitro(),
      cadenceStatus: self.cadenceStatus.toNitro(),
      stepsFinal: self.stepsFinal,
      sessionId: self.sessionId,
      state: self.state.toNitro(),
      segmentId: Double(self.segmentId),
      distance: self.distance.toNitro(),
      fixCount: Double(self.fixCount),
      lastFixTimeMs: self.lastFixTimeMs.map { Double($0) },
      updatedAtMs: Double(self.updatedAtMs),
      error: self.error
    )
  }
}

extension NitroEngineConfig {
  func toNative() -> EngineConfig {
    return EngineConfig(
      maxAccuracyMeters: self.maxAccuracyMeters,
      maxFixAgeMs: Int64(self.maxFixAgeMs),
      silenceAfterMs: Int64(self.silenceAfterMs),
      maxSpeedMps: self.maxSpeedMps,
      minStepMeters: self.minStepMeters,
      accuracyNoiseFactor: self.accuracyNoiseFactor,
      stationarySpeedMps: self.stationarySpeedMps,
      maxBridgeMs: Int64(self.maxBridgeMs),
      reanchorAfterRejects: Int64(self.reanchorAfterRejects),
      rejectMock: self.rejectMock,
      pdrEnabled: self.pdrEnabled,
      pdrConfirmRatio: self.pdrConfirmRatio,
      kalman: self.kalman,
      stopRadiusMeters: self.stopRadiusMeters,
      stopMinDwellMs: Int64(self.stopMinDwellMs),
      initialStrideMeters: self.initialStrideMeters,
      pdrTrustedWhenCalibrated: self.pdrTrustedWhenCalibrated,
      recoveryStepEvidenceAfterMs: Int64(self.recoveryStepEvidenceAfterMs)
    )
  }
}

extension NitroStartConfig {
  func toNative() -> StartConfig {
    return StartConfig(
      pedalCadence: self.pedalCadence,
      recoverRunning: self.recoverRunning,
      maxRecoverGapMs: Int64(self.maxRecoverGapMs),
      stepsEnabled: self.stepsEnabled,
      initialSteps: Int64(self.initialSteps),
      engine: self.engine.toNative(),
      adaptiveSampling: self.adaptiveSampling,
      batterySaver: self.batterySaver,
      sessionId: self.sessionId,
      startSeq: Int64(self.startSeq),
      startSegmentId: Int64(self.startSegmentId),
      intervalMs: Int64(self.intervalMs),
      minDistanceMeters: self.minDistanceMeters,
      notificationTitle: self.notificationTitle,
      notificationText: self.notificationText
    )
  }
}
