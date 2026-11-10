package com.liveactivitytracking

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Foreground service that owns the ongoing notification while a workout is recorded (used when the app asks for its
 * own service; with `androidForegroundService: false` the module only posts the notification).
 *
 * Every START opens a new session epoch ([currentSessionId]); an UPDATE or STOP carrying another epoch is stale and
 * ignored, so a queued stop of an old session can never kill a new one. START_NOT_STICKY: a notification with no live
 * recording behind it is worse than none.
 */
internal class LiveActivityService : Service() {

    private lateinit var builder: OngoingNotificationBuilder
    private var last: LivePayload? = null

    companion object {
        const val ACTION_START = "com.liveactivitytracking.START"
        const val ACTION_UPDATE = "com.liveactivitytracking.UPDATE"
        const val ACTION_STOP = "com.liveactivitytracking.STOP"
        const val EXTRA_PAYLOAD = "payload"
        const val EXTRA_SESSION_ID = "session_id"

        @Volatile var isRunning: Boolean = false
            private set

        /** Incremented on every ACTION_START so stale intents are ignored. */
        @Volatile var currentSessionId: Int = 0
            private set

        @Volatile private var instance: LiveActivityService? = null

        /** Stops the service from the same process without going through the Intent queue. Safe from any thread. */
        fun stopDirect() {
            isRunning = false
            currentSessionId++
            val service = instance
            instance = null
            service?.let {
                try {
                    it.stopForegroundCompat()
                } catch (_: Exception) {
                }
                it.stopSelf()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        builder = OngoingNotificationBuilder(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) return START_NOT_STICKY
        val action = intent.action ?: return START_NOT_STICKY
        @Suppress("DEPRECATION")
        val payload = intent.getSerializableExtra(EXTRA_PAYLOAD) as? LivePayload
        val intentSession = intent.getIntExtra(EXTRA_SESSION_ID, -1)

        when (action) {
            ACTION_START -> {
                if (payload == null) {
                    // startForegroundService() requires startForeground() or stopSelf(): never neither.
                    stopSelf()
                } else {
                    last = payload
                    currentSessionId++
                    if (startForegroundCompat(payload.notificationId, builder.build(payload))) {
                        isRunning = true
                    } else {
                        isRunning = false
                        last = null
                        stopSelf()
                    }
                }
            }

            ACTION_UPDATE -> {
                val base = last
                if (payload != null && base != null && isRunning && intentSession == currentSessionId) {
                    val next = base.withNumbers(payload)
                    last = next
                    safeNotify(next)
                }
            }

            ACTION_STOP -> {
                if (intentSession != -1 && intentSession != currentSessionId) return START_NOT_STICKY
                isRunning = false
                last = null
                instance = null
                stopForegroundCompat()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    /**
     * Promotes the service to the foreground; API 34+ needs a declared type. Returns false when the system refuses
     * (SecurityException: location foreground service not allowed now; ForegroundServiceStartNotAllowedException).
     */
    private fun startForegroundCompat(id: Int, notification: Notification): Boolean = try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(id, notification)
        }
        true
    } catch (_: Exception) {
        false
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    /** Posts the notification, swallowing a SecurityException (POST_NOTIFICATIONS revoked at runtime). */
    private fun safeNotify(payload: LivePayload) {
        try {
            builder.systemManager().notify(payload.notificationId, builder.build(payload))
        } catch (_: Exception) {
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        if (instance == this) instance = null
    }
}
