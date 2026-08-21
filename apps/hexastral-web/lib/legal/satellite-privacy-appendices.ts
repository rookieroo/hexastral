/**
 * Per-app privacy appendices under the UseONE, LLC umbrella policy.
 *
 * Scope (2026-07): Yuel, Yuun, Yaul, Kanyu (feng), and Syel. The HexAstral
 * universe is ONE sign-in identity, and these appendices describe the data flows
 * that carry across that shared account. Apps still in development are
 * intentionally NOT listed: we don't pre-announce unreleased surfaces, and an
 * appendix only goes live when its app does.
 *
 * Each appendix is a thin, app-specific supplement; the umbrella policy
 * (privacy.{locale}.json) governs everything common.
 */

export const SATELLITE_PRIVACY_KEYS = ['yuel', 'yuun', 'yaul', 'kanyu', 'syel'] as const

export type SatellitePrivacyKey = (typeof SATELLITE_PRIVACY_KEYS)[number]

export function isSatellitePrivacyKey(key: string): key is SatellitePrivacyKey {
  return (SATELLITE_PRIVACY_KEYS as readonly string[]).includes(key)
}

export const SATELLITE_PRIVACY_APPENDICES: Record<
  SatellitePrivacyKey,
  { displayName: string; summary: string; bullets: readonly string[] }
