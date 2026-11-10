jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }))

import { LiveActivityError, parseLiveActivityError } from '../errors'
import { LiveActivityTracking, toNativeOptions } from '../liveActivityTracking'
import type { LiveActivityTracking as Native, NitroLiveActivityEvent } from '../specs/LiveActivityTracking.nitro'

function fakeNative(overrides: Partial<Native> = {}) {
  const calls: unknown[][] = []
  let listener: ((e: NitroLiveActivityEvent) => void) | undefined
  const native = {
    isSupported: async () => true,
    startActivity: async (...a: unknown[]) => {
      calls.push(['start', ...a])
      return { activityId: 'A1', success: true }
    },
    updateActivity: async (...a: unknown[]) => {
      calls.push(['update', ...a])
      return true
    },
    endActivity: async () => true,
    getActiveActivityIds: () => [],
    setEventListener: (l: typeof listener) => {
      listener = l
      calls.push(['listener', l ? 'set' : 'cleared'])
    },
    ...overrides,
  } as unknown as Native
  return { native, calls, fire: (e: NitroLiveActivityEvent) => listener?.(e) }
}

describe('options mapping', () => {
  it('fills English labels, keeps the app texts and the Android defaults', () => {
    const o = toNativeOptions({ labels: { distance: 'Quãng đường' }, deepLinkUrl: 'myapp://record', android: { notificationId: 7421, foregroundService: false } })
    expect(o.labels).toMatchObject({ distance: 'Quãng đường', time: 'Time', paused: 'Paused' })
    expect(o).toMatchObject({ deepLinkUrl: 'myapp://record', enablePushUpdates: false, androidNotificationId: 7421, androidForegroundService: false })
    expect(toNativeOptions().androidForegroundService).toBe(true)
  })
})

describe('LiveActivityTracking', () => {
  it('starts with the data and the mapped options', async () => {
    const { native, calls } = fakeNative()
    const result = await new LiveActivityTracking({ native }).start({ activityType: 'soccer', status: 'active' }, { title: 'Soccer' })
    expect(result).toEqual({ activityId: 'A1', success: true })
    expect(calls[0]).toMatchObject(['start', { activityType: 'soccer' }, { title: 'Soccer', androidForegroundService: true }])
  })

  it('turns a native failure into a LiveActivityError with its code', async () => {
    const { native } = fakeNative({
      updateActivity: async () => {
        throw new Error("NOT_FOUND: No active Live Activity with id 'x'.")
      },
    })
    await expect(new LiveActivityTracking({ native }).update('x', {})).rejects.toMatchObject({ name: 'LiveActivityError', code: 'NOT_FOUND' })
    expect(parseLiveActivityError(new Error('boom'))).toBeInstanceOf(LiveActivityError)
    expect(parseLiveActivityError(new Error('boom')).code).toBe('UNKNOWN')
  })

  it('fans events out, ignores unknown ones, and clears the native listener with the last subscriber', () => {
    const { native, calls, fire } = fakeNative()
    const sdk = new LiveActivityTracking({ native })
    const tokens: string[] = []
    const states: string[] = []
    const offToken = sdk.onPushToken((e) => tokens.push(e.token))
    const offState = sdk.onStateChange((e) => states.push(e.state))
    fire({ type: 'pushToken', activityId: 'A1', token: 'ab12' })
    fire({ type: 'stateChange', activityId: 'A1', state: 'ended' })
    fire({ type: 'stateChange', activityId: 'A1', state: 'pending' }) // newer than the table
    fire({ type: 'pushToken', activityId: 'A1' }) // no token: dropped
    offToken()
    offState()
    offState()
    expect(tokens).toEqual(['ab12'])
    expect(states).toEqual(['ended', 'unknown'])
    expect(calls.filter((c) => c[0] === 'listener')).toEqual([['listener', 'set'], ['listener', 'cleared']])
  })
})
