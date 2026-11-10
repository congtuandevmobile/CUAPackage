import ActivityKit
import Foundation

/// A failure with a stable code; its description is `CODE: message`.
final class LiveActivityError: Error, LocalizedError, CustomStringConvertible, @unchecked Sendable {
  let code: String
  let message: String

  init(code: String, message: String) {
    self.code = code
    self.message = message
  }

  var errorDescription: String? { "\(code): \(message)" }
  var description: String { "\(code): \(message)" }
}

/// What `startActivity` is told, free of Nitro types.
@available(iOS 16.2, *)
struct LiveActivityStartRequest {
  var activityType: String
  var startTimestamp: Int
  var title: String
  var deepLinkUrl: String
  var accentColor: String
  var labels: LiveActivityTrackingAttributes.Labels
  var enablePushUpdates: Bool
}

/// The workout numbers of one update, free of Nitro types (all optional: a missing value shows as zero).
struct LiveActivityStateInput {
  var elapsedSeconds: Int?
  var distanceMeters: Double?
  var paceSecondsPerKm: Double?
  var heartRate: Int?
  var calories: Double?
  var steps: Int?
  var status: String?
  var activeStartTimestamp: Int?
  var startTimestamp: Int?
}

/// Manages the lifecycle of workout Live Activities via ActivityKit. Requires iOS 16.2+.
@available(iOS 16.2, *)
final class LiveActivityManager {

  /// Called when a push token is issued or rotated: (activityId, hexToken).
  var onTokenUpdated: ((String, String) -> Void)?

  /// Called when an activity changes state: (activityId, "active"|"ended"|"dismissed"|"stale").
  var onStateChanged: ((String, String) -> Void)?

  private var activities: [String: Activity<LiveActivityTrackingAttributes>] = [:]
  private var observationTasks: [String: Task<Void, Never>] = [:]

  func isSupported() -> Bool {
    ActivityAuthorizationInfo().areActivitiesEnabled
  }

  func startActivity(_ request: LiveActivityStartRequest, state input: LiveActivityStateInput) throws -> String {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      throw LiveActivityError(
        code: "NOT_SUPPORTED",
        message: "Live Activities are disabled in Settings or unsupported on this device.")
    }

    let attributes = LiveActivityTrackingAttributes(
      activityType: request.activityType,
      startTimestamp: request.startTimestamp,
      title: request.title,
      deepLinkUrl: request.deepLinkUrl,
      accentColor: request.accentColor,
      labels: request.labels
    )
    let content = ActivityContent(state: makeContentState(from: input), staleDate: nil)

    let activity = try Activity<LiveActivityTrackingAttributes>.request(
      attributes: attributes,
      content: content,
      pushType: request.enablePushUpdates ? .token : nil
    )

    activities[activity.id] = activity
    startObserving(activity: activity, activityId: activity.id)
    return activity.id
  }

  func updateActivity(activityId: String, state input: LiveActivityStateInput) async throws {
    guard let activity = activities[activityId] else {
      throw LiveActivityError(code: "NOT_FOUND", message: "No active Live Activity with id '\(activityId)'.")
    }
    await activity.update(ActivityContent(state: makeContentState(from: input), staleDate: nil))
  }

  func endActivity(activityId: String) async throws {
    guard let activity = activities[activityId] else {
      throw LiveActivityError(code: "NOT_FOUND", message: "No active Live Activity with id '\(activityId)'.")
    }
    await activity.end(nil, dismissalPolicy: .immediate)
    removeActivity(activityId: activityId)
  }

  func endAllActivities() async {
    for activity in Activity<LiveActivityTrackingAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    for id in Array(activities.keys) { removeActivity(activityId: id) }
  }

  /// Takes back an activity that survived a previous app session (the process died, the activity did not).
  func reclaimExistingActivities() {
    for activity in Activity<LiveActivityTrackingAttributes>.activities {
      guard activities[activity.id] == nil else { continue }
      activities[activity.id] = activity
      startObserving(activity: activity, activityId: activity.id)
    }
  }

  func getActivityIds() -> [String] { Array(activities.keys) }

  func isActivityActive(activityId: String) -> Bool {
    activities[activityId]?.activityState == .active
  }

  func getPushToken(activityId: String) -> String? {
    guard let token = activities[activityId]?.pushToken else { return nil }
    return hexString(from: token)
  }

  // MARK: - Private

  private func makeContentState(from d: LiveActivityStateInput) -> LiveActivityTrackingAttributes.ContentState {
    LiveActivityTrackingAttributes.ContentState(
      elapsedSeconds: d.elapsedSeconds ?? 0,
      distanceMeters: d.distanceMeters ?? 0,
      paceSecondsPerKm: d.paceSecondsPerKm ?? 0,
      heartRate: d.heartRate ?? 0,
      calories: d.calories ?? 0,
      steps: d.steps ?? 0,
      status: d.status ?? "active",
      activeStartTimestamp: d.activeStartTimestamp ?? d.startTimestamp ?? 0
    )
  }

  private func startObserving(activity: Activity<LiveActivityTrackingAttributes>, activityId: String) {
    let tokenTask = Task { [weak self] in
      for await token in activity.pushTokenUpdates {
        guard let self = self else { return }
        self.onTokenUpdated?(activityId, self.hexString(from: token))
      }
    }
    observationTasks["\(activityId)_token"] = tokenTask

    let stateTask = Task { [weak self] in
      for await state in activity.activityStateUpdates {
        let stateString: String
        switch state {
        case .active: stateString = "active"
        case .ended: stateString = "ended"
        case .dismissed: stateString = "dismissed"
        case .stale: stateString = "stale"
        default: stateString = "unknown"  // also iOS 26 `.pending`
        }
        self?.onStateChanged?(activityId, stateString)
      }
    }
    observationTasks["\(activityId)_state"] = stateTask
  }

  private func removeActivity(activityId: String) {
    activities.removeValue(forKey: activityId)
    for suffix in ["token", "state"] {
      observationTasks["\(activityId)_\(suffix)"]?.cancel()
      observationTasks.removeValue(forKey: "\(activityId)_\(suffix)")
    }
  }

  private func hexString(from data: Data) -> String {
    data.map { String(format: "%02x", $0) }.joined()
  }
}
