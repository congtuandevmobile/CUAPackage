/**
 * A failure of the module. `code` is stable: `UNSUPPORTED_PLATFORM` (not iOS), `INVALID_UUID`, `WORKOUT_NOT_FOUND`,
 * or `UNKNOWN` for an error HealthKit itself raised (its text is kept in `message`).
 */
export class AppleHealthSyncError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'AppleHealthSyncError'
    this.code = code
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause
  }
}

// Not anchored: the bridge may prepend its own text to the native message. Every code has an underscore.
const CODE_PREFIX = /\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+): ([\s\S]*)$/

/** Native errors arrive as `CODE: message`; anything else keeps the code `UNKNOWN`. */
export function parseAppleHealthSyncError(error: unknown): AppleHealthSyncError {
  if (error instanceof AppleHealthSyncError) return error
  const text = error instanceof Error ? error.message : String(error)
  const match = CODE_PREFIX.exec(text)
  return match
    ? new AppleHealthSyncError(match[1] as string, match[2] as string, { cause: error })
    : new AppleHealthSyncError('UNKNOWN', text, { cause: error })
}
