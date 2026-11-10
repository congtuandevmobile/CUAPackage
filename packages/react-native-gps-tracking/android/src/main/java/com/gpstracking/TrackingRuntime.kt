package com.gpstracking

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.io.File

/**
 * Process-wide holder of the [TrackingEngine]. The engine deliberately outlives
 * the JS runtime and the module instance: a recording must not stop because
 * the JS runtime was reloaded or destroyed. Its scope is the process, so nothing here holds
 * an Activity or a plugin; only the application context is used.
 */
internal object TrackingRuntime {
    private val lock = Any()
    private var engine: TrackingEngine? = null

    fun engine(context: Context): TrackingEngine = synchronized(lock) {
        engine ?: createEngine(context.applicationContext).also { engine = it }
    }

    private fun createEngine(appContext: Context): TrackingEngine = TrackingEngine(
        source = FusedLocationSource(appContext),
        stepSource = SensorStepSource(appContext),
        accelerometerSource = SensorAccelerometerSource(appContext),
        store = FileJournalStore(File(appContext.filesDir, STORE_DIRECTORY)),
        scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
    )

    private const val STORE_DIRECTORY = "gps_tracking/journal"
}
