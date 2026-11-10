import type { LiveActivityTracking } from './liveActivityTracking'
import type { LiveActivityData, LiveActivityOptions, LiveActivityResult } from './types'

export interface WorkoutLiveActivityOptions {
  /** The facade (or anything with the same four commands). */
  activity: Pick<LiveActivityTracking, 'start' | 'update' | 'end' | 'getActiveActivityIds'>
  options?: LiveActivityOptions
  /** Longest pause between two pushes of unchanged status (default 1000 ms). A status change is never throttled. */
  minUpdateIntervalMs?: number
  /** Clock in epoch ms (tests). */
  now?: () => number
}

/**
 * The state and the commands of one workout's activity, free of React and of native code: `start`, `update`, `pause`,
 * `resume`, `finish`. It is deterministic under repeated calls (a second `start` while open reclaims the open
 * activity, a second `finish` does nothing), throttles the pushes, and keeps the live timer honest by recomputing
 * `activeStartTimestamp` (= now - elapsed) whenever the workout is running.
 */
export class WorkoutLiveActivity {
  private readonly activity: WorkoutLiveActivityOptions['activity']
  private readonly options?: LiveActivityOptions
  private readonly minIntervalMs: number
  private readonly now: () => number

  private id?: string
  private last: LiveActivityData = {}
  private lastPushAt = -Infinity
  private lastPushedStatus?: string
  private starting?: Promise<LiveActivityResult>

  constructor(o: WorkoutLiveActivityOptions) {
    this.activity = o.activity
    this.options = o.options
    this.minIntervalMs = o.minUpdateIntervalMs ?? 1000
    this.now = o.now ?? Date.now
  }

  /** The id of the open activity, if any. */
  get activityId(): string | undefined {
    return this.id
  }

  /** The latest state this object holds (what was or will be pushed). */
  get state(): Readonly<LiveActivityData> {
    return this.last
  }

  /**
   * Starts the activity, or takes back one that survived a previous session. Concurrent calls share one start.
   * Resolves with `success: false` and the reason when the platform refuses.
   */
  async start(data: LiveActivityData): Promise<LiveActivityResult> {
    if (this.id !== undefined) return { activityId: this.id, success: true }
    if (this.starting) return this.starting
    const startedAt = data.startTimestamp ?? this.now()
    this.last = this.withTimer({ ...data, status: data.status ?? 'active', startTimestamp: startedAt })
    this.starting = (async () => {
      try {
        const reclaimed = this.activity.getActiveActivityIds()[0]
        const result: LiveActivityResult =
          reclaimed !== undefined
            ? { activityId: reclaimed, success: true }
            : await this.activity.start(this.last, this.options)
        if (result.success && result.activityId !== undefined) {
          this.id = result.activityId
          this.lastPushAt = this.now()
          this.lastPushedStatus = this.last.status
          if (reclaimed !== undefined) await this.activity.update(reclaimed, this.last)
        }
        return result
      } finally {
        this.starting = undefined
      }
    })()
    return this.starting
  }

  /** Records the numbers and pushes them (throttled while the status does not change). */
  async update(partial: LiveActivityData): Promise<boolean> {
    this.last = this.withTimer({ ...this.last, ...partial })
    return this.push(false)
  }

  async pause(partial: LiveActivityData = {}): Promise<boolean> {
    this.last = { ...this.last, ...partial, status: 'paused', paceSecondsPerKm: 0 }
    return this.push(true)
  }

  async resume(partial: LiveActivityData = {}): Promise<boolean> {
    this.last = this.withTimer({ ...this.last, ...partial, status: 'active' })
    return this.push(true)
  }

  /** Shows the final numbers and ends the activity. A second call does nothing. */
  async finish(partial: LiveActivityData = {}): Promise<boolean> {
    const id = this.id
    if (id === undefined) return false
    this.last = { ...this.last, ...partial, status: 'finished', paceSecondsPerKm: 0 }
    await this.push(true)
    this.id = undefined
    return this.activity.end(id)
  }

  private push(force: boolean): Promise<boolean> {
    const id = this.id
    if (id === undefined) return Promise.resolve(false)
    const t = this.now()
    const statusChanged = this.last.status !== this.lastPushedStatus
    if (!force && !statusChanged && t - this.lastPushAt < this.minIntervalMs) return Promise.resolve(true)
    this.lastPushAt = t
    this.lastPushedStatus = this.last.status
    return this.activity.update(id, this.last)
  }

  /** While running, the timer counts from (now - elapsed) so it matches the app's own clock after every resume. */
  private withTimer(d: LiveActivityData): LiveActivityData {
    if (d.status !== 'active' || d.elapsedSeconds === undefined) return d
    return { ...d, activeStartTimestamp: this.now() - d.elapsedSeconds * 1000 }
  }
}
