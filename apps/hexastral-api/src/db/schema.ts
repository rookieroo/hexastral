/**
 * HexAstral 统一 D1 数据库 Schema
 *
 * 合并自 stellar-db + fengshui-db + yiching-db
 * 单一 users 表管理订阅、credits、统计
 */

import { relations } from 'drizzle-orm'
import { index, integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

// ==================== 用户表（统一） ====================

/** 用户表 — 合并三端用户数据 */
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email'),
    /**
     * 真实姓名（占卜与命理必要参数）— 由 onboarding NameStep 写入。
     * 不对外公开，仅用于 LLM 命理排盘的姓名学输入。
     */
    name: text('name'),
    /**
     * 公开昵称 — 用户可在 Profile 自由编辑，展示在 hexastral-web 公开页与 App 内问候语。
     * 与 `name`（真实姓名）解耦，避免占卜姓名被泄露到公开渠道。
     */
    displayName: text('display_name'),
    appleUserId: text('apple_user_id').unique(),
    googleUserId: text('google_user_id').unique(),

    // ── 公开个人资料 ──
    /** @username — 全局唯一，用于公开星盘 URL hexastral.com/u/:username */
    username: text('username').unique(),
    /** 公开头像 R2 Key (存储相对路径/Key，API动态拼接完整URL) */
    avatarKey: text('avatar_key'),
    /** 手机号（仅采集，用于"联系人加入"通知匹配，不对外暴露） */
    phone: text('phone'),
    /** 是否公开星盘报告（用于 hexastral-web 病毒传播） */
    chartPublic: integer('chart_public', { mode: 'boolean' }).default(false).notNull(),
    /**
     * 公开星盘可见字段细粒度控制 (仅当 chartPublic=true 时生效)
     * JSON: { signature, bazi, ziwei, basic } — 缺省视为 true；旧版 `stats` 在 parse 时并入 basic；遗留 `dayun` 键在读时忽略、写 PATCH 时不再持久化
     */
    publicVisibilityJson: text('public_visibility_json'),

    // ── 命理签名 (Hero Identity) ──
    /** AI 生成的命理签名 — 4-12 字, 落在 Hero 名片下方 */
    fateSignature: text('fate_signature'),
    /** 签名风格: classical(古典四字) | sharp(毒舌) | poetic(现代诗) | custom */
    fateSignatureStyle: text('fate_signature_style').default('classical'),
    /** Pro 用户自定义风格的语调参考 prompt (≤120字, 由系统模板包裹防注入) */
    fateSignatureCustomPrompt: text('fate_signature_custom_prompt'),
    /** 签名生成时间 (ISO 8601) — 用于 staleness 判断 */
    fateSignatureGeneratedAt: text('fate_signature_generated_at'),
    /**
     * 命理签名的白话解释 (与签名同步生成, 与 fateSignature 同locale)
     * 用于普通用户理解 4-字签名的含义, 渲染于签名下方的小字注解。
     */
    fateSignatureExplanation: text('fate_signature_explanation'),

    // ── 出生信息（命盘推演用） ──
    birthSolarDate: text('birth_solar_date'),
    birthTimeIndex: integer('birth_time_index'),
    birthGender: text('birth_gender'),
    birthCity: text('birth_city'),
    birthLongitude: text('birth_longitude'),
    /** 出海时空参数 (v2) */
    birthLatitude: text('birth_latitude'),
    birthTimezoneId: text('birth_timezone_id'),

    /** 精确出生时间：当天 00:00 起分钟数 0-1439。null = 仅时辰（不做真太阳时校准）。 */
    birthClockMinutes: integer('birth_clock_minutes'),
    /** 真太阳时校准开关（仅精确模式生效，默认开；false = 用户显式关闭）。 */
    birthSolarCalibrate: integer('birth_solar_calibrate', { mode: 'boolean' }),

    /** 南半球月令置换开关 (opt-in, 影响命格月支) */
    hemisphereReversalEnabled: integer('hemisphere_reversal_enabled', { mode: 'boolean' })
      .default(false)
      .notNull(),

    /** 用户输入时选择的历法 — solar (阳历) | lunar (农历) */
    birthCalendarType: text('birth_calendar_type'),
    /** 原始农历日期 (仅 lunar 输入时记录, 格式 "YYYY-M-D") */
    birthLunarDate: text('birth_lunar_date'),
    /** 农历闰月标记 (1=闰月, 0=非闰月) */
    birthIsLeapMonth: integer('birth_is_leap_month', { mode: 'boolean' }).default(false),

    // ── 面相/手相（可选，作为占卜命理入参）──
    /** 最新一次面相特征提取记录 ID（关联 user_physiognomy_features） */
    activePhysiognomyId: text('active_physiognomy_id'),
    /** 最新一次手相特征提取记录 ID（关联 user_physiognomy_features, type='palm'） */
    activePalmFeatureId: text('active_palm_feature_id'),

    // ── 订阅 & Credits ──
    // Subscription access is canonical in `user_entitlements` (ADR-0013). The
    // legacy subscription_status/_plan/_expires_at shim columns were dropped in P5.
    /** RevenueCat App User ID（用于对账） */
    revenueCatUserId: text('revenue_cat_user_id'),
    /** 预购对话消息数（consumable IAP hexastral_chat_5，每包 5 条）*/
    chatCreditsRemaining: integer('chat_credits_remaining').default(0).notNull(),
    /** 预购占卜次数（consumable IAP hexastral_divination_3，每包 3 次）*/
    divinationCreditsRemaining: integer('divination_credits_remaining').default(0).notNull(),
    /** CoinCast satellite: cast-pack credits (RevenueCat consumable, non-expiring). */
    coincastCreditsRemaining: integer('coincast_credits_remaining').default(0).notNull(),
    /** CoinCast Pro (RevenueCat subscription) — ISO 8601 UTC; active while > now. */
    coincastProExpiresAt: text('coincast_pro_expires_at'),
    /** Consecutive CoinCast readings refused by three-principles gate (linked users). */
    coincastConsecutiveViolations: integer('coincast_consecutive_violations').default(0).notNull(),
    /** ISO 8601 UTC — while > now, linked CoinCast requests are rejected. */
    coincastBannedUntil: text('coincast_banned_until'),
    /**
     * Portfolio satellites (CoinCast / dreamoracle): user opted in to optional AI Search indexing
     * of reading summaries for personalized recall. Default false.
     */
    portfolioMemoryEnabled: integer('portfolio_memory_enabled', { mode: 'boolean' })
      .default(false)
      .notNull(),
    /**
     * Cross-app memory recall opt-in. When true, chat may reference this user's
     * readings across ALL HexAstral apps (not just the current one). Kept
     * separate from portfolioMemoryEnabled (same-app) so cross-app recall is its
     * own explicit opt-in — never silently broadened from the same-app toggle.
     */
    crossAppMemoryEnabled: integer('cross_app_memory_enabled', { mode: 'boolean' })
      .default(false)
      .notNull(),
    /**
     * Biometric (face/palm) processing opt-in — BIPA / GDPR Art.9 / CCPA. A DEDICATED,
     * timestamped consent, never inferred from ToS acceptance or another flag. Null =
     * not consented → the face VLM pipeline 403s `biometric_consent_required` before any
     * processing. `biometricConsentVersion` records WHICH disclosure was accepted (bump
     * the disclosure → re-prompt). See lib/biometric-consent.ts.
     */
    biometricConsentAt: text('biometric_consent_at'),
    biometricConsentVersion: text('biometric_consent_version'),
    /**
     * 终身赠送的免费 Flash chat 配额（破冰策略）。
     * Free 用户首次注册赠送 3 次；用完后引导 Paywall 而非默认扣 chatCreditsRemaining。
     * Pro 用户不消耗此字段。账户级强核销，避免客户端 MMKV 被绕过。
     */
    freeChatQuota: integer('free_chat_quota').default(3).notNull(),

    /** Per-device HMAC 签名密钥 (Phase 3: iOS 请求防伪) */
    deviceSecret: text('device_secret'),
    /** SHA-256(normalizeE164(phone)) — 用于通讯录匹配，indexed */
    phoneHash: text('phone_hash'),
    /** 用户语言偏好 (IETF BCP 47，如 zh / en / ja，用于每日运势生成语言) */
    locale: text('locale').default('zh'),
    /** AI 解读音调偏好 — gentle(温和) | straight(直白) | poetic(诗意) */
    tonePreference: text('tone_preference').default('gentle'),
    /** 推送通知偏好 JSON: { dailyFortune, dailyFortuneEvening, luckyWindow, chartTransit,
     *  fateReportReady }（旧版 contactJoined 忽略）。dailyFortune* 两个槽位在
     *  push-targets 用 json_extract 过滤；缺省视为开启（退订而非订阅）。 */
    notifPrefsJson: text('notif_prefs_json'),

    // ── 命理静态特征（onboarding 一次性计算，永不变） ──
    /** 日干 (10 天干) — drives almanac wuxing relations */
    dayMasterStem: text('day_master_stem'),
    /** 日主强弱: 'strong' | 'medium' | 'weak' */
    dayMasterStrength: text('day_master_strength'),
    /** 喜用神 (favorable five-element) — single token wood/fire/earth/metal/water */
    favorableElement: text('favorable_element'),
    /** 忌神 (unfavorable five-element) */
    unfavorableElement: text('unfavorable_element'),
    /** 紫微命宫主星 (e.g. 紫微/天机/太阳...) */
    ziweiMingPalaceStar: text('ziwei_ming_palace_star'),
    /** 出生年支 (12 地支, used for clash detection) */
    birthBranch: text('birth_branch'),

    // ── 统计 ──
    totalReadings: integer('total_readings').default(0).notNull(),
    totalAnalyses: integer('total_analyses').default(0).notNull(),
    totalDivinations: integer('total_divinations').default(0).notNull(),

    /**
     * 命书章节解锁额度 — first N chapters in `CHAPTER_UNLOCK_ORDER`
     * (see lib/chapter-access.ts) are available to this user.
     *
     * Free user starts at 3 (ch1 + ch4 + ch3 in unlock order). The first
     * invite-redeem (target binds email) flips this to the full chapter
     * count — the partner showed up, unlock the whole reading. Pro/IAP path
     * also flips to max. New rows should pass `CHAPTER_UNLOCK_DEFAULT`
     * explicitly so behavior is independent of the column-level default.
     */
    unlockedChapterCount: integer('unlocked_chapter_count').default(3).notNull(),

    /**
     * Free users get one lifetime birth-info correction. After that, the edit
     * entry is locked until a Pro/IAP upgrade flips the gate. The flag is
     * consumed by the PUT birth-info handlers on a real edit (existing birth
     * → new birth); the first-ever "add birth" does not consume it.
     */
    birthEditUsed: integer('birth_edit_used', { mode: 'boolean' }).default(false).notNull(),

    /** 最后一次 app 活跃时间 (device registration 心跳更新，用于智能推送分级) */
    lastActiveAt: text('last_active_at'),

    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index('users_phone_hash_idx').on(t.phoneHash)]
)

