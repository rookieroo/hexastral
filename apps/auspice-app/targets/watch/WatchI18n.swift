// UI chrome only — 宜忌 labels come from payload `data.chrome`.

import Foundation

enum WatchLocale: String, CaseIterable {
  case zhHans = "zh-Hans"
  case zhHant = "zh-Hant"
  case ja
  case en

  static func normalize(_ raw: String) -> WatchLocale {
    let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    let lower = t.lowercased()
    if lower.hasPrefix("en") { return .en }
    if lower.hasPrefix("ja") { return .ja }
    if lower.contains("hant") || lower.contains("tw") || lower.contains("hk") { return .zhHant }
    if lower.hasPrefix("zh") { return .zhHans }
    return .en
  }
}

struct WatchStrings {
  let today: String
  let browse: String
  let settings: String
  let refresh: String
  let refreshing: String
  let syncSuccess: String
  let syncFailed: String
  let offlineStale: String
  let noData: String
  let lastSync: String
  let credentialLabel: String
  let credentialLinked: String
  let credentialMissing: String
  let personalActive: String
  let personalPending: String
  let personalNeedBirth: String
  let backgroundNote: String
  let complicationTitle: String
  let complicationStep1: String
  let complicationStep2: String
  let complicationStep3: String
  let complicationFaceHint: String
  let goodLabel: String
  let avoidLabel: String
  let forYouLabel: String
  let selectDate: String
  let cachedDays: String
}

enum WatchI18n {
  static func strings(for locale: WatchLocale) -> WatchStrings {
    switch locale {
    case .zhHans:
      return WatchStrings(
        today: "今日", browse: "浏览", settings: "设置",
        refresh: "刷新", refreshing: "刷新中…",
        syncSuccess: "同步成功", syncFailed: "同步失败",
        offlineStale: "数据可能已过期 · 请刷新",
        noData: "暂无黄历 · 请刷新或打开 iPhone Yuun",
        lastSync: "上次同步",
        credentialLabel: "账号凭据", credentialLinked: "已关联账号",
        credentialMissing: "未关联 · 仅公开黄历",
        personalActive: "个性化已生效",
        personalPending: "等待刷新「对你而言」",
        personalNeedBirth: "在 iPhone 录入生辰以解锁对你而言",
        backgroundNote: "后台刷新为尽力而为，打开 App 或 iPhone Yuun 可获最新数据。",
        complicationTitle: "添加表盘复杂功能",
        complicationStep1: "长按表盘 → 编辑",
        complicationStep2: "点复杂功能槽位",
        complicationStep3: "选择 Yuun",
        complicationFaceHint:
          "矩形显示月相、干支、农历与宜忌；其他表盘显示精简内容。对你而言仅在 Watch App。",
        goodLabel: "宜", avoidLabel: "忌", forYouLabel: "对你而言",
        selectDate: "选择日期", cachedDays: "已缓存"
      )
    case .zhHant:
      return WatchStrings(
        today: "今日", browse: "瀏覽", settings: "設定",
        refresh: "刷新", refreshing: "刷新中…",
        syncSuccess: "同步成功", syncFailed: "同步失敗",
        offlineStale: "資料可能已過期 · 請刷新",
        noData: "暫無黃曆 · 請刷新或打開 iPhone Yuun",
        lastSync: "上次同步",
        credentialLabel: "帳號憑證", credentialLinked: "已關聯帳號",
        credentialMissing: "未關聯 · 僅公開黃曆",
        personalActive: "個人化已生效",
        personalPending: "等待刷新「對你而言」",
        personalNeedBirth: "在 iPhone 錄入生辰以解鎖對你而言",
        backgroundNote: "背景刷新為盡力而為，打開 App 或 iPhone Yuun 可獲最新資料。",
        complicationTitle: "添加錶盤複雜功能",
        complicationStep1: "長按錶盤 → 編輯",
        complicationStep2: "點複雜功能槽位",
        complicationStep3: "選擇 Yuun",
        complicationFaceHint:
          "矩形顯示月相、干支、農曆與宜忌；其他錶盤顯示精簡內容。對你而言僅在 Watch App。",
        goodLabel: "宜", avoidLabel: "忌", forYouLabel: "對你而言",
        selectDate: "選擇日期", cachedDays: "已快取"
      )
    case .ja:
      return WatchStrings(
        today: "今日", browse: "閲覧", settings: "設定",
        refresh: "更新", refreshing: "更新中…",
        syncSuccess: "同期完了", syncFailed: "同期失敗",
        offlineStale: "データが古い可能性 · 更新してください",
        noData: "データなし · 更新または iPhone Yuun を開く",
        lastSync: "最終同期",
        credentialLabel: "アカウント認証", credentialLinked: "アカウント連携済み",
        credentialMissing: "未連携 · 公開暦のみ",
        personalActive: "パーソナル表示中",
        personalPending: "「あなたに」の更新待ち",
        personalNeedBirth: "iPhone で生年月日を入力すると「あなたに」が解放されます",
        backgroundNote: "バックグラウンド更新はベストエフォートです。",
        complicationTitle: "コンプリケーションを追加",
        complicationStep1: "文字盤を長押し → 編集",
        complicationStep2: "スロットをタップ",
        complicationStep3: "Yuun を選択",
        complicationFaceHint:
          "矩形は月相・干支・旧暦・宜忌を表示。ほかの文字盤は簡易表示です。「あなたに」は Watch App のみ。",
        goodLabel: "向く", avoidLabel: "避ける", forYouLabel: "あなたに",
        selectDate: "日付", cachedDays: "キャッシュ"
      )
    case .en:
      return WatchStrings(
        today: "Today", browse: "Browse", settings: "Settings",
        refresh: "Refresh", refreshing: "Refreshing…",
        syncSuccess: "Synced", syncFailed: "Sync failed",
        offlineStale: "Data may be stale · pull to refresh",
        noData: "No almanac · refresh or open Yuun on iPhone",
        lastSync: "Last sync",
        credentialLabel: "Account", credentialLinked: "Account linked",
        credentialMissing: "Not linked · public almanac only",
        personalActive: "Personalization on",
        personalPending: "Waiting to refresh For you",
        personalNeedBirth: "Add birth on iPhone to unlock For you",
        backgroundNote: "Background refresh is best-effort.",
        complicationTitle: "Add complication",
        complicationStep1: "Long-press face → Edit",
        complicationStep2: "Tap a complication slot",
        complicationStep3: "Choose Yuun",
        complicationFaceHint:
          "Rectangular shows moon, stem-branch, lunar date, and Good/Avoid. Other faces use compact views. For you stays in the Watch app.",
        goodLabel: "Good", avoidLabel: "Avoid", forYouLabel: "For you",
        selectDate: "Pick date", cachedDays: "Cached"
      )
    }
  }

  static func currentStrings() -> WatchStrings {
    strings(for: WatchPayloadStore.shared.resolvedLocale)
  }
}
