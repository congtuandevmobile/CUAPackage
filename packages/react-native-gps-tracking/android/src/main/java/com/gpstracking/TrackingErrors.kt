package com.gpstracking

import android.util.Log

/** Error codes the JS side can switch on. */
internal object TrackingErrorCode {
    const val NO_ACTIVITY = "NO_ACTIVITY"
    const val PERMISSION_REQUEST_FAILED = "PERMISSION_REQUEST_FAILED"
    const val PERMISSION_REQUEST_PENDING = "PERMISSION_REQUEST_PENDING"
    const val START_FAILED = "START_FAILED"
    const val PAUSE_FAILED = "PAUSE_FAILED"
    const val RESUME_FAILED = "RESUME_FAILED"
    const val STOP_FAILED = "STOP_FAILED"
    const val RESTORE_FAILED = "RESTORE_FAILED"
    const val CORE_REJECTED = "CORE_REJECTED"
    const val STORE_READ_FAILED = "STORE_READ_FAILED"
    const val STORE_CLEAR_FAILED = "STORE_CLEAR_FAILED"
    const val LOCATION_UPDATES_FAILED = "LOCATION_UPDATES_FAILED"
    const val STORE_WRITE_FAILED = "STORE_WRITE_FAILED"
    const val STEPS_FAILED = "STEPS_FAILED"
    const val CADENCE_FAILED = "CADENCE_FAILED"
    const val JOURNAL_REPAIRED = "JOURNAL_REPAIRED"
    const val JOURNAL_CORRUPT = "JOURNAL_CORRUPT"
    const val ENGINE_CHANGED = "ENGINE_CHANGED"
    const val FOREGROUND_START_FAILED = "FOREGROUND_START_FAILED"
    const val STORE_LIST_FAILED = "STORE_LIST_FAILED"
}

private const val LOG_TAG = "GpsTracking"

/**
 * A failure that reaches JS as a rejected promise. The stable [code] is the prefix of the JS error message
 * (`CODE: message`), and the stack trace is kept as [details].
 */
class TrackingException(val code: String, message: String, val details: String? = null) :
    RuntimeException("$code: $message")

/**
 * Turns any failure into a [TrackingException]: a stable code, a short message, and the stack trace as details.
 * Nothing is swallowed: the failure is logged here as well.
 */
internal fun Throwable.toTrackingException(code: String, message: String): TrackingException {
    Log.e(LOG_TAG, "$code: $message", this)
    return TrackingException(
        code = code,
        message = "$message (${this::class.java.simpleName}: ${this.message ?: "no message"})",
        details = stackTraceToString(),
    )
}

internal fun trackingException(code: String, message: String, details: String? = null): TrackingException {
    Log.e(LOG_TAG, "$code: $message")
    return TrackingException(code = code, message = message, details = details)
}
