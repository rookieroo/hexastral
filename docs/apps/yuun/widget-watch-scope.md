# Auspice (Yuun) — native Widget + Watch scope

Status: **iPhone WidgetKit + Watch companion in repo.** Activate with prebuild + App Group on device — see [widget-build-runbook.md](./widget-build-runbook.md).

**Launch boundary:** Store / ASO for the June–July v1 cut does **not** claim Widget or Watch ([launch.md](./launch.md)). Shipping the full Watch companion is a **separate milestone** (EAS + Xcode deploy of `YuunWatchApp` to a paired Watch). Code below is the SSOT when that milestone ships.

## SSOT

| Layer | Location |
|---|---|
| RN layout mock | `apps/auspice-app/components/WidgetCard.tsx` |
| App-level sync (not Home-only) | `apps/auspice-app/hooks/useYuunWidgetSync.ts` → RootLayout |
| RN write + N-day window | `apps/auspice-app/lib/widget-bridge.ts` → `@zhop/widget-kit-ios` |
| Watch credential provision | `apps/auspice-app/lib/watch-provision.ts` |
| Shared types | `packages/widget-kit-ios/src/types.ts` (`YuunWidgetData`, prefs / credential keys) |
| Home + Lock Screen Swift | `apps/auspice-app/targets/widget/` |
| Watch companion (Today / Browse / Settings) | `apps/auspice-app/targets/watch/` |
| Watch complications | `apps/auspice-app/targets/watch-widget/` |
| Public 黄历 fallback | `targets/widget/AlmanacEngine.swift` (+ Watch copy) |
| Watch API | `POST /api/auspice/watch/bootstrap` · `POST/GET/DELETE /api/watch/credentials` |

## Families

- Home: `systemSmall` / `systemMedium` / `systemLarge`
- Lock Screen: `accessoryCircular` / `accessoryRectangular`
- Watch complications: circular / rectangular / corner / inline (kind `YuunWatch`)
- Watch App: Today, date browse, settings + complication guide

## Data — iPhone WidgetKit

App Group `group.com.hexastral.yuun`. Envelope key `hexastral_widget_payload_v1`; legacy `almanac_days` mirrored for one release.

The **iPhone Widget extension never calls the API**. Flow:

```
RootLayout (AppState / locale / birth)
  → useYuunWidgetSync → /api/auspice/day
  → widget-bridge builds an N-day window (+ personalization when birth is set)
  → App Group UserDefaults → WidgetKit TimelineProvider
```

Open Yuun **once on any screen** (not only Home) to refresh desktop widgets. Deep links into `/timeline` or `/me` also trigger sync.

Why the extension does not fetch: the HMAC signer + credentials live in the RN
app, and WidgetKit refresh budget is not a reliable place to spend network
calls. `AlmanacEngine.swift` is the offline floor for a widget added before the
app has ever synced — deterministic public 黄历 only, never `fit`.

### Localization ownership

`data.chrome` (`YuunWidgetChrome`) carries the face copy — `good` / `avoid` /
`forYou` / `tip` / `lunarFallback` / `emptyHint` / 8 `moonPhaseNames` — sourced
from `t.widgetChrome` + `t.moonPhaseNames` in `apps/auspice-app/lib/i18n.ts`.
Translations are therefore edited in the locale tables only. Swift contains no
second face-copy table; before first sync the extension shows neutral `Yuun`
chrome until the App writes the localized payload.

Day strings (宜忌 verbs, 日签, For-you sentence) are already localized **and**
formatted for the user's 宜忌 display mode (`modern` / `traditional`) before
being written, so Swift never re-translates content. Mode is part of the sync
cache key; changing Settings forces a widget/Watch rewrite. Offline
`AlmanacEngine.officerYiJi` stays traditional canonical CJK only (must match
`OFFICER_YIJI` — see [yiji-vocabulary.md](./yiji-vocabulary.md)).

Watch bootstrap accepts optional `yijiMode` (omit → `traditional` for old
clients). Public `/day` fallback on Watch formats via `WatchYijiVocab` using
prefs mode + locale default.

## Data — Watch companion (direct API)

iPhone App Group does **not** auto-sync to Watch. Two paths:

1. **WatchConnectivity push** after RN writes payload + prefs + optional credential
   (`@zhop/widget-kit-ios` `syncWatchAppGroup`).
2. **Watch → API**: scoped Bearer `w1.<id>.<secret>` (minted via HMAC
   `POST /api/watch/credentials`, stored in Watch Keychain). Watch calls
   `POST /api/auspice/watch/bootstrap` with `birthDate` in the **body only**,
   `Cache-Control: private, no-store`. Response is a ready-to-store
   `WidgetSyncPayload<YuunWidgetData>` window.

**Do not** put personalized `birthDate` on the public cached `GET /api/auspice/day`
query string for Watch. Do **not** copy the iPhone `deviceSecret` onto Watch.

| App Group / Keychain key | Purpose |
|---|---|
| `hexastral_widget_payload_v1` | Almanac window envelope |
| `yuun_watch_preferences_v1` | `{ locale, birthDate?, yijiMode? }` snapshot |
| `yuun_watch_credential` | Bearer token; **empty string = tombstone** (clears Watch Keychain) |

Guests without a portfolio identity still get prefs + WCSession almanac push;
Watch can fall back to public `/day` or `AlmanacEngine` (never invents `fit`).

## Layout budgets

Each family reads a different 宜忌 field so the verb count matches the available
width. `verbBudget()` in `DailyCard.tsx` is the single source; the bridge fills
all three fields per day.

