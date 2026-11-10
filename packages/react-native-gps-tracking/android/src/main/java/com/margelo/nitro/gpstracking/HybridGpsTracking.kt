package com.margelo.nitro.gpstracking

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import androidx.annotation.Keep
import androidx.core.content.ContextCompat
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.gpstracking.NativeCadenceSource
import com.gpstracking.NativeCollection
import com.gpstracking.NativeGpsQuality
import com.gpstracking.NativeMotionStatus
import com.gpstracking.NativePermission
import com.gpstracking.NativeRestoreState
import com.gpstracking.NativeSnapshot
import com.gpstracking.NativeStepsStatus
import com.gpstracking.NativeTrackingState
import com.gpstracking.TrackingEngine
import com.gpstracking.TrackingErrorCode
import com.gpstracking.TrackingException
import com.gpstracking.TrackingRuntime
import com.gpstracking.TrackingService
import com.gpstracking.emptyDistance
import com.gpstracking.toNative
import com.gpstracking.toNitro
import com.gpstracking.toTrackingException
import com.gpstracking.trackingException
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * React Native entry point (a Nitro HybridObject). Thin on purpose: it validates, forwards to the
 * [TrackingEngine], and turns every failure into a rejected promise whose message starts with a stable
 * code (`CODE: message`). Results are delivered from the main thread; heavy work runs on `Dispatchers.IO`
 * inside the engine.
 *
 * The recording itself outlives this object (see [TrackingRuntime]): a JS reload only drops the listeners.
 */
@DoNotStrip
@Keep
class HybridGpsTracking : HybridGpsTrackingSpec() {
    private var scope: CoroutineScope? = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var fixesJob: Job? = null
    private var snapshotsJob: Job? = null
    private var pendingPermission: Promise<NitroPermission>? = null
    private var pendingStepsPermission: Promise<NitroPermission>? = null

    private val appContext: Context? get() = NitroModules.applicationContext?.applicationContext
    private val activity: Activity? get() = NitroModules.applicationContext?.currentActivity

    override fun dispose() {
        // The recording keeps going (see TrackingRuntime); only what this instance holds is released.
        fixesJob?.cancel()
        fixesJob = null
        snapshotsJob?.cancel()
        snapshotsJob = null
        scope?.cancel()
        scope = null
        pendingPermission = null
        pendingStepsPermission = null
        super.dispose()
    }

    // ── Permission ──────────────────────────────────────────────────────────

    override fun permissionStatus(): NitroPermission {
        val context = appContext ?: return NitroPermission.DENIED
        return currentPermission(context).toNitro()
    }

    override fun stepsPermissionStatus(): NitroPermission {
        val context = appContext ?: return NitroPermission.DENIED
        return currentStepsPermission(context).toNitro()
    }

