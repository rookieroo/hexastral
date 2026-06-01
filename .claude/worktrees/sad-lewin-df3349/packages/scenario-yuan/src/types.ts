/**
 * Domain types for the Yuán (緣) synastry product.
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
 *
 * These types are kept in sync with [apps/hexastral-app/lib/domain/bonds.ts]
 * (the existing API wrapper). When the migration to scenario-yuan completes,
 * lib/domain/bonds.ts will re-export from this package instead of duplicating.
 */

// ── Bond mode + relationship ────────────────────────────────────────────────

export type BondMode = 'solo' | 'resonance'

export type BondStatus =
  | 'active'
  | 'pending_invite'
  | 'declined'
  | 'expired'
  | 'removed'

export type RelationshipStage =
  | 'crush'
  | 'dating'
  | 'committed'
  | 'engaged'
  | 'married'
  | 'ex'

export type ArchetypeCategory =
  | 'harmony'
  | 'tension'
  | 'growth'
  | 'karmic'
  | 'volatile'

export type HookDimension =
  | 'long_term'
  | 'communication'
  | 'attraction'
  | 'emotional'

/**
 * Relationship type used by Yuán's product UI. Maps loosely to the backend's
 * free-text `relationshipLabel` (which is more granular for power users).
 * Yuán's selector renders these chips; the chip's label becomes
 * `relationshipLabel` on the wire.
 */
export type RelationshipType =
  | 'romantic'
  | 'friend'
  | 'family'
  | 'partner'
  | 'colleague'
  | 'other'

export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'romantic',
  'friend',
  'family',
  'partner',
  'colleague',
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
  archetypeName: string | null
  archetypeTagline: string | null
  archetypeCategory: ArchetypeCategory | null
  hookDimension: HookDimension | null
  /** '4' = full, '1' = hookDimension only, null = legacy (treat as 4) */
  unlockedDimensions: string | null
  sharedByOwner: boolean
  targetUser: { name: string | null; avatarKey: string | null } | null
  invitation: { expiresAt: string; targetEmail: string } | null
  relationshipStage: RelationshipStage | null
  todaySynastry: DailySynastry | null
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
}

export interface PairInterpretation {
  overview?: string
  dayMaster?: string
  branches?: string
  highlights?: string
  advice?: string
  /** Optional per-chapter content for v2 reports */
  chapters?: SynastryChapter[]
  [key: string]: unknown
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
  targetEmail: string
  targetName: string
  relationshipLabel: string
  /** Optional opening note from A */
  message?: string
}

export interface ResonanceInviteResult {
  bondId: string
  invitationId: string
  status: 'pending_invite'
  token: string
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

export interface SynastryChapter {
  kind: ChapterKind
  title: string
  /** 1–3 sentence "金句" lead — what users screenshot and share */
  goldenLine: string
  /** Long-form interpretation, 150–250 words */
  body: string
  /** Optional visual data for the chapter (e.g., radar chart data) */
  visualData?: unknown
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

// ── Credit / quota status ───────────────────────────────────────────────────

export interface BondInviteCredits {
  available: number
  lifetime: number
}

// ── Yuán palette tokens proxy ──────────────────────────────────────────────

export type { YuanTheme } from '@zhop/hexastral-tokens/yuan'
