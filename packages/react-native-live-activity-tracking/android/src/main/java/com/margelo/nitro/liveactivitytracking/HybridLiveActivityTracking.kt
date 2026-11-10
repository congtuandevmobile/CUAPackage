package com.margelo.nitro.liveactivitytracking

import android.Manifest
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.liveactivitytracking.LiveActivityService
import com.liveactivitytracking.LivePayload
import com.liveactivitytracking.OngoingNotificationBuilder
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

/**
 * Android implementation of the Nitro HybridObject `LiveActivityTracking`: the ongoing workout notification.
 *
 * Two modes, chosen at start by `androidForegroundService`:
 *  - true: an own foreground service ([LiveActivityService]) owns the notification;
 *  - false: the module only posts / updates / cancels the notification with `androidNotificationId`; another service
 *    of the app keeps the process alive. Giving the id of that service's notification replaces its content.
 */
@DoNotStrip
@Keep
class HybridLiveActivityTracking : HybridLiveActivityTrackingSpec() {

    private val appContext: Context? get() = NitroModules.applicationContext?.applicationContext

    private var listener: ((NitroLiveActivityEvent) -> Unit)? = null
    private var pendingPermission: Promise<Boolean>? = null

    /** The one activity this module shows (Android has a single ongoing notification per session). */
    private var activeId: String? = null
    private var usesService = false
    private var payload: LivePayload? = null

    override fun dispose() {
        pendingPermission = null
        listener = null
        super.dispose()
    }

    override fun isSupported(): Promise<Boolean> = Promise.resolved(true)

    // ── Commands ────────────────────────────────────────────────────────────

    override fun startActivity(data: NitroLiveActivityData, options: NitroLiveActivityOptions): Promise<NitroLiveActivityResult> {
        val promise = Promise<NitroLiveActivityResult>()
        val context = appContext
        if (context == null) {
            promise.resolve(failure("The module is detached."))
            return promise
        }
        val first = toPayload(data, options)
        ensureNotificationPermission(context).then { granted ->
            if (!granted) {
                promise.resolve(failure("Notification permission denied"))
            } else {
                promise.resolve(begin(context, first, options.androidForegroundService))
            }
        }.catch { error -> promise.resolve(failure(error.message ?: "Notification permission request failed")) }
        return promise
    }

    private fun begin(context: Context, first: LivePayload, foregroundService: Boolean): NitroLiveActivityResult {
        // A new start replaces the previous recording's notification.
        if (activeId != null) stop(context)
        try {
            if (foregroundService) {
                if (!canStartLocationFgs(context)) return failure("Location foreground service not allowed")
                val intent = Intent(context, LiveActivityService::class.java)
                    .setAction(LiveActivityService.ACTION_START)
                    .putExtra(LiveActivityService.EXTRA_PAYLOAD, first)
                // startForegroundService is required on API 26+ to start a foreground service.
                ContextCompat.startForegroundService(context, intent)
            } else {
                val builder = OngoingNotificationBuilder(context)
                builder.systemManager().notify(first.notificationId, builder.build(first))
            }
        } catch (e: Exception) {
            return failure(e.message ?: "Could not show the notification")
        }
        usesService = foregroundService
        payload = first
        val id = first.notificationId.toString()
        activeId = id
        emit(NitroLiveActivityEvent(type = "stateChange", activityId = id, token = null, state = "active"))
        return NitroLiveActivityResult(activityId = id, success = true, error = null)
    }

    override fun updateActivity(activityId: String, data: NitroLiveActivityData): Promise<Boolean> {
        val context = appContext ?: return Promise.resolved(false)
        val base = payload
        if (activityId != activeId || base == null) return Promise.resolved(false)
        val next = base.withNumbers(toPayload(data, null))
        payload = next
        return try {
            if (usesService) {
                val intent = Intent(context, LiveActivityService::class.java)
                    .setAction(LiveActivityService.ACTION_UPDATE)
                    .putExtra(LiveActivityService.EXTRA_PAYLOAD, next)
                    .putExtra(LiveActivityService.EXTRA_SESSION_ID, LiveActivityService.currentSessionId)
                context.startService(intent)
            } else {
                val builder = OngoingNotificationBuilder(context)
                builder.systemManager().notify(next.notificationId, builder.build(next))
            }
            Promise.resolved(true)
        } catch (_: Exception) {
            Promise.resolved(false)
        }
    }