    override fun requestPermission(): Promise<NitroPermission> {
        val wanted = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) wanted.add(Manifest.permission.POST_NOTIFICATIONS)
        return requestRuntimePermission(
            wanted, REQUEST_CODE,
            current = ::currentPermission, pending = { pendingPermission }, setPending = { pendingPermission = it },
        )
    }

    override fun requestStepsPermission(): Promise<NitroPermission> =
        requestRuntimePermission(
            listOf(Manifest.permission.ACTIVITY_RECOGNITION), STEPS_REQUEST_CODE,
            current = ::currentStepsPermission, pending = { pendingStepsPermission }, setPending = { pendingStepsPermission = it },
        )

    private fun requestRuntimePermission(
        wanted: List<String>,
        code: Int,
        current: (Context) -> NativePermission,
        pending: () -> Promise<NitroPermission>?,
        setPending: (Promise<NitroPermission>?) -> Unit,
    ): Promise<NitroPermission> {
        val promise = Promise<NitroPermission>()
        val context = appContext
        val host = activity
        if (context == null || host == null) {
            promise.reject(trackingException(TrackingErrorCode.NO_ACTIVITY, "requesting a permission needs a foreground activity"))
            return promise
        }
        if (current(context) == NativePermission.GRANTED) {
            promise.resolve(NitroPermission.GRANTED)
            return promise
        }
        if (pendingPermission != null || pendingStepsPermission != null) {
            promise.reject(trackingException(TrackingErrorCode.PERMISSION_REQUEST_PENDING, "a permission request is already open"))
            return promise
        }
        if (host !is PermissionAwareActivity) {
            // Only a ReactActivity can hand the result back to this module.
            promise.reject(
                trackingException(TrackingErrorCode.PERMISSION_REQUEST_FAILED, "the current activity cannot deliver permission results"),
            )
            return promise
        }
        setPending(promise)
        val listener = PermissionListener { requestCode, _, _ ->
            if (requestCode != code) return@PermissionListener false
            val waiting = pending()
            setPending(null)
            val ctx = appContext
            waiting?.resolve((if (ctx == null) NativePermission.DENIED else current(ctx)).toNitro())
            true
        }
        try {
            host.requestPermissions(wanted.toTypedArray(), code, listener)
        } catch (e: RuntimeException) {
            setPending(null)
            promise.reject(e.toTrackingException(TrackingErrorCode.PERMISSION_REQUEST_FAILED, "could not ask for the permission"))
        }
        return promise
    }

    private fun currentPermission(context: Context): NativePermission {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
        if (!granted) return NativePermission.DENIED
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        val enabled = manager?.let { androidx.core.location.LocationManagerCompat.isLocationEnabled(it) } ?: true
        return if (enabled) NativePermission.GRANTED else NativePermission.SERVICES_DISABLED
    }

    /** Before Android 10 `ACTIVITY_RECOGNITION` is not a runtime permission. */
    private fun currentStepsPermission(context: Context): NativePermission {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return NativePermission.GRANTED
        return if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) ==
            PackageManager.PERMISSION_GRANTED
        ) NativePermission.GRANTED else NativePermission.DENIED
    }

    // ── Session commands ────────────────────────────────────────────────────

    override fun start(config: NitroStartConfig): Promise<NitroSnapshot> {
        val native = config.toNative()
        return command(TrackingErrorCode.START_FAILED, "could not start tracking") { context, engine ->
            if (currentPermission(context) != NativePermission.GRANTED) {
                engine.markPermissionDenied()
                return@command engine.snapshot().toNitro()
            }
            startForegroundAndWait(context, native.notificationTitle, native.notificationText)
            try {
                engine.start(native).toNitro()
            } catch (e: Throwable) {
                stopService(context) // no orphan service when the session did not start
                throw e
            }
        }
    }

    override fun pause(sessionId: String): Promise<NitroSnapshot> =
        command(TrackingErrorCode.PAUSE_FAILED, "could not pause tracking") { _, engine ->
            engine.pause(sessionId).toNitro()
        }

    override fun resume(sessionId: String): Promise<NitroSnapshot> =
        command(TrackingErrorCode.RESUME_FAILED, "could not resume tracking") { context, engine ->
            // After a process death (restore) the service is gone: it must be running BEFORE location, tick and
            // steps start. If the OS refuses, recording does NOT continue: the session stays paused and the caller
            // gets FOREGROUND_START_FAILED.
            val current = engine.snapshot()
            // Validate BEFORE any side effect: a wrong id or state must not start (and orphan) a service.
            if (current.sessionId != sessionId || current.state != NativeTrackingState.PAUSED) {
                return@command engine.resume(sessionId).toNitro()
            }
            val extras = engine.sessionExtras()
            startForegroundAndWait(context, extras["title"] ?: DEFAULT_TITLE, extras["text"] ?: DEFAULT_TEXT)
            try {
                engine.resume(sessionId).toNitro()
            } catch (e: Throwable) {
                stopService(context)
                throw e
            }
        }

    override fun stop(sessionId: String): Promise<NitroSnapshot> =
        command(TrackingErrorCode.STOP_FAILED, "could not stop tracking") { context, engine ->
            val snapshot = engine.stop(sessionId)
            if (snapshot.state == NativeTrackingState.STOPPED) stopService(context)
            snapshot.toNitro()
        }

    override fun getSnapshot(): NitroSnapshot {
        val context = appContext ?: return idleSnapshot().toNitro()
        return TrackingRuntime.engine(context).snapshot().toNitro()
    }

    override fun submitPdr(sessionId: String, segmentId: Double, meters: Double) {
        val context = appContext ?: return
        TrackingRuntime.engine(context).submitPdr(sessionId, segmentId.toInt(), meters)
    }

    override fun pushCscMeasurement(sessionId: String, sourceId: String, connectionId: Double, data: ArrayBuffer) {
        val context = appContext ?: return
        TrackingRuntime.engine(context).pushCsc(sessionId, sourceId, connectionId.toLong(), data.toByteArray())
    }

    override fun pushExternalCadence(sessionId: String, sourceId: String, connectionId: Double, rpm: Double) {
        val context = appContext ?: return
        TrackingRuntime.engine(context).pushExternalRpm(sessionId, sourceId, connectionId.toLong(), rpm)
    }

    override fun setExternalCadenceConnected(sessionId: String, sourceId: String, connectionId: Double, connected: Boolean) {
        val context = appContext ?: return
        TrackingRuntime.engine(context).setExternalConnected(sessionId, sourceId, connectionId.toLong(), connected)
    }

    override fun restoreSession(config: NitroStartConfig): Promise<NitroSnapshot> {
        val native = config.toNative()
        return command(TrackingErrorCode.RESTORE_FAILED, "could not restore the session") { context, engine ->
            if (!native.recoverRunning) return@command engine.restore(native).toNitro()
            // A recording that continues needs the foreground service BEFORE location starts (as a resume does). When
            // this process already holds the session (the service recovered it without JS) nothing is replayed.
            val live = engine.snapshot()
            if (live.sessionId == native.sessionId && live.state == NativeTrackingState.RUNNING) {
                return@command live.toNitro()
            }
            startForegroundAndWait(context, native.notificationTitle, native.notificationText)
            val snapshot = try {
                engine.restore(native)
            } catch (e: Throwable) {
                stopService(context)
                throw e
            }
            if (snapshot.state != NativeTrackingState.RUNNING) stopService(context)
            snapshot.toNitro()
        }
    }

    override fun activeSessionId(): Promise<String?> =
        command(TrackingErrorCode.STORE_READ_FAILED, "could not read the open session") { _, engine ->
            engine.activeSessionId()
        }

    override fun updateNotification(title: String, text: String) {
        // The SDK owns the notification (channel, tap action, lifecycle); this only changes its text.
        TrackingService.update(title, text)
    }

    override fun listSessions(): Promise<Array<String>> =
        command(TrackingErrorCode.STORE_LIST_FAILED, "could not list the sessions") { _, engine ->
            engine.listSessions().toTypedArray()
        }

    override fun getReport(): String {
        val context = appContext ?: return ""
        return TrackingRuntime.engine(context).report()
    }

    override fun readPersistedFixes(sessionId: String, afterSeq: Double): Promise<Array<NitroFix>> =
        command(TrackingErrorCode.STORE_READ_FAILED, "could not read the persisted fixes") { _, engine ->
            engine.readPersisted(sessionId, afterSeq.toLong()).map { it.toNitro() }.toTypedArray()
        }

    override fun clearSession(sessionId: String): Promise<Unit> =
        command(TrackingErrorCode.STORE_CLEAR_FAILED, "could not clear the session") { _, engine ->
            engine.clearSession(sessionId)
        }

    // ── Listeners ───────────────────────────────────────────────────────────

    override fun setFixListener(listener: ((fix: NitroFix) -> Unit)?) {
        fixesJob?.cancel()
        fixesJob = null
        val context = appContext
        val activeScope = scope
        if (listener == null || context == null || activeScope == null) return
        fixesJob = activeScope.launch {
            try {
                TrackingRuntime.engine(context).fixes.collect { fix -> listener(fix.toNitro()) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                e.toTrackingException(TrackingErrorCode.LOCATION_UPDATES_FAILED, "fix stream failed")
            }
        }
    }

    override fun setSnapshotListener(listener: ((snapshot: NitroSnapshot) -> Unit)?) {
        snapshotsJob?.cancel()
        snapshotsJob = null
        val context = appContext
        val activeScope = scope
        if (listener == null || context == null || activeScope == null) return
        snapshotsJob = activeScope.launch {
            try {
                TrackingRuntime.engine(context).snapshots.collect { snapshot -> listener(snapshot.toNitro()) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                e.toTrackingException(TrackingErrorCode.LOCATION_UPDATES_FAILED, "snapshot stream failed")
            }
        }
    }

    // ── Internals ───────────────────────────────────────────────────────────

    /**
     * Runs [block] on the module scope and settles the promise from the main thread. A failure becomes a rejection
     * (its message starts with the stable code); cancellation is rethrown, never reported as an error.
     */
    private fun <T> command(
        code: String,
        message: String,
        block: suspend (Context, TrackingEngine) -> T,
    ): Promise<T> {
        val promise = Promise<T>()
        val context = appContext
        val activeScope = scope
        if (context == null || activeScope == null) {
            promise.reject(trackingException(code, "$message: the module is detached"))
            return promise
        }
        activeScope.launch {
            try {
                promise.resolve(block(context, TrackingRuntime.engine(context)))
            } catch (e: CancellationException) {
                throw e
            } catch (e: TrackingException) {
                promise.reject(e) // already carries its own stable code
            } catch (e: Exception) {
                promise.reject(e.toTrackingException(code, message))
            }
        }
        return promise
    }

    private fun idleSnapshot() = NativeSnapshot(
        state = NativeTrackingState.IDLE,
        segmentId = 0,
        fixCount = 0,
        updatedAtMs = System.currentTimeMillis(),
        distance = emptyDistance(),
        stepsStatus = NativeStepsStatus.OFF,
        stepsFinal = false,
        journalPending = 0,
        journalFailed = false,
        restoreState = NativeRestoreState.NOT_RESTORED,
        engineChanged = false,
        elapsedTimeMs = 0,
        recoveredGapMs = 0,
        clockAnomaly = false,
        collection = NativeCollection.NOT_COLLECTING,
        pedalCadenceRpm = -1.0,
        cadenceStatus = NativeMotionStatus.OFF,
        cadenceSource = NativeCadenceSource.NONE,
    )

    private fun startService(context: Context, title: String, text: String) {
        val intent = Intent(context, TrackingService::class.java)
            .setAction(TrackingService.ACTION_START)
            .putExtra(TrackingService.EXTRA_TITLE, title)
            .putExtra(TrackingService.EXTRA_TEXT, text)
        ContextCompat.startForegroundService(context, intent)
    }

    /**
     * Starts the service and returns only after it reached `startForeground`; otherwise throws. The cleanup stops
     * the service only when this request is still the newest one: an older request timing out must never stop a
     * service a newer request is using.
     */
    private suspend fun startForegroundAndWait(context: Context, title: String, text: String) {
        val handshake = TrackingService.handshake
        val wait = handshake.expect()
        val ready = try {
            startService(context, title, text)
            handshake.await(wait, FOREGROUND_READY_TIMEOUT_MS)
        } catch (e: CancellationException) {
            if (handshake.isCurrent(wait)) stopService(context)
            throw e
        } catch (e: Exception) {
            if (handshake.isCurrent(wait)) stopService(context)
            throw e.toTrackingException(
                TrackingErrorCode.FOREGROUND_START_FAILED, "could not start the foreground service; recording did not start",
            )
        }
        if (!ready) {
            if (handshake.isCurrent(wait)) stopService(context)
            throw trackingException(
                TrackingErrorCode.FOREGROUND_START_FAILED, "the foreground service did not start in time; recording did not start",
            )
        }
    }

    private fun stopService(context: Context) {
        context.stopService(Intent(context, TrackingService::class.java))
    }

    private companion object {
        const val REQUEST_CODE = 7421
        const val STEPS_REQUEST_CODE = 7422
        const val FOREGROUND_READY_TIMEOUT_MS = 5_000L
        const val DEFAULT_TITLE = "Recording"
        const val DEFAULT_TEXT = "Tracking your activity. Tap to return to the app."
    }
}
