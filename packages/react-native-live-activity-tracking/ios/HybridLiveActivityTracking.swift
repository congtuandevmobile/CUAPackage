import ActivityKit
import Foundation
import NitroModules

/// React Native entry point (a Nitro HybridObject) for the iOS Live Activity. Thin on purpose: it maps the Nitro
/// structs to the manager's own types and turns each call into a `Promise`. Without iOS 16.2 every call answers
/// "not supported" instead of failing.
final class HybridLiveActivityTracking: HybridLiveActivityTrackingSpec {

  /// Held as `Any?` so the class itself carries no `@available` constraint.
  private var managerStorage: Any?
  private var listener: ((NitroLiveActivityEvent) -> Void)?

  @available(iOS 16.2, *)
  private var manager: LiveActivityManager {
    if let existing = managerStorage as? LiveActivityManager { return existing }
    let created = LiveActivityManager()
    created.onTokenUpdated = { [weak self] id, token in
      self?.emit(NitroLiveActivityEvent(type: "pushToken", activityId: id, token: token, state: nil))
    }
    created.onStateChanged = { [weak self] id, state in
      self?.emit(NitroLiveActivityEvent(type: "stateChange", activityId: id, token: nil, state: state))
    }
    managerStorage = created
    return created
  }

  private func emit(_ event: NitroLiveActivityEvent) {
    guard let listener = listener else { return }
    DispatchQueue.main.async { listener(event) }
  }

  // MARK: - HybridLiveActivityTrackingSpec

  func isSupported() throws -> Promise<Bool> {
    guard #available(iOS 16.2, *) else { return Promise.resolved(withResult: false) }
    return Promise.resolved(withResult: manager.isSupported())
  }

  func startActivity(data: NitroLiveActivityData, options: NitroLiveActivityOptions) throws
    -> Promise<NitroLiveActivityResult>
  {
    guard #available(iOS 16.2, *) else {
      return Promise.resolved(
        withResult: NitroLiveActivityResult(activityId: nil, success: false, error: "Live Activities require iOS 16.2+."))
    }
    let activityType = data.activityType ?? "other"
    let request = LiveActivityStartRequest(
      activityType: activityType,
      startTimestamp: Int(data.startTimestamp ?? 0),
      title: options.title ?? activityType.prefix(1).uppercased() + activityType.dropFirst(),
      deepLinkUrl: options.deepLinkUrl ?? "",
      accentColor: options.accentColor ?? "#0A84FF",
      labels: LiveActivityTrackingAttributes.Labels(
        distance: options.labels.distance, time: options.labels.time, pace: options.labels.pace,
        speed: options.labels.speed, paused: options.labels.paused, pausedTitle: options.labels.pausedTitle),
      enablePushUpdates: options.enablePushUpdates
    )
    let input = Self.input(from: data)
    // ActivityKit requests must start from the app in the foreground: do it on the main thread.
    let promise = Promise<NitroLiveActivityResult>()
    DispatchQueue.main.async {
      do {
        let id = try self.manager.startActivity(request, state: input)
        promise.resolve(withResult: NitroLiveActivityResult(activityId: id, success: true, error: nil))
      } catch {
        promise.resolve(
          withResult: NitroLiveActivityResult(activityId: nil, success: false, error: error.localizedDescription))
      }
    }
    return promise
  }

  func updateActivity(activityId: String, data: NitroLiveActivityData) throws -> Promise<Bool> {
    guard #available(iOS 16.2, *) else { return Promise.resolved(withResult: false) }
    let input = Self.input(from: data)
    return Promise.async {
      try await self.manager.updateActivity(activityId: activityId, state: input)
      return true
    }
  }

  func endActivity(activityId: String) throws -> Promise<Bool> {
    guard #available(iOS 16.2, *) else { return Promise.resolved(withResult: false) }
    return Promise.async {
      try await self.manager.endActivity(activityId: activityId)
      return true
    }
  }

  func endAllActivities() throws -> Promise<Bool> {
    guard #available(iOS 16.2, *) else { return Promise.resolved(withResult: false) }
    return Promise.async {
      await self.manager.endAllActivities()
      return true
    }
  }

  func isActivityActive(activityId: String) throws -> Promise<Bool> {
    guard #available(iOS 16.2, *) else { return Promise.resolved(withResult: false) }
    return Promise.resolved(withResult: manager.isActivityActive(activityId: activityId))
  }

  func getPushToken(activityId: String) throws -> Promise<String?> {
    guard #available(iOS 16.2, *) else { return Promise.resolved(withResult: nil) }
    return Promise.resolved(withResult: manager.getPushToken(activityId: activityId))
  }

  func getActiveActivityIds() throws -> [String] {
    guard #available(iOS 16.2, *) else { return [] }
    manager.reclaimExistingActivities()
    return manager.getActivityIds()
  }

  func setEventListener(listener: ((NitroLiveActivityEvent) -> Void)?) throws {
    self.listener = listener
    if listener != nil, #available(iOS 16.2, *) {
      // Start observing the activities that survived the last session, so their events are not missed.
      manager.reclaimExistingActivities()
    }
  }

  // MARK: - Mapping

  private static func input(from d: NitroLiveActivityData) -> LiveActivityStateInput {
    LiveActivityStateInput(
      elapsedSeconds: d.elapsedSeconds.map { Int($0) },
      distanceMeters: d.distanceMeters,
      paceSecondsPerKm: d.paceSecondsPerKm,
      heartRate: d.heartRate.map { Int($0) },
      calories: d.calories,
      steps: d.steps.map { Int($0) },
      status: d.status,
      activeStartTimestamp: d.activeStartTimestamp.map { Int($0) },
      startTimestamp: d.startTimestamp.map { Int($0) }
    )
  }
}