// ==================== Multi-flagship entitlements ====================

/**
 * Normalized per-user × per-entitlement subscription state — the single source of
 * truth for subscription access (ADR-0013).
 *
 * RC webhook writes here; `GET /api/users/me/entitlements` reads. Entitlement
 * keys are defined in src/config/products.ts: kindred_pro | auspice_pro | fate_pro |
 * universe_pro.
 */
export const userEntitlements = sqliteTable(
  'user_entitlements',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entitlementKey: text('entitlement_key').notNull(),
    plan: text('plan'),
    productId: text('product_id'),
    activatedAt: text('activated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    expiresAt: text('expires_at'),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.entitlementKey] }),
    index('user_entitlements_expires_idx').on(t.expiresAt),
  ]
)

// ==================== Portfolio satellites ====================

/** Portfolio satellite unified readings (preview + linked) */
export const portfolioReadings = sqliteTable(
  'portfolio_readings',
  {
    id: text('id').primaryKey(),
    /** Nullable for anonymous preview traffic */
    userId: text('user_id').references(() => users.id),
    targetApp: text('target_app').notNull(),
    readingType: text('reading_type').notNull(),
    inputJson: text('input_json').notNull(),
    resultJson: text('result_json').notNull(),
    ddlToken: text('ddl_token'),
    locale: text('locale').default('en'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('portfolio_readings_target_created_idx').on(t.targetApp, t.createdAt),
    index('portfolio_readings_user_target_created_idx').on(t.userId, t.targetApp, t.createdAt),
    index('portfolio_readings_ddl_idx').on(t.ddlToken),
  ]
)

// ==================== 命理报告章节（append-only versioned）====================

/**
 * Full report chapters storage — deep-refactor Phase 1.
 *
 * Design principles:
 *   - Append-only: every LLM output, once generated, is never mutated;
 *     updates insert a new row and flip the prior is_current=0 (atomically via db.batch()).
 *   - Per-chapter: each slug ('ch1_personality' | 'ch2_dimensions_static' |
 *     'ch2_dimensions_dynamic' | 'ch3_stellar' | 'ch4_timeline' | 'ch5_hidden' |
 *     'ch6_action') generates and versions independently.
 *   - Lazy-on-read regen: API route compares the request's expected context_hash to the
 *     current row's context_hash; mismatch → generate new version, write, return.
 *
 * Free users only access static chapters (ch1, ch2_static, ch3); time-bound chapters
 * (ch2_dynamic, ch4, ch5, ch6) are Pro-only and lazy-regen on liunian / dayun / birthday
 * boundaries.
 */
export const reportChapters = sqliteTable(
  'report_chapters',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** Chapter slug — 'ch1_personality' | 'ch2_dimensions_static' | 'ch2_dimensions_dynamic'
     *  | 'ch3_stellar' | 'ch4_timeline' | 'ch5_hidden' | 'ch6_action' */
    chapter: text('chapter').notNull(),
    /** Chart fingerprint — sha256(birthSolarDate + timeIndex + gender + city) */
    chartHash: text('chart_hash').notNull(),
    /** Context fingerprint — chartHash + currentLiunian + currentDayun + promptVersion + modelId
     *  (static chapters omit liunian/dayun) */
    contextHash: text('context_hash').notNull(),
    /** LLM structured JSON output */
    contentJson: text('content_json').notNull(),
    /** Locale (BCP-47) */
    locale: text('locale').notNull(),
    /** Explanation mode — 'term' (jargon-first) | 'plain' (everyday speech) */
    explanationMode: text('explanation_mode').notNull(),
    /** Model provenance tag, e.g. 'cf-flagship@2026-05' (see lib/model-registry.ts) */
    model: text('model').notNull(),
    /** Prompt version, e.g. 'v1.2' */
    promptVersion: text('prompt_version').notNull(),
    /** Pro "change perspective" re-roll perspective seed (optional) */
    perspectiveSeed: text('perspective_seed'),
    /** Current-version flag — 1 = current, 0 = history. Exactly one per (user_id, chapter). */
    isCurrent: integer('is_current', { mode: 'boolean' }).default(true).notNull(),
    generatedAt: text('generated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('rc_user_chapter_current_idx').on(t.userId, t.chapter, t.isCurrent),
    index('rc_user_chapter_generated_idx').on(t.userId, t.chapter, t.generatedAt),
  ]
)

// ==================== 合婚 ====================

/** 合婚记录 — PRD v2.5 裂变引擎 */
export const pairReadings = sqliteTable(
  'pair_readings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    personASolarDate: text('person_a_solar_date').notNull(),
    personATimeIndex: integer('person_a_time_index').notNull(),
    personAGender: text('person_a_gender').notNull(),
    personAName: text('person_a_name'),
    personBSolarDate: text('person_b_solar_date').notNull(),
    personBTimeIndex: integer('person_b_time_index').notNull(),
    personBGender: text('person_b_gender').notNull(),
    personBName: text('person_b_name'),
    // ── personB 生辰精度 (BT.2, ADR-0014): resonance bond 的对方原始盘, 仅服务端可读 (隐私 D2) ──
    /** personB 出生经度 (东经为正) */
    personBLongitude: text('person_b_longitude'),
    /** personB 出生纬度 (北纬为正) */
    personBLatitude: text('person_b_latitude'),
    /** personB 出生地 IANA 时区 ID (e.g. Asia/Shanghai) */
    personBTimezoneId: text('person_b_timezone_id'),
    /** personB 录入历法 — solar (阳历) | lunar (农历) */
    personBCalendarType: text('person_b_calendar_type'),
    /** personB 原始农历日期 (仅 lunar 录入时记录, 格式 "YYYY-M-D") */
    personBLunarDate: text('person_b_lunar_date'),
    /** personB 农历闰月标记 (1=闰月, 0=非闰月) */
    personBIsLeapMonth: integer('person_b_is_leap_month', { mode: 'boolean' }).default(false),
    score: integer('score').notNull(),
    grade: text('grade').notNull(),
    /** 关系原型名称 (e.g. "镜中人", "Hunt & Chase") */
    archetypeName: text('archetype_name'),
    /** 关系原型一句话标语 */
    archetypeTagline: text('archetype_tagline'),
    /** 原型分类: harmony | tension | growth | karmic | volatile */
    archetypeCategory: text('archetype_category', {
      enum: ['harmony', 'tension', 'growth', 'karmic', 'volatile'],
    }),
    /** B 免费可见的维度 (Curiosity Gap 钩子): long_term | communication | attraction | emotional */
    hookDimension: text('hook_dimension', {
      enum: ['long_term', 'communication', 'attraction', 'emotional'],
    }),
    /** 关系类型 — 与 iOS bond-create 8 选项对应，影响 svc-astro 解读基调与原型词库 */
    relationshipCategory: text('relationship_category', {
      enum: ['spouse', 'partner', 'parent', 'child', 'sibling', 'friend', 'colleague', 'boss'],
    }),
    /** 用于展示的自定义关系描述（用户选 custom 时的自由文本，作为 AI prompt 补充语境） */
    customRelationshipLabel: text('custom_relationship_label'),
    compatibilityData: text('compatibility_data').notNull(),
    interpretation: text('interpretation').notNull(),
    /** 双方紫微时序摘要 (JSON.stringify(ZiweiSummary))，供 timeline / what-if 复用，
     *  无需重算 iztro。可空 (旧报告 / 排盘失败)。star→宫 映射即足够印证流年/流月。 */
    ziweiSummaryA: text('ziwei_summary_a'),
    ziweiSummaryB: text('ziwei_summary_b'),
    /** Whether THIS row's owner (userId) is personA (甲, the inviter) in the prose.
     *  Stamped at creation, so the report renders the right "you" even if the viewer
     *  later edits their birth. null on legacy rows → the read path falls back to
     *  birth-matching. Resonance writes two rows: inviter=true, responder=false. */
    ownerIsPersonA: integer('owner_is_person_a', { mode: 'boolean' }),
    bookmarked: integer('bookmarked', { mode: 'boolean' }).default(false).notNull(),
    rating: integer('rating'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('pair_user_created_idx').on(t.userId, t.createdAt),
    unique('pair_combo_uniq').on(
      t.userId,
      t.personASolarDate,
      t.personATimeIndex,
      t.personBSolarDate,
      t.personBTimeIndex
    ),
  ]
)

// ==================== 合盘年度运势预测 ====================

/** 合盘年度运势预测记录 — 基于已有合盘数据生成特定年份运势 */
export const pairAnnualForecasts = sqliteTable(
  'pair_annual_forecasts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    pairReadingId: text('pair_reading_id')
      .notNull()
      .references(() => pairReadings.id),
    queryYear: integer('query_year').notNull(),
    interpretation: text('interpretation').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('paf_pair_year_uniq').on(t.pairReadingId, t.queryYear),
    index('paf_user_idx').on(t.userId),
    index('paf_pair_reading_idx').on(t.pairReadingId),
  ]
)

// ==================== 风水堪舆 ====================

/** 风水分析记录 */
export const analyses = sqliteTable(
  'analyses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** Portfolio satellite key (hexastral = flagship app) */
    targetApp: text('target_app').notNull().default('hexastral'),
    analysisType: text('analysis_type', {
      enum: ['eight-house', 'flying-star', 'combined'],
    }).notNull(),
    facingDirection: text('facing_direction').notNull(),
    birthYear: integer('birth_year'),
    gender: text('gender'),
    constructionPeriod: integer('construction_period'),
    label: text('label'),
    eightHouseData: text('eight_house_data'),
    flyingStarData: text('flying_star_data'),
    interpretation: text('interpretation'),
    bookmarked: integer('bookmarked', { mode: 'boolean' }).default(false).notNull(),
    rating: integer('rating'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('analyses_user_created_idx').on(t.userId, t.createdAt),
    index('analyses_target_app_user_idx').on(t.targetApp, t.userId),
  ]
)

