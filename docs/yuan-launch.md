# Yuán / 緣 — June 2026 launch checklist

**Bundle:** `com.hexastral.yuan` · **Display name:** Yuán (or 緣 in CJK locales)

Yuán is the relationships product — a user-centred multi-bond graph with 八字 合婚 + relationship-timeline reading. Its **acquisition moat is Auspice**: every Pro Auspice user has already sketched their 亲友, and those are carry-over into Yuán automatically.

---

## State (early June)

**Backend (`hexastral-api`):**
- `/api/bonds/*` HMAC-gated; `POST /bonds/solo` accepts `{ targetName, relationshipLabel, targetBirth, language }`
- `bonds-timeline` composer (`composeBondsTimeline` in astro-core) — yearly / monthly / daily windows
- `relationship-timeline.ts` route for the Pro reading

**App (`apps/yuan-app`):**
- Bonds home + invite/solo create flow
- Onboarding wizard, IAP via RC, settings with Apple sign-in already wired (the canonical sign-in pattern Auspice now mirrors)
- Bonds receive path: when a user signs into Yuán with an identity that has bonds already in the portfolio, they appear (the `transferCyclePeopleToBonds` push from Auspice is what populates them)

---

## June-launch open work

### Verify the Auspice carry-over actually lands
- [ ] In Auspice: sign in → record one fully-specified 亲友 (date + 时辰 + gender) → confirm bonds push success (`pushed === 1`)
- [ ] In Yuán: sign in with the same Apple/Google account → confirm the 亲友 shows up as a bond
- [ ] Edge case: skipped people (year-unknown / no 时辰 / no gender) DO NOT push — confirm `TransferResult.skipped` count matches
- [ ] Idempotency: re-open Auspice → no duplicate pushes (`cycle.bonds.transferred` set holds them)
- [ ] Pricing: Yuán's IAP unlocks the deep readings; verify universe_pro from Auspice also unlocks Yuán surfaces

### App Store Connect
- [ ] App Store Connect record (display name: **Yuán** or 緣 for CJK locales, subtitle: 关系 / Relationships, category: Lifestyle)
- [ ] Apple Sign In capability on the bundle id
- [ ] Privacy nutrition labels: collected = identity (Apple/Google email), Purchases, Contacts-derived (the 亲友 birthdays the user typed). No tracking.
- [ ] ASO: name + subtitle + 4-locale keywords + description
- [ ] Screenshots — covered in `launch-checklist.md`

### Build + smoke
- [ ] Standard `bun install` → `bun run prebuild` → `bun ios` flow
- [ ] On-device smoke: cold-install Yuán → sign in → bonds appear → run a 合婚 reading → subscription gating works
- [ ] Independent flow (no Auspice install): create a solo bond manually in Yuán → reading runs

### Polish (known gaps, prioritized for June)
- [ ] Verify the bond-language hardcoded `'zh-CN'` from Auspice's transfer doesn't break Yuán's non-zh-Hans rendering (Yuán fetches its own locale; the transferred bond is just data)
- [ ] First-open empty state when there ARE bonds-from-portfolio waiting on first sign-in (a "we brought these over from your 亲友" affordance)

### Post-launch (NOT June)
- Real-time Bond sync (write the other direction back to Auspice)
- Cross-app deep links from Auspice → Yuán reading
- Bonds graph extensions (more relation kinds, group readings)
