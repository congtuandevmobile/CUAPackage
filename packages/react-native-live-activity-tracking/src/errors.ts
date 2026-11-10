/** A failure of the module. `code`: `NOT_FOUND` (no such activity), `NOT_SUPPORTED`, or `UNKNOWN`. */
export class LiveActivityError extends Error {
  readonly code: string
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'LiveActivityError'
    this.code = code
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause
  }
}

// Not anchored: the bridge may prepend its own text. Every code is UPPER_SNAKE.
const CODE_PREFIX = /\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*): ([\s\S]*)$/

export function parseLiveActivityError(error: unknown): LiveActivityError {
  if (error instanceof LiveActivityError) return error
  const text = error instanceof Error ? error.message : String(error)
  const match = CODE_PREFIX.exec(text)
  const code = match?.[1]
  return code === 'NOT_FOUND' || code === 'NOT_SUPPORTED'
    ? new LiveActivityError(code, match?.[2] ?? text, { cause: error })
    : new LiveActivityError('UNKNOWN', text, { cause: error })
}