/** 面相/手相解读记录 */
export const physiognomyReadings = sqliteTable(
  'physiognomy_readings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    targetApp: text('target_app').notNull().default('hexastral'),
    type: text('type', { enum: ['face', 'palm'] }).notNull(),
    vlmDescription: text('vlm_description'),
    interpretation: text('interpretation'),
    bookmarked: integer('bookmarked', { mode: 'boolean' }).default(false).notNull(),
    rating: integer('rating'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('physiognomy_user_created_idx').on(t.userId, t.createdAt),
    index('physiognomy_target_app_user_idx').on(t.targetApp, t.userId),
  ]
)

// ==================== 易经占卜 ====================

/** 占卜历史记录 */
export const divinations = sqliteTable(
  'divinations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    targetApp: text('target_app').notNull().default('hexastral'),
    question: text('question').notNull(),
    hexagramNumber: integer('hexagram_number').notNull(),
    hexagramName: text('hexagram_name').notNull(),
    changingLines: text('changing_lines').notNull().default('[]'),
    interpretation: text('interpretation').notNull(),
    advice: text('advice').notNull(),
    summary: text('summary').notNull(),
    fortune: text('fortune', {
      enum: ['great-fortune', 'fortune', 'neutral', 'caution', 'misfortune'],
    }).notNull(),
    method: text('method', { enum: ['liuyao', 'meihua'] })
      .notNull()
      .default('liuyao'),
    entropySource: text('entropy_source'),
    bookmarked: integer('bookmarked', { mode: 'boolean' }).notNull().default(false),
    rating: integer('rating'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('divinations_user_created_idx').on(t.userId, t.createdAt),
    index('divinations_target_app_user_idx').on(t.targetApp, t.userId),
  ]
)

// ==================== 单次 IAP 购买记录 ====================

/**
 * 单次购买记录 — 非 Pro 用户（或 Pro 用户配额耗尽时）的单次解锁
 *
 * 生命周期:
 *   purchased → consumed: 占卜类（起卦完成时核销 consumedAt + readingId）
 *   purchased → consumed: 命理类（生成报告后核销，但报告永久可回看）
 *   purchased → refunded: RevenueCat 触发退款事件时更新
 *
 * 幂等键: rcEventId (RevenueCat S2S event.id) — UNIQUE
 */
export const singlePurchases = sqliteTable(
  'single_purchases',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** SKU 标识符 — 与 iOS sku-catalog.ts 中的 SkuId 对应 (year_ahead 已合并入 fate_reading，保留用于历史数据兼容) */
    skuId: text('sku_id', {
      enum: ['cast', 'fate_reading', 'year_ahead', 'compatibility', 'feng_analysis'],
    }).notNull(),
    /** RevenueCat S2S event.id — 用于幂等去重（UNIQUE） */
    rcEventId: text('rc_event_id').unique().notNull(),
    /** RevenueCat product_id */
    productId: text('product_id').notNull(),
    /** 购买状态 */
    status: text('status', { enum: ['purchased', 'consumed', 'refunded'] })
      .notNull()
      .default('purchased'),
    /** 消耗后关联到具体 reading 表的记录 ID */
    readingId: text('reading_id'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    /** 消耗时间戳（占卜起卦完成 / 命理报告生成后写入） */
    consumedAt: text('consumed_at'),
  },
  (t) => [
    index('sp_user_sku_status_idx').on(t.userId, t.skuId, t.status),
    index('sp_user_created_idx').on(t.userId, t.createdAt),
  ]
)

// ==================== 共用 ====================

/** 每日活跃记录 — 统一所有术数 */
export const dailyActivity = sqliteTable(
  'daily_activity',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    targetApp: text('target_app').notNull().default('hexastral'),
    date: text('date').notNull(),
    readingCount: integer('reading_count').default(0).notNull(),
    analysisCount: integer('analysis_count').default(0).notNull(),
    divinationCount: integer('divination_count').default(0).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('da_user_date_app_uniq').on(t.userId, t.date, t.targetApp),
    index('da_user_date_idx').on(t.userId, t.date),
    index('da_target_app_user_idx').on(t.targetApp, t.userId),
  ]
)

// ==================== 面相特征存储 ====================

/**
 * 用户面相特征预处理记录
 *
 * 隐私架构:
 *   1. iOS 直传照片至 Cloudflare R2（临时 URL，15min 有效）
 *   2. svc-ai Worker 拿到 URL，调用 Gemini 3.1 Pro Vision 提取结构化面部特征 JSON
 *   3. 特征 JSON 入库（本表），R2 原图立即删除
 *   4. 后续合参报告直接读取本表 featuresJson，无需用户再次上传
 *
 * 存储的不是照片，而是面部相学特征向量（如额头宽窄、眉型、法令纹深浅），
 * 与命格/星宫盘的数值化处理方式完全对等，不涉及生物特征 PII。
 */
export const userPhysiognomyFeatures = sqliteTable(
  'user_physiognomy_features',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 特征类型: face=面相, palm=手相 */
    type: text('type', { enum: ['face', 'palm'] })
      .notNull()
      .default('face'),
    /** VLM 提取的结构化面相/手相特征 (JSON) */
    featuresJson: text('features_json').notNull(),
    /** 原始 VLM 描述（文字段落，供前端展示/调试用） */
    vlmNarrative: text('vlm_narrative'),
    /** 提取时使用的模型（gemini-2.5-pro-preview 等） */
    extractionModel: text('extraction_model').notNull(),
    /** R2 原图已删除 */
    imageDeleted: integer('image_deleted', { mode: 'boolean' }).default(false).notNull(),
    /** 用户告知并同意的隐私描述版本 */
    privacyConsentVersion: text('privacy_consent_version').notNull().default('v1'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('upf_user_created_idx').on(t.userId, t.createdAt),
    index('upf_user_model_idx').on(t.userId, t.extractionModel),
  ]
)

// (comprehensiveFateReports table removed in deep refactor — replaced by reportChapters above)

// ==================== 命盘缓存 ====================

/**
 * 用户命盘缓存 — 计算一次，永久有效
 *
 * 星宫盘和命格盘是出生时间的确定性函数，相同输入永远产出相同结果。
 * 缓存命盘避免重复计算，仅当用户修改出生信息时失效并重新计算。
 *
 * 唯一键: (userId, chartType)
 *   - 每个用户每种命盘类型只有一条缓存记录
 *   - 用户修改出生信息时 → 更新 inputHash + chartData + interpretation
 *
 * inputHash = SHA-256(solarDate|timeIndex|gender|longitude|timezoneId)
 *   - 用于检测输入是否变化，变化则触发重新计算
 */
export const userCharts = sqliteTable(
  'user_charts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 命盘类型: stellar=星宫, natal=命格, fate=合盘（星宫+命格联合缓存） */
    chartType: text('chart_type', { enum: ['stellar', 'natal', 'fate'] }).notNull(),
    /** 输入参数哈希 SHA-256(solarDate|timeIndex|gender|longitude|timezoneId) */
    inputHash: text('input_hash').notNull(),

    // ── 原始输入 ──
    solarDate: text('solar_date').notNull(),
    timeIndex: integer('time_index').notNull(),
    gender: text('gender').notNull(),
    city: text('city'),
    longitude: text('longitude'),
    latitude: text('latitude'),
    timezoneId: text('timezone_id'),

    // ── 缓存的命盘数据 ──
    /** 完整命盘结构 (JSON) — 星宫: palaces+meta / 命格: pillars+geju+daYun+shenSha */
    chartData: text('chart_data').notNull(),
    /** AI 解读 (JSON) — 基础解读 (free tier) */
    interpretationFree: text('interpretation_free'),
    /** AI 解读 (JSON) — Pro 解读 (pro tier, 更详尽) */
    interpretationPro: text('interpretation_pro'),
    /** AI 解读使用的语言 (BCP-47); UI locale 不匹配时提醒用户可重生 */
    interpretationLang: text('interpretation_lang'),

    // ── 用户操作 ──
    bookmarked: integer('bookmarked', { mode: 'boolean' }).default(false).notNull(),
    rating: integer('rating'),
    /** 命盘卡片速览元数据 (JSON) — stellar: {fiveElementsClass,soulPalaceMajorStars} / natal: {dayMaster,gejuPrimary,favorableElement,tiaohouGods} */
    displayHints: text('display_hints'),

    // ── 元数据 ──
    /** 计算引擎版本 (iztro/astro-core), 升级时可批量重算 */
    engineVersion: text('engine_version').notNull(),
    /** 命盘首次计算时间 */
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    /** 最近一次更新（出生信息变更或引擎升级重算） */
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('uc_user_chart_type_uniq').on(t.userId, t.chartType),
    index('uc_user_idx').on(t.userId),
  ]
)

// ==================== 全局命盘解读缓存 ====================

/**
 * 跨用户命盘解读缓存 — 相同命格/星宫盘 = 相同 AI 解读
 *
 * 核心洞察: 命格盘和星宫盘是出生时间的确定性函数。
 * 如果 SHA-256(solarDate|timeIndex|gender|longitude|timezoneId) 相同，
 * 两个不同用户的命理解读完全一致，无需重复调用 Gemini。
 *
 * 与 per-user 的 userCharts 表互补:
 *   - userCharts: 每个用户一条缓存，保留个人历史
 *   - globalChartInterpretations: 全局唯一，消除跨用户重复 LLM 调用
 *
 * 缓存失效: engineVersion 字段控制。Prompt 升级时递增版本号，旧版不命中。
 */
