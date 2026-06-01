/**
 * Portfolio growth funnel — shared event shape for web + native clients.
 * Ingestion (Workers, analytics vendors) should validate with {@link GrowthFunnelEvent}.
 */

import { z } from 'zod/v4'

/** Where the event was emitted */
export type GrowthEventSource = z.infer<typeof GrowthEventSource>
export const GrowthEventSource = z.enum(['web', 'ios', 'android', 'api'])

/** Fields present on every funnel event */
export type GrowthFunnelEventBase = z.infer<typeof GrowthFunnelEventBase>
export const GrowthFunnelEventBase = z.object({
  event_id: z.string().max(80),
  occurred_at_ms: z.number().int(),
  source: GrowthEventSource,
  /** Web route group, or native screen key */
  surface: z.string().max(48).optional(),
  /** Unified account id when authenticated (cross-app graph; optional until SSO ships everywhere) */
  user_id: z.string().max(64).optional(),
  anonymous_id: z.string().max(64).optional(),
  session_id: z.string().max(64).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  ddl_token: z.string().max(80).optional(),
  target_app: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
})

export type WebPageViewEvent = z.infer<typeof WebPageViewEvent>
export const WebPageViewEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('web_page_view'),
  payload: z.object({
    pathname: z.string().max(512),
    referrer: z.string().max(1024).optional(),
    title: z.string().max(256).optional(),
  }),
})

export type WebCtaClickEvent = z.infer<typeof WebCtaClickEvent>
export const WebCtaClickEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('web_cta_click'),
  payload: z.object({
    cta_id: z.string().max(128),
    href: z.string().max(1024).optional(),
    pathname: z.string().max(512).optional(),
  }),
})

export type DdlSessionCreatedEvent = z.infer<typeof DdlSessionCreatedEvent>
export const DdlSessionCreatedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('ddl_session_created'),
  payload: z.object({
    landing_path: z.string().max(512).optional(),
    app_store_target: z.string().max(64).optional(),
  }),
})

export type AppOpenEvent = z.infer<typeof AppOpenEvent>
export const AppOpenEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('app_open'),
  payload: z.object({
    app_version: z.string().max(32).optional(),
    build_number: z.string().max(32).optional(),
    ddl_resolved: z.boolean().optional(),
  }),
})

export type AppInstallAttributedEvent = z.infer<typeof AppInstallAttributedEvent>
export const AppInstallAttributedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('app_install_attributed'),
  payload: z.object({
    attribution_provider: z.string().max(64).optional(),
    first_open_ms: z.number().int().optional(),
  }),
})

export type FirstReadingStartedEvent = z.infer<typeof FirstReadingStartedEvent>
export const FirstReadingStartedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('first_reading_started'),
  payload: z.object({
    reading_kind: z.string().max(64),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
})

export type FirstReadingCompletedEvent = z.infer<typeof FirstReadingCompletedEvent>
export const FirstReadingCompletedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('first_reading_completed'),
  payload: z.object({
    reading_kind: z.string().max(64),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
})

export type PurchaseCompletedEvent = z.infer<typeof PurchaseCompletedEvent>
export const PurchaseCompletedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('purchase_completed'),
  payload: z.object({
    product_id: z.string().max(128),
    currency: z.string().max(8).optional(),
    amount_cents: z.number().int().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
})

export type SubscriptionStartedEvent = z.infer<typeof SubscriptionStartedEvent>
export const SubscriptionStartedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('subscription_started'),
  payload: z.object({
    product_id: z.string().max(128),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
})

/** Native portfolio app claimed a DDL session after install (KV session read) */
export type PortfolioDdlClaimedEvent = z.infer<typeof PortfolioDdlClaimedEvent>
export const PortfolioDdlClaimedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('portfolio_ddl_claimed'),
  payload: z.object({
    has_meta_payload: z.boolean(),
    landing_path: z.string().max(512).optional(),
    /** Key from DDL meta.payload if present */
    payload_source: z.string().max(64).optional(),
  }),
})

/** User linked Sign in with Apple on a satellite shell (credential stored locally until server SSO) */
export type PortfolioAppleLinkedEvent = z.infer<typeof PortfolioAppleLinkedEvent>
export const PortfolioAppleLinkedEvent = GrowthFunnelEventBase.extend({
  event_name: z.literal('portfolio_apple_linked'),
  payload: z.object({
    /** True when credential.user is non-empty opaque Apple subject */
    credential_present: z.boolean(),
  }),
})

/** Discriminated funnel events (web visit → DDL → install → first reading → revenue) */
export type GrowthFunnelEvent = z.infer<typeof GrowthFunnelEvent>
export const GrowthFunnelEvent = z.discriminatedUnion('event_name', [
  WebPageViewEvent,
  WebCtaClickEvent,
  DdlSessionCreatedEvent,
  AppOpenEvent,
  AppInstallAttributedEvent,
  FirstReadingStartedEvent,
  FirstReadingCompletedEvent,
  PurchaseCompletedEvent,
  SubscriptionStartedEvent,
  PortfolioDdlClaimedEvent,
  PortfolioAppleLinkedEvent,
])

export function parseGrowthFunnelEvent(input: unknown): GrowthFunnelEvent {
  return GrowthFunnelEvent.parse(input)
}

export function safeParseGrowthFunnelEvent(input: unknown) {
  return GrowthFunnelEvent.safeParse(input)
}
