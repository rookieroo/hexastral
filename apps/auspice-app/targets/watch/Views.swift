// SwiftUI companion screens.

import SwiftUI

struct ContentView: View {
  @ObservedObject private var store = WatchPayloadStore.shared
  private var locale: WatchLocale { store.resolvedLocale }
  private var t: WatchStrings { WatchI18n.strings(for: locale) }

  var body: some View {
    TabView {
      TodayView()
        .tabItem { Label(t.today, systemImage: "moon.stars") }
      DateBrowserView()
        .tabItem { Label(t.browse, systemImage: "calendar") }
      SettingsView()
        .tabItem { Label(t.settings, systemImage: "gearshape") }
    }
    .onAppear {
      YuunWatchSession.shared.activate()
      YuunWatchSession.shared.refreshStatusFromDefaults()
      Task { await WatchRefreshController.shared.refresh(includePhone: true) }
    }
  }
}

// MARK: - Today

struct TodayView: View {
  @ObservedObject private var store = WatchPayloadStore.shared
  @ObservedObject private var refresh = WatchRefreshController.shared
  private var t: WatchStrings { WatchI18n.strings(for: store.resolvedLocale) }

  private var today: String { ymdString(Date()) }
  private var day: SharedDay? { store.day(for: today) }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 8) {
          if store.isStale || refresh.bannerIsError, let msg = refresh.bannerMessage {
            Text(msg)
              .font(.caption2)
              .foregroundStyle(.orange)
          }

          if let day {
            dayHeader(day)
            yiJiBlock(day)
            if let fit = day.fit, !fit.isEmpty {
              fitBlock(day, fit: fit)
            } else if let summary = day.fitSummary, !summary.isEmpty {
              Text(summary)
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
          } else {
            Text(t.noData)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
        .padding(.horizontal, 4)
      }
      .navigationTitle(t.today)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button(refresh.isRefreshing ? t.refreshing : t.refresh) {
            Task { await refresh.refresh(includePhone: true) }
          }
          .disabled(refresh.isRefreshing)
        }
      }
    }
  }

  @ViewBuilder
  private func dayHeader(_ day: SharedDay) -> some View {
    HStack(alignment: .center, spacing: 8) {
      WatchPhaseLogo(phase: store.phase(for: day))
        .frame(width: 36, height: 36)
      VStack(alignment: .leading, spacing: 2) {
        Text(day.ganZhi)
          .font(.headline)
        if !day.lunar.isEmpty {
          Text(day.lunar)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        if !day.solarTerm.isEmpty {
          Text(day.solarTerm)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
    }
  }

  @ViewBuilder
  private func yiJiBlock(_ day: SharedDay) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(alignment: .top, spacing: 6) {
        Text(store.label("good", fallback: t.goodLabel))
          .font(.caption2.bold())
        Text(day.yi)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      HStack(alignment: .top, spacing: 6) {
        Text(store.label("avoid", fallback: t.avoidLabel))
          .font(.caption2.bold())
        Text(day.ji)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
  }

  @ViewBuilder
  private func fitBlock(_ day: SharedDay, fit: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(store.label("forYou", fallback: t.forYouLabel))
        .font(.caption2.bold())
      Text(fit)
        .font(.caption)
      if let summary = day.fitSummary, !summary.isEmpty {
        Text(summary)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
  }
}

// MARK: - Browse

struct DateBrowserView: View {
  @ObservedObject private var store = WatchPayloadStore.shared
  @State private var picked = Date()
  private var t: WatchStrings { WatchI18n.strings(for: store.resolvedLocale) }

  var body: some View {
    NavigationStack {
      List {
        Section(t.selectDate) {
          DatePicker("", selection: $picked, displayedComponents: .date)
            .labelsHidden()
          NavigationLink {
            DayDetailView(date: ymdString(picked))
          } label: {
            Text(ymdString(picked))
              .font(.caption)
          }
        }
        Section(t.cachedDays) {
          ForEach(store.allDaysSorted()) { day in
            NavigationLink {
              DayDetailView(date: day.date)
            } label: {
              VStack(alignment: .leading, spacing: 2) {
                Text(day.date)
                  .font(.caption2)
                Text(day.ganZhi)
                  .font(.headline)
              }
            }
          }
        }
      }
      .navigationTitle(t.browse)
    }
  }
}

struct DayDetailView: View {
  let date: String
  @ObservedObject private var store = WatchPayloadStore.shared
  private var t: WatchStrings { WatchI18n.strings(for: store.resolvedLocale) }

  var body: some View {
    ScrollView {
      if let day = store.day(for: date) {
        VStack(alignment: .leading, spacing: 8) {
          HStack {
            WatchPhaseLogo(phase: store.phase(for: day))
              .frame(width: 28, height: 28)
            Text(day.ganZhi)
              .font(.headline)
          }
          if !day.lunar.isEmpty {
            Text(day.lunar)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
          Text("\(store.label("good", fallback: t.goodLabel)) \(day.yi)")
            .font(.caption2)
          Text("\(store.label("avoid", fallback: t.avoidLabel)) \(day.ji)")
            .font(.caption2)
          if let fit = day.fit {
            Text("\(store.label("forYou", fallback: t.forYouLabel)) \(fit)")
              .font(.caption2)
          }
          if let tip = day.dayTip, !tip.isEmpty {
            if let label = day.tipLabel, !label.isEmpty {
              Text(label)
                .font(.caption2.bold())
            }
            Text(tip)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
        .padding(.horizontal, 4)
      } else {
        Text(t.noData)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .navigationTitle(date)
  }
}

// MARK: - Settings

struct SettingsView: View {
  @ObservedObject private var store = WatchPayloadStore.shared
  @ObservedObject private var session = YuunWatchSession.shared
  @ObservedObject private var refresh = WatchRefreshController.shared
  private var t: WatchStrings { WatchI18n.strings(for: store.resolvedLocale) }

  private var personalStatus: String {
    let birth = store.loadPreferences()?.birthDate
    let hasBirth = !(birth ?? "").isEmpty
    let today = ymdString(Date())
    let hasFit = !(store.day(for: today)?.fit ?? "").isEmpty
    if hasBirth, hasFit { return t.personalActive }
    if hasBirth { return t.personalPending }
    return t.personalNeedBirth
  }

  var body: some View {
    NavigationStack {
      List {
        Section {
          if let at = store.lastUpdatedAt {
            LabeledContent(t.lastSync) {
              Text(at, style: .relative)
                .font(.caption2)
            }
          }
          LabeledContent {
            Text(WatchKeychain.hasCredential ? t.credentialLinked : t.credentialMissing)
              .font(.caption2)
              .foregroundStyle(.secondary)
          } label: {
            Text("Credential")
              .font(.caption)
          }
          Text(personalStatus)
            .font(.caption2)
            .foregroundStyle(.secondary)
          if !session.statusText.isEmpty {
            Text(session.statusText)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }

        Section {
          Button(refresh.isRefreshing ? t.refreshing : t.refresh) {
            Task { await refresh.refresh(includePhone: true) }
          }
          .disabled(refresh.isRefreshing)
        }

        Section {
          NavigationLink {
            ComplicationGuideView()
          } label: {
            Text(t.complicationTitle)
          }
        }

        Section {
          Text(t.backgroundNote)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle(t.settings)
    }
  }
}

struct ComplicationGuideView: View {
  private var t: WatchStrings { WatchI18n.currentStrings() }

  var body: some View {
    List {
      Text(t.complicationStep1)
      Text(t.complicationStep2)
      Text(t.complicationStep3)
      Text(t.complicationFaceHint)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
    .navigationTitle(t.complicationTitle)
  }
}