export const globalChartInterpretations = sqliteTable(
  'global_chart_interpretations',
  {
    id: text('id').primaryKey(),
    /** SHA-256(solarDate|timeIndex|gender|longitude|timezoneId) */
    inputHash: text('input_hash').notNull(),
    /** 命盘类型: stellar | natal */
    chartType: text('chart_type', { enum: ['stellar', 'natal'] }).notNull(),
    /** 排盘结构数据 (JSON) */
    chartData: text('chart_data').notNull(),
    /** PLG Hook 文案 (JSON) — 所有用户可见 */
    hooks: text('hooks'),
    /** 完整 AI 解读 (JSON) — Pro 用户可见 */
    fullReading: text('full_reading'),
    /** 计算引擎版本 — 用于 prompt 升级后缓存失效 */
    engineVersion: text('engine_version').notNull(),
    /** 命中次数 — 评估节省多少 LLM 调用 */
    hitCount: integer('hit_count').default(0).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('gci_hash_type_version_uniq').on(t.inputHash, t.chartType, t.engineVersion),
    index('gci_hash_type_idx').on(t.inputHash, t.chartType),
  ]
)

// ==================== 报告分享链接 ====================

/**
 * 用户分享的报告快照
 *
 * 分享链接格式: hexastral.com/report/:id
 * 内容快照存在本表，与原始报告表解耦（即使报告被删也能访问分享页）
 *
 * 分享的是 AI 解读文字报告（命理/占卜/风水），不是命盘结构数据。
 * 命盘结构数据通过 chartPublic + /u/:username 公开。
 */
export const sharedReports = sqliteTable(
  'shared_reports',
  {
    /** 12 位 alphanumeric 随机 ID — URL slug */
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 报告类型 */
    reportType: text('report_type', {
      enum: [
        'stellar',
        'natal',
        'fengshui',
        'yiching',
        'fate',
        'physiognomy',
        'pair',
        'numerology',
        'feng',
        'cycle',
      ],
    }).notNull(),
    /** 原始报告表中的记录 ID（仅用于溯源，可能已被用户删除） */
    reportId: text('report_id').notNull(),
    /** 标题提示，如 "甲子年 · 子时 · 男" 或 "问：今年升职运势" */
    titleHint: text('title_hint'),
    /** 报告内容快照 (JSON 字符串) — 生成时保存，独立于原始记录 */
    contentJson: text('content_json').notNull(),
    /** 访问计数 */
    viewCount: integer('view_count').default(0).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    /** 可选过期时间 (ISO 8601)，null 表示永不过期 */
    expiresAt: text('expires_at'),
    /** 可见性: public=公开访问, private=仅创建者可见 */
    visibility: text('visibility', { enum: ['public', 'private'] })
      .default('private')
      .notNull(),
  },
  (t) => [index('sr_user_created_idx').on(t.userId, t.createdAt)]
)

// ==================== 每日 Almanac (deterministic, 0-LLM) ====================

/**
 * Daily almanac — generated by svc-signal cron for ALL users; drives the daily push.
 *
 * 0-LLM: derived purely from wuxing relations + classical 通胜/玉匣记 rules,
 * combining the user's static traits (users.dayMasterStem etc.) with today's ganzhi.
 * Push payload contains only this row's `headline`; tapping the deep link opens the
 * app where lazy LLM signal "colors in" on top of this almanac scaffold.
 */
export const dailyAlmanac = sqliteTable(
  'daily_almanac',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** Date YYYY-MM-DD in user's local timezone */
    date: text('date').notNull(),
    /** Wuxing relation — 'sheng' (生我) | 'ke' (克我) | 'tongqi' (同气) | 'wosheng' (我生) | 'woke' (我克') */
    relation: text('relation').notNull(),
    /** Energy band — 'rising' | 'stable' | 'low' */
    energyLevel: text('energy_level').notNull(),
    /** Push headline (locale-rendered, picked from template library) */
    headline: text('headline').notNull(),
    /** Today's focal point (short sentence) */
    todayLens: text('today_lens').notNull(),
    /** Today's caution */
    watchFor: text('watch_for').notNull(),
    /** Lucky hour band, e.g. '10-12' */
    luckyHour: text('lucky_hour'),
    /** Lucky direction (locale-rendered) */
    luckyDirection: text('lucky_direction'),
    /** Lucky color (locale-rendered) */
    luckyColor: text('lucky_color'),
    /** Locale */
    locale: text('locale').notNull(),
    /** Push notification id — for push→IAP attribution tracking (optional) */
    notificationId: text('notification_id'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('dalm_user_date_uniq').on(t.userId, t.date),
    index('dalm_user_date_idx').on(t.userId, t.date),
  ]
)

// ==================== Daily Signal (LLM-generated, lazy on open, append-only) ====================

/**
 * Daily signal — lazy on app open, generated by Gemini 2.5 Flash Lite,
 * eats today's daily_almanac row as scaffold so in-app text agrees with the push headline.
 *
 * Append-only versioning: same (user, date) may have multiple rows due to prompt/model
 * upgrades; is_current=1 marks the active one. History versions feed the Pro
 * HistoryDrawer and broader quality validation.
 */
export const dailySignals = sqliteTable(
  'daily_signals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** Signal date YYYY-MM-DD (user local tz) */
    date: text('date').notNull(),
    /** Chart fingerprint */
    chartHash: text('chart_hash').notNull(),
    /** LLM structured JSON output (headline, energy, today_lens, watch_for, lucky, reasoning_chain) */
    contentJson: text('content_json').notNull(),
    locale: text('locale').notNull(),
    explanationMode: text('explanation_mode').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    isCurrent: integer('is_current', { mode: 'boolean' }).default(true).notNull(),
    generatedAt: text('generated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('ds_user_date_current_idx').on(t.userId, t.date, t.isCurrent),
    index('ds_user_date_generated_idx').on(t.userId, t.date, t.generatedAt),
  ]
)

// ==================== 关系图谱（Kindred·Bonds） ====================

/**
 * 用户关系绑定 — 双模式: Solo (默念) + Resonance (共振)
 *
 * Solo 模式:
 *   A 知道 B 的生辰 → 输入数据 → 仪式感扣币 → 私密合盘，B 不知情
 *   适合: A 已掌握对方生辰且不方便/不想通知对方的场景
 *   隐私: 结果仅 A 可见，bond 单向
 *
 * Resonance 模式:
 *   A 发邮件邀请 → B 在落地页输入生辰 → 双向 bond + reading
 *   适合: A 不知 B 时辰 / 想社交裂变 / 尊重玄学"不诚不测"伦理
 *   隐私: B 的精确生辰不暴露给 A（只返回合盘结论）
 *   增长: B 免费获得简报 → 转化为新用户（Viral Loop）
 *
 * Bond limits: Free ≤ 20, Pro/Premium = unlimited
 */
export const userBonds = sqliteTable(
  'user_bonds',
  {
    id: text('id').primaryKey(),
    /** 创建此关系的用户 */
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),
    /** 对方用户 ID — nullable（solo 模式或 resonance 对方尚未注册时为 null） */
    targetUserId: text('target_user_id').references(() => users.id),
    /** 对方显示名称（用户自定义，如 "老婆"、"Dad"） */
    targetName: text('target_name').notNull(),
    /** 关系标签 — 预设 + 自定义: '配偶', '情侣', '父母', '子女', '朋友', '同事', '上下级' 等 */
    relationshipLabel: text('relationship_label').notNull(),
    /** 合盘模式: solo=默念(A私有), resonance=共振(双向) */
    mode: text('mode', { enum: ['solo', 'resonance'] })
      .default('solo')
      .notNull(),
    /** 关联的合婚报告 */
    hehunReadingId: text('hehun_reading_id').references(() => pairReadings.id),
    /** 关联的 bond_invitations 记录 (仅 resonance 模式) */
    invitationId: text('invitation_id'),
    /** 镜像 bond ID — resonance 模式下 B 的对应 bond 指向 A 的 bond (双向关联) */
    mirrorBondId: text('mirror_bond_id'),

    // ── Solo 模式: A 输入的 B 的生辰信息 ──
    /** 对方出生日期 (公历 YYYY-M-D) — solo 模式由 A 填入 */
    targetBirthSolarDate: text('target_birth_solar_date'),
    /** 对方时辰 0-12 */
    targetBirthTimeIndex: integer('target_birth_time_index'),
    /** 对方性别 */
    targetBirthGender: text('target_birth_gender'),
    /** 对方出生城市 */
    targetBirthCity: text('target_birth_city'),
    // ── 生辰精度 (BT.2, ADR-0014): 与 users 本我列对齐, 为关系流月/流日级时间轴预留真太阳时 ──
    /** 对方出生经度 (东经为正) */
    targetBirthLongitude: text('target_birth_longitude'),
    /** 对方出生纬度 (北纬为正) */
    targetBirthLatitude: text('target_birth_latitude'),
    /** 对方出生地 IANA 时区 ID (e.g. Asia/Shanghai) */
    targetBirthTimezoneId: text('target_birth_timezone_id'),
    /** 对方录入历法 — solar (阳历) | lunar (农历) */
    targetBirthCalendarType: text('target_birth_calendar_type'),
    /** 对方原始农历日期 (仅 lunar 录入时记录, 格式 "YYYY-M-D") */
    targetBirthLunarDate: text('target_birth_lunar_date'),
    /** 对方农历闰月标记 (1=闰月, 0=非闰月) */
    targetBirthIsLeapMonth: integer('target_birth_is_leap_month', { mode: 'boolean' }).default(
      false
    ),

    /** @deprecated 对方手机号哈希 — 已废弃，新 bond 不再写入 */
    targetPhoneHash: text('target_phone_hash'),

    /** 已解锁的维度 JSON 数组 (e.g. ["soulmate_score","conflict_map"]) — Pro 功能 */
    unlockedDimensions: text('unlocked_dimensions'),
    /**
     * 是否已解锁全部六章深度合盘。solo 创建时 A 已付 compatibility，故置 true；
     * 免费 resonance bond 默认 false，经单次购买 (POST /:id/unlock) 翻转。订阅 /
     * 邀请解锁走全局信号 (capability / users.unlockedChapterCount)，不依赖此列。
     */
    chaptersUnlocked: integer('chapters_unlocked', { mode: 'boolean' }).default(false).notNull(),
    /** 是否已分享给对方（用于 Resonance 模式社交裂变） */
    sharedByOwner: integer('shared_by_owner', { mode: 'boolean' }).default(false).notNull(),

    /** 感情阶段 — crush | dating | committed | engaged | married | ex */
    relationshipStage: text('relationship_stage').default('crush'),

    /** 状态 */
    status: text('status', {
      enum: ['active', 'pending_invite', 'declined', 'expired', 'removed'],
    })
      .default('active')
      .notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('ub_owner_idx').on(t.ownerId),
    index('ub_owner_status_mode_idx').on(t.ownerId, t.status, t.mode),
    index('ub_target_idx').on(t.targetUserId),
    index('ub_invitation_idx').on(t.invitationId),
  ]
)

