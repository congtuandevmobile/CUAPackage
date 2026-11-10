import { PresenterDispatcher } from '../api/presenterDispatcher'
import { idleSnapshot } from '../domain/trackingSnapshot'

const snap = (n: number) => ({ ...idleSnapshot, fixCount: n })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('PresenterDispatcher', () => {
  it('coalesces updates: only the newest waits behind a running call', async () => {
    const seen: number[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const d = new PresenterDispatcher({
      onStart: () => gate,
      onUpdate: (s) => void seen.push(s.fixCount),
    })
    d.lifecycle('start', snap(0))
    d.update(snap(1))
    d.update(snap(2))
    d.update(snap(3))
    release()
    await d.close()
    expect(seen).toEqual([3])
  })

  it('drops a pending update once finish is queued', async () => {
    const seen: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const d = new PresenterDispatcher({
      onStart: () => gate,
      onUpdate: () => void seen.push('update'),
      onFinish: () => void seen.push('finish'),
    })
    d.lifecycle('start', snap(0))
    d.update(snap(1))
    d.lifecycle('finish', snap(2))
    d.update(snap(3))
    release()
    await d.close()
    expect(seen).toEqual(['finish'])
  })

  it('reports a timeout, never overlaps the hung call, and resumes when it ends', async () => {
    const errors: string[] = []
    const order: string[] = []
    let finishHung!: () => void
    const hung = new Promise<void>((r) => (finishHung = r))
    const d = new PresenterDispatcher(
      {
        onStart: () => {
          order.push('start:begin')
          return hung.then(() => void order.push('start:end'))
        },
        onPause: () => void order.push('pause'),
      },
      { callTimeoutMs: 20, onError: (e) => errors.push((e as Error).name) }
    )
    d.lifecycle('start', snap(0))
    d.lifecycle('pause', snap(1))
    await sleep(60)
    expect(errors).toEqual(['PresenterTimeoutError'])
    expect(order).toEqual(['start:begin']) // pause waits for the hung call
    finishHung()
    await sleep(10)
    expect(order).toEqual(['start:begin', 'start:end', 'pause'])
    await d.close()
  })

  it('contains a throwing error handler and bounds close()', async () => {
    const d = new PresenterDispatcher(
      { onStart: () => Promise.reject(new Error('x')) },
      { onError: () => { throw new Error('handler') } }
    )
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    d.lifecycle('start', snap(0))
    await d.close()
    const never = new PresenterDispatcher({ onStart: () => new Promise<void>(() => {}) }, { callTimeoutMs: 10, onError: () => {} })
    never.lifecycle('start', snap(0))
    const started = Date.now()
    await never.close(50)
    expect(Date.now() - started).toBeLessThan(500)
  })

  it('overflow drops the oldest lifecycle event and reports it', async () => {
    const errors: string[] = []
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const seen: number[] = []
    const d = new PresenterDispatcher(
      { onStart: () => gate, onPause: (s) => void seen.push(s.fixCount) },
      { maxQueued: 2, onError: (e) => errors.push((e as Error).message) }
    )
    d.lifecycle('start', snap(0))
    await sleep(0)
    d.lifecycle('pause', snap(1))
    d.lifecycle('pause', snap(2))
    d.lifecycle('pause', snap(3))
    release()
    await d.close()
    expect(errors[0]).toContain('overflow')
    expect(seen).toEqual([2, 3])
  })
})
