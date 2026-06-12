/**
 * @zhop/scenario-kindred
 *
 * Shared logic for the Kindred (Kindred) synastry product. Consumed by:
 *   - apps/hexastral-app (bonds tab) — migration planned, see README
 *   - apps/kindred-app (planned, standalone Expo build)
 *
 * Setup (in app root):
 *
 *   import { createHexastralClient } from '@zhop/hexastral-client'
 *   import { KindredClientProvider } from '@zhop/scenario-kindred'
 *
 *   const client = createHexastralClient(API_URL, { signRequest })
 *
 *   <KindredClientProvider client={client}>
 *     <App />
 *   </KindredClientProvider>
 *
 * Then any descendant component can call hooks:
 *
 *   const { invitation, respond } = useBondInvitation(token)
 *   const { bonds } = useBondList()
 *   const { detail, chapters } = useSynastryReport(bondId)
 *
 * See docs/decisions/0001-yuan-naming.md for product context.
 */

export * from './components'
export type { KindredClientConfig, KindredClientProviderProps } from './context'
export { KindredClientProvider, useKindredClient } from './context'
export {
  CHAPTER_SEAL,
  GLYPHS,
  type GlyphKey,
  NUMERALS,
  WUXING_GLYPH,
} from './glyphs'
export * from './hooks'
export { isCjkLocale, kindredFonts } from './kindredFonts'
export {
  elementName,
  formatLean,
  formatVerdict,
  formatWindowMonth,
  formatWindowReasons,
} from './lib/makeif-format'
export {
  formatLeadLabel,
  formatNodeKind,
  formatNodeSummary,
  type KindredLocale,
} from './lib/timeline-format'
export {
  type BuildTimelineNotificationPlanOptions,
  buildLiuyueDigestPlan,
  buildTimelineNotificationPlan,
  LIUYUE_DIGEST_ID_PREFIX,
  TIMELINE_NOTIFY_ID_PREFIX,
  type TimelineNotificationPlanItem,
} from './lib/timeline-notify'
export * from './types'
