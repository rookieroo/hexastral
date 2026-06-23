/**
 * Domain types for the Kindred (Kindred) synastry product.
 *
 * These types mirror the actual contract exposed by hexastral-api routes:
 *   POST   /api/bonds/solo           — create a solo bond
 *   POST   /api/bonds/invite         — A sends an invitation
 *   GET    /api/bonds/invite/:token/info     — B's landing page reads this
 *   POST   /api/bonds/invite/:token/respond  — B accepts (or declines)
 *   GET    /api/bonds                — list all bonds
 *   GET    /api/bonds/:id            — single bond detail
 *   GET    /api/bonds/:id/synastry   — synastry reading
 *   POST   /api/bonds/:id/share      — generate share link
 *   GET    /api/bonds/timeline       — ego-centric multi-bond timeline (BT.3, ADR-0014)
 *   POST   /api/bonds/timeline/explain — node deep-explain dispatch (BT.4, bondId-keyed)
 *
 * These types are kept in sync with [apps/hexastral-app/lib/domain/bonds.ts]
 * (the existing API wrapper). When the migration to scenario-yuan completes,
 * lib/domain/bonds.ts will re-export from this package instead of duplicating.
 */

// ── Bond mode + relationship ────────────────────────────────────────────────

export type BondMode = 'solo' | 'resonance'

export type BondStatus = 'active' | 'pending_invite' | 'declined' | 'expired' | 'removed'

export type RelationshipStage = 'crush' | 'dating' | 'committed' | 'engaged' | 'married' | 'ex'

export type ArchetypeCategory = 'harmony' | 'tension' | 'growth' | 'karmic' | 'volatile'

export type HookDimension = 'long_term' | 'communication' | 'attraction' | 'emotional'

/**
 * Relationship type used by Kindred's product UI. Maps loosely to the backend's
 * free-text `relationshipLabel` (which is more granular for power users).
 * Kindred's selector renders these chips; the chip's label becomes
 * `relationshipLabel` on the wire.
 */
// Relationship types are 紫微-palace-aligned: each maps to the 宫 it inhabits
// (夫妻/父母/子女/兄弟/仆役/官禄), so the type-aware palace lens fires. 'family' is a
// LEGACY type (old 家人 bonds) kept valid but no longer in the picker — it was too
// coarse for the lens, which reads the 父母/子女/兄弟 axis.
export type RelationshipType =
  | 'romantic'
  | 'family'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'friend'
  | 'boss'
  | 'colleague'
  | 'partner'
  | 'other'

export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'romantic',
  'parent',
  'child',
  'sibling',
  'friend',
  'boss',
  'colleague',
  'partner',
  'other',
] as const

// ── Birth info ──────────────────────────────────────────────────────────────

/** Earthly-branch time index 0–12 (0 = early 子时, 12 = late 子时) */
export type TimeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface PersonBirth {
  solarDate: string // YYYY-MM-DD
  timeIndex: TimeIndex
  gender: '男' | '女'
  city?: string
  /** Precise birth clock, minutes since midnight 0..1439 (precise mode). Enables
   *  真太阳时 calibration for this person in 合盘 — mirrors the self side. */
  clockMinutes?: number
  /** 真太阳时 calibration toggle (precise mode); default on. */
  calibrate?: boolean
  /** Decimal longitude as string (matches the bonds API personBirthSchema). */
  longitude?: string
  /** IANA timezone id — calibration needs it for historical DST. */
  timezoneId?: string
}

// ── Daily synastry (transit reading) ────────────────────────────────────────

export interface DailySynastry {
  synergy: number
  friction: number
  status: 'resonance' | 'tension' | 'neutral'
  date: string
}

// ── Bond list item ──────────────────────────────────────────────────────────

export interface BondData {
  id: string
  ownerId: string
  targetUserId: string | null
  targetName: string
  relationshipLabel: string
  mode: BondMode
  hehunReadingId: string | null
  mirrorBondId: string | null
  status: BondStatus
  createdAt: string
  score: number | null
  grade: string | null
  /** Coarse day-master 五行 (金木水火土) for both parties — privacy-safe, drives
   *  the list/home 意象 chip (生克平 essence). Null until a reading exists. */
  aElement?: string | null
  bElement?: string | null
  /** The OTHER person's 五行 from the VIEWER's perspective — colours this thread's
   *  star in the sky + its list dot, so each bond reads in its own element hue. */
  counterpartElement?: string | null
  /** ISO time the report was generated (resonance: the accept time, not the invite).
   *  null until a reading exists. The list shows it for completed threads. */
  generatedAt?: string | null
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: ArchetypeCategory | null
  hookDimension: HookDimension | null
  /** '4' = full, '1' = hookDimension only, null = legacy (treat as 4) */
  unlockedDimensions: string | null
  sharedByOwner: boolean
  targetUser: { name: string | null; avatarKey: string | null } | null
  invitation: { expiresAt: string; targetEmail: string; resonateUrl?: string } | null
  relationshipStage: RelationshipStage | null
  todaySynastry: DailySynastry | null
  /** True when this reading's birth snapshot no longer matches the viewer's current
   *  birth info (they edited it after the report was generated). The report stays
   *  as-is; the list tags it so the basis is clear. */
  basedOnStaleBirth?: boolean
}

