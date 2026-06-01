/**
 * Components barrel — UI primitives shared by hexastral-app and yuan-app.
 *
 * Implementation status:
 *   ✅ YuanSeal                  cinnabar 緣 stamp (3 animation modes)
 *   ✅ RelationshipTypeSelector  chip group for relationship type
 *   ✅ CompatibilityScore        0–100 score with concentric ring
 *   ✅ RevealMoment              the 2.7s emotional peak after bond creation
 *   ✅ WaitingForOther           A's screen after sending invitation (pending / accepted)
 *   ✅ InviteAcceptSheet         B's bottom sheet on first app launch
 *   ✅ ChapterCard               single chapter of a synastry report
 *   ✅ ChapterPager              horizontal page-snap container for chapters
 *   ✅ ShareableChapterCard      9:16 PNG-capture card for IG / 小红书 share
 *
 * All visuals consume @zhop/hexastral-tokens/yuan tokens. App-level concerns
 * (routing, paywall, RevenueCat) stay in each app.
 */

export { YuanSeal } from './YuanSeal'
export type { YuanSealMode, YuanSealProps } from './YuanSeal'

export { RelationshipTypeSelector } from './RelationshipTypeSelector'
export type { RelationshipTypeSelectorProps } from './RelationshipTypeSelector'

export { CompatibilityScore } from './CompatibilityScore'
export type { CompatibilityScoreProps } from './CompatibilityScore'

export { RevealMoment } from './RevealMoment'
export type { RevealMomentProps } from './RevealMoment'

export { WaitingForOther } from './WaitingForOther'
export type { WaitingForOtherProps } from './WaitingForOther'

export { InviteAcceptSheet } from './InviteAcceptSheet'
export type { InviteAcceptSheetProps } from './InviteAcceptSheet'

export { ChapterCard } from './ChapterCard'
export type { ChapterCardProps } from './ChapterCard'

export { ChapterPager } from './ChapterPager'
export type { ChapterPagerProps } from './ChapterPager'

export { ShareableChapterCard } from './ShareableChapterCard'
export type { ShareableChapterCardProps } from './ShareableChapterCard'