// ==================== 关系推送队列（Kindred Push Queue） ====================

/**
 * Pre-generated relationship push 语料, harvested from the LLM moments that already
 * run for a Thread (合盘报告 / timeline / what-if). A cheap deterministic cron later
 * sends the right line on a matching day — NO per-day LLM (ADR-0025).
 *
 *   - kind='conditional' → fires when the day's calculateDailySynastry().status
 *     equals `triggerKind` (e.g. 'resonance' on a high-契合 day).
 *   - kind='dated'       → fires on `fireOn` (anniversaries, transit dates).
 *
 * `bondId` may be null when harvested from a raw /pair compute that precedes bond
 * creation; the cron resolves the Thread via `sourceReadingId` (userBonds.hehunReadingId).
 */
export const kindredPushQueue = sqliteTable(
  'kindred_push_queue',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bondId: text('bond_id').references(() => userBonds.id, { onDelete: 'cascade' }),
    sourceReadingId: text('source_reading_id').references(() => pairReadings.id, {
      onDelete: 'set null',
    }),
    locale: text('locale').notNull().default('zh-CN'),
    kind: text('kind', { enum: ['conditional', 'dated'] })
      .notNull()
      .default('conditional'),
    /** kind='conditional': matches calculateDailySynastry().status — 'resonance' | 'tension' | 'neutral'. */
    triggerKind: text('trigger_kind'),
    /** kind='dated': YYYY-MM-DD the snippet should fire on. */
    fireOn: text('fire_on'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    source: text('source', {
      enum: ['report', 'timeline', 'whatif', 'planner', 'template'],
    })
      .notNull()
      .default('report'),
    status: text('status', { enum: ['queued', 'sent', 'expired'] })
      .notNull()
      .default('queued'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    sentAt: text('sent_at'),
  },
  (t) => [
    index('kpq_user_status_idx').on(t.userId, t.status),
    index('kpq_bond_idx').on(t.bondId),
    index('kpq_fireon_idx').on(t.fireOn),
  ]
)

// ==================== 共振邀请（Resonance Invitations） ====================

/**
 * Bond 共振邀请 — email consent + coin escrow
 *
 * 流程:
 *   1. A 发起共振: 预扣 1000 coins → 创建 invitation + bond(pending_invite)
 *   2. 系统发邮件给 B，含高熵 token 链接 → hexastral.com/resonate/{token}
 *   3. B 点击链接 → 输入生辰 → 系统生成合盘 → 双向 bond 生效
 *   4. 若 B 拒绝 / 7 天未响应 → 自动退币给 A
 *
 * 隐私: B 的生辰命格不暴露给 A，仅返回合盘结论 (score/grade/dimensions)
 * 安全: token 为 nanoid(32)，高熵防猜测；过期自动清理
 */
export const bondInvitations = sqliteTable(
  'bond_invitations',
  {
    id: text('id').primaryKey(),
    /** 关联的 bond 记录 (A 的 bond) */
    bondId: text('bond_id')
      .notNull()
      .references(() => userBonds.id),
    /** 发起人 */
    inviterUserId: text('inviter_user_id')
      .notNull()
      .references(() => users.id),
    /** 被邀请人邮箱 */
    targetEmail: text('target_email').notNull(),
    /** 高熵 URL token (nanoid(32)) */
    token: text('token').notNull().unique(),
    /** 邀请状态 */
    status: text('status', {
      enum: ['pending', 'accepted', 'declined', 'expired'],
    })
      .default('pending')
      .notNull(),
    /** A 的自定义留言 */
    message: text('message'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    /** 过期时间 (创建 +7 天) */
    expiresAt: text('expires_at').notNull(),
    /** B 响应时间 */
    respondedAt: text('responded_at'),
  },
  (t) => [
    index('bi_token_idx').on(t.token),
    index('bi_inviter_idx').on(t.inviterUserId),
    index('bi_target_email_status_idx').on(t.targetEmail, t.status),
    index('bi_expires_status_idx').on(t.expiresAt, t.status),
  ]
)

/**
 * Chapter-unlock invitations — A invites B by email so A unlocks the next
 * chapter when B downloads the app and confirms their email. Independent of
 * `bondInvitations` (合婚) because:
 *   - There is no bond record to attach to.
 *   - Redemption fires on email confirm, not on a target-click flow.
 *   - Each invite credits exactly one chapter to the inviter (clamped to the
 *     unlock cap — see lib/chapter-access.ts).
 *
 * Indexed on `(target_email, status)` so the email-confirm route can scan
 * pending invites in O(log n) when a new email is bound.
 */
export const chapterUnlockInvitations = sqliteTable(
  'chapter_unlock_invitations',
  {
    id: text('id').primaryKey(),
    inviterUserId: text('inviter_user_id')
      .notNull()
      .references(() => users.id),
    /** Lowercased + trimmed at insert. Match against the same on email-confirm. */
    targetEmail: text('target_email').notNull(),
    /** High-entropy URL token (nanoid(32)) — embedded in the invite email link. */
    token: text('token').notNull().unique(),
    status: text('status', { enum: ['pending', 'redeemed', 'expired'] })
      .default('pending')
      .notNull(),
    /** Optional inviter message included in the email body. */
    message: text('message'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    /** 7-day TTL by default; expired rows are reaped lazily. */
    expiresAt: text('expires_at').notNull(),
    redeemedAt: text('redeemed_at'),
    /** B's userId once they bind the matching email — null while pending. */
    redeemedByUserId: text('redeemed_by_user_id').references(() => users.id),
  },
  (t) => [
    index('cui_inviter_idx').on(t.inviterUserId),
    index('cui_target_email_status_idx').on(t.targetEmail, t.status),
    index('cui_token_idx').on(t.token),
    index('cui_expires_status_idx').on(t.expiresAt, t.status),
  ]
)

/** Viral credits: each successful resonance invite grants both sides one free credit. */
export const bondInviteCredits = sqliteTable(
  'bond_invite_credits',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    inviteId: text('invite_id')
      .notNull()
      .references(() => bondInvitations.id),
    earnedFrom: text('earned_from', { enum: ['invite_sent', 'invite_received'] }).notNull(),
    consumed: integer('consumed', { mode: 'boolean' }).default(false).notNull(),
    consumedAt: text('consumed_at'),
    consumedReadingId: text('consumed_reading_id'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('bic_user_consumed_idx').on(t.userId, t.consumed),
    unique('bic_invite_earned_uniq').on(t.inviteId, t.earnedFrom),
  ]
)

// ==================== 通讯录哈希 ====================

/** 联系人手机号哈希 — 用于"熟人已加入"通知匹配 */
export const contactHashes = sqliteTable(
  'contact_hashes',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    phoneHash: text('phone_hash').notNull(),
    uploadedAt: text('uploaded_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('ch_user_hash_uniq').on(t.userId, t.phoneHash),
    index('ch_phone_hash_idx').on(t.phoneHash),
  ]
)

// ==================== 推送令牌 ====================

/** 设备推送令牌 — PK 为 Expo Push Token (支持多设备) */
export const pushTokens = sqliteTable(
  'push_tokens',
  {
    /** Expo Push Token (ExponentPushToken[xxx]) */
    token: text('token').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 设备平台 */
    platform: text('platform', { enum: ['ios', 'android'] })
      .default('ios')
      .notNull(),
    /** IANA 时区 (用于按时区分批推送) */
    timezoneId: text('timezone_id').notNull(),
    /** 令牌最后一次活跃时间 (心跳更新) */
    lastActiveAt: text('last_active_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index('pt_user_idx').on(t.userId), index('pt_timezone_idx').on(t.timezoneId)]
)

// ==================== 推送转化归因 ====================

/**
 * 通知转化归因 — 记录推送通知 → IAP 购买链路
 * svc-signal/svc-notify 生成 notificationId → iOS 推送 → 用户购买后回写此表
 */
export const notificationAttributions = sqliteTable(
  'notification_attributions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 生成的 UUID，与推送 payload 中的 notificationId 对应 */
    notificationId: text('notification_id').notNull(),
    /** RevenueCat product_id e.g. hexastral_fate_reading */
    productId: text('product_id').notNull(),
    /** 业务 SKU e.g. fate_reading | divination | compatibility | pro_annual */
    skuId: text('sku_id').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index('na_user_idx').on(t.userId), index('na_notification_idx').on(t.notificationId)]
)

// ==================== make-if 人生分支 (Auspice — user-created forks) ====================

/**
 * make-if forks — the user's interactive "假如人生" branches (Auspice Pro). Each
 * row is a 大运 node the user tapped + an event they chose; the LLM narrative is
 * stored so the sandbox survives an app restart (it was in-memory only). Scoped by
 * `owner` = userId when signed in, else `device:<deviceId>` (Pro users sign in at
 * the paywall; dev/anon falls back to device). Profile columns let the list filter
 * to the current birth profile. PK (owner, id) → re-saving the same fork upserts.
 */
export const makeifForks = sqliteTable(
  'makeif_forks',
  {
    owner: text('owner').notNull(),
    /** Client branch id — deterministic from event + age. */
    id: text('id').notNull(),
    birthDate: text('birth_date').notNull(),
    birthHour: integer('birth_hour').notNull(),
    gender: text('gender').notNull(),
    event: text('event').notNull(),
    label: text('label').notNull(),
    divergeAtAge: integer('diverge_at_age').notNull(),
    /** null = the branch runs to the end (no rejoin). */
    mergeAtAge: integer('merge_at_age'),
    isPast: integer('is_past', { mode: 'boolean' }).notNull().default(false),
    realPillar: text('real_pillar'),
    narrative: text('narrative').notNull(),
    locale: text('locale').notNull().default('en'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    primaryKey({ columns: [t.owner, t.id] }),
    index('makeif_forks_owner_profile_idx').on(t.owner, t.birthDate, t.birthHour, t.gender),
  ]
)

/**
 * Timeline per-node deep-read cache (落库) — the durable store BOTH the in-app Pro
 * reading AND the cron push (流月/流年/大运 node notifications — the #1 paid hook)
 * draw from. Generate-once: whichever surfaces a period first (an in-app open or
 * the cron) runs the LLM via svc-astro and persists here; the other reuses it.
 * Inputs are deterministic (chart + period), so a reading never changes → cached
 * FOREVER (no TTL), which bounds total LLM spend to "periods actually surfaced"
 * and is exactly why 落库 (not KV-24h) is mandatory.
 *
 * `owner` = `device:<deviceId>` (anon) or `user:<userId>`, matching makeif_forks.
 * Chart inputs are stored + indexed so a birth change misses + regenerates; the
 * endpoint upserts on the deterministic period `id`. See
 * docs/timeline-deep-read-plan.md.
 */
export const timelineReadings = sqliteTable(
  'timeline_readings',
  {
    owner: text('owner').notNull(),
    /** Deterministic period id within a chart: `${nodeType}:${year}:${month}:${locale}`. */
    id: text('id').notNull(),
    birthDate: text('birth_date').notNull(),
    birthHour: integer('birth_hour').notNull(),
    gender: text('gender').notNull(),
    /** '大运' | '流年' | '流月'. */
    nodeType: text('node_type').notNull(),
    year: integer('year').notNull(),
    /** 1-12 for 流月; 0 for 流年/大运 (a node spans no single month). */
    month: integer('month').notNull().default(0),
    /** The cached LLM deep-read (the value both view + push render). */
    reading: text('reading').notNull(),
    /** Guard tier the read was generated at ('deep' = Pro). */
    tier: text('tier').notNull().default('standard'),
    locale: text('locale').notNull().default('en'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    primaryKey({ columns: [t.owner, t.id] }),
    index('timeline_readings_owner_profile_idx').on(t.owner, t.birthDate, t.birthHour, t.gender),
  ]
)

/**
 * 生日提醒 (birthday reminders) — server-backed store for the 亲友 birthdays that
 * drive reminder notifications. Auspice schedules these LOCALLY today (lib/push.ts,
 * from on-device AsyncStorage); this table is the authoritative store so the
 * free-tier cap (`FREE_BIRTHDAY_LIMIT`) is enforced server-side (not just locally),
 * birthdays survive a reinstall, and a future REMOTE birthday push has a data
 * source. Scoped by `owner` = `device:<deviceId>` (anon) or `user:<userId>`,
 * matching makeif_forks. `monthDay` (MM-DD, solar only) is denormalized so a
 * future "whose birthday is today" cron can index it; lunar rows resolve their
 * Gregorian date at query/schedule time (astro-core), so monthDay stays null.
 *
 * Cadence/source: one row per saved 亲友 — written on add/edit, read on schedule.
 * No generation, no LLM, tiny + static per user; the cap keeps it bounded for free.
 */
export const birthdayReminders = sqliteTable(
  'birthday_reminders',
  {
    owner: text('owner').notNull(),
    /** Client-generated stable id (matches the local AuspicePerson id). */
    id: text('id').notNull(),
    name: text('name').notNull(),
    /** YYYY-MM-DD — Gregorian when calendar='solar', else interpreted as 农历. */
    solarDate: text('solar_date').notNull(),
    /** 'solar' (default) | 'lunar'. */
    calendar: text('calendar').notNull().default('solar'),
    relation: text('relation'),
    /** Days before the birthday to remind (0 = none). */
    advanceDays: integer('advance_days').notNull().default(1),
    /** Also remind on the day itself. */
    remindOnDay: integer('remind_on_day', { mode: 'boolean' }).notNull().default(true),
    /** MM-DD for solar birthdays (cron index); null for lunar (resolved at runtime). */
    monthDay: text('month_day'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    primaryKey({ columns: [t.owner, t.id] }),
    index('birthday_reminders_owner_idx').on(t.owner),
    index('birthday_reminders_month_day_idx').on(t.monthDay),
  ]
)

/**
 * 真实服务端推送订阅 (Auspice remote-push subscribers).
 *
 * Auspice has been LOCAL-only (expo-notifications), which dries up if the app
 * isn't opened within the rolling window — unreliable for a daily habit. This
 * table registers a device for REAL server push: svc-notify's hourly cron finds
 * subscribers whose local time is a dispatch hour and sends an Expo push. The
 * body is computed server-side from `buildDay` (deterministic — 干支/宜忌 + the
 * 吉平凶 verdict from the birth profile); the LLM 对你而言 reading stays app-only.
 *
 * Anonymous + device-scoped (Auspice has no account): `deviceId` is the identity.
 * The birth profile is denormalized here so the cron can personalize without a
 * round-trip. Slot prefs are opt-OUT (default on); they mirror the local toggles
 * so a device runs EITHER server push (when registered) OR local — never both
 * (the app defers local daily once a token is registered). Indexed by timezone
 * for the cron's per-zone fan-out.
 */
export const auspicePushSubs = sqliteTable(
  'auspice_push_subs',
  {
    deviceId: text('device_id').primaryKey(),
    /** Expo push token (ExponentPushToken[...]). */
    token: text('token').notNull(),
    platform: text('platform').notNull().default('ios'),
    timezoneId: text('timezone_id').notNull(),
    locale: text('locale').notNull().default('zh'),
    /** Birth profile for the deterministic 对你而言 verdict (optional). */
    birthDate: text('birth_date'),
    /** 0-23, -1 = 时辰 unknown, null = no birth set. */
    birthHour: integer('birth_hour'),
    gender: text('gender'),
    /** Slot prefs — opt-out (true = enabled). */
    dailyMorning: integer('daily_morning', { mode: 'boolean' }).notNull().default(true),
    dailyEvening: integer('daily_evening', { mode: 'boolean' }).notNull().default(true),
    /** 生日提醒 (server-sent from birthday_reminders, morning slot). */
    birthdayOn: integer('birthday_on', { mode: 'boolean' }).notNull().default(true),
    /** 节假日/调休 heads-up (evening-before, CN schedule). */
    holidayOn: integer('holiday_on', { mode: 'boolean' }).notNull().default(true),
    /** 关系桥 nudge: "今日 你和 [亲友] 同气" on a resonance day (morning, rare). */
    relationshipOn: integer('relationship_on', { mode: 'boolean' }).notNull().default(true),
    /** 人生时间线 node push (流月 month-start / 流年 year-start / 大运 transition).
     *  Mirrors the client `timelineRemindToggle`; Pro-gated. The push is a
     *  deterministic personalized teaser → tap opens the in-app LLM deep-read. */
    timelineRemindOn: integer('timeline_remind_on', { mode: 'boolean' }).notNull().default(true),
    /** Last-known auspice_pro — gates the 对你而言 verdict line in the push body. */
    isPro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
    lastActiveAt: text('last_active_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index('auspice_push_subs_tz_idx').on(t.timezoneId)]
)

// ==================== Relations ====================

export const usersRelations = relations(users, ({ many }) => ({
  userCharts: many(userCharts),
  pairReadings: many(pairReadings),
  analyses: many(analyses),
  physiognomyReadings: many(physiognomyReadings),
  divinations: many(divinations),
  lifeEvents: many(lifeEvents),
  conversations: many(conversations),
  sharedReports: many(sharedReports),
  bondsAsOwner: many(userBonds, { relationName: 'bondOwner' }),
  bondsAsTarget: many(userBonds, { relationName: 'bondTarget' }),
  pushTokens: many(pushTokens),
  pairAnnualForecasts: many(pairAnnualForecasts),
  notificationAttributions: many(notificationAttributions),
  reportChapters: many(reportChapters),
  dailySignals: many(dailySignals),
  dailyAlmanac: many(dailyAlmanac),
}))

export const userChartsRelations = relations(userCharts, ({ one }) => ({
  user: one(users, { fields: [userCharts.userId], references: [users.id] }),
}))

export const reportChaptersRelations = relations(reportChapters, ({ one }) => ({
  user: one(users, { fields: [reportChapters.userId], references: [users.id] }),
}))

export const dailySignalsRelations = relations(dailySignals, ({ one }) => ({
  user: one(users, { fields: [dailySignals.userId], references: [users.id] }),
}))

export const dailyAlmanacRelations = relations(dailyAlmanac, ({ one }) => ({
  user: one(users, { fields: [dailyAlmanac.userId], references: [users.id] }),
}))

export const pairReadingsRelations = relations(pairReadings, ({ one, many }) => ({
  user: one(users, { fields: [pairReadings.userId], references: [users.id] }),
  annualForecasts: many(pairAnnualForecasts),
}))

export const pairAnnualForecastsRelations = relations(pairAnnualForecasts, ({ one }) => ({
  user: one(users, { fields: [pairAnnualForecasts.userId], references: [users.id] }),
  pairReading: one(pairReadings, {
    fields: [pairAnnualForecasts.pairReadingId],
    references: [pairReadings.id],
  }),
}))

export const userBondsRelations = relations(userBonds, ({ one, many }) => ({
  owner: one(users, {
    fields: [userBonds.ownerId],
    references: [users.id],
    relationName: 'bondOwner',
  }),
  target: one(users, {
    fields: [userBonds.targetUserId],
    references: [users.id],
    relationName: 'bondTarget',
  }),
  hehunReading: one(pairReadings, {
    fields: [userBonds.hehunReadingId],
    references: [pairReadings.id],
  }),
  invitations: many(bondInvitations),
}))

export const bondInvitationsRelations = relations(bondInvitations, ({ one }) => ({
  bond: one(userBonds, { fields: [bondInvitations.bondId], references: [userBonds.id] }),
}))

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, { fields: [pushTokens.userId], references: [users.id] }),
}))

export const notificationAttributionsRelations = relations(notificationAttributions, ({ one }) => ({
  user: one(users, { fields: [notificationAttributions.userId], references: [users.id] }),
}))

// ==================== 人生日志（Life Log） ====================

/**
 * 人生事件记录 — 用户标记的重要生命节点，供 AI 结合大运/流年解读
 */
export const lifeEvents = sqliteTable(
  'life_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 事件日期 (公历 YYYY-MM-DD) */
    eventDate: text('event_date').notNull(),
    /** 事件类型 — career | relationship | health | travel | education | family | other */
    eventType: text('event_type').notNull(),
    /** 标题 */
    title: text('title').notNull(),
    /** 详细描述（可选）*/
    description: text('description'),
    /** AI 命理解读（结合大运/流年生成）*/
    aiInterpretation: text('ai_interpretation'),
    /** 所处大运索引 (0-8)，由后端计算填入 */
    dayunIndex: integer('dayun_index'),
    /** 所处流年干支 (e.g. "甲子") */
    liunianGanZhi: text('liunian_ganzhi'),
    /** 印证时间 — 用户标记事件已验证 */
    verifiedAt: text('verified_at'),
    /** 印证标签 — 验 | 准 | 偏 */
    stampLabel: text('stamp_label'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('le_user_date_idx').on(t.userId, t.eventDate),
    index('le_user_type_idx').on(t.userId, t.eventType),
  ]
)

export const lifeEventsRelations = relations(lifeEvents, ({ one }) => ({
  user: one(users, { fields: [lifeEvents.userId], references: [users.id] }),
}))

// ==================== AI 对话（Reading Chat）====================

/**
 * 阅读后 AI 对话会话
 *
 * 每个阅读(reading)对应一个对话(conversation)，用于多轮追问。
 * Pro 用户无限次，非 Pro 用户每条消息消耗铜钱。
 */
export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    targetApp: text('target_app').notNull().default('hexastral'),
    /** 关联的阅读类型 */
    readingType: text('reading_type', {
      enum: [
        'fate',
        'natal',
        'stellar',
        'fengshui',
        'yiching',
        'pair',
        'physiognomy',
        'report',
        'numerology',
        'feng',
        'cycle',
      ],
    }).notNull(),
    /** 关联阅读记录的 ID（多态，指向对应表的主键） */
    readingId: text('reading_id').notNull(),
    /** 消息总数（冗余字段，便于快速统计） */
    messageCount: integer('message_count').default(0).notNull(),
    /**
     * Pro 用户本对话已使用的免费消息数。
     * 每次解读前 5 条对话对 Pro 用户免费（不计入月度配额池）。
     * 超出 5 条后从月度 chat 配额池扣减，再超出则按溢出价格收费。
     */
    freeMessagesUsed: integer('free_messages_used').default(0).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('conv_user_reading_app_uniq').on(t.userId, t.readingId, t.targetApp),
    index('conv_user_type_idx').on(t.userId, t.readingType),
    index('conv_target_app_user_idx').on(t.targetApp, t.userId),
  ]
)

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(conversationMessages),
}))

