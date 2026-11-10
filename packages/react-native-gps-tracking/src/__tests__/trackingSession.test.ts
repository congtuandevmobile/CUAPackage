import { TrackingStateError } from '../api/errors'
import { TrackingSession } from '../api/trackingSession'
import type { TrackingSnapshot } from '../domain/trackingSnapshot'
import { FakePlatform, platformSnapshot } from './fakePlatform'

const make = (platform = new FakePlatform(), extra = {}) => ({
  platform,
  session: new TrackingSession({ platform, ...extra }),
})

describe('TrackingSession lifecycle', () => {
  it('starts, pauses, resumes and finishes', async () => {
    const { platform, session } = make()
    await session.start({ sessionId: 's1' })
    expect(session.snapshot.state).toBe('running')
    await session.pause()
    expect(session.snapshot.state).toBe('paused')
    await session.resume()
    expect(session.snapshot.state).toBe('running')
    expect(session.snapshot.segmentId).toBe(1)
    const final = await session.finish()
    expect(final.state).toBe('finished')
    expect(final.stepsFinal).toBe(true)
    expect(platform.calls).toEqual(['start', 'pause', 'resume', 'stop'])
    // stops listening once finished
    expect(platform.nativeSnapshotListeners).toBe(0)
  })

  it('refuses to start without the location permission', async () => {
    const platform = new FakePlatform()
    platform.permission = 'denied'
    const { session } = make(platform)
    await expect(session.start({ sessionId: 's1' })).rejects.toThrow('location permission: denied')
    expect(platform.calls).toEqual([])
  })

  it('refuses a second start, and a restart after finish', async () => {
    const { session } = make()
    await session.start({ sessionId: 's1' })
    await expect(session.start({ sessionId: 's2' })).rejects.toBeInstanceOf(TrackingStateError)
    await session.finish()
    await expect(session.start({ sessionId: 's3' })).rejects.toThrow('already finished')
  })

  it('refuses pause/resume in the wrong state', async () => {
    const { session } = make()
    await expect(session.pause()).rejects.toBeInstanceOf(TrackingStateError)
    await session.start({ sessionId: 's1' })
    await expect(session.resume()).rejects.toThrow('expected paused, was running')
  })

  it('throws when native does not start running', async () => {
    const platform = new FakePlatform()
    platform.nextState = 'permissionDenied'
    const { session } = make(platform)
    await expect(session.start({ sessionId: 's1' })).rejects.toThrow('native did not start: permissionDenied')
  })

  it('finish with a non-final native state keeps the session and throws', async () => {
    const platform = new FakePlatform()
    platform.stop = async (id) => platformSnapshot({ sessionId: id, state: 'finishing' })
    const { session } = make(platform)
    await session.start({ sessionId: 's1' })
    await expect(session.finish()).rejects.toThrow('finish did not complete')
    expect(session.snapshot.state).toBe('finishing')
  })

  it('sends the config to native with the unit conversions', async () => {
    const { platform, session } = make(undefined, { stepsEnabled: true })
    await session.start({ sessionId: 's1' })
    const request = platform.requests[0]
    expect(request?.stepsEnabled).toBe(true)
    expect(request?.config.maxFixAgeMs).toBe(30_000)
  })
})

describe('TrackingSession snapshots', () => {
  it('ignores snapshots of another session and notifies only on change', async () => {
    const { platform, session } = make()
    const seen: TrackingSnapshot[] = []
    session.subscribe((s) => seen.push(s))
    await session.start({ sessionId: 's1' })
    const afterStart = seen.length
    platform.emitSnapshot(platformSnapshot({ sessionId: 'other', state: 'running' }))
    expect(seen.length).toBe(afterStart)
    const live = platformSnapshot({ sessionId: 's1', state: 'running', fixCount: 5 })
    platform.emitSnapshot(live)
    platform.emitSnapshot(live) // identical: no notification
    expect(seen.length).toBe(afterStart + 1)
    expect(session.snapshot.fixCount).toBe(5)
  })

  it('maps "unknown" and a write failure code into the snapshot', async () => {
    const { platform, session } = make()
    await session.start({ sessionId: 's1' })
    platform.emitSnapshot(
      platformSnapshot({ sessionId: 's1', state: 'running', error: 'STORE_WRITE_FAILED: disk full' })
    )
    expect(session.snapshot.journalFailed).toBe(true)
    expect(session.snapshot.speedMps).toBeUndefined()
  })

  it('keeps the recording state on a native failure and reports it', async () => {
    const { platform, session } = make()
    await session.start({ sessionId: 's1' })
    platform.emitSnapshot(platformSnapshot({ sessionId: 's1', state: 'permissionDenied' }))
    expect(session.snapshot.state).toBe('running')
    expect(session.snapshot.failureState).toBe('permissionDenied')
  })

  it('filters fixes by session and stops on unsubscribe', async () => {
    const { platform, session } = make()
    await session.start({ sessionId: 's1' })
    const got: string[] = []
    const off = session.onFix((f) => got.push(f.sessionId))
    const fix = (sessionId: string) => ({
      sessionId, segmentId: 0, seq: 0, time: new Date(0), elapsedMs: 0,
      latitude: 1, longitude: 2, provider: 'gps', isMock: false,
    })
    platform.emitFix(fix('s1'))
    platform.emitFix(fix('other'))
    off()
    platform.emitFix(fix('s1'))
    expect(got).toEqual(['s1'])
    expect(platform.nativeFixListeners).toBe(0)
  })
})

describe('TrackingSession restore and external inputs', () => {
  it('restores paused and inherits the journal recover gap', async () => {
    const { platform, session } = make()
    await session.restore({ sessionId: 's9', recoverRunning: true })
    expect(session.snapshot.state).toBe('paused')
    expect(platform.requests[0]).toMatchObject({ recoverRunning: true, inheritRecoverGap: true })
  })

  it('tags a pdr estimate with the current segment and ignores inputs without a session', async () => {
    const { platform, session } = make()
    session.submitPdr(10) // no session yet
    await session.start({ sessionId: 's1' })
    await session.pause()
    await session.resume()
    session.submitPdr(12)
    expect(platform.calls.filter((c) => c.startsWith('pdr'))).toEqual(['pdr:s1:1:12'])
  })
})

describe('TrackingSession presenter', () => {
  it('delivers lifecycle events in order and a failing presenter does not affect the recording', async () => {
    const events: string[] = []
    const errors: unknown[] = []
    const presenter = {
      onStart: () => void events.push('start'),
      onPause: () => {
        events.push('pause')
        throw new Error('boom')
      },
      onResume: () => void events.push('resume'),
      onFinish: () => void events.push('finish'),
    }
    const { session } = make(undefined, { presenter, onPresenterError: (e: unknown) => errors.push(e) })
    await session.start({ sessionId: 's1' })
    await session.pause()
    await session.resume()
    await session.finish()
    await session.dispose()
    expect(events).toEqual(['start', 'pause', 'resume', 'finish'])
    expect(errors).toHaveLength(1)
    expect(session.snapshot.state).toBe('finished')
  })
})
