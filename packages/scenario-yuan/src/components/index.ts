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

export type { ChapterCardProps } from './ChapterCard'
export { ChapterCard } from './ChapterCard'
export type { ChapterPagerProps } from './ChapterPager'
export { ChapterPager } from './ChapterPager'
export type { CompatibilityScoreProps } from './CompatibilityScore'
export { CompatibilityScore } from './CompatibilityScore'
export type { InviteAcceptSheetProps } from './InviteAcceptSheet'
export { InviteAcceptSheet } from './InviteAcceptSheet'
export type { RelationshipTypeSelectorProps } from './RelationshipTypeSelector'
export { RelationshipTypeSelector } from './RelationshipTypeSelector'
export type { RevealMomentProps } from './RevealMoment'
export { RevealMoment } from './RevealMoment'
export type { ShareableChapterCardProps } from './ShareableChapterCard'
export { ShareableChapterCard } from './ShareableChapterCard'
export type { WaitingForOtherProps } from './WaitingForOther'
export { WaitingForOther } from './WaitingForOther'
export type { YuanSealMode, YuanSealProps } from './YuanSeal'
export { YuanSeal } from './YuanSeal'
