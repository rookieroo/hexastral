# Feng V1 — Human deploy checklist

Engineering items that **cannot** be completed in code alone. Run after
`bun typecheck` + feng golden tests are green on `main`.

Last updated: **2026-07-10**.

---

## 1. Premium IAP (`hexastral_feng_premium`)

- [ ] App Store Connect: create non-consumable **$39.99** SKU for flat/villa tier
- [ ] RevenueCat: map product → `hexastral_feng_premium` entitlement
- [ ] Flip `PREMIUM_SKU_PROVISIONED = true` in
      [`apps/feng-app/lib/feng-pricing-client.ts`](../../apps/feng-app/lib/feng-pricing-client.ts)
- [ ] EAS production build + TestFlight purchase smoke (apartment $9.99 + premium $39.99)

Ref: [deploy-acceptance.md](./deploy-acceptance.md) §5, [optimization-progress.md](./optimization-progress.md).

---

## 2. D1 migrations (production)

- [ ] Confirm `0020_outgoing_dracula.sql` (`feng_sites.residence_type`) applied on prod
- [ ] Confirm `0021` (`input_meta`) applied if not already
- [ ] Command (human approval only): `cd apps/hexastral-api && bun db:migrate:prod`

---

## 3. Mapillary street 形煞 (optional, gated)

- [ ] Legal review complete — [deploy-acceptance.md](./deploy-acceptance.md) §6
- [ ] `cd services/svc-feng && bunx wrangler secret put MAPILLARY_TOKEN`
- [ ] Redeploy `svc-feng` + smoke one flat/villa report with street attribution footer

**Default**: OFF without token (fail-open degraded). Apartment tier never calls street pass.

---

## 4. Staging full-chain smoke (3 residence types)

One end-to-end report each on staging API + TestFlight build:

| Type | Checks |
|------|--------|
| **apartment** | No street pass; optional skip floor plan → exterior-only closing note |
| **flat** | Premium IAP or test entitlement; Mapillary if token set |
| **villa** | Multi-floor plan upload; combinations chips on flying stars chapter |

Spot-check against [acceptance-standard.md](./acceptance-standard.md) red flags (no 旺煞误读).

---

## 5. Worker deploy order

```bash
cd services/svc-feng && bun deploy
cd apps/hexastral-api && bun deploy
# feng-app: eas build --profile production --platform ios
```

---

## Launch definition (V1)

- Device smoke (3 types) + golden harness green + docs/ASO match implementation
- IAP live for both tiers
- **No** external 风水师 sign-off gate
