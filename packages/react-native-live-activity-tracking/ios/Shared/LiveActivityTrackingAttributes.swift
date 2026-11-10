import ActivityKit
import Foundation

/// ActivityKit attributes of a workout Live Activity. SHARED between the app (this module) and the Widget Extension
/// that draws the activity: add THIS file to the Widget Extension target too (Target Membership), and do not rename the
/// type: ActivityKit pairs the app's activity with the extension's UI by the attributes type.
///
/// Static part (given once, to `startActivity`): the sport, the start, the title, the deep link, the accent colour and
/// the labels. Dynamic part (`ContentState`, changed by every update): the workout numbers.
@available(iOS 16.2, *)
public struct LiveActivityTrackingAttributes: ActivityAttributes {

  public struct Labels: Codable, Hashable {
    public var distance: String
    public var time: String
    public var pace: String
    public var speed: String
    public var paused: String
    public var pausedTitle: String

    public init(distance: String, time: String, pace: String, speed: String, paused: String, pausedTitle: String) {
      self.distance = distance
      self.time = time
      self.pace = pace
      self.speed = speed
      self.paused = paused
      self.pausedTitle = pausedTitle
    }
  }

  public struct ContentState: Codable, Hashable {
    public var elapsedSeconds: Int
    public var distanceMeters: Double
    /// Seconds per kilometre (0 = unavailable).
    public var paceSecondsPerKm: Double
    /// Heart rate in bpm (0 = unavailable).
    public var heartRate: Int
    /// Calories burned in kcal.
    public var calories: Double
    public var steps: Int
    /// "active" | "paused" | "finished"
    public var status: String
    /// Virtual workout start as epoch milliseconds (= now - elapsed at resume): the live timer counts from it.
    public var activeStartTimestamp: Int

    public init(
      elapsedSeconds: Int,
      distanceMeters: Double,
      paceSecondsPerKm: Double,
      heartRate: Int,
      calories: Double,
      steps: Int,
      status: String,
      activeStartTimestamp: Int = 0
    ) {
      self.elapsedSeconds = elapsedSeconds
      self.distanceMeters = distanceMeters
      self.paceSecondsPerKm = paceSecondsPerKm
      self.heartRate = heartRate
      self.calories = calories
      self.steps = steps
      self.status = status
      self.activeStartTimestamp = activeStartTimestamp
    }
  }

  /// Any sport name (`running`, `cycling`, `soccer`...); picks the icon.
  public var activityType: String
  /// Workout start, epoch milliseconds.
  public var startTimestamp: Int
  /// The sport as shown (already localized by the app).
  public var title: String
  /// Opened when the person taps the activity; empty = the app.
  public var deepLinkUrl: String
  /// `#RRGGBB`.
  public var accentColor: String
  public var labels: Labels

  public init(
    activityType: String, startTimestamp: Int, title: String, deepLinkUrl: String, accentColor: String,
    labels: Labels
  ) {
    self.activityType = activityType
    self.startTimestamp = startTimestamp
    self.title = title
    self.deepLinkUrl = deepLinkUrl
    self.accentColor = accentColor
    self.labels = labels
  }
}