    override fun endActivity(activityId: String): Promise<Boolean> {
        val context = appContext ?: return Promise.resolved(false)
        if (activityId != activeId) return Promise.resolved(false)
        stop(context)
        return Promise.resolved(true)
    }

    override fun endAllActivities(): Promise<Boolean> {
        val context = appContext ?: return Promise.resolved(false)
        stop(context)
        return Promise.resolved(true)
    }

    override fun isActivityActive(activityId: String): Promise<Boolean> =
        Promise.resolved(activityId == activeId && (!usesService || LiveActivityService.isRunning))

    /** There is no APNs on Android. */
    override fun getPushToken(activityId: String): Promise<String?> = Promise.resolved(null)

    override fun getActiveActivityIds(): Array<String> = activeId?.let { arrayOf(it) } ?: emptyArray()

    override fun setEventListener(listener: ((event: NitroLiveActivityEvent) -> Unit)?) {
        this.listener = listener
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private fun stop(context: Context) {
        val id = activeId
        val current = payload
        if (usesService && LiveActivityService.isRunning) {
            LiveActivityService.stopDirect()
        } else {
            try {
                OngoingNotificationBuilder(context).systemManager()
                    .cancel(current?.notificationId ?: LivePayload.DEFAULT_NOTIFICATION_ID)
            } catch (_: Exception) {
            }
        }
        activeId = null
        payload = null
        if (id != null) emit(NitroLiveActivityEvent(type = "stateChange", activityId = id, token = null, state = "ended"))
    }

    private fun emit(event: NitroLiveActivityEvent) {
        listener?.invoke(event)
    }

    private fun failure(message: String) = NitroLiveActivityResult(activityId = null, success = false, error = message)

    private fun toPayload(d: NitroLiveActivityData, o: NitroLiveActivityOptions?): LivePayload = LivePayload(
        activityType = d.activityType ?: "other",
        elapsedSeconds = d.elapsedSeconds?.toInt() ?: 0,
        distanceMeters = d.distanceMeters ?: 0.0,
        paceSecondsPerKm = d.paceSecondsPerKm ?: 0.0,
        heartRate = d.heartRate?.toInt() ?: 0,
        calories = d.calories ?: 0.0,
        steps = d.steps?.toInt() ?: 0,
        startTimestamp = d.startTimestamp?.toLong(),
        activeStartTimestamp = d.activeStartTimestamp?.toLong(),
        status = d.status ?: "active",
        title = o?.title ?: "",
        deepLinkUrl = o?.deepLinkUrl,
        accentColor = o?.accentColor ?: "#0A84FF",
        pausedLabel = o?.labels?.paused ?: "Paused",
        notificationId = o?.androidNotificationId?.toInt() ?: LivePayload.DEFAULT_NOTIFICATION_ID,
        channelName = o?.androidChannelName ?: "Live activity",
    )

    // ── Permissions and foreground rules ────────────────────────────────────

    /** POST_NOTIFICATIONS is a runtime permission from Android 13; asked through the host (React) activity. */
    private fun ensureNotificationPermission(context: Context): Promise<Boolean> {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return Promise.resolved(true)
        if (isGranted(context, Manifest.permission.POST_NOTIFICATIONS)) return Promise.resolved(true)
        val promise = Promise<Boolean>()
        val host = NitroModules.applicationContext?.currentActivity
        if (host !is PermissionAwareActivity || pendingPermission != null) {
            promise.resolve(false)
            return promise
        }
        pendingPermission = promise
        val permissionListener = PermissionListener { requestCode, _, grantResults ->
            if (requestCode != REQUEST_CODE) return@PermissionListener false
            val waiting = pendingPermission
            pendingPermission = null
            waiting?.resolve(grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED)
            true
        }
        try {
            host.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_CODE, permissionListener)
        } catch (e: RuntimeException) {
            pendingPermission = null
            promise.resolve(false)
        }
        return promise
    }

    /**
     * A location foreground service (API 34+) needs the location permission AND, when it is only "while in use", the
     * app visible (or background location). Otherwise startForeground() throws SecurityException.
     */
    private fun canStartLocationFgs(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
        val hasLocation = isGranted(context, Manifest.permission.ACCESS_FINE_LOCATION) ||
            isGranted(context, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (!hasLocation) return false
        return isGranted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) || isAppInForeground()
    }

    private fun isGranted(context: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    private fun isAppInForeground(): Boolean {
        val info = ActivityManager.RunningAppProcessInfo()
        ActivityManager.getMyMemoryState(info)
        return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    }

    private companion object {
        const val REQUEST_CODE = 7431
    }
}
