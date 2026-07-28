// Yuun Watch complications — WidgetKit on watchOS.
// Same App Group payload as the iPhone home-screen widget.

import SwiftUI
import WidgetKit

private let APP_GROUP = "group.com.hexastral.yuun"
private let ENVELOPE_KEY = "hexastral_widget_payload_v1"
private let LEGACY_DAYS_KEY = "almanac_days"

struct WatchDay: Codable {
  var date: String
  var ganZhi: String
  var yi: String
  var yiShort: String?
  var fit: String?
  var moonPhase: Double
}

private struct Legacy: Codable { var days: [WatchDay] }
private struct EnvData: Codable { var days: [WatchDay] }
private struct Env: Codable { var data: EnvData }

private func loadToday() -> WatchDay? {
  guard let defaults = UserDefaults(suiteName: APP_GROUP) else { return nil }
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.dateFormat = "yyyy-MM-dd"
  let today = f.string(from: Date())

  func pick(_ days: [WatchDay]) -> WatchDay? {
    days.first { $0.date == today } ?? days.first
  }

  if let json = defaults.string(forKey: ENVELOPE_KEY),
     let data = json.data(using: .utf8),
     let env = try? JSONDecoder().decode(Env.self, from: data) {
    return pick(env.data.days)
  }
  if let json = defaults.string(forKey: LEGACY_DAYS_KEY),
     let data = json.data(using: .utf8),
     let leg = try? JSONDecoder().decode(Legacy.self, from: data) {
    return pick(leg.days)
  }
  return nil
}

struct WatchEntry: TimelineEntry {
  let date: Date
  let day: WatchDay?
}

struct WatchProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchEntry {
    WatchEntry(
      date: Date(),
      day: WatchDay(date: "—", ganZhi: "丁未", yi: "祈福", yiShort: "祈福", fit: nil, moonPhase: 0.5)
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (WatchEntry) -> Void) {
    completion(WatchEntry(date: Date(), day: loadToday()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WatchEntry>) -> Void) {
    let entry = WatchEntry(date: Date(), day: loadToday())
    let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date().addingTimeInterval(21600)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

struct WatchComplicationView: View {
  @Environment(\.widgetFamily) var family
  var entry: WatchEntry

  var body: some View {
    let d = entry.day
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Text(d?.ganZhi ?? "—")
          .font(.system(size: 12, weight: .bold))
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text(d?.ganZhi ?? "Yuun").font(.headline)
        Text(d?.fit ?? ("宜 " + (d?.yiShort ?? d?.yi ?? "—")))
          .font(.caption2)
          .lineLimit(1)
      }
    default:
      Text(d?.ganZhi ?? "Yuun")
    }
  }
}

struct AuspiceWatchWidget: Widget {
  let kind = "AuspiceWatch"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchProvider()) { entry in
      WatchComplicationView(entry: entry)
    }
    .configurationDisplayName("Yuun")
    .description("干支 · 宜忌")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular])
  }
}

@main
struct AuspiceWatchBundle: WidgetBundle {
  var body: some Widget {
    AuspiceWatchWidget()
  }
}
