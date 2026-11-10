package com.liveactivitytracking

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.net.toUri

/**
 * Builds the ongoing workout notification: a chronometer while active, the pace (or speed for cycling) and distance as
 * text, and on Android 16+ a promoted ongoing notification with the distance as the status chip. Texts come from the
 * app ([LivePayload]); the SDK ships no strings.
 */
internal class OngoingNotificationBuilder(private val context: Context) {

    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    fun systemManager(): NotificationManager = notificationManager

    private fun ensureChannel(name: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        // Promoted ongoing notifications need an importance of DEFAULT or HIGH.
        val channel = NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Live workout tracking"
            setShowBadge(false)
            enableVibration(false)
            setSound(null, null)
        }
        notificationManager.createNotificationChannel(channel)
    }

    fun build(p: LivePayload): Notification {
        ensureChannel(p.channelName)
        val isActive = p.status == "active"
        val wallStartMs = p.activeStartTimestamp ?: p.startTimestamp
            ?: (System.currentTimeMillis() - p.elapsedSeconds.toLong() * 1000L)

        val distanceText = "${formatDistance(p.distanceMeters)} km"
        val title = p.title.ifEmpty { p.activityType.replaceFirstChar { it.uppercase() } }
        val subtitle = "$distanceText • ${formatPace(p.paceSecondsPerKm, p.activityType)}"
        val subText = if (!isActive) p.pausedLabel else null
        val accent = parseColor(p.accentColor)

        val contentIntent = PendingIntent.getActivity(
            context, 0, launchIntent(p.deepLinkUrl),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        // Swiping the notification away (Android 14+) tells the service, which stops with it.
        val deleteIntent = PendingIntent.getService(
            context, 1,
            Intent(context, LiveActivityService::class.java)
                .setAction(LiveActivityService.ACTION_STOP)
                .putExtra(LiveActivityService.EXTRA_SESSION_ID, LiveActivityService.currentSessionId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return if (Build.VERSION.SDK_INT >= 36) {
            buildPromoted(title, subtitle, subText, distanceText, wallStartMs, isActive, accent, contentIntent, deleteIntent)
        } else {
            buildCompat(title, subtitle, subText, wallStartMs, isActive, accent, contentIntent, deleteIntent)
        }
    }

    @RequiresApi(36)
    private fun buildPromoted(
        title: String, subtitle: String, subText: String?, distanceText: String, wallStartMs: Long, isActive: Boolean,
        accent: Int, contentIntent: PendingIntent, deleteIntent: PendingIntent,
    ): Notification {
        val builder = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_live_activity_tracking)
            .setColor(accent)
            .setContentTitle(title) // a promoted notification MUST have a title
            .setContentText(subtitle)
            .setSubText(subText)
            .setOngoing(true) // and FLAG_ONGOING_EVENT
            .setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_WORKOUT)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setShowWhen(false)
            .setSortKey("0")
            .setDeleteIntent(deleteIntent)
            .setContentIntent(contentIntent)
            .setExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
            .setShortCriticalText(distanceText)
        // Chronometer only while active: when paused the elapsed time is not ticking.
        if (isActive) {
            builder.setUsesChronometer(true)
            builder.setWhen(wallStartMs)
        }
        // A promoted notification must NOT be colorized and must NOT use a custom content view.
        return builder.build()
    }

    private fun buildCompat(
        title: String, subtitle: String, subText: String?, wallStartMs: Long, isActive: Boolean, accent: Int,
        contentIntent: PendingIntent, deleteIntent: PendingIntent,
    ): Notification {
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_live_activity_tracking)
            .setColor(accent)
            .setContentTitle(title)
            .setContentText(subtitle)
            .setSubText(subText)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setSortKey("0")
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false)
            .setDeleteIntent(deleteIntent)
            .setContentIntent(contentIntent)
            .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
        if (isActive) {
            builder.setUsesChronometer(true)
            builder.setWhen(wallStartMs)
        }
        return builder.build()
    }

    /** The deep link when the app gave one, otherwise the launcher activity of the app. */
    private fun launchIntent(deepLinkUrl: String?): Intent {
        if (!deepLinkUrl.isNullOrBlank()) {
            return Intent(Intent.ACTION_VIEW, deepLinkUrl.toUri()).apply {
                setPackage(context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
        }
        return context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
    }

    private fun parseColor(hex: String): Int = try {
        Color.parseColor(if (hex.startsWith("#")) hex else "#$hex")
    } catch (_: IllegalArgumentException) {
        Color.parseColor(DEFAULT_ACCENT)
    }

    internal companion object {
        const val CHANNEL_ID = "live_activity_tracking"
        private const val DEFAULT_ACCENT = "#0A84FF"
        private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

        fun formatDistance(meters: Double): String {
            val km = meters / 1000.0
            return if (km < 10) "%.2f".format(km) else "%.1f".format(km)
        }

        /** Pace as `mm:ss` per km; km/h for cycling. */
        fun formatPace(secsPerKm: Double, activityType: String): String {
            val cycling = activityType.lowercase().contains("cycling")
            return if (cycling) {
                if (secsPerKm <= 0) "0.0" else "%.1f".format(3600.0 / secsPerKm)
            } else {
                if (secsPerKm <= 0) "00:00" else "%02d:%02d".format(secsPerKm.toInt() / 60, secsPerKm.toInt() % 60)
            }
        }
    }
}