/** 对话消息 */
export const conversationMessages = sqliteTable(
  'conversation_messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),
    /** Denormalized from parent conversation for app-scoped queries */
    targetApp: text('target_app').notNull().default('hexastral'),
    /** 消息角色 */
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    /** 消息内容 */
    content: text('content').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('cm_conv_created_idx').on(t.conversationId, t.createdAt),
    index('cm_target_app_conv_idx').on(t.targetApp, t.conversationId),
  ]
)

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
}))

// ==================== 赠送阅读（Reading Gifts）====================

/**
 * 替他人生成阅读并通过邮件赠送
 *
 * Sender A 出资生成某类阅读（命格/星宫/命途/风水），
 * 填写接收方邮箱 → 系统发邮件通知 B。
 * B 下载 App 后绑定相同邮箱 → 自动领取。
 *
 * 30 天过期，过期未领取则状态变 expired。
 */
export const readingGifts = sqliteTable(
  'reading_gifts',
  {
    id: text('id').primaryKey(),
    /** 赠送方（付费&生成方） */
    senderUserId: text('sender_user_id')
      .notNull()
      .references(() => users.id),
    /** 接收方邮箱（lowercase） */
    recipientEmail: text('recipient_email').notNull(),
    /** 接收方注册后的 userId（领取后填入） */
    recipientUserId: text('recipient_user_id').references(() => users.id),
    /** 阅读类型 */
    readingType: text('reading_type', {
      enum: ['fate', 'natal', 'stellar', 'fengshui'],
    }).notNull(),
    /** 关联的阅读记录 ID（sender 名下的原始记录） */
    readingId: text('reading_id').notNull(),
    /** 赠送给的人名（可选，用于邮件展示） */
    recipientName: text('recipient_name'),
    /** 接收方性别（供邮件正文使用） */
    recipientGender: text('recipient_gender'),
    /** 接收方出生日期（公历 YYYY-MM-DD） */
    recipientBirthSolar: text('recipient_birth_solar'),
    /** 状态 */
    status: text('status', {
      enum: ['pending', 'claimed', 'expired'],
    })
      .default('pending')
      .notNull(),
    /** 领取时间 */
    claimedAt: text('claimed_at'),
    /** 报告内容快照 (JSON) — 礼物不可变，独立于发送方的可变缓存 */
    snapshotJson: text('snapshot_json'),
    /** 过期时间（创建后 30 天） */
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('rg_sender_idx').on(t.senderUserId),
    index('rg_recipient_email_status_idx').on(t.recipientEmail, t.status),
    index('rg_recipient_user_idx').on(t.recipientUserId),
  ]
)

