import { z } from 'zod/v4'

export const AdVendorSchema = z.enum(['meta', 'google', 'tiktok', 'reddit'])
export type AdVendor = z.infer<typeof AdVendorSchema>

export const AdConvertEventNameSchema = z.enum([
  'PageView',
  'Lead',
  'Purchase',
  'Subscribe',
  'ViewContent',
  'CompleteRegistration',
])
export type AdConvertEventName = z.infer<typeof AdConvertEventNameSchema>

export const AdConvertMessageSchema = z.object({
  event_id: z.string().min(8).max(128),
  event_name: AdConvertEventNameSchema,
  occurred_at_ms: z.number().int().positive(),
  action_source: z.enum(['website', 'app']),
  target_app: z.string().max(64).optional(),
  click_ids: z.record(z.string(), z.string()).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().max(8).optional(),
  user_id: z.string().max(128).optional(),
  /** Limit fanout; omit = all configured vendors */
  vendors: z.array(AdVendorSchema).optional(),
  client_user_agent: z.string().max(512).optional(),
  client_ip: z.string().max(64).optional(),
})

export type AdConvertMessage = z.infer<typeof AdConvertMessageSchema>

export interface Env {
  SVC_ADMIN_NOTIFY: Fetcher
  ALERT_KV: KVNamespace
  META_PIXEL_ID?: string
  META_ACCESS_TOKEN?: string
  META_TEST_EVENT_CODE?: string
  GOOGLE_MEASUREMENT_ID?: string
  GOOGLE_API_SECRET?: string
  TIKTOK_PIXEL_ID?: string
  TIKTOK_ACCESS_TOKEN?: string
  TIKTOK_TEST_EVENT_CODE?: string
  REDDIT_PIXEL_ID?: string
  REDDIT_CONVERSIONS_TOKEN?: string
}

export type VendorResult =
  | { vendor: AdVendor; status: 'skipped'; reason: string }
  | { vendor: AdVendor; status: 'ok' }
  | { vendor: AdVendor; status: 'auth_error'; httpStatus: number; body: string }
  | { vendor: AdVendor; status: 'transient_error'; httpStatus?: number; body: string }
  | { vendor: AdVendor; status: 'config_error'; reason: string }
