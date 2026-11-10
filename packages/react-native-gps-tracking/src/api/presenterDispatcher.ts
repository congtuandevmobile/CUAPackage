import type { TrackingSnapshot } from '../domain/trackingSnapshot'
import type { TrackingPresenter } from './trackingPresenter'

/** What a [TrackingPresenter] is told. */
export type PresenterEvent = 'start' | 'update' | 'pause' | 'resume' | 'finish'

export interface PresenterDispatcherOptions {
  onError?: (error: unknown) => void
  callTimeoutMs?: number
  maxQueued?: number
}

class PresenterTimeoutError extends Error {
  constructor(event: PresenterEvent, ms: number) {
    super(`presenter ${event} did not finish within ${ms} ms`)
    this.name = 'PresenterTimeoutError'
  }
}

/**
 * Delivers recording events to a [TrackingPresenter] without ever letting it hurt the recording:
 *
 *  - lifecycle events (start, pause, resume, finish) are delivered in order and kept (the queue is capped: on
 *    overflow the OLDEST are discarded and reported, so "never dropped" holds only below the cap);
 *  - `update` events are COALESCED: only the newest waits, and a pending update is discarded once `finish` is queued;
 *  - every call has a time limit; a presenter that hangs or is slow is reported. A timeout does NOT cancel the
 *    original call (a promise cannot be cancelled), so the dispatcher never starts another call while the hung one
 *    is still running: events queue and are delivered, in order, once it finally completes;
 *  - a throwing presenter, or a throwing error handler, is contained;
 *  - `close` waits for delivery but never longer than a bound, so `dispose` cannot hang.
 */
export class PresenterDispatcher {
  private readonly lifecycleQueue: Array<[PresenterEvent, TrackingSnapshot]> = []
  private pendingUpdate?: TrackingSnapshot
  private pumping = false
  private closed = false
  private finishQueued = false
  private stuck = false
  private idleWaiters: Array<() => void> = []
  private readonly onError?: (error: unknown) => void
  readonly callTimeoutMs: number
  readonly maxQueued: number

  constructor(
    private readonly presenter: TrackingPresenter,
    options: PresenterDispatcherOptions = {}
  ) {
    this.onError = options.onError
    this.callTimeoutMs = options.callTimeoutMs ?? 5000
    this.maxQueued = options.maxQueued ?? 32
  }

  lifecycle(event: PresenterEvent, snapshot: TrackingSnapshot): void {
    if (this.closed) return
    if (event === 'finish') {
      this.finishQueued = true
      this.pendingUpdate = undefined // nothing stale after the final snapshot
    }
    if (this.lifecycleQueue.length >= this.maxQueued) {
      this.lifecycleQueue.shift()
      this.report(new Error('presenter queue overflow: the oldest event was dropped'))
    }
    this.lifecycleQueue.push([event, snapshot])
    this.pump()
  }

  update(snapshot: TrackingSnapshot): void {
    if (this.closed || this.finishQueued) return
    this.pendingUpdate = snapshot
    this.pump()
  }

  /** Waits until everything queued was delivered (or timed out), for at most [maxWaitMs]; then stops accepting. */
  async close(maxWaitMs: number = this.callTimeoutMs * 2): Promise<void> {
    if (this.pumping || this.stuck) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, maxWaitMs)
        this.idleWaiters.push(() => {
          clearTimeout(timer)
          resolve()
        })
      })
    }
    // Closed means closed: nothing queued may be delivered later, not even when a hung call finally completes.
    this.closed = true
    this.lifecycleQueue.length = 0
    this.pendingUpdate = undefined
  }

  private pump(): void {
    if (this.closed || this.pumping || this.stuck) return
    this.pumping = true
    void (async () => {
      for (;;) {
        let next: [PresenterEvent, TrackingSnapshot] | undefined
        if (this.closed) break
        if (this.lifecycleQueue.length > 0) {
          next = this.lifecycleQueue.shift()
        } else if (this.pendingUpdate) {
          next = ['update', this.pendingUpdate]
          this.pendingUpdate = undefined
        } else {
          break
        }
        if (!next) break
        const timedOut = await this.deliver(next[0], next[1])
        if (timedOut) break // never overlap with the hung call: wait for it
      }
      this.pumping = false
      if (!this.stuck) this.releaseIdle()
    })()
  }

  private releaseIdle(): void {
    const waiters = this.idleWaiters
    this.idleWaiters = []
    for (const w of waiters) w()
  }

  /** Returns true when the call exceeded its time limit and is still running. */
  private async deliver(event: PresenterEvent, snapshot: TrackingSnapshot): Promise<boolean> {
    let call: Promise<void>
    try {
      const handler = this.handlerFor(event)
      call = Promise.resolve(handler ? handler.call(this.presenter, snapshot) : undefined)
    } catch (error) {
      this.report(error)
      return false
    }
    type Outcome = { failed: false } | { failed: true; error: unknown }
    let settled = false
    let timedOut = false
    const outcome = await new Promise<Outcome>((resolve) => {
      const timer = setTimeout(() => {
        timedOut = true
        resolve({ failed: false })
      }, this.callTimeoutMs)
      call.then(
        () => {
          settled = true
          clearTimeout(timer)
          resolve({ failed: false })
        },
        (error: unknown) => {
          clearTimeout(timer)
          if (timedOut) this.report(error) // it failed after we gave up on it
          settled = true
          resolve({ failed: true, error })
        }
      )
    })
    if (outcome.failed) this.report(outcome.error)
    if (!timedOut) return false
    this.report(new PresenterTimeoutError(event, this.callTimeoutMs))
    if (settled) return false
    // Keep the hung call as the "stuck" one; resume once it ends, however it ends.
    this.stuck = true
    const resume = () => {
      this.stuck = false
      if (this.closed) return
      this.pump()
      if (!this.pumping) this.releaseIdle()
    }
    call.then(resume, resume)
    return true
  }

  private handlerFor(event: PresenterEvent) {
    switch (event) {
      case 'start':
        return this.presenter.onStart
      case 'update':
        return this.presenter.onUpdate
      case 'pause':
        return this.presenter.onPause
      case 'resume':
        return this.presenter.onResume
      case 'finish':
        return this.presenter.onFinish
    }
  }

  private report(error: unknown): void {
    const handler = this.onError
    if (!handler) {
      console.warn('[react-native-gps-tracking] presenter failed', error)
      return
    }
    try {
      handler(error)
    } catch (handlerError) {
      console.warn('[react-native-gps-tracking] presenter error handler failed', handlerError)
    }
  }
}
