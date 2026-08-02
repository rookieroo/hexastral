# Yuel — pre-submit device smoke

Run on a **production-profile** (or current dev-client with latest JS) before App Store submit.

**MVP monetization (2026-08-01):** three products — `kindred_pro_monthly` / `kindred_pro_annual` (entitlement `kindred_pro`) + one-time `hexastral_compatibility` (per-bond unlock). Pro includes personal 命书, monthly layer, living layer, and **3** synastry unlocks/mo; AI chat is a **monthly allowance**, not unlimited.

**Prereqs:** latest JS with invite UL harden (`+native-intent` + `app/resonate/[token]`); notifications allowed for push steps.

---

## 1. Invite Universal Link / AirDrop / web CTA

1. Create invite on device A → share HTTPS `https://yuel.hexastral.com/resonate/{token}`.
2. Device B **with app installed**:
   - AirDrop / Messages tap → lands on **accept** modal (birth form), **not** Unmatched Route.
   - Web landing 「Open in app」 → same accept screen.
3. Device **without app** (or delete + reinstall): web → DDL → App Store path; cold start resumes `/accept/{token}`.

---

## 2. Home / threads

1. Cold launch → onboarding or home.
2. Empty threads → invite CTA works; FAB VoiceOver = localized `bondList.add` (EN: "New thread").
3. Upcoming strip: loading copy while `pushFuel === null`, then list or empty CTA.

---

## 3. Bond unlock + Pro quota

1. Create / open a locked synastry report.
2. With **Pro**: unlock (or birth recompute) consumes 1 of **3** monthly synastry unlocks; after exhaustion, fall through to one-time `hexastral_compatibility`.
3. Without Pro: purchase path offers one-time unlock and/or Pro paywall (both are MVP-valid).
4. After unlock: chapters readable; PushFuelDisclosure bond-scoped (not user-wide remaining).

---

## 4. Timeline push tap

1. With a Pro/unlocked timeline notification (or simulated `data.route`).
2. Tap → opens `/(timeline)…` (not silently dropped).

---

## 5. Settings / legal / delete

1. Settings → Privacy / Terms → `yuel.hexastral.com` with correct locale (`zh-Hant` → `/tw/…`).
2. Sign out confirm works.
3. **Delete account** → server purge + re-onboard (bonds gone).

---

## 6. Yuun → Yuel carry-over

1. Yuun: sign in → full 亲友 → transfer `pushed === 1`.
2. Yuel: same Apple/Google → bond appears; incomplete 亲友 skipped; re-open Yuun → no duplicates.
3. Home carry-over banner once if applicable.

---

## 7. Legal URLs (curl)

```bash
for seg in '' zh tw ja; do
  base="https://yuel.hexastral.com${seg:+/$seg}"
  curl -sI "$base/privacy/yuel" | head -1
  curl -sI "$base/terms" | head -1
done
```

---

## Automated preflight

```bash
bun typecheck --filter=@zhop/kindred-app --filter=@zhop/scenario-kindred --filter=@zhop/core-ui
bun test apps/kindred-app/lib/native-intent.test.ts apps/kindred-app/lib/timeline-push.test.ts
```

Related: [pre-submit-audit.md](./pre-submit-audit.md) · [publish/launch-checklist.md](../../publish/launch-checklist.md)
