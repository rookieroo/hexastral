# ADR-0027: Bond (合盘) credit + per-reader-locale economy

- Status: Accepted
- Date: 2026-06-24
- Builds on: [ADR-0014](0014-bonds-timeline-architecture.md) (bonds), [ADR-0021](0021-kindred-v2-solo-first-mingpan-frame.md) (kindred solo-first)

## Context

The 合盘 bond report has three cost surfaces that were partly implicit, and one
unmetered abuse vector. Facts today (`apps/hexastral-api/src/routes/bonds.ts`):

- `FREE_SOLO_FULL_READS = 2` — the first 2 **solo** bonds get the full report free;
  then teaser + single-purchase / invite-credit. (This is the "2" — it is solo-only,
  NOT an invite pool.)
- Invites **earn** (not consume) 1 credit each side on accept; credits are spent later
  to unlock a teaser bond.
- **New-user invite** (`accepterIsNew` = 0 prior bonds) → both sides unlock the full
  report **free** (acquisition).
- The report is **symmetric** (pair-level — `/pair/compute` takes both charts). Each
  reader's mirror is generated in their account locale at accept; only the AI prose
  differs by language.
- `GET /:id?lc` auto-regenerates the whole report whenever the device locale ≠ the
  stored language (`maybeRelocalizeReading`) — **free + unmetered**, so it re-generates
  on every device-locale toggle (a real cost + abuse vector).

## Decision

### 1. Cost is per (relationship × first language), not per reader-action

- **New-user invite → both sides full + free**, in both natives (the acquisition IS the
  payment). *(Already implemented via `accepterIsNew`.)*
- **Solo → the existing 2-free-then-pay quota**, unchanged.
- **Existing-user invite → one charge** (the owner's unlock / earned credit) covers the
  bond in **both** readers' native languages. Do NOT double-charge a couple because they
  speak different languages — it is one relationship of value, and the marginal
  second-language generation is small next to the unlock's worth (model "B").

### 2. Per-reader locale is personalize-once-then-freeze

- Each reader's mirror is personalized to their locale **once** (account locale at
  accept, or the first device-locale read), then **FROZEN** (a `localeLocked` flag in the
  interpretation JSON).
- A later device-locale change does **not** auto-regenerate — this kills the
  malicious-toggle re-gen and keeps history stable. Auto re-gen is bounded to ≤1 per
  reader (the first personalization).
- To read in a different language **after** the freeze: an **explicit, metered** action
  (`POST /api/bonds/:id/relocalize`) that spends the existing **`reroll` allowance**
  (5/month Pro) — the bond-report sibling of the solo chapter reroll (which is solo-only
  today). No new quota type.

## Consequences

- The bond unlock buys the relationship in each side's native tongue; switching languages
  later is the metered reroll.
- Reuses the `reroll` economy; no new credit type, no schema migration (the lock flag
  rides the existing interpretation JSON).
- Deliberate change to the 00f541b "report follows each reader's device locale" behaviour:
  it now follows the device locale **once**, then freezes (anti-abuse, by design).
- A reader who wants to switch language twice hits the metered path — acceptable; the
  free path is "your native tongue, once."

## References

- `apps/hexastral-api/src/routes/bonds.ts` — `maybeRelocalizeReading`, `POST /:id/relocalize`,
  `GET /:id`, `accepterIsNew`, `FREE_SOLO_FULL_READS`, `bondInviteCredits`
- `apps/hexastral-api/src/services/pro-allowance.ts` — `PRO_MONTHLY_LIMITS.reroll`
- `apps/hexastral-api/src/routes/report.ts` — the solo chapter reroll (the sibling)
