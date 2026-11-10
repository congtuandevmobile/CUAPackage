// LiveActivityTrackingWidget.swift
// A TEMPLATE for the UI of the Live Activity. Add it to your Widget Extension target (NOT to the app target) together
// with `ios/Shared/LiveActivityTrackingAttributes.swift`, then edit it freely: the module only needs the attributes.
//
// Setup in the Widget Extension:
//   1. File > New > Target > Widget Extension (tick "Include Live Activity" or delete what Xcode generates).
//   2. Add this file and ios/Shared/LiveActivityTrackingAttributes.swift to that target.
//   3. In the app's Info.plist: NSSupportsLiveActivities = YES.
//
// Everything shown comes from the attributes the app passed to `startActivity` (title, labels, accent colour, deep
// link) and from the content state of each update, so there are no resources or lproj files to maintain here.

import ActivityKit
import SwiftUI
import WidgetKit

@main
struct LiveActivityTrackingWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveActivityTrackingWidget()
  }
}

@available(iOS 16.2, *)
struct LiveActivityTrackingWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveActivityTrackingAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
        .widgetURL(URL(string: context.attributes.deepLinkUrl))
        .activityBackgroundTint(context.state.status == "paused" ? Color(hex: "#272E35") : .white)
        .activitySystemActionForegroundColor(.black)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          IslandExpandedView(attributes: context.attributes, state: context.state)
        }
      } compactLeading: {
        Image(systemName: sportSymbol(context.attributes.activityType))
          .foregroundStyle(Color(hex: context.attributes.accentColor))
      } compactTrailing: {
        if context.state.status == "paused" {
          Image(systemName: "pause.fill").foregroundStyle(.orange)
        } else {
          TimerText(state: context.state)
            .font(.system(size: 14, weight: .bold).monospacedDigit())
            .foregroundStyle(.white)
            .frame(minWidth: 40, alignment: .trailing)
            .contentTransition(.identity)
        }
      } minimal: {
        Image(systemName: sportSymbol(context.attributes.activityType))
          .foregroundStyle(Color(hex: context.attributes.accentColor))
      }
      .widgetURL(URL(string: context.attributes.deepLinkUrl))
    }
  }
}

// MARK: - Lock screen

@available(iOS 16.2, *)
private struct LockScreenView: View {
  let attributes: LiveActivityTrackingAttributes
  let state: LiveActivityTrackingAttributes.ContentState

  var body: some View {
    let isPaused = state.status == "paused"
    let isCycling = attributes.activityType.lowercased().contains("cycling")
    let accent = Color(hex: attributes.accentColor)

    VStack(spacing: 0) {
      if isPaused {
        Text(attributes.labels.pausedTitle)
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(.white)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
      }

      VStack(spacing: 12) {
        HStack(spacing: 6) {
          Image(systemName: sportSymbol(attributes.activityType)).foregroundStyle(accent)
          Text(attributes.title)
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(Color(hex: "#272E35"))
          Spacer()
        }

        HStack(spacing: 0) {
          StatColumn(valueView: Text(formatDistance(state.distanceMeters)), label: attributes.labels.distance)
          Divider().frame(height: 36)
          StatColumn(valueView: TimerText(state: state), label: attributes.labels.time)
          Divider().frame(height: 36)
          StatColumn(
            valueView: Text(isCycling ? formatSpeed(state.paceSecondsPerKm) : formatPace(state.paceSecondsPerKm)),
            label: isCycling ? attributes.labels.speed : attributes.labels.pace)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(Color.white)
      .clipShape(RoundedRectangle(cornerRadius: 16))
      .padding(.top, isPaused ? 6 : 0)
    }
  }
}

// MARK: - Dynamic Island expanded

@available(iOS 16.2, *)
private struct IslandExpandedView: View {
  let attributes: LiveActivityTrackingAttributes
  let state: LiveActivityTrackingAttributes.ContentState

  var body: some View {
    let isPaused = state.status == "paused"
    let isCycling = attributes.activityType.lowercased().contains("cycling")

    VStack(spacing: 10) {
      HStack(spacing: 6) {
        if isPaused {
          Text(attributes.labels.paused)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(.orange)
          Spacer()
          Image(systemName: "pause.circle.fill").foregroundStyle(.orange)
        } else {
          Image(systemName: sportSymbol(attributes.activityType))
            .foregroundStyle(Color(hex: attributes.accentColor))
          Text(attributes.title)
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(.white)
          Spacer()
        }
      }

      HStack(spacing: 0) {
        IslandStatColumn(valueView: TimerText(state: state), label: attributes.labels.time)
        IslandDivider()
        IslandStatColumn(
          valueView: Text(isCycling ? formatSpeed(state.paceSecondsPerKm) : formatPace(state.paceSecondsPerKm)),
          label: isCycling ? attributes.labels.speed : attributes.labels.pace)
        IslandDivider()
        IslandStatColumn(valueView: Text(formatDistance(state.distanceMeters)), label: attributes.labels.distance)
      }
    }
    .padding(.horizontal, 12)
    .padding(.bottom, 10)
  }
}

private struct IslandStatColumn<ValueView: View>: View {
  let valueView: ValueView
  let label: String

  var body: some View {
    VStack(spacing: 2) {
      valueView
        .font(.system(size: 20, weight: .bold).monospacedDigit())
        .foregroundStyle(.white)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
        .contentTransition(.identity)
      Text(label)
        .font(.system(size: 9))
        .foregroundStyle(.white.opacity(0.6))
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.7)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity)
  }
}

private struct IslandDivider: View {
  var body: some View {
    Rectangle().fill(.white.opacity(0.25)).frame(width: 1, height: 32)
  }
}

private struct StatColumn<ValueView: View>: View {
  let valueView: ValueView
  let label: String

