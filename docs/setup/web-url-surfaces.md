# Web URL surfaces + merchant conversion postback

SSOT for brand acquisition URLs, first-party attribution cookies, browser pixels, and internal CAPI-style postbacks (`svc-ad-convert`).

**Product boundary:** HexAstral as merchant sending conversion signals to Meta / Google / TikTok / Reddit for analysis and bid optimization. Not an Ads SaaS, MMP, or public conversion API.

---

## URL policy

| Surface | URL | Role tag | Browser pixels | Server postback |
|---|---|---|---|---|
| Brand acquisition | `{brand}.hexastral.com/?utm_*` (+ click ids) | `brand_acq` | Yes (if pixel env set) | CTA + INITIAL purchase |
| Thin LP acquisition | `/lp/yuel`, `/lp/yuun`, `/lp/kanyu`, … | `lp_acq` | Yes | CTA (optional) |
| Owner reopen | `/lp/hexagram/*` (Yaul self-reopen) | `lp_reopen` | No | No |
| Legal | `/privacy/*`, `/terms` | `legal` | No | No |
| Yuel viral invite | `/resonate/{token}` | `resonate` | Default no | No |

Brand hosts: `yuel` / `yuun` / `kanyu` / `yaul` / `syel` `.hexastral.com`. Engineering ids (`kindred`, `auspice`, `feng`, …) stay in API / RC / DDL `targetApp`.

---

## First-party cookies (middleware)

Set by [`apps/hexastral-web/middleware.ts`](../../apps/hexastral-web/middleware.ts) (30 days, `SameSite=Lax`):

| Cookie | Contents |
|---|---|
| `growth_utm` | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id` (last-click merge) |
| `growth_click_ids` | `fbclid`, `gclid`, `ttclid`, `rdt_cid`, `_fbp`, `_fbc` (last-click merge) |

DDL create merges both into session `meta` via `@zhop/ddl-client` (`mergeUtmForDdl`, `mergeClickIdsForDdl`).

---

## Channels (P0)

| Channel | Browser | Server (`svc-ad-convert`) | Click / match keys |
|---|---|---|---|
| Meta | Pixel | Conversions API | `fbclid`, `_fbp`, `_fbc` |
| Google | gtag / Ads | Enhanced Conversions / MP | `gclid` |
| TikTok | Pixel | Events API | `ttclid` |
| Reddit | Pixel | Conversions API | `rdt_cid` + `conversion_id` (= `event_id`) |

Unset Pixel ID / access token → **silent no-op** (log only). Do not Telegram-alert for “channel not configured”.

Web env (public Pixel IDs only): `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `NEXT_PUBLIC_REDDIT_PIXEL_ID`.

Worker secrets (svc-ad-convert): `META_PIXEL_ID`, `META_ACCESS_TOKEN`, `GOOGLE_ADS_*` / MP credentials, `TIKTOK_PIXEL_ID`, `TIKTOK_ACCESS_TOKEN`, `REDDIT_PIXEL_ID`, `REDDIT_CONVERSIONS_TOKEN` — see `services/svc-ad-convert/.env.example`.

---

## Conversion rules (RevenueCat)

| Event | Growth AE (optional) | Ad postback |
|---|---|---|
| Web Store CTA | — | **Lead** — has click ids from cookies |
| `portfolio_ddl_claimed` | Yes | Anon upload of click ids → D1 `user_growth_attributions` |
| Apple / Google login | Yes | **CompleteRegistration** + re-key anon → `user_id` |
| `INITIAL_PURCHASE` (sub or consumable / single) | Yes | **Purchase / Subscribe** — RC `event.id` + joined click ids |
| `RENEWAL` / `PRODUCT_CHANGE` / `UNCANCELLATION` | May emit funnel | **No** (avoids ROAS inflation) |
| Cancel / expire | Ops alerts only | No |

### Why DDL → login → IAP matters

Landing pixels only see **CTA / App Store jump**. Real revenue events happen in-app. Flow:

1. Web CTA writes DDL `meta.clickIds` + enqueues Lead  
2. App claims DDL → `POST /api/growth/attribution/anon`  
3. SSO → `POST /api/growth/attribution` (HMAC) merges onto `user_id`, optional CompleteRegistration  
4. RC INITIAL → webhook loads attribution by `user_id` → CAPI Purchase/Subscribe with same click ids  

Web Store CTA uses a client-generated UUID as shared `event_id` for pixel + server enqueue dedupe.

---

## Architecture

```
Ad click → brand / lp_acq web
  → cookies (utm + click ids)
  → browser pixels (View / CTA)
  → DDL session (meta.clickIds)
  → POST /api/growth/ad-convert (Lead) → AD_CONVERT_QUEUE → svc-ad-convert

App install → resolve DDL
  → POST /api/growth/attribution/anon (click ids by anonymous_id)

SSO login
  → POST /api/growth/attribution (HMAC, re-key → user_id)
  → optional CompleteRegistration postback

RevenueCat INITIAL_PURCHASE
  → webhook loads user_growth_attributions by user_id
  → enqueue Purchase/Subscribe WITH click_ids → same queue → vendors
```

`growth-funnel` / Analytics Engine remain first-party analytics. They are **not** the postback transport. Do not trigger CAPI from anonymous `/api/growth/events`.

---

## Admin alerts (`svc-admin-notify` → Telegram)

Reuse [`alertAdmin`](../../apps/hexastral-api/src/lib/admin-alert.ts). Throttle key `ad_convert_alert:{vendor}:{kind}` TTL 1h on GUARD_KV (api) / shared KV (svc).

| Scenario | Level | Emitter |
|---|---|---|
| Queue retries exhausted / permanent consumer failure | `critical` | `svc-ad-convert` |
| Vendor configured but sustained 401/403 | `critical` | `svc-ad-convert` |
| Vendor 5xx / timeout after retries | `error` | `svc-ad-convert` |
| Enqueue fail on INITIAL purchase | `critical` | `hexastral-api` |
| Enqueue fail on Web CTA | `error` | `hexastral-api` |
| Channel marked enabled but missing secret | `critical` | `svc-ad-convert` |

**Silent (no Telegram):** channel unset; transient retry then success; missing click ids (log only); browser pixel failure; renewals not posted.

---

## Privacy checklist

Satellite privacy appendices must not claim “No ads” once paid measurement is live. Prefer: no IDFA / no cross-app advertising trackers / conversion measurement may use server-side postbacks and first-party cookies. Update [`satellite-privacy-appendices.ts`](../../apps/hexastral-web/lib/legal/satellite-privacy-appendices.ts) when enabling pixels in production.

---

## Ops smoke

1. Create queues (once per account):
   ```bash
   cd apps/hexastral-api && bunx wrangler queues create ad-convert
   bunx wrangler queues create ad-convert-dlq
   ```
2. Deploy `svc-ad-convert`, then `hexastral-api` (producer binding), then `hexastral-web`.
3. Hit brand URL with `?utm_source=test&fbclid=test` → confirm cookies + DDL meta.
4. Platform Test Events for each configured pixel / CAPI.
5. Force vendor 401 or enqueue failure → expect one Telegram alert (throttled).

### Local verification (no deploy)

```bash
cd services/svc-ad-convert && bun run typecheck
cd apps/hexastral-api && bun run typecheck
cd apps/hexastral-web && bun run typecheck
cd apps/hexastral-web && bunx vitest run lib/ads/surface.test.ts
```

Production Test Events + Telegram failure drill require Pixel tokens and a deployed queue — run after secrets sync.