package com.liveactivitytracking

import java.io.Serializable

/**
 * Everything the notification shows, plus the options fixed at start. Travels to the service inside an Intent, so it is
 * [Serializable]. An update changes the workout numbers and keeps the options ([withNumbers]).
 */
internal data class LivePayload(
    val activityType: String = "other",
    val elapsedSeconds: Int = 0,
    val distanceMeters: Double = 0.0,
    val paceSecondsPerKm: Double = 0.0,
    val heartRate: Int = 0,
    val calories: Double = 0.0,
    val steps: Int = 0,
    val startTimestamp: Long? = null,
    val activeStartTimestamp: Long? = null,
    val status: String = "active",
    // Options (given once, at start).
    val title: String = "",
    val deepLinkUrl: String? = null,
    val accentColor: String = "#0A84FF",
    val pausedLabel: String = "Paused",
    val notificationId: Int = DEFAULT_NOTIFICATION_ID,
    val channelName: String = "Live activity",
) : Serializable {

    /** The numbers of [update] with the options of this payload. */
    fun withNumbers(update: LivePayload): LivePayload = update.copy(
        activityType = update.activityType.ifEmpty { activityType },
        title = title,
        deepLinkUrl = deepLinkUrl,
        accentColor = accentColor,
        pausedLabel = pausedLabel,
        notificationId = notificationId,
        channelName = channelName,
        startTimestamp = update.startTimestamp ?: startTimestamp,
    )

    companion object {
        const val DEFAULT_NOTIFICATION_ID = 2000
        private const val serialVersionUID = 1L
    }
}