| Family | 宜忌 field | Verbs | Extra content |
|---|---|---|---|
| `systemSmall` | `yiShort` / `jiShort` | 2, one line (scales down, never truncates) | 月相 · 农历 · stem-branch |
| `systemMedium` | `yi` / `ji` | 4–5, two lines in the right column | full-width footer: complete For-you sentence (en omits the categorical verdict) |
| `systemLarge` | `yiLong` / `jiLong` | 6, two lines full width | 月相 caption (name · % lit), stem-branch reading, 值神 / 二十八宿 (zh/ja), `对你而言` **and** 日签 |
| `accessoryRectangular` | `yiShort` / `jiShort` | 2, one line | stem-branch |

Locale chrome is semantic, not decorative:

- zh: `宜 / 忌`; stem-branch as CJK.
- en: `Good / Avoid`; Wiktionary headword order `yǐsì (乙巳)`. The For-you
  footer is `For you · <full sentence>` and never exposes raw `吉 / 平 / 凶`.
- ja: `向く / 避ける`; stem-branch remains Japanese kanji.

Large distributes slack **above** the 宜忌 rule, so the almanac block and the
footer stay on the bottom edge — en drops 值神/二十八宿 and would otherwise leave
a hole under the last line.

## Complications

| Family | Content |
|---|---|
| Circular | Moon logo + ganZhi; solar term replaces ganZhi on 节气当日 |
| Corner | Moon logo + curved label (ganZhi / solar term same rule) |
| Rectangular | Line 1 moon logo + ganZhi + `农历 · 节气` caption (term only on 节气当日); then 宜 / 忌 one line each, **3 verbs max** (`RECT_VERBS`) from `yiLong` → `yi` → `yiShort`. Capped so a mild `minimumScaleFactor` absorbs long locales instead of painting an unreadable `…` |
| Inline | `宜 one · 忌 one` (keep both sides of the almanac) |

- Resolve the day by **calendar date**, never bare `days.first` (midnight / window skew).
- `yiShort` / `jiShort` are capped at 2 verbs by the bridge **and** bootstrap, so a wide
  slot must read `yiLong` → `yi` → `yiShort` in that order; raising the Swift verb limit
  alone changes nothing.
- Swift re-splitting of a joined verb string must break on `·` / `•` **only**. `topVerbs`
  joins with `" · "` on en/ja, and en glosses include multi-word phrases (`Move in`,
  `Bless idol`, `Mourn end`) — treating a bare space as a separator shears them into
  fragments. Applies to `verbParts` (complication) and `WatchAPIClient.compactVerbs`.
- Prefer envelope `chrome` / `freshUntil` / source metadata when present.
- Missing today + network fail → public `AlmanacEngine` only (never fabricate `fit`).
- **For you is Watch App only** — complications do not paint `fit` / `fitSummary`.
- Complication chrome is localized in-extension (`goodLabel` / `avoidLabel` / `emptyHint`
  / gallery description / preview sample), preferring payload `chrome` + `locale`, then
  the Watch's own language — never a hardcoded `en`. Watch App copy lives in
  `WatchI18n.swift` (4 locales, no `Localizable.strings`); `data.chrome` still wins for
  宜忌 labels. Gallery text is read at `body` evaluation, so it uses `loadLocale()`
  rather than the timeline-populated `cachedLocale`.
- `getSnapshot` may fall back to the preview sample; `getTimeline` must not — on the
  face, missing data is real state and has to render `emptyHint`.

### For you boundary

- Watch App Today / day detail show localized `fit` + `fitSummary` when birth is in
  `yuun_watch_preferences_v1` and bootstrap (or WCSession payload) includes them.
- Bootstrap `fitSummary` is a server-side canned sentence; wording may differ from
  in-app `DailyCard` copy.
- Guest / no-birth users: Watch does **not** show 日签 (`dayTip`); bootstrap leaves
  `dayTip` null. Tip text from an earlier iPhone WCSession push is preserved across
  Watch network refresh via `mergeEnvelope`.
- Clearing birth on iPhone clears Watch personalization on the next prefs + refresh
  cycle (`mergeEnvelope` drops `fit` when prefs have no `birthDate`).

### Account birth SSOT (cross-device)

- Self birth is stored on `users` via `GET/PUT /api/portfolio/birth-info` after
  Apple/Google sign-in. Local AsyncStorage is an offline + Widget/Watch mirror only.
- `birth_multi_device_sync_enabled` defaults **on**; when off, only the owning
  install may read the birth body (other installs see `multi_device_disabled`).
- `birth_cross_app_sync_enabled` defaults **off** (API ready; Yuun UI hides the
  toggle). Other apps cannot read Yuun-sourced birth unless enabled.
- Account deletion hard-deletes the `users` row and owned tables (including
  `watch_credentials`, Auspice push/makeif/birthday rows keyed `user:<id>`).
  Privacy policy: permanent erasure within 30 days; in-app delete runs immediately.

## IAP / freemium

- **Free (no birth):** public 黄历 on Home (S/M/L), Lock Screen accessories, Watch — same for everyone.
- **Free (with birth):** 「对你而言」 verdict + one-line summary in App, iPhone widgets, and Watch App (via bootstrap body or App Group). Not on Watch complications.
- **Pro:** per-reason 宜忌 deep unlock, life timeline / what-if, personal calendar feed, chart deep-read — not the public almanac itself.

AlmanacEngine never invents fit.

## Out of scope (this architecture)

- Full HMAC v2 client on Watch
- Long-running network inside the complication extension (Watch App owns refresh;
  background refresh is best-effort and not guaranteed on-time)
- Treating public `/day?birthDate=` as an authenticated personalized channel
- Multiple Watch complication style variants / AppIntent picker (one adaptive design per family)
