# LiveActivityTrackingAttributes.swift

The ActivityKit attributes: static part (`activityType`, `startTimestamp`, `title`, `deepLinkUrl`, `accentColor`, `labels`) and `ContentState` (elapsed, distance, pace, heart rate, calories, steps, `status`, `activeStartTimestamp`). SHARED: it is compiled into the app by the pod AND must be added to the Widget Extension target (Target Membership). Do not rename the type: ActivityKit pairs the app's activity with the extension's UI through it. It has no dependency except ActivityKit.