export const readingGiftsRelations = relations(readingGifts, ({ one }) => ({
  sender: one(users, {
    fields: [readingGifts.senderUserId],
    references: [users.id],
    relationName: 'giftSender',
  }),
  recipient: one(users, {
    fields: [readingGifts.recipientUserId],
    references: [users.id],
    relationName: 'giftRecipient',
  }),
}))

// ==================== Free 用户月度配额 ====================

/**
 * Free 用户月度占卜配额追踪表
 *
 * 每个用户每个自然月（YYYY-MM）一条记录，首次占卜时懒创建。
 * 旧月份记录永不再查询（自然失效），无需 cron 清理。
 *
 * Free 月度上限: 3 次占卜（FREE_QUOTA_LIMITS.divinationMonthly）
 */
export const freeMonthlyQuotas = sqliteTable(
  'free_monthly_quotas',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 配额月份 YYYY-MM (UTC) */
    month: text('month').notNull(),
    /** 当月已使用占卜次数 */
    divinationUsed: integer('divination_used').default(0).notNull(),
    /** 当月面相/手相上传次数 */
    physiognomyUploads: integer('physiognomy_uploads').default(0).notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('fmq_user_month_uniq').on(t.userId, t.month),
    index('fmq_user_month_idx').on(t.userId, t.month),
  ]
)

export const freeMonthlyQuotasRelations = relations(freeMonthlyQuotas, ({ one }) => ({
  user: one(users, { fields: [freeMonthlyQuotas.userId], references: [users.id] }),
}))

// ==================== 单次消耗信用 (per-use credit ledger) ====================

/**
 * Unified per-use credit ledger (ADR-0013 §4). Replaces the scattered per-type
 * columns (chat/divination/coincast credits on `users`) for the episodic apps.
 *
 * Two rows per (user, creditType) at most — one per source:
 *   - 'purchased'  IAP pack / one-shot, non-expiring (webhook top-up).
 *   - 'allowance'  universe_pro monthly grant; resets each period (periodKey),
 *                  consumed before purchased (use-it-or-lose-it).
 *
 * creditType is an episodic capability: feng | face | coincast | dream | numerology.
 */
export const userCredits = sqliteTable(
  'user_credits',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Episodic capability the credit spends on. */
    creditType: text('credit_type').notNull(),
    /** 'purchased' (non-expiring IAP) | 'allowance' (universe monthly, resets). */
    source: text('source').notNull(),
    balance: integer('balance').default(0).notNull(),
    /** Allowance period marker (YYYY-MM) so the monthly grant resets once per period; null for purchased. */
    periodKey: text('period_key'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.creditType, t.source] })]
)

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, { fields: [userCredits.userId], references: [users.id] }),
}))

// ==================== 落地页命格预设（商业转化）====================

/**
 * 命格人格预设表 — 引流漏斗核心内容库
 *
 * 120 格局法原型 (10天干 × 12地支) × 2性别 × 4语言 = 960 行
 * 支持 A/B 变体测试、曝光/转化统计、热更新，无需重新部署代码。
 *
 * 热更新方式：
 *   1. 直接编辑 D1 数据（Cloudflare Dashboard 或 wrangler d1 execute）
 *   2. 将 ARCHETYPE_CACHE_VERSION 环境变量从 'v1' 改为 'v2'
 *   3. 旧 KV 缓存自动失效（key 含版本前缀），新内容立即生效
 */
export const archetypePresets = sqliteTable(
  'archetype_presets',
  {
    id: text('id').primaryKey(),
    /** 日主天干 — 甲乙丙丁戊己庚辛壬癸 */
    dayStem: text('day_stem').notNull(),
    /** 月令地支 — 子丑寅卯辰巳午未申酉戌亥 */
    monthBranch: text('month_branch').notNull(),
    /** 性别 — 影响运势顺逆方向 */
    gender: text('gender', { enum: ['男', '女'] }).notNull(),
    /** 语言 — zh | zh-Hant | en | ja (ko 回退 en 等扩充后加入) */
    lang: text('lang').notNull(),
    /** 人格画像第一条 ≤150 chars — 日主核心特质 */
    bullet1: text('bullet_1').notNull(),
    /** 人格画像第二条 ≤150 chars — 日主深层模式 */
    bullet2: text('bullet_2').notNull(),
    /** 人格画像第三条 ≤150 chars — 月支环境微调 */
    bullet3: text('bullet_3').notNull(),
    /** 命运钩子悬念句 ≤200 chars — 核心引导下载/付费的开放式悬念 */
    fateTease: text('fate_tease').notNull(),
    /** 天机警示句 ≤200 chars — 制造紧迫感的模糊预警 */
    warning: text('warning').notNull(),
    /** A/B 测试变体 — 同一命格可配置多套文案并追踪转化率 */
    variant: text('variant').notNull().default('A'),
    /** 曝光次数 — 每次向用户展示此预设时 +1（通过 waitUntil 异步更新） */
    impressions: integer('impressions').notNull().default(0),
    /** 转化次数 — 点击下载/注册时 +1（通过 POST /api/onboarding/convert 写入） */
    conversions: integer('conversions').notNull().default(0),
    /** 是否启用 — false 可下线废弃行而不删除，保留历史数据 */
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('ap_stem_branch_gender_lang_variant_uniq').on(
      t.dayStem,
      t.monthBranch,
      t.gender,
      t.lang,
      t.variant
    ),
    index('ap_lookup_idx').on(t.dayStem, t.monthBranch, t.gender, t.lang, t.active),
  ]
)

// ==================== 命盘术语词库 (Glossary) ====================