/** Free-bond quota, returned alongside the bond list (GET /api/bonds). Lets the UI
 *  pre-empt the paywall at "New Thread". `used` counts non-refundable generations
 *  (readings kept through a "Let go" soft-delete) plus outstanding pending invites,
 *  so it matches what the server enforces at create. Pro is unbounded (`used` is
 *  informational and never gates when `isPro`). */
export interface BondQuota {
  isPro: boolean
  used: number
  limit: number
}

// ── Bond detail (single bond with full interpretation) ──────────────────────

export interface BondDimension {
  key: HookDimension
  name: string
  /** null when this dimension is locked behind paywall */
  score: number | null
  maxScore: number | null
  note: string | null
  isLocked: boolean
}

export interface BondDetailData extends BondData {
  dimensions: BondDimension[] | null
  /** Full AI interpretation: overview, day-master, branches, highlights, advice */
  interpretation: PairInterpretation | null
  /** Which side of the reading the VIEWER is. The prose is written once with
   *  甲方/乙方 tokens (甲=personA=inviter); the report screen reads this to render
   *  "you" + order the 五行 subtitle from the viewer's own perspective. Server-set
   *  by matching the viewer's birth to the snapshot; absent on legacy responses. */
  viewerIsPersonA?: boolean
}

export interface PairInterpretation {
  overview?: string
  dayMaster?: string
  branches?: string
  highlights?: string
  advice?: string
  /** Optional per-chapter content for v2 reports (unlocked chapters only). */
  chapters?: SynastryChapter[]
  /** Locked chapters as teasers (no body) — present when not all are unlocked. */
  lockedChapters?: LockedSynastryChapter[]
  /** Total chapters in the full report, for "N / total" framing. */
  totalChapters?: number
  /** The aha-hook assertion — shown on the unlock wall to drive conversion + invite. */
  ahaHook?: string
  /** Both day-master 五行 (金木水火土) — drives the report ink centerpiece (生/克/比和). */
  personAElement?: string
  personBElement?: string
  [key: string]: unknown
}

// ── Solo bond creation ──────────────────────────────────────────────────────

/** Input for POST /api/bonds/solo — A creates a one-sided synastry reading. */
export interface SoloCreateInput {
  targetName: string
  relationshipLabel: string
  targetBirth: PersonBirth
  language?: string
  /** Cross-app hand-off from Auspice — skips the compatibility paywall; the bond
   *  lands on the free 3 chapters + unlock wall (server gates the full report). */
  fromHandoff?: boolean
}

/** Response from POST /api/bonds/solo. */
export interface SoloCreateResult {
  bondId: string
  readingId: string
  mode: 'solo'
  score: number
  grade: string
  compatibility: Record<string, unknown>
  interpretation: Record<string, unknown>
}

// ── Invitation flow ─────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'

/** Returned by GET /api/bonds/invite/:token/info — what B sees on the landing page */
export interface InvitationInfo {
  invitationId: string
  inviterName: string
  inviterAvatarUrl: string | null
  relationshipLabel: string
  targetName: string
  message: string | null
  expiresAt: string
  /** Archetype hint, if pre-computed; otherwise null */
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: ArchetypeCategory | null
}

export interface ResonanceInviteInput {
  /**
   * Optional. Only set when delivery mode is `'server'` (legacy path).
   * For `'user'` (default), the email is private to A's device and is
   * never sent to the server.
   */
  targetEmail?: string
  targetName: string
  relationshipLabel: string
  /** Optional opening note from A */
  message?: string
  /**
   * `'user'` (default): A's device opens the system mail composer with the
   * server-provided subject + body. Privacy-by-design — no PII for B
   * stored server-side.
   * `'server'`: legacy SES path. Required for the rare case A's device
   * has no mail composer; client must also supply `targetEmail`.
   */
  deliveryMode?: 'user' | 'server'
  /**
   * BCP-47 / app locale A is composing in (e.g. 'en', 'zh-Hant'). Drives the
   * server-built share message AND the resonate landing URL's locale so the
   * whole invite stays in A's language. Falls back to the stored user locale,
   * then 'en' (US-market default) — never silently 'zh'.
   */
  language?: string
}