  var body: some View {
    VStack(spacing: 2) {
      valueView
        .font(.system(size: 22, weight: .bold).monospacedDigit())
        .foregroundStyle(Color(hex: "#272E35"))
        .minimumScaleFactor(0.7)
        .lineLimit(1)
        .contentTransition(.identity)
      Text(label)
        .font(.system(size: 10))
        .foregroundStyle(Color(hex: "#555F6D"))
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.7)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Sport icon

/// An SF Symbol for the sport name; any sport without its own symbol gets a generic one.
private func sportSymbol(_ type: String) -> String {
  switch type.lowercased() {
  case "running", "running_indoor", "trackandfield": return "figure.run"
  case "walking": return "figure.walk"
  case "hiking": return "figure.hiking"
  case "cycling", "cycling_indoor", "handcycling": return "bicycle"
  case "swimming", "swimming_pool", "swimming_open_water": return "figure.pool.swim"
  case "soccer": return "soccerball"
  case "basketball": return "basketball"
  case "tennis", "tabletennis", "badminton", "squash", "racquetball", "pickleball": return "figure.tennis"
  case "volleyball": return "volleyball"
  case "americanfootball", "australianfootball", "rugby": return "football"
  case "baseball", "softball": return "baseball"
  case "golf": return "figure.golf"
  case "yoga", "pilates", "flexibility", "mindandbody", "taichi": return "figure.yoga"
  case "rowing": return "figure.rower"
  case "elliptical": return "figure.elliptical"
  case "stairclimbing", "stairs", "steptraining": return "figure.stairs"
  case "boxing", "kickboxing", "martialarts": return "figure.boxing"
  case "climbing": return "figure.climbing"
  case "downhillskiing", "crosscountryskiing", "snowboarding", "snowsports": return "figure.skiing.downhill"
  case "highintensityintervaltraining", "traditionalstrengthtraining", "functionalstrengthtraining",
    "crosstraining", "coretraining", "mixedcardio":
    return "figure.highintensity.intervaltraining"
  default: return "figure.mixed.cardio"
  }
}

// MARK: - Formatters

@ViewBuilder
private func TimerText(state: LiveActivityTrackingAttributes.ContentState) -> some View {
  if state.status == "active" {
    Text(Date(timeIntervalSince1970: Double(state.activeStartTimestamp) / 1000), style: .timer)
      .multilineTextAlignment(.center)
  } else {
    Text(formatDuration(state.elapsedSeconds))
  }
}

private func formatDistance(_ meters: Double) -> String {
  let km = meters / 1000.0
  return km < 10 ? String(format: "%.2f", km) : String(format: "%.1f", km)
}

private func formatDuration(_ seconds: Int) -> String {
  let h = seconds / 3600
  let m = (seconds % 3600) / 60
  let s = seconds % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)
}

private func formatPace(_ secsPerKm: Double) -> String {
  guard secsPerKm > 0 else { return "00:00" }
  return String(format: "%02d:%02d", Int(secsPerKm) / 60, Int(secsPerKm) % 60)
}

private func formatSpeed(_ secsPerKm: Double) -> String {
  guard secsPerKm > 0 else { return "0.0" }
  return String(format: "%.1f", 3600.0 / secsPerKm)
}

// MARK: - Color helper

extension Color {
  init(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    self.init(
      red: Double((int >> 16) & 0xFF) / 255, green: Double((int >> 8) & 0xFF) / 255, blue: Double(int & 0xFF) / 255)
  }
}

// MARK: - Preview

@available(iOS 17.0, *)
#Preview(
  "Lock Screen", as: .content,
  using: LiveActivityTrackingAttributes(
    activityType: "soccer", startTimestamp: Int(Date().timeIntervalSince1970 * 1000), title: "Soccer",
    deepLinkUrl: "", accentColor: "#0A84FF",
    labels: .init(
      distance: "Distance (km)", time: "Time", pace: "Pace (min/km)", speed: "Speed (km/h)", paused: "Paused",
      pausedTitle: "Paused"))
) {
  LiveActivityTrackingWidget()
} contentStates: {
  LiveActivityTrackingAttributes.ContentState(
    elapsedSeconds: 22 * 60 + 50, distanceMeters: 5_210, paceSecondsPerKm: 5 * 60 + 45, heartRate: 158,
    calories: 312, steps: 4_820, status: "active")
}
