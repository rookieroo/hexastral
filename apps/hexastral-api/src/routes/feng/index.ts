/**
 * Fēng API surface — barrel exported from src/routes/index.ts.
 *
 * Public:
 *   GET    /api/feng/declination               magnetic declination lookup
 *
 * Authenticated (HMAC v2):
 *   POST   /api/feng/sites                     create site
 *   GET    /api/feng/sites                     list user sites
 *   GET    /api/feng/sites/:id                 get site + latest report
 *   PATCH  /api/feng/sites/:id                 edit
 *   DELETE /api/feng/sites/:id                 soft-delete
 *   POST   /api/feng/sites/:id/analyze         enqueue analysis
 *   GET    /api/feng/jobs/:id                  poll job status
 *   GET    /api/feng/maps/preview              satellite tile (base64 PNG)
 */

export { fengDeclinationRoutes } from './declination'
export { fengJobRoutes } from './jobs'
export { fengMapRoutes } from './maps'
export { fengReportRoutes } from './reports'
export { fengSiteRoutes } from './sites'