export interface ResonanceInviteMailto {
  subject: string
  body: string
}

export interface ResonanceInviteResult {
  bondId: string
  invitationId: string
  status: 'pending_invite'
  token: string
  resonateUrl: string
  deliveryMode: 'user' | 'server'
  /** Locale-aware mailto template — client composes the email on A's device. */
  mailto: ResonanceInviteMailto
}

export interface RespondInput {
  action: 'accept' | 'decline'
  birthData?: PersonBirth
  language?: string
}

export interface RespondResult {
  bondId: string
  readingId?: string
  status: 'active' | 'declined'
}

// ── Report ──────────────────────────────────────────────────────────────────

export type ChapterKind =
  | 'first_impression'
  | 'communication'
  | 'conflict'
  | 'complement'
  | 'monthly_outlook'
  | 'long_term_advice'

/** Severity of a chapter's named risk (暗礁·风险). */
export type ReefSeverity = 'low' | 'mid' | 'high'

export interface SynastryChapter {
  kind: ChapterKind
  title: string
  /** 1–3 sentence "金句" lead — what users screenshot and share */
  goldenLine: string
  /** Assembled long-form body (the four layers joined) — what the current
   *  text card renders. The redesigned card uses the structured fields below. */
  body: string
  // ── Four-layer structure (populated by svc-astro) ──────────────────────────
  /** 命盘依据 — concrete chart facts */
  evidence?: string
  /** 关系动态 — how the two actually interact on this dimension */
  dynamic?: string
  /** 暗礁·风险 — the one named risk/crisis to watch */
  reef?: string
  /** Severity of `reef` */
  severity?: ReefSeverity
  /** 解法 — concrete remedy anchored on 用神 */
  remedy?: string
  /** 用神 element the remedy is built on (金|木|水|火|土) */
  yongshen?: string
  /** Optional 注脚 — a hopeful counterpoint */
  counterpoint?: string
  /** Optional visual data for the chapter (e.g., radar chart data) */
  visualData?: unknown
}

/** A locked chapter as sent to the client — teaser only, never a body. */
export interface LockedSynastryChapter {
  kind: ChapterKind
  title: string
  /** The screenshot-bait line, shown blurred/locked on the unlock wall. */
  goldenLine: string
  locked: true
}

/**
 * Web-facing teaser payload — fetched by /yuan/invite/[token]/teaser to show
 * 3 golden lines + score after B fills the form, before they download the app.
 */
export interface InvitationTeaserData {
  selfName: string
  otherName: string
  goldenLines: string[]
  score?: number
}

/**
 * Public shared-chapter payload — fetched by /yuan/report/[shareId].
 */
export interface SharedChapterData {
  chapter: SynastryChapter
  selfName: string
  otherName: string
  expiresAt: string | null
}

export interface SynastryReport {
  /** Optional metadata for app shells that also show bond id / headline */
  id?: string
  bondId?: string
  generatedAt?: string
  headline?: string
  chapters: SynastryChapter[]
}

// ── Bonds timeline (本我中心多关系时间轴, BT.3/BT.4, ADR-0014) ───────────────
//
// Server returns ONLY derived nodes (privacy D2): no counterpart raw birth ever
// crosses the wire. Mirrors apps/hexastral-api/src/lib/bonds-timeline.ts DTOs.

export type BondsTimelineNodeKind = '大运' | '流年' | '流月'
export type BondsTimelineSignificance = 'major' | 'notable' | 'routine'

/** A bond touched by a merged node — id/name/label only, never birth. */
export interface BondsTimelineNodeBond {
  bondId: string
  name: string
  relationshipLabel?: string
}

/** One merged timeline node (co-located across bonds), privacy-safe. */
export interface BondsTimelineNode {
  key: string
  /** effective date ISO YYYY-MM-DD */
  date: string
  year: number
  /** 流月 nodes: calendar month 1–12 (undefined for 大运/流年). */
  month?: number
  kind: BondsTimelineNodeKind
  /** 干支 label only (e.g. "甲子") */
  ganZhi: string
  /** 大运 nodes: whose transition (A=ego / B=counterpart) */
  daYunOf?: 'A' | 'B'
  significance: BondsTimelineSignificance
  summary: string
  bonds: BondsTimelineNodeBond[]
}

/** A scheduled local-push hint (client lays these onto expo-notifications). */
export interface BondsTimelineNotification {
  /** references the originating node's key */
  key: string
  fireDate: string
  leadDays: number
  leadLabel: string
  date: string
  year: number
  kind: BondsTimelineNodeKind
  significance: BondsTimelineSignificance
  summary: string
}