> = {
  yuel: {
    displayName: 'Yuel',
    summary:
      'Relationship synastry (合盘) in the HexAstral universe. Your own birth data drives a solo reading; adding another person creates a "bond" whose compatibility report combines both charts. One shared sign-in carries your bonds across the universe and survives a reinstall. For entertainment and cultural exploration only — not relationship counseling or professional advice.',
    bullets: [
      'Not professional advice. Yuel readings and chat are for entertainment, cultural exploration, and personal reflection. We do not guarantee relationship, marriage, or compatibility outcomes.',
      'Your birth date, 时辰 (hour-pillar index), gender, and optional birthplace power the solo and pair (合盘) charts.',
      "A partner's birth details are stored only when you enter them yourself or they accept an invite and enter their own — both subjects' data backs the bond.",
      'Apple / Google sign-in attaches a recoverable identity (a stable id, and an email when provided) so your bonds restore on a new device; required before any purchase so a subscription is never stranded on a lost device.',
      'People you recorded in Yuun (亲友) can be imported into Yuel as bonds, and a Yuel bond can be sent back to Yuun — the same shared account moves the data; nothing crosses apps until you trigger the carry-over.',
      'Subscription identifiers are processed via RevenueCat. We may record anonymous install and onboarding steps to improve the product (no IDFA). If you arrived from an ad, we may use first-party cookies and server-side conversion postbacks; there are no third-party ad SDKs in the app.',
      'For our referral program and to prevent abuse, we record whether an invitation you accept is your first connection (i.e. whether it onboarded a new member). This is used only for allowance/referral accounting; the specific free-reading and referral limits may change at any time (see Terms).',
    ],
  },
  yuun: {
    displayName: 'Yuun',
    summary:
      'Daily Chinese almanac (黄历) in the HexAstral universe. The free public almanac works without an account. You may save birth info on-device for a deterministic “For you” preview and personalized daily push. Signing in enables optional account sync, cross-device restore, and subscriptions (Yuun Pro).',
    bullets: [
      'Birth info: you can save birth details on this device only for a deterministic “For you” summary (吉/平/凶). Deep per-reason explanations remain Yuun Pro. Signing in lets you sync birth to your HexAstral account (with multi-device and cross-app controls) so it can restore on another device, widgets, and Apple Watch.',
      'Push notifications: if you enable reminders, we register an Expo push token with our servers together with your locale, timezone, display preferences, and optional birth profile so we can send morning/evening almanac notifications even when the app is closed. If a birth profile is on file, notifications may include a short personal conclusion (sign-in not required); Pro may receive additional deterministic tips. You can turn notifications off anytime.',
      'Home Screen widgets, Lock Screen accessories, and Apple Watch complications show the public 黄历; after you add birth info on device, an optional For you line can appear. Paired Watch sync uses App Group + WatchConnectivity; a signed-in Watch credential may be minted for independent refresh.',
      '亲友 (friends & family) you add are stored on device by default. Birthday reminders may also be stored server-side for the registered device when push is enabled. You may export an eligible 亲友 to Yuel as a bond over your shared sign-in.',
      'Apple / Google sign-in creates a recoverable portfolio identity (stable id, and email when the provider supplies it) required before purchase so subscriptions restore across devices. Purchases are processed via RevenueCat; we never see your card number.',
      'The optional AI deep reading / timeline / chart chat sends only the minimum chart context needed (for example date, selected 宜/忌 field, day-master stem, or structured chapter inputs) to authorized LLM providers under DPAs — not raw biometrics. Outputs are for entertainment, cultural exploration, and personal reflection only.',
      'Account deletion in Settings permanently removes account-linked birth sync data, Watch credentials, push registrations linked to your account, device-linked 亲友 reminder rows when tied to your signed-in devices, and related reading/chat history. Cancel App Store subscriptions separately. We may record anonymous install and onboarding steps (no IDFA; no third-party ad SDKs in the app).',
    ],
  },
  yaul: {
    displayName: 'Yaul',
    summary:
      'I Ching Liu Yao (六爻) study journal in the HexAstral universe. Three-coin casting uses on-device physics; free-tier casts return deterministic classical output (hexagram, I Ching corpus, na-jia). Optional AI commentary requires cast-pack credits or Yaul Pro. No birth chart is required. Sign in with Apple (iOS) is optional and is required only to link readings to your account, restore purchases, and continue after guest limits.',
    bullets: [
      'No natal chart input. Yaul does not ask for your birth date, 时辰, gender, or birthplace to cast. Chart-based features remain in Yuel and Yuun.',
      'What we store for a completed cast: your question (2–500 characters), optional six line values (6/7/8/9) you derived on-device, entropy metadata, and the server-generated hexagram plus interpretation fields. Free-tier casts use deterministic corpus + na-jia only — no third-party LLM. AI fields (interpretation, advice, summary) are generated only when you consume a cast-pack credit or have active Yaul Pro for that cast.',
      'Guests (not signed in): up to 3 classical casts per UTC calendar day. Each guest cast is stored on our servers in `portfolio_readings` with no user id, keyed by an `anonymous_id` your app generates — not by Apple ID. After the daily guest limit, you must sign in with Apple to continue on the linked path.',
      'Signed-in users (Apple on iOS): 3 free classical casts per UTC calendar month, then each additional cast consumes one `coincast` cast-pack credit (AI commentary) on your account unless Yaul Pro is active. Yaul Pro (active `coincast_pro` entitlement / `coincast_pro_expires_at`) removes the monthly free cap and includes AI on each cast.',
      'Consumable cast packs (`coincast_cast_pack_1`, `_5`, `_10`) and Yaul Pro subscriptions (`coincast_pro_monthly`, `coincast_pro_annual`) are validated via RevenueCat. We store entitlement state and `coincast_credits_remaining` on your account — never your payment card.',
      'Classical refusal (三不占): rule-based guards may refuse insincere or abusive questions before generating a reading — no LLM is required for this check on free-tier casts. Refused attempts are not saved as completed readings. For signed-in users, consecutive refusals increment `coincast_consecutive_violations`; at 3 refusals you may see a warning, and at 5 refusals Yaul may pause new casts for 24 hours (`coincast_banned_until`).',
      'Outer sign (外应): if on-device physics detects a coin on its rim (cannot settle yin/yang), the app voids the in-progress hexagram locally and restarts from line 1 — no server call for that line.',
      'Local-only preferences: coin skin, haptics, shake-to-cast, first-cast ritual acknowledgment, a 5-minute cooldown between completed readings, and recent-question duplicate checks (24 hours, up to 5 entries) are stored in on-device storage only.',
      'Optional portfolio memory (off by default): when you enable it in Settings, only AI-tier casts may retrieve short summaries of your prior Yaul AI readings to enrich new AI casts. Classical (free-tier) casts are never indexed. Memory is stored on HexAstral servers under your account; you can disable it anytime.',
      'The 3D coin ritual runs on-device. We do not upload camera, microphone, or photo-library data for casting.',
      'We may record anonymous install and onboarding steps to improve the product (no IDFA, no cross-app advertising trackers). If you arrived from an ad, we may use first-party cookies and server-side conversion postbacks.',
      'Universal links on hexastral.com (`/lp/hexagram/*`) re-open your own signed-in readings on a device with Yaul installed. These links are owner-scoped for self re-entry, not a public broadcast of your question.',
      'Classical and AI commentary are for entertainment, cultural study, and personal reflection — not fortune-telling, prediction, or professional advice.',
      'Account deletion (in-app or privacy@hexastral.com) removes your Yaul reading history within 30 days alongside other HexAstral account data. Guest readings keyed only by `anonymous_id` are not linked to your Apple account and are not recovered on sign-in.',
    ],
  },
  kanyu: {
    displayName: 'Kanyu',
    summary:
      'Classical feng-shui (堪舆) site analysis in the HexAstral universe. Pin a home or office, calibrate facing on satellite imagery, optionally upload floor plans for room-level reading, and receive a structured report with deterministic 玄空 / 八宅 compute plus AI synthesis. Optional birth profile improves the 八宅 chapter only. Sign in with Apple or Google is optional but required before any purchase. Kanyu is a cultural/educational digital tool — not on-site professional feng-shui, architecture, or surveying.',
    bullets: [
      'Not professional advice. Kanyu does not replace licensed architects, surveyors, engineers, building inspectors, real-estate professionals, or experienced human 风水师. Reports and chat are for entertainment, cultural exploration, and personal reflection only. We do not guarantee wealth, health, relationship, construction, or property outcomes.',
      'Report vs chat reliability. The report mixes deterministic classical compute (玄空飞星, 八宅, 格局/形理) with AI-inferred remote landform notes from satellite tiles, elevation models, and optional floor-plan vision — the latter may be wrong or incomplete. Report narrative is AI-generated under prompt constraints but is not guaranteed accurate. Chat follow-ups are separate, less constrained LLM replies scoped to your report id: they may hallucinate, drift, or contradict the report and are reference-only — never professional advice.',
      'Site inputs we store: name, formatted address, latitude/longitude (from your pin), facing bearing, build year, move-in year, floor count, and optional per-floor bearings. These power Mapbox satellite tiles, magnetic-declination correction, and deterministic flying-star / 八宅 chapters. You are responsible for the accuracy of facing, build year, and floor-plan inputs.',
      'Optional floor plans: you may upload one or more images from your photo library. Images are sent over TLS to our servers (EXIF/GPS metadata stripped on upload), stored in private object storage keyed to your account, and processed by a vision model to localize rooms into the nine palaces. Deleting a site purges its floor-plan images from storage; the finished report keeps only derived room findings, not the raw image.',
      'Exterior analysis: satellite tiles around your pin are rendered and annotated by a vision model (峦头 context). Annotated tile cache keys and structured vision JSON are saved on the report — not a permanent public map URL. No on-site inspection is performed.',
      'Optional birth profile: if your shared HexAstral user row includes birth date and gender, the 八宅 chapter uses them; without birth info the report still completes with an in-report notice and the 玄空 / exterior chapters remain.',
      'Anonymous boot: first launch registers a device-scoped user via POST /api/user and stores a device secret for HMAC signing. Apple / Google sign-in links that session for cross-device restore across universe apps.',
      'Paywall: each full site analysis job requires one unconsumed one-time purchase matched to your declared residence type — `hexastral_feng_single` for apartment / compound-unit residences (currently from approximately USD $9.99 in supported markets) or `hexastral_feng_premium` for large flat / detached-villa residences (currently approximately USD $39.99 when that SKU is enabled in the store). Until the premium SKU is live end-to-end, all residence types may be billed at the single-tier price. There is no Kanyu subscription and no free monthly feng analysis quota. The single purchase is consumed only after a report completes successfully.',
      'Bundled chat: unlimited AI chat about that same report is included with the purchase (no separate chat SKU), unlocked only after analysis completes. Chat messages, your question text, and report context snippets are stored in our conversation tables under your user id and sent to authorized LLM providers under DPAs. Chat is moderated automatically; abusive prompts may be refused. Fair-use rate limits may apply. See Terms §3 Kanyu limitations.',
      "When portfolio memory is enabled on your account, report synthesis may retrieve short summaries from your prior HexAstral readings to add context; chat may also reference the saved report chapters. It never pulls another user's data.",
      'Location & sensors (on-device): when-in-use location for map preview and declination; magnetometer for facing calibration. We do not run background location tracking.',
      'Reports, sites, job status, and chat threads live in `feng_reports`, `feng_sites`, `feng_jobs`, and chat conversation tables under your user id. RevenueCat validates `hexastral_feng_single` and `hexastral_feng_premium` one-time purchases — we never see your payment card.',
      'We may record anonymous install and onboarding steps to improve the product (no IDFA, no cross-app advertising trackers). If you arrived from an ad, we may use first-party cookies and server-side conversion postbacks.',
      'Account deletion removes your feng sites, reports, and related chat history within 30 days alongside other HexAstral account data.',
    ],
  },
  syel: {
    displayName: 'Syel',
    summary:
      'Face and palm physiognomy (形气 / 相) readings in the HexAstral universe. You capture left palm, right palm, and a clear face photo, then supply birth details so structured features can be contrasted with a BaZi summary. Sign in with Apple is required before biometric processing and purchases. Readings are for entertainment and cultural exploration only — not medical diagnosis, fate claims, or professional advice. Server product ids remain faceoracle_*; the consumer brand is Syel.',
    bullets: [
      'Not professional advice. Syel outputs are for entertainment, cultural study, and personal reflection. We do not provide medical, dermatological, psychological, legal, or fortune-telling advice, and we do not guarantee life outcomes.',
      'Biometric processing consent: before any face or palm image is sent for feature extraction, you must accept an in-app biometric disclosure (BIPA / GDPR Art.9 style). We record a timestamp and disclosure version on your account. You may withdraw consent anytime in Settings; processing is blocked until you opt in again at the current disclosure version.',
      'Photos you choose (camera or library): left palm, right palm, and face. Drafts remain viewable in the on-device period workspace. For feature extraction we briefly upload images over TLS into short-lived private object storage (application deletes after extract success or permanent failure; bucket lifecycle is a backstop ≤ ~1 day). Authorized vision models under DPAs produce structured feature vectors only. Source images are not retained permanently and never appear in reading JSON. After upload completes you may leave the app while extract and reading continue in the cloud. We do not sell biometric data or use it for advertising.',
      'On-device period workspace: the app may keep the current three photos only in the device app sandbox so you can view or replace a slot before the next reading. Replacing a slot deletes the previous local file. These files are not kept as a server-side photo archive. Signing out or withdrawing biometric consent clears the local workspace and best-effort deletes any pending ephemeral uploads.',
      'What we keep after a reading: structured physiognomy feature records (not raw pixels), the narrative / structured reading JSON (without imageBase64), birth profile fields you entered (solar date, 时辰 index, gender, optional city), and an optional forward event table used for Pro reminders.',
      'Birth details: required for a complete reading so physiognomy can be contrasted with natal context. They are stored with your shared HexAstral account birth profile and may be reused across universe apps you choose to open while signed in.',
      'Identity: portfolio Apple sign-in links a recoverable user id (and email when Apple provides it) so purchases and history restore on a new device. HMAC-signed device secrets protect API calls.',
      'Monetization (opaque ids): consumable `faceoracle_reading` (~USD 9.99) for one full deep five-chapter reading; subscriptions `faceoracle_pro_monthly` (~USD 14.99) / `faceoracle_pro_annual` (~USD 99.99) grant `faceoracle_pro` — archive & qi tools, **3 deep readings / UTC month**, **1 Face shallow brief / UTC day** (first Pro seal is deep). Payments are validated via RevenueCat — we never see your card number.',
      'Pro reminders: if you enable reminders, we may schedule local and/or push notifications for monthly re-capture nudges and “宜留意” windows derived from your active event table. Push tokens are registered only when you opt in. Copy uses exploratory framing, not deterministic fate (see umbrella policy / portfolio voice rules).',
      'We may record anonymous install and onboarding steps to improve the product (no IDFA, no cross-app advertising trackers). If you arrived from an ad, we may use first-party cookies and server-side conversion postbacks.',
      'Universal links on hexastral.com (`/lp/face/*`, `/lp/palm/*`) may open Syel when installed (bundle `com.hexastral.syel`).',
      'Account deletion (in-app request or privacy@hexastral.com) removes your Syel features, readings, and related account data within 30 days alongside other HexAstral universe data. Withdrawing biometric consent stops new processing but does not by itself delete historical structured features or readings — use account deletion for full erasure.',
    ],
  },
}

