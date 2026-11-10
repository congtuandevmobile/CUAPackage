# LiveActivityService.kt

Foreground service (type `location`) that owns the notification when the app asks for its own service. Every START opens a session epoch (`currentSessionId`); an UPDATE or STOP of another epoch is stale and ignored. `START_NOT_STICKY` (a notification with no recording behind it is worse than none). `startForeground` refusals (SecurityException, start not allowed) are caught: the service stops and `startActivity` reports the failure. `stopDirect()` stops it without going through the Intent queue.
