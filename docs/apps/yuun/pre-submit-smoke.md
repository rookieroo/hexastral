# Yuun — pre-submit device smoke

Run on a **production-profile** build before App Store submit. Each step maps to an ASO description claim.

**Prereqs:** device with notifications allowed; optional Pro sandbox account for steps marked Pro.

---

## 1. First launch & Today almanac

1. Cold launch → **Welcome** screen (date-led, almanac copy).
2. Tap **Open today** → **Today** home.
3. Confirm: week strip, **yi/ji** chips visible, **For you** card (verdict or birth CTA).
4. Bottom hints: Calendar (left), Settings (right) — text only, no header icons.

**ASO:** Today yi/ji + week strip.

---

## 2. Calendar navigation

1. On Today, **swipe right** → `/calendar` (slides from left).
2. Month grid shows solar + lunar + 节气 + festivals.
3. **Swipe left** on Calendar → returns to Today.

**ASO:** Swipe right for month calendar.

---

## 3. Settings & Library

1. On Today, **swipe left** → Settings (`/(tabs)/me`).
2. Open **Library** → all six entries reachable (reading, timeline, make-if, event, people, glossary).
3. Open **glossary** → 24 solar terms / festivals content loads.

**ASO:** Settings → Library culture library.

---

## 4. Locale (en)

1. Switch app language to **English**.
2. Today + Calendar: solar terms in **English/pinyin**, not raw Chinese-only labels.
3. Lunar sub-labels use day names (no `L5` prefix).
4. Month grid: no en rating cell shading.

**ASO:** Four languages; localized calendar display.

---

## 5. Paywall vs ASO Pro list

1. Trigger paywall (For you reasons lock, timeline, or reading).
2. Confirm **four** `proBenefits` bullets match ASO Pro section (same order/meaning).
3. Footer shows `legalDisclaimerShort`.

**ASO:** Free vs Pro section.

---

## 6. Free tier gates

1. **Yi/ji:** full list visible without Pro.
2. **For you:** summary visible; per-reason detail locked (paywall).
3. **Event / 择日:** free window ~30 days, top 3 dates.
4. **People:** add 4th person → birthday reminder cap nudge (3 free).

**ASO:** Free tier bullets.

---

## 7. Legal links

1. Settings → **Legal** → Privacy → opens `yuun.hexastral.com/.../privacy/auspice` (200).
2. Terms → opens `.../terms` (200).

**ASO:** About section URLs.

---

## 8. Push deep link (optional)

1. Enable daily push in Settings.
2. Receive notification → tap → lands on **Today** with **For you** in view (`focus=personal`).

**ASO:** Daily push + For you layer.

---

## 9. Pro-only (sandbox)

- Timeline (`/timeline`) and reading (`/reading`) open with Pro.
- Personal calendar `webcal://` subscribes (requires backend + `CYCLE_CALENDAR_SECRET` in prod).

---

## Automated preflight (repo)

```bash
bun typecheck
bun run aso:charcount
bun run aso:parity
node scripts/assert-release-config.mjs   # before EAS production submit only
```
