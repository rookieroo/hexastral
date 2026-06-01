// Chat (AI conversation on a reading)

export { chatRoutes } from './chat'
// Onboarding — preview (public, IP-rate-limited) + convert tracking (Turnstile for web)
export { onboardingRoutes } from './onboarding/index'
export { purchaseRoutes } from './purchase'

// Stellar routes

// Bonds / Contacts
export { bondRoutes } from './bonds'
export { contactRoutes } from './contacts'
export { ddlRoutes } from './ddl'
export { geocodeRoutes } from './geocode'
// Glossary — 命盘术语长释义
export { glossaryRoutes } from './glossary'
export { growthFunnelEventRoutes } from './growth-funnel-events'
export { healthRoutes } from './health'
export { internalAlmanacRoutes } from './internal-almanac'
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
export { portfolioAuthRoutes } from './portfolio-auth'
export { portfolioRoutes } from './portfolio'
// Quota — Pro 月度配额
export { quotaRoutes } from './quota'
// Versioned report (6-chapter, append-only, lazy regen on context_hash mismatch)
export { reportChapterRoutes, reportManifestRoutes } from './report'
// Report sharing
export { shareRoutes } from './share'
// (Removed in deep refactor: fateReportRoutes, fateReadingRoutes, shuangpanRoutes,
// fortuneRoutes, readingsForOthersRoutes — replaced by signal/report/almanac surface)
// Daily Signal (lazy LLM, scaffolded by daily_almanac)
export { signalHistoryRoutes, signalItemRoutes, signalTodayRoutes } from './signal'
export { chartRoutes as stellarRoutes } from './stellar/chart'
// Shared routes
export { userRoutes } from './user'
// (fateSignatureRoutes removed — signature now derives client-side via astro-i18n)
export { visibilityRoutes } from './visibility'
export { webhookRoutes } from './webhook'
// Yiching routes
export { divinationRoutes } from './yiching/divination'
export { hexagramRoutes } from './yiching/hexagram'
