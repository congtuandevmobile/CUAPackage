/** One raw location reading. `undefined` means the platform did not know the value. */
export interface TrackingFix {
  readonly sessionId: string
  readonly segmentId: number
  readonly seq: number
  /** When the position was measured (not when it was delivered). */
  readonly time: Date
  /** Monotonic time since boot at the measurement, ms. */
  readonly elapsedMs: number
  readonly latitude: number
  readonly longitude: number
  readonly horizontalAccuracy?: number
  /** Doppler speed, m/s. */
  readonly speed?: number
  readonly speedAccuracy?: number
  readonly course?: number
  readonly altitude?: number
  readonly verticalAccuracy?: number
  readonly provider: string
  readonly isMock: boolean
}
