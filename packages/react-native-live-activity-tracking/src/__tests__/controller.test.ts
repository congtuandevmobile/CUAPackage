import { WorkoutLiveActivity } from '../controller'
import type { LiveActivityData, LiveActivityResult } from '../types'

function setup(existing: string[] = []) {
  let t = 1_000_000
  const log: string[] = []
  const pushed: LiveActivityData[] = []
  const activity = {
    getActiveActivityIds: () => existing,
    start: async (d: LiveActivityData): Promise<LiveActivityResult> => {
      log.push('start')
      pushed.push(d)
      return { activityId: 'A1', success: true }
    },
    update: async (id: string, d: LiveActivityData) => {
      log.push(`update:${id}:${d.status}`)
      pushed.push(d)
      return true
    },
    end: async (id: string) => {
      log.push(`end:${id}`)
      return true
    },
  }
  const wla = new WorkoutLiveActivity({ activity, now: () => t, minUpdateIntervalMs: 1000 })
  return { wla, log, pushed, tick: (ms: number) => (t += ms) }
}

describe('WorkoutLiveActivity', () => {
  it('starts once, even when asked twice at the same time or again later', async () => {
    const { wla, log } = setup()
    const [a, b] = await Promise.all([wla.start({ activityType: 'soccer', elapsedSeconds: 0 }), wla.start({ activityType: 'soccer' })])
    expect(a).toEqual(b)
    await wla.start({})
    expect(log).toEqual(['start'])
    expect(wla.activityId).toBe('A1')
  })

  it('reclaims an activity that survived the last session instead of starting a second one', async () => {
    const { wla, log } = setup(['OLD'])
    const r = await wla.start({ activityType: 'running', elapsedSeconds: 30 })
    expect(r).toEqual({ activityId: 'OLD', success: true })
    expect(log).toEqual(['update:OLD:active'])
  })

  it('throttles unchanged-status updates but never a status change', async () => {
    const { wla, log, tick } = setup()
    await wla.start({ elapsedSeconds: 0 })
    tick(200)
    await wla.update({ elapsedSeconds: 1 }) // throttled
    tick(900)
    await wla.update({ elapsedSeconds: 2 }) // pushed
    await wla.pause() // forced
    await wla.resume() // forced
    expect(log).toEqual(['start', 'update:A1:active', 'update:A1:paused', 'update:A1:active'])
  })

  it('counts the live timer from now - elapsed while running, zeroes pace when paused', async () => {
    const { wla, pushed, tick } = setup()
    await wla.start({ elapsedSeconds: 0, paceSecondsPerKm: 330 })
    tick(5000)
    await wla.update({ elapsedSeconds: 5 })
    expect(pushed[1]?.activeStartTimestamp).toBe(1_005_000 - 5000)
    await wla.pause()
    expect(pushed[2]).toMatchObject({ status: 'paused', paceSecondsPerKm: 0 })
    tick(60_000)
    await wla.resume()
    expect(pushed[3]?.activeStartTimestamp).toBe(1_065_000 - 5000) // virtual start moves forward by the pause
  })

  it('finish shows the final state, ends once, and a second finish does nothing', async () => {
    const { wla, log } = setup()
    await wla.start({ elapsedSeconds: 0 })
    expect(await wla.finish({ elapsedSeconds: 600 })).toBe(true)
    expect(await wla.finish()).toBe(false)
    expect(log).toEqual(['start', 'update:A1:finished', 'end:A1'])
    expect(wla.activityId).toBeUndefined()
    expect(await wla.update({ elapsedSeconds: 1 })).toBe(false)
  })

  it('reports a refused start without keeping an id', async () => {
    const activity = {
      getActiveActivityIds: () => [],
      start: async (): Promise<LiveActivityResult> => ({ success: false, error: 'disabled' }),
      update: async () => true,
      end: async () => true,
    }
    const wla = new WorkoutLiveActivity({ activity })
    expect(await wla.start({})).toEqual({ success: false, error: 'disabled' })
    expect(wla.activityId).toBeUndefined()
    expect(await wla.finish()).toBe(false)
  })
})