type AppendixBody = { summary: string; bullets: readonly string[] }

/** Yuun appendix bodies for store locales (en fallback = SATELLITE_PRIVACY_APPENDICES.yuun). */
const YUUN_APPENDIX_LOCALES: Partial<Record<'en' | 'zh' | 'tw' | 'ja', AppendixBody>> = {
  zh: {
    summary:
      'HexAstral 宇宙中的每日中华黄历。公开黄历无需账号；可将生辰保存在本机以获得确定性的「对你而言」预览。登录后可开启账号同步、个性化推送结论，并订阅 Yuun Pro。',
    bullets: [
      '生辰：可仅存本机，用于确定性的「对你而言」摘要（吉/平/凶）；逐条原因属 Yuun Pro。登录并可开启多设备/跨应用同步后写入账号，以便在其他设备、小组件与 Apple Watch 恢复。',
      '推送：开启提醒后，我们会向服务器注册 Expo push token，以及语言、时区、显示偏好与可选生辰资料，以便在 App 关闭时发送早晚黄历通知。登录用户可收到短个人结论；Pro 可收到额外确定性提示。可随时关闭通知。',
      '主屏/锁屏小组件与 Watch 复杂功能展示公开黄历；本机录入生辰后可显示「对你而言」。配对 Watch 经 App Group + WatchConnectivity；登录后可签发 Watch credential 供手表独立联网刷新。',
      '亲友默认存本机；开启推送时生日提醒也可能按设备存于服务端。可将符合条件的亲友经同一登录导出到 Yuel 合盘。',
      'Apple / Google 登录创建可恢复的组合身份（稳定 id，以及提供方给出的邮箱），购买前需要，以便跨设备恢复订阅。支付经 RevenueCat；我们看不到卡号。',
      '可选 AI 深读 / 时间轴 / 命盘对话仅发送必要盘面上下文给受 DPA 约束的 LLM，不含原始生物特征。内容仅供文化探索与个人省思。',
      '在设置中删号会永久删除账号生辰同步、Watch credential、与账号关联的推送登记、关联设备上的亲友提醒行及相关阅读/对话记录。App Store 订阅需另行取消。我们可能记录匿名安装与引导步骤（无 IDFA；无第三方广告 SDK）。',
    ],
  },
  tw: {
    summary:
      'HexAstral 宇宙中的每日中華黃曆。公開黃曆無需帳號；可將生辰保存在本機以獲得確定性的「對你而言」預覽。登入後可開啟帳號同步、個人化推播結論，並訂閱 Yuun Pro。',
    bullets: [
      '生辰：可僅存本機，用於確定性的「對你而言」摘要（吉/平/凶）；逐條原因屬 Yuun Pro。登入並可開啟多裝置/跨應用同步後寫入帳號，以便在其他裝置、小組件與 Apple Watch 恢復。',
      '推播：開啟提醒後，我們會向伺服器註冊 Expo push token，以及語言、時區、顯示偏好與可選生辰資料，以便在 App 關閉時發送早晚黃曆通知。登入使用者可收到短個人結論；Pro 可收到額外確定性提示。可隨時關閉通知。',
      '主畫面/鎖屏元件與 Watch 複雜功能展示公開黃曆；本機錄入生辰後可顯示「對你而言」。配對 Watch 經 App Group + WatchConnectivity；登入後可簽發 Watch credential 供手錶獨立連網刷新。',
      '親友預設存本機；開啟推播時生日提醒也可能依裝置存於伺服器。可將符合條件的親友經同一登入匯出到 Yuel 合盤。',
      'Apple / Google 登入建立可恢復的組合身分（穩定 id，以及提供方給出的信箱），購買前需要，以便跨裝置恢復訂閱。支付經 RevenueCat；我們看不到卡號。',
      '可選 AI 深讀 / 時間軸 / 命盤對話僅發送必要盤面上下文給受 DPA 約束的 LLM，不含原始生物特徵。內容僅供文化探索與個人省思。',
      '在設定中刪號會永久刪除帳號生辰同步、Watch credential、與帳號關聯的推播登記、關聯裝置上的親友提醒列及相關閱讀/對話紀錄。App Store 訂閱需另行取消。我們可能記錄匿名安裝與引導步驟（無 IDFA；無第三方廣告 SDK）。',
    ],
  },
  ja: {
    summary:
      'HexAstral 宇宙の毎日の中華黄暦。公開黄暦はアカウント不要。生年月日を端末に保存すると確定的な「あなたへ」プレビューが使えます。サインイン後は任意のアカウント同期、個人向けプッシュ結論、Yuun Pro 購読が利用できます。',
    bullets: [
      '生年月日：端末のみに保存して確定的な「あなたへ」要約（吉/平/凶）を表示できます。理由の詳細は Yuun Pro。サインインしマルチデバイス同期を ON にするとアカウントへ書き込み、他端末・ウィジェット・Apple Watch で復元できます。',
      'プッシュ：通知を ON にすると Expo プッシュトークンと言語・タイムゾーン・表示設定・任意の生年月日をサーバーに登録し、アプリ終了中でも朝夕の黄暦通知を送れます。サインインユーザーは短い個人結論、Pro は追加の確定的ヒントを受け取れる場合があります。いつでもオフにできます。',
      'ホーム／ロック画面ウィジェットと Watch コンプリケーションは公開黄暦を表示。端末に生年月日があると「あなたへ」行も表示できます。ペア Watch は App Group + WatchConnectivity。サインイン後は独立更新用の Watch credential を発行できます。',
      '親友はデフォルトで端末内。プッシュ ON 時は誕生日リマインダーがデバイス単位でサーバー保存されることがあります。同一サインインで Yuel の合盤へエクスポートできます。',
      'Apple / Google サインインは復元可能なポートフォリオ ID（安定 id と、提供される場合のメール）を作り、購入前に必要です（端末間で購読復元）。決済は RevenueCat；カード番号は見えません。',
      '任意の AI 深掘り／タイムライン／命式チャットは必要な盤面コンテキストのみを DPA 下の LLM に送り、生の生体データは送りません。娯楽・文化・内省目的のみです。',
      '設定からのアカウント削除で、アカウントの生年月日同期、Watch credential、関連プッシュ登録、関連デバイスの親友リマインダー行、関連の閲覧／チャット履歴を永久削除します。App Store 購読は別途解約。匿名のインストール／オンボーディング記録を取ることがあります（IDFA なし、第三者広告 SDK なし）。',
    ],
  },
}

export function resolveSatelliteAppendix(
  key: SatellitePrivacyKey,
  locale: 'en' | 'zh' | 'tw' | 'ja'
): { displayName: string; summary: string; bullets: readonly string[] } {
  const base = SATELLITE_PRIVACY_APPENDICES[key]
  if (key !== 'yuun' || locale === 'en') return base
  const localized = YUUN_APPENDIX_LOCALES[locale]
  if (!localized) return base
  return { displayName: base.displayName, summary: localized.summary, bullets: localized.bullets }
}
