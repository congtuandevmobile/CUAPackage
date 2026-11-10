jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('react-native-nitro-modules', () => ({ NitroModules: { createHybridObject: jest.fn() } }))

import { AppleHealthSync, toWorkout } from '../appleHealthSync'
import { AppleHealthSyncError, parseAppleHealthSyncError } from '../errors'
import { HealthSport } from '../sports'
import type { AppleHealthSync as Native, NitroHealthWorkoutRecord } from '../specs/AppleHealthSync.nitro'

const workout = (o: Partial<NitroHealthWorkoutRecord> = {}): NitroHealthWorkoutRecord => ({
  uuid: 'u', activityType: 'activity', sport: 'soccer', sportId: 41, startTime: 1, endTime: 2, embeddedSteps: -1,
  elevationAscended: -1, ...o,
})

function fakeNative(overrides: Partial<Native> = {}) {
  const calls: unknown[][] = []
  let observer: (() => void) | undefined
  const native = {
    isHealthDataAvailable: () => true,
    requestPermissions: async () => true,
    readWorkouts: async (...args: unknown[]) => {
      calls.push(args)
      return [workout(), workout({ uuid: 'r', sport: 'whatever', sportId: 37, activityType: 'running', embeddedSteps: 120, elevationAscended: 8 })]
    },
    readCadenceSamples: async () => [],
    setObserverListener: (l: (() => void) | undefined) => {
      observer = l
      calls.push(['observer', l ? 'set' : 'cleared'])
    },
    ...overrides,
  } as unknown as Native
  return { native, calls, fire: () => observer?.() }
}

describe('AppleHealthSync workouts', () => {
  it('names the exact sport from the id and keeps the real id for a sport newer than the table', async () => {
    const { native } = fakeNative()
    const rows = await new AppleHealthSync({ native, platformOS: 'ios' }).readWorkouts(0, 10)
    expect(rows[0]).toMatchObject({ sport: 'soccer', sportId: HealthSport.SOCCER, activityType: 'activity' })
    // the name is derived from the id, not trusted from native
    expect(rows[1]).toMatchObject({ sport: 'running', sportId: 37, activityType: 'running' })
    expect(toWorkout(workout({ sportId: 9999, sport: 'unknown' }))).toMatchObject({ sport: 'unknown', sportId: 9999 })
  })

  it('turns the "not available" sentinels into undefined and keeps real values', async () => {
    const { native } = fakeNative()
    const [soccer, run] = await new AppleHealthSync({ native, platformOS: 'ios' }).readWorkouts(0, 10)
    expect(soccer?.embeddedSteps).toBeUndefined()
    expect(soccer?.elevationAscended).toBeUndefined()
    expect(run?.embeddedSteps).toBe(120)
    expect(run?.elevationAscended).toBe(8)
  })

  it('accepts Date or ms and defaults to Apple sources only', async () => {
    const { native, calls } = fakeNative()
    const sdk = new AppleHealthSync({ native, platformOS: 'ios' })
    await sdk.readWorkouts(new Date(1000), 2000)
    await sdk.readWorkouts(1, 2, { onlyAppleSources: false })
    expect(calls).toEqual([[1000, 2000, true], [1, 2, false]])
  })

  it('turns a native failure into an AppleHealthSyncError with its code', async () => {
    const { native } = fakeNative({
      readCadenceSamples: async () => {
        throw new Error('WORKOUT_NOT_FOUND: No workout found for UUID: x')
      },
    })
    await expect(new AppleHealthSync({ native, platformOS: 'ios' }).readCadenceSamples('x')).rejects.toMatchObject({
      name: 'AppleHealthSyncError',
      code: 'WORKOUT_NOT_FOUND',
    })
    expect(parseAppleHealthSyncError(new Error('HealthKit said no')).code).toBe('UNKNOWN')
  })
})

describe('AppleHealthSync platform and observer', () => {
  it('is unavailable and throws UNSUPPORTED_PLATFORM off iOS', async () => {
    const sdk = new AppleHealthSync({ platformOS: 'android' })
    expect(sdk.isAvailable()).toBe(false)
    await expect(sdk.readWorkouts(0, 1)).rejects.toBeInstanceOf(AppleHealthSyncError)
    await expect(sdk.readWorkouts(0, 1)).rejects.toMatchObject({ code: 'UNSUPPORTED_PLATFORM' })
  })

  it('fans one native listener out to many subscribers and clears it with the last', () => {
    const { native, calls, fire } = fakeNative()
    const sdk = new AppleHealthSync({ native, platformOS: 'ios' })
    let a = 0
    let b = 0
    const offA = sdk.onNewDataAvailable(() => a++)
    const offB = sdk.onNewDataAvailable(() => b++)
    fire()
    offA()
    fire()
    offB()
    offB() // idempotent
    expect([a, b]).toEqual([1, 2])
    expect(calls).toEqual([['observer', 'set'], ['observer', 'cleared']])
  })
})