/** Response from GET /api/bonds/timeline. */
export interface BondsTimelineResponse {
  nodes: BondsTimelineNode[]
  /** Empty for non-Pro (proactive push is the Pro moat). */
  notifications: BondsTimelineNotification[]
  /**
   * 流月 living layer — near-term rolling months (orthogonal to the lifetime
   * axis; never pushed). Free = current month only; Pro = 12-month window.
   */
  liuyue?: BondsTimelineNode[]
  /** True iff kindred_pro / universe_pro. Free = current year + all bonds, no push. */
  pro: boolean
  /** Present only for non-Pro — paywall hint. */
  upsell?: {
    capability: 'yuan'
    iapProductIds: { monthly: string; annual: string }
  }
}

/** Input for POST /api/bonds/timeline/explain — bondId-keyed (server resolves birth). */
export interface BondsTimelineExplainInput {
  bondId: string
  year: number
  nodeType: BondsTimelineNodeKind
  /** required for 大运 nodes (disambiguate ego/counterpart same-year transition) */
  daYunOf?: 'A' | 'B'
  locale?: string
}

/** Result from POST /api/bonds/timeline/explain. */
export interface BondsTimelineExplainResult {
  /** null = no node to explain at that (year, type) */
  explanation: string | null
  source: 'none' | 'cache' | 'template' | 'llm'
  tier?: 'default' | 'deep'
  upsell: boolean
}

// ── Relationship make-if (Workstream B — forward decision support) ───────────

export type DecisionLean = 'favorable' | 'mixed' | 'caution'

/** One scored candidate window from POST /api/bonds/:id/makeif. */
export interface RelMakeIfWindow {
  /** stable key `${year}-${month}` */
  key: string
  year: number
  month: number
  date: string
  /** month pillar 干支 label */
  ganZhi: string
  /** month stem 五行 */
  element: string
  score: number
  lean: DecisionLean
  isYongshen: boolean
  feedsYongshen: boolean
  harmony: boolean
  clash: boolean
  /** move-specific 神煞: month is either party's 桃花 / 驿马, or feeds their 食伤 */
  taohua: boolean
  yima: boolean
  shishang: boolean
  /** 紫微 流月四化 also lights a bond palace (命宫/夫妻/福德) — second-system corroboration. */
  ziwei: boolean
  /** deterministic zh reasons (client may localize from the structured flags) */
  reasons: string[]
}

/** One scored candidate YEAR from the long-horizon (10y) tier. */
export interface RelMakeIfYear {
  /** stable key `${year}` */
  key: string
  year: number
  date: string
  ganZhi: string
  element: string
  score: number
  lean: DecisionLean
  isYongshen: boolean
  feedsYongshen: boolean
  harmony: boolean
  clash: boolean
  taohua: boolean
  yima: boolean
  shishang: boolean
  ziwei: boolean
  reasons: string[]
}

/** Response from POST /api/bonds/:id/makeif. */
export interface RelMakeIfResponse {
  /** True iff kindred_pro / universe_pro. */
  pro: boolean
  /** Present only for non-Pro — paywall hint (no windows computed). */
  upsell?: {
    capability: 'kindred'
    iapProductIds: { monthly: string; annual: string }
  }
  /** The relationship's 通关用神 (one element). Empty when not Pro. */
  yongshen?: string
  yongshenNote?: string
  windows?: RelMakeIfWindow[]
  /** key of the recommended (highest-scoring) window. */
  bestKey?: string
  /** deterministic zh synthesis verdict. */
  verdict?: string
  /** Long-horizon yearly ranking — "哪一年最适合推进重大一步" (the next 10 years). */
  longterm?: {
    years: RelMakeIfYear[]
    bestYearKey?: string
    verdict: string
  }
}

/** Per-window make-if LLM deep-read request — DERIVED facts only (privacy D2-safe). */
export interface MakeIfExplainInput {
  windowKey: string
  year: number
  month: number
  ganZhi: string
  element?: string
  lean?: DecisionLean
  yongshen?: string
  isYongshen?: boolean
  feedsYongshen?: boolean
  harmony?: boolean
  taohua?: boolean
  yima?: boolean
  shishang?: boolean
  /** The step being weighed — a preset move label or a free-text custom note. */
  step?: string
  /** Deterministic one-liner shown if the LLM is unavailable (never blank). */
  fallback: string
  locale?: string
}

// ── Credit / quota status ───────────────────────────────────────────────────

export interface BondInviteCredits {
  available: number
  lifetime: number
}

// ── Kindred palette tokens proxy ──────────────────────────────────────────────

export type { KindredTheme } from '@zhop/hexastral-tokens/kindred'
