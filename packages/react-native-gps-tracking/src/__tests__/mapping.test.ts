jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }))

import { parseTrackingError, TrackingError } from '../api/errors'
import { createTrackingConfig, trackingConfigForSport } from '../domain/trackingConfig'
import { toFix, toSnapshot, toStartConfig } from '../platform/nitroTrackingPlatform'
import type { NitroFix } from '../specs/GpsTracking.nitro'

const nitroFix = (o: Partial<NitroFix> = {}): NitroFix => ({
  sessionId: 's', segmentId: 0, seq: 1, timeMs: 1000, elapsedMs: 50, latitude: 10, longitude: 106,
  horizontalAccuracy: 5, speed: -1, speedAccuracy: -1, course: -1, altitude: undefined, verticalAccuracy: -1,
  provider: 'fused', isMock: false, ...o,
})

describe('Nitro mapping', () => {
  it('turns negative "unknown" values into undefined and keeps real ones', () => {
    const fix = toFix(nitroFix({ speed: 0, altitude: 12 }))
    expect(fix.speed).toBe(0) // zero is a measurement
    expect(fix.horizontalAccuracy).toBe(5)
    expect(fix.course).toBeUndefined()
    expect(fix.altitude).toBe(12)
    expect(fix.time.getTime()).toBe(1000)
  })

  it('maps the start request', () => {
    const config = trackingConfigForSport('cycling', { initialStrideMeters: 0.8 })
    const native = toStartConfig({
      sessionId: 's1', startSeq: 0, startSegmentId: 0, config, adaptiveSampling: true, batterySaver: false,
      notificationTitle: 't', notificationText: 'x', stepsEnabled: true, initialSteps: 3, pedalCadence: true,
    })
    expect(native.engine.maxSpeedMps).toBe(25)
    expect(native.engine.pdrEnabled).toBe(false) // cycling: pdr off
    expect(native.engine.initialStrideMeters).toBe(0.8)
    expect(native.maxRecoverGapMs).toBe(0)
    expect(native.intervalMs).toBe(1000)
    expect(toStartConfig({ ...baseRequest(), inheritRecoverGap: true }).maxRecoverGapMs).toBe(-1)
    expect(toStartConfig({ ...baseRequest(), config: createTrackingConfig({ maxRecoverGapMs: 60_000 }) }).maxRecoverGapMs).toBe(60_000)
    expect(toStartConfig({ ...baseRequest(), config: createTrackingConfig({ pdrPolicy: 'trustedWhenCalibrated', smoothing: 'kalman' }) }).engine)
      .toMatchObject({ pdrEnabled: true, pdrTrustedWhenCalibrated: true, kalman: true, initialStrideMeters: -1 })
  })

  it('maps a snapshot', () => {
    const s = toSnapshot({
      stepsStatus: 'active', restoreState: 'complete', engineChanged: false, journalPending: 0, journalFailed: false,
      elapsedTimeMs: 5, recoveredGapMs: 0, clockAnomaly: false, collection: 'collecting', pedalCadenceRpm: -1,
      cadenceSource: 'none', cadenceStatus: 'off', stepsFinal: false, sessionId: 's', state: 'running', segmentId: 0,
      distance: {
        quality: 'good', totalMeters: 10, gpsMeters: 10, gapBridgeMeters: 0, pdrMeters: 0, pendingPdrMeters: 0,
        movingTimeMs: 1, isStopped: false, speedMps: -1, lastAcceptedFixAtMs: -1, steps: 0, strideMeters: -1,
        activeTimeMs: 1, bridgedGapMs: 0, uncreditedGapMs: 0, uncreditedGaps: 0, ambiguousSteps: 0, distanceEligibleSteps: 0,
      },
      fixCount: 1, updatedAtMs: 0,
    })
    expect(s.pedalCadenceRpm).toBeUndefined()
    expect(s.distance.lastAcceptedFixAt).toBeUndefined()
    expect(s.distance.strideMeters).toBeUndefined()
    expect(s.distance.totalMeters).toBe(10)
  })
})

describe('parseTrackingError', () => {
  it('extracts the stable code even when the bridge prepends text', () => {
    const e = parseTrackingError(new Error('Exception in HostFunction: FOREGROUND_START_FAILED: could not start'))
    expect(e).toBeInstanceOf(TrackingError)
    expect(e.code).toBe('FOREGROUND_START_FAILED')
    expect(e.message).toBe('could not start')
  })
  it('keeps UNKNOWN for anything else', () => {
    expect(parseTrackingError(new Error('plain')).code).toBe('UNKNOWN')
  })
})

function baseRequest() {
  return {
    sessionId: 's1', startSeq: 0, startSegmentId: 0, config: createTrackingConfig(), adaptiveSampling: false,
    batterySaver: false, notificationTitle: 't', notificationText: 'x', stepsEnabled: false, initialSteps: 0,
    pedalCadence: false,
  }
}
