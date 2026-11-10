/** Thrown when an operation is not allowed in the current state. */
export class TrackingStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TrackingStateError'
  }
}

/**
 * A failure reported by the native layer. `code` is the stable code the native side puts in front of its message
 * (`START_FAILED`, `FOREGROUND_START_FAILED`, `STORE_WRITE_FAILED`, ...); switch on it, not on the text.
 */
export class TrackingError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'TrackingError'
    this.code = code
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause
  }
}

// Not anchored: the bridge may prepend its own text (for example the host function name) to the native message.
const CODE_PREFIX = /\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+): ([\s\S]*)$/

/** Native errors arrive as `CODE: message` (every code has an underscore); anything else keeps the code `UNKNOWN`. */
export function parseTrackingError(error: unknown): TrackingError {
  if (error instanceof TrackingError) return error
  const text = error instanceof Error ? error.message : String(error)
  const match = CODE_PREFIX.exec(text)
  return match
    ? new TrackingError(match[1] as string, match[2] as string, { cause: error })
    : new TrackingError('UNKNOWN', text, { cause: error })
}
