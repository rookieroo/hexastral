// Chat (AI conversation on a reading)

export { chatRoutes } from './chat'
// Fēng — feng-shui flagship (Phase E)
export {
  fengDeclinationRoutes,
  fengJobRoutes,
  fengMapRoutes,
  fengReportRoutes,
  fengSiteRoutes,
} from './feng/index'
// Onboarding — preview (public, IP-rate-limited) + convert tracking (Turnstile for web)
export { onboardingRoutes } from './onboarding/index'
export { purchaseRoutes } from './purchase'

// Stellar routes

// Auspice — 黄历 satellite engine (deterministic: 干支 + 建除 + 二十八宿 + 宜忌 + 日冲煞)
export { auspiceRoutes } from './auspice'
// Bonds / Contacts
export { bondRoutes } from './bonds'
export { contactRoutes } from './contacts'
// Auspice Pro — Life Timeline (大运 + 流年 + 流月) — deterministic, HMAC-signed, D1-cached
export { auspiceTimelineRoutes } from './cycle-timeline'
export { ddlRoutes } from './ddl'
export { discoveryRoutes } from './discovery'
export { flagsRoutes } from './flags'
export { geocodeRoutes } from './geocode'
// Glossary — 命盘术语长释义
export { glossaryRoutes } from './glossary'
export { growthFunnelEventRoutes } from './growth-funnel-events'
export { healthRoutes } from './health'
export { internalAlmanacRoutes } from './internal-almanac'
// Kindred relationship push scheduler — internal (X-Internal-Key), svc-notify cron
export { kindredPushRoutes } from './kindred-push'
// Life Log
export { lifeEventRoutes } from './life-events'
// Media proxy — user avatars, palm photos, floor plan images (hexastral-media R2)
export { mediaRoutes } from './media'
// Natal routes
export { natalRoutes } from './natal/chart'
export { notifyRoutes } from './notify'
// Numerology — deterministic Pythagorean compute (Phase D.2)
export { numerologyRoutes } from './numerology'
export { pairAnnualForecastRoutes } from './pair/annual-forecast'
// Pair Readings (dual-chart compatibility) routes
export { pairRoutes } from './pair/pair'
export { pairPreviewRoutes } from './pair/preview'
// Physiognomy VLM feature extraction (R2 + Gemini Vision)
export { faceFeaturesRoutes } from './physiognomy/face-features'
export { portfolioRoutes } from './portfolio'
export { portfolioAuthRoutes } from './portfolio-auth'
// Quota — Pro 月度配额
export { quotaRoutes } from './quota'
// Timeline — fate/Kindred 命运时间轴节点 deep reading (astro-core engine + K.4-guarded explain)
export { relationshipTimelineRoutes } from './relationship-timeline'
// Versioned report (6-chapter, append-only, lazy regen on context_hash mismatch)
export { reportChapterRoutes, reportManifestRoutes } from './report'
// Report sharing
export { shareRoutes } from './share'
// (Removed in deep refactor: fateReportRoutes, fateReadingRoutes, shuangpanRoutes,
// fortuneRoutes, readingsForOthersRoutes — replaced by signal/report/almanac surface)
// Daily Signal (lazy LLM, scaffolded by daily_almanac)
export { signalHistoryRoutes, signalItemRoutes, signalTodayRoutes } from './signal'
export { chartRoutes as stellarRoutes } from './stellar/chart'
export { timelineRoutes } from './timeline'
// Shared routes
export { userRoutes } from './user'
// (fateSignatureRoutes removed — signature now derives client-side via astro-i18n)
export { visibilityRoutes } from './visibility'
export { webhookRoutes } from './webhook'
// Yiching routes
export { divinationRoutes } from './yiching/cast'
export { hexagramRoutes } from './yiching/hexagram'
