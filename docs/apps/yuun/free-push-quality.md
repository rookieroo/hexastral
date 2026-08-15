# Yuun Free push quality — audit + repetition handling

Status: 2026-07 · SSOT: [push-retention-playbook.md](../../setup/push-retention-playbook.md) ·
render: `renderAuspicePush` in `apps/hexastral-api/src/routes/auspice.ts` · client catalog:
`apps/auspice-app/lib/pushRegistry.ts`.

## What free users actually receive today

| Slot | Who | Content | Repetition risk |
|---|---|---|---|
| 08:00 daily | Anonymous (public tier) | Title `{干支}日` (+节气/节日) · body `宜 X、Y、Z · 忌 A、B、C` (top-3, deterministic `buildDay`) | **High** — see below |
| 08:00 daily | Signed-in Free | Same body + `· 你{吉/平/凶}` in title; **en** leads with the rotating corpus `dailyHook` instead of the 干支 label | **Medium** for zh/ja (宜忌 body still repeats; only the fit verdict varies), **Low** for en |
| 20:00 evening | Free | Event-driven only: tomorrow is a 节气/节日 → heads-up; otherwise **silent** | Low — ~30 events/year |
| Birthday | Free (≤3 亲友) | Static "还有 N 天 / 明天 / 今天" per person | None — fires ≤2× per person per year |
| Timeline node | Pro only | 流月/流年/大运 teaser | N/A (not free) |

## Why the 08:00 body repeats for long-term users

1. **60-day 干支 cycle** — the same day-pillar returns every 60 days; the day-signature
   (干支 × 建除 × 宿) that drives 宜忌 is a bounded set, so the same top-3 verb triplets
   recur regularly.
2. **Fixed top-3 truncation** — `slice(0, 3)` collapses days that share the first three
   宜/忌 verbs into the *same rendered body*, even when the full day differs.
3. **No per-device variation, no send history** — every subscriber renders the identical
   string for a given day (the en `dailyHook` is the exception: `rotateIndex` in
   `@zhop/astro-i18n` already rotates it by calendar-day ordinal).
4. The local fallback (`lib/push.ts` `dailyContent`) has the same fixed `slice(0, 1)` shape,
   but it only runs when server registration fails — the server path is primary.

## What was fixed (this pass)

**Variant space (24 deterministic variants).** `pushVariation(deviceId, dateStr, offset)`
in `auspice.ts` — per-device-per-day variation applied to the free morning body:

- 宜/忌 window rotates **3 / 4 / 5** verbs per side.
- CJK locales rotate in a **冲X煞Y** clause (standard almanac annotation already shown
  on the day card); en keeps its minimal gloss path.
- CJK locales rotate a **third clause**: 值神 (day god) / 彭祖忌 (Peng Zu taboo) / `宿`
  (lunar mansion) — one extra deterministic fact per day, zero LLM.
- Signed-in CJK users get the corpus **dailyHook headline appended to the body**
  (`@zhop/astro-i18n` templates exist for all four locales); the title KEEPS the
  干支-day convention — the hook supplements, never replaces.
- `offset` walks the fixed variant space — used by the repeat guard below.

**No-verbatim-repeat guard.** `auspice_push_subs.last_body_key` (migration **0039**)
stores the hash of the last rendered daily push (title+body). `GET /push/targets`
compares at render time and advances through the variant space when the body would
repeat, then writes the new key back. Render-time bookkeeping: a failed send can only
cost a little variety, never an extra message. (Cron fires once per slot per day, so
the write happens once per device per day.)

**Client local-fallback parity.** `lib/push.ts` `dailyContent` now mirrors the same
variation (deviceId-seeded hash, 3/4/5 verb window + 冲煞 + 值神/彭祖/宿) for the rare
window where server push isn't registered; `AuspiceDay` gained optional
`dayGod` / `pengZu` fields (already present in the payload).

No LLM anywhere; the only schema change is one nullable text column. Coverage lives in
`apps/hexastral-api/src/routes/cycle.test.ts` (`pushVariation — free push repetition guard`).

## Remaining repetition / quality work (decide before long-term cohorts age)

1. **zh/ja lead WITH the hook instead of 干支日** — pure copy decision, not engineering:
   the corpus is wired for all four locales, but zh deliberately leads with 干支日 today.
   Current compromise: 干支 title + hook line appended to the body. If zh users rate the
   hook higher in testing, flip the title in `renderAuspicePush` (one branch).
2. **Push metrics (the real DAU gap — 重点建设).** Nothing tracks delivery / opens today:
   `svc-tail` only aggregates logs. To invest in push as the DAU lever you need, at minimum:
   - delivery receipts: Expo push receipts from svc-notify → D1 (delivered/error per send);
   - open attribution: the push data already carries `day` / `hookKey` / `type` — have the
     app fire a lightweight `POST /api/auspice/push/open` (or log to a metrics table) on
     cold-start-from-push, then A/B the variants (`hookKey` exists for exactly this);
   - a weekly per-slot send/open table (device, slot, body key) to measure which clauses
     drive opens. This is a small worker + one D1 table + a client hook — spec it before
     building anything else on top.
3. **en anonymous body** stays the minimal 宜忌 gloss (no extra clauses, no corpus without
   a birth subject). If en DAU lags, extend the corpus hook to anonymous en via the
   deviceId seed — copy work, not engineering.
4. **Do not** add send-time LLM or "come do a reading" filler — the playbook's rule
   (deterministic calendar; silence over spam) stays; repetition is handled by
   deterministic variation, not noise.

## Quality notes (not repetition, but observed in the same audit)

- zh/ja 宜忌 verbs in push stay CJK (documented v1 limitation); in-app shows localized
  glosses — the push is zh-first by design, acceptable for launch.
- Evening slot is already non-repetitive by construction (event-driven); keep it.
- Birthday push is the highest-value free push (real-world action, never repetitive) —
  protect its ≤3 cap and keep it out of any future spam budget.
