/**
 * Common Zod schemas — reused across routes.
 *
 * Per phase-f-plan §3.3: routes import shared schemas instead of redefining
 * inline. Inline Zod is allowed only for one-off request shapes.
 */

import { z } from 'zod/v4'

// ── IDs ────────────────────────────────────────────────────────────────────

/** All entity IDs are 24-char nanoid (or compatible). 12-char legacy IDs accepted. */
export const idSchema = z.string().min(8).max(64)

/** Compound payload IDs when the entity reference is ambiguous in the body. */
export const userIdSchema = idSchema
export const bondIdSchema = idSchema
export const siteIdSchema = idSchema
export const reportIdSchema = idSchema
export const shareIdSchema = z.string().regex(/^[A-Za-z0-9]{12,22}$/)

// ── Time ───────────────────────────────────────────────────────────────────

/** ISO 8601 date — YYYY-MM-DD. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** ISO 8601 datetime with timezone. */
export const isoDateTimeSchema = z.string().datetime({ offset: true })

// ── Locale ─────────────────────────────────────────────────────────────────

export const localeSchema = z.enum([
  'en',
  'zh',
  'zh-Hant',
  'ja',
  'ms',
  'ko',
  'de',
  'es',
  'vi',
  'th',
])
export type Locale = z.infer<typeof localeSchema>

/** Subset of locales currently supported by Fēng / Yuán / HexAstral V1. */
export const v1LocaleSchema = z.enum(['en', 'zh', 'zh-Hant', 'ja'])
export type V1Locale = z.infer<typeof v1LocaleSchema>

// ── Pagination ─────────────────────────────────────────────────────────────

/**
 * Standard pagination cursor + limit. Add to list endpoint query params:
 *
 *   const { limit, cursor } = paginationSchema.parse(c.req.query())
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

export type Pagination = z.infer<typeof paginationSchema>

// ── Birth data ─────────────────────────────────────────────────────────────

/** Shichen index (0–12): 0 = unknown, 1–12 = 子丑寅卯辰巳午未申酉戌亥. */
export const timeIndexSchema = z.int().gte(0).lte(12)

/** Gender — DB enum + analysis primitive. */
export const genderSchema = z.enum(['男', '女'])
export type Gender = z.infer<typeof genderSchema>

/** Full person birth — used by bonds, pair, natal, physiognomy. */
export const personBirthSchema = z.object({
  name: z.string().min(1).max(80),
  birthSolarDate: isoDateSchema,
  birthTimeIndex: timeIndexSchema,
  gender: genderSchema,
})
export type PersonBirth = z.infer<typeof personBirthSchema>

// ── Lat/Lng (geographic) ───────────────────────────────────────────────────

export const latSchema = z.number().gte(-85).lte(85)
export const lngSchema = z.number().gte(-180).lte(180)
export const latLngSchema = z.object({ lat: latSchema, lng: lngSchema })

// ── Degree (0..360, true-north convention) ─────────────────────────────────

export const facingDegSchema = z.number().gte(0).lt(360)