/**
 * 命盘术语长释义 — 入门模式下的「展开阅读」内容
 *
 * 与 @zhop/astro-i18n 的 `explainTerm()` 区别：
 * - explainTerm: 一句话短解释 (≤80 chars)，硬编码在 SDK 包，覆盖核心 token
 * - chartGlossary: 长释义 markdown (≤500 chars)，按 (dayStem × monthBranch × gender)
 *   等多维 key 提供个性化教学，可热更新无需 app 发版
 *
 * key 格式：`<category>:<token>[|<context>:<value>]*`
 * 例：`stem:甲|monthBranch:寅|gender:男`
 *     `geju:正官格`
 *     `palace:命宫|major:紫微`
 */
export const chartGlossary = sqliteTable(
  'chart_glossary',
  {
    id: text('id').primaryKey(),
    /** 复合 key，见上面注释格式 */
    key: text('key').notNull(),
    /** TokenCategory — stem | branch | element | shishen | geju | palace | mutagen | ziweiMajor */
    category: text('category').notNull(),
    /** BCP-47 语言标签：zh | zh-Hant | en | ja */
    lang: text('lang').notNull(),
    /** 标题 ≤40 chars — 折叠卡片显示 */
    title: text('title').notNull(),
    /** Markdown 正文 ≤500 chars — 展开后显示 */
    bodyMd: text('body_md').notNull(),
    /** A/B 变体 */
    variant: text('variant').notNull().default('A'),
    /** 是否启用 */
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('cg_key_lang_variant_uniq').on(t.key, t.lang, t.variant),
    index('cg_lookup_idx').on(t.key, t.lang, t.active),
  ]
)

// ==================== Fēng / 風 (Phase E Week 3) ====================

/**
 * 风水站点 — 一个用户保存的住所/办公室坐标 + 朝向元数据。
 *
 * 一个用户可以有多个站点（自宅、办公室、父母家），每个站点独立计算
 * 玄空飞星 + 八宅吉凶。隐私敏感字段（lat/lng/address）随 D1 透明加密；
 * 软删除（deletedAt）保留 30 天以便恢复。
 */
export const fengSites = sqliteTable(
  'feng_sites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    /** 用户起的名字（"自宅"/"办公室"），≤40 chars */
    name: text('name').notNull(),
    /** 可选副标题（"上海徐汇" 等） */
    label: text('label'),

    // ── 地理 ──
    lat: text('lat').notNull(),
    lng: text('lng').notNull(),
    formattedAddress: text('formatted_address').notNull(),

    // ── 朝向（全部 true-north 度数） ──
    facingDegTrue: text('facing_deg_true').notNull(),
    /** 缓存的磁北度数 = facingDegTrue - magneticDeclination */
    facingDegMagnetic: text('facing_deg_magnetic').notNull(),
    /** 创建时刻的磁偏角快照（° east of true north） */
    magneticDeclination: text('magnetic_declination').notNull(),
    /** 坐山 = (facingDegTrue + 180) mod 360 */
    sitDegTrue: text('sit_deg_true').notNull(),
    /** 大门朝向（如与建筑朝向不同） */
    doorDegTrue: text('door_deg_true'),

    // ── 建筑信息（决定玄空运盘）──
    buildYear: integer('build_year'),
    /** 数据质量分级 — exact / decade / moveIn / unknown */
    buildYearAccuracy: text('build_year_accuracy', {
      enum: ['exact', 'decade', 'moveIn', 'unknown'],
    })
      .notNull()
      .default('unknown'),
    moveInYear: integer('move_in_year'),
    floor: integer('floor'),

    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    deletedAt: text('deleted_at'),
  },
  (t) => [
    index('fs_user_idx').on(t.userId, t.deletedAt),
    index('fs_user_updated_idx').on(t.userId, t.updatedAt),
  ]
)

/**
 * 风水报告 — 一个站点可有多份报告（首次分析 + 流年滚动 + 用户手动重算）。
 *
 * 整张报告作为不可变快照存储；客户端通过 ChapterPager 渲染 chapters[]。
 * Stage 1 vision + Stage 2 compute 原始 JSON 都保留，便于将来 prompt 升级后
 * 复用旧数据重生成 chapters（不重新跑 vision 或 compute）。
 */
export const fengReports = sqliteTable(
  'feng_reports',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => fengSites.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),

    /** Gregorian 流年 — 用来过滤"今年/明年"切换 */
    fengYear: integer('feng_year').notNull(),
    /** 当前玄空元运 1-9 */
    currentYuan: integer('current_kindred').notNull(),

    /** Stage 1 输出 — ShaObservationSet JSON */
    visionJson: text('vision_json').notNull(),
    /** Stage 2 输出 — FengComputeJson */
    computeJson: text('compute_json').notNull(),
    /** Stage 3 输出 — FengChapter[] */
    chapters: text('chapters').notNull(),
    /** Data quality footer JSON */
    dataQuality: text('data_quality').notNull(),

    /** { vision: '...', synthesis: '...' } — 模型版本快照 */
    modelVersions: text('model_versions').notNull(),

    /**
     * Annotated R2 keys for {close, mid, wide} satellite tiles — JSON encoded
     * `{ close?: string, mid?: string, wide?: string }`. Phase H · F4 surfaces
     * the annotated maps in the report screen instead of discarding them after
     * vision. Variable subset reflects F2 prefetch-driven adaptive rendering.
     * Nullable for legacy rows that pre-date this column.
     */
    annotatedMapKeys: text('annotated_map_keys'),

    generatedAt: text('generated_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('fr_site_year_idx').on(t.siteId, t.fengYear),
    index('fr_user_generated_idx').on(t.userId, t.generatedAt),
  ]
)

/**
 * 风水分析作业 — POST /api/feng/sites/:id/analyze 返回 jobId，
 * 客户端按 200ms 间隔轮询 GET /api/feng/jobs/:id 拿进度。
 *
 * 分析流程 (svc-feng 编排):
 *   stage 'maps' → fetch 3张卫星图 (close/mid/wide), 写入 R2
 *   stage 'vision' → Gemini 2.5 Pro Vision 结构化输出
 *   stage 'compute' → astro-core/feng (本机 0-ms)
 *   stage 'synthesis' → Claude Opus 4.7 / Gemini 2.5 Pro 文本 → 6 chapters
 *   stage 'done' → reportId 填入
 *   stage 'failed' → errorMessage 填入
 *
 * Worker 实际并不"暂停" — 整条流水线在请求内同步跑完（svc-feng 5xx 时本表
 * 会标记 failed）。但保留 job 表是为了让客户端做 Pull-to-Refresh 时不重复
 * 触发 LLM；后续 V2 切到 Cloudflare Queues 后无需改 schema。
 */
export const fengJobs = sqliteTable(
  'feng_jobs',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => fengSites.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    stage: text('stage', {
      enum: ['maps', 'vision', 'compute', 'synthesis', 'done', 'failed'],
    })
      .notNull()
      .default('maps'),
    /** 0 - 100 整数，避免浮点序列化抖动 */
    progress: integer('progress').notNull().default(0),
    /** 完成后填入 fengReports.id */
    reportId: text('report_id').references(() => fengReports.id),
    errorMessage: text('error_message'),
    startedAt: text('started_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    finishedAt: text('finished_at'),
  },
  (t) => [
    index('fj_site_started_idx').on(t.siteId, t.startedAt),
    index('fj_user_stage_idx').on(t.userId, t.stage),
  ]
)

export const fengSitesRelations = relations(fengSites, ({ one, many }) => ({
  user: one(users, { fields: [fengSites.userId], references: [users.id] }),
  reports: many(fengReports),
  jobs: many(fengJobs),
}))

export const fengReportsRelations = relations(fengReports, ({ one }) => ({
  site: one(fengSites, { fields: [fengReports.siteId], references: [fengSites.id] }),
  user: one(users, { fields: [fengReports.userId], references: [users.id] }),
}))

export const fengJobsRelations = relations(fengJobs, ({ one }) => ({
  site: one(fengSites, { fields: [fengJobs.siteId], references: [fengSites.id] }),
  user: one(users, { fields: [fengJobs.userId], references: [users.id] }),
  report: one(fengReports, { fields: [fengJobs.reportId], references: [fengReports.id] }),
}))

// ==================== Auspice · Life Timeline cache (Sprint 4 — ADR-0020) ====================
//
// Memoizes the deterministic `POST /api/auspice/timeline` payload (大运 + 流年 + 流月) keyed
// on the sha256 of `(birthDate, birthHour, gender, locale, TIMELINE_CACHE_VERSION)`.
// The route is anonymous-by-design (no userId column) — birth lives on-device for
// Auspice; the cache key fully describes the input domain.
//
// Bumping `TIMELINE_CACHE_VERSION` invalidates ALL existing rows on the next read
// (the hash changes, the lookup misses, the recompute path runs + overwrites by
// `contextKey`). Use that escape hatch when astro-core changes 大运 boundaries or
// when the payload shape (`schemaVersion`) bumps.
// v2 (Phase 2): rolling 12-month 流月 (was current-calendar-year) + per-row personal
// 对你而言 fit/reasons on 大运/流年/流月; `thisYearLiuyue` renamed `liuyue`.
// v3 (git-graph): each 大运 carries its own 流年 commits (DayunRow.liunian) so the
// client can render every 大运 as a real branch that merges back.
// v4 (2026-06): the deep-read reading id now folds in this version, and
// svc-astro's output-language directive was hardened — flush en-keyed rows the
// old prompt mistakenly wrote in Chinese.
// v5 (2026-06): 流年/流月 rows now carry a 紫微 second-system fold (a `ziwei` tone +
// a 平-tie break to 吉/凶); flush 八字-only payloads.
export const TIMELINE_CACHE_VERSION = 'v5'

export const lifeTimelineCache = sqliteTable(
  'life_timeline_cache',
  {
    id: text('id').primaryKey(),
    /** sha256 hex — see `routes/cycle-timeline.ts` `computeContextKey`. */
    contextKey: text('context_key').notNull(),
    /** Serialized `TimelinePayload` (ADR-0020). */
    contentJson: text('content_json').notNull(),
    /** ISO timestamp — readers compare against `now`. TTL = 30 days. */
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    unique('ltc_context_key_uq').on(t.contextKey),
    index('ltc_expires_at_idx').on(t.expiresAt),
  ]
)
