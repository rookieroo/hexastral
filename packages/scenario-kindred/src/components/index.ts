/**
 * Components barrel — UI primitives shared by hexastral-app and yuan-app.
 *
 * Implementation status:
 *   ✅ KindredSeal                  cinnabar Kindred stamp (3 animation modes)
 *   ✅ RelationshipTypeSelector  chip group for relationship type
 *   ✅ CompatibilityScore        0–100 score with concentric ring
 *   ✅ RevealMoment              the 2.7s emotional peak after bond creation
 *   ✅ WaitingForOther           A's screen after sending invitation (pending / accepted)
 *   ✅ InviteAcceptSheet         B's bottom sheet on first app launch
 *   ✅ ChapterCard               single chapter of a synastry report
 *   ✅ ChapterPager              horizontal page-snap container for chapters
 *   ✅ ShareableChapterCard      9:16 PNG-capture card for IG / 小红书 share
 *
 * All visuals consume @zhop/hexastral-tokens/kindred tokens. App-level concerns
 * (routing, paywall, RevenueCat) stay in each app.
 */

export type { AncientNumeralProps } from './AncientNumeral'
export { AncientNumeral } from './AncientNumeral'
export type { AncientSealProps } from './AncientSeal'
export { AncientSeal } from './AncientSeal'
export type { ChapterCardProps } from './ChapterCard'
export { ChapterCard } from './ChapterCard'
export { YongshenKey } from './ChapterMeta'
export type { ChapterPagerProps } from './ChapterPager'
export { ChapterPager } from './ChapterPager'
export type { ChapterUnlockWallLabels, ChapterUnlockWallProps } from './ChapterUnlockWall'
export { ChapterUnlockWall } from './ChapterUnlockWall'
export type { CompatibilityScoreProps } from './CompatibilityScore'
export { CompatibilityScore } from './CompatibilityScore'
export type { InviteAcceptSheetProps } from './InviteAcceptSheet'
export { InviteAcceptSheet } from './InviteAcceptSheet'
export type { KindredSealMode, KindredSealProps } from './KindredSeal'
export { KindredSeal } from './KindredSeal'
export type { QrCodeProps } from './QrCode'
export { QrCode } from './QrCode'
export type { ShareableReadingCardProps } from './ShareableReadingCard'
export { ShareableReadingCard } from './ShareableReadingCard'
export type { RelationshipTypeSelectorProps } from './RelationshipTypeSelector'
export { RelationshipTypeSelector } from './RelationshipTypeSelector'
export type { RevealMomentProps } from './RevealMoment'
export { RevealMoment } from './RevealMoment'
export { RiskMark } from './RiskMark'
export type { ShareableChapterCardProps } from './ShareableChapterCard'
export { ShareableChapterCard } from './ShareableChapterCard'
export type { ShareableSynastryCardProps } from './ShareableSynastryCard'
export { ShareableSynastryCard } from './ShareableSynastryCard'
export type { TermBubbleColors, TermBubbleProps } from './TermBubble'
export { TermBubble } from './TermBubble'
export type { WaitingForOtherProps } from './WaitingForOther'
export { WaitingForOther } from './WaitingForOther'
