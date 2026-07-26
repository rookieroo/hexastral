# Push retention playbook — Yuun / Yuel / Syel

**Status:** living SSOT for push fuel + cron send (2026-07).  
**Principle:** send-time never calls LLM; Yuun stays deterministic calendar; Yuel/Syel harvest dated windows at reading time.

Related: [api-cron-cache-eval.md](./api-cron-cache-eval.md) · ADR-0025 (Kindred queue) · ADR-0028 (Syel).

---

## Alignment (what to copy from Yuun)

| Copy | Do not copy |
|---|---|
| Cron = Expo only (no LLM) | Daily `buildDay` 宜忌 as primary surface for Yuel/Syel |
| Timezone pool + local-hour slots | Query-on-cron for report-derived copy |
| Deep link into owning surface | One shared `push_jobs` table across apps |
| Server-side Pro / entitlement on register + targets | Client-trusted `isPro` (Yuun still has a known debt — see Risk) |

```text
Reading complete ──► harvest (rules and/or LLM) ──► queue rows
                                                          │
Hourly svc-notify ──► pick ≤1 msg/user/slot ──► Expo ─────┘
Yuun only: buildDay / birthday / month-node at send time (no harvest LLM)
```

---

## Corpus quality & locale

- **Valuable situational push requires a reading** (oneshot completion push / Pro harvest both count). Never-read → **silence**. No “come do a reading” spam to fake DAU.
- **More readings → richer corpus:** Yuel = **union** across bonds/reports (caps); Syel = **latest Pro reading replaces** prior windows.
- **No cron LLM refill.** After dated/conditional fuel is exhausted → silence (Syel may still fire rule-based recapture on D25–D27 if Pro + registered).
- **Locale SSOT:** title/body language = **reading locale at harvest** → stored on queue row → send **verbatim**. Do not re-translate at cron. App UI locale change without a new reading does not rewrite old rows.
- **Prompt style:** fewer hard caps on count/length; stick to pair/physiognomy facts; compliance floor only (Syel non-medical; ADR-0003 no fatalism).
- Empty harvest → do not retry-spam; wait for the next reading. Syel **must not wipe** prior queued rows when the new window list is empty.

---

## Boundary decisions (product)

**Do not align Yuel/Syel daily push with Yuun’s almanac model.** Yuun can daily-push from birth; Yuel/Syel value is report-derived.

| # | Scenario | Fuel source | Behavior |
|---|---|---|---|
| ① | ~45d fuel exhausted, no new reading | Remaining queue until empty; then none | Cron **silence**. No send-time LLM. Syel rule recapture only if still Pro + in window. |
| ② | Birth only, never read | None | Yuel/Syel **no** situational server push. |
| ③ | Logged in, no birth | None | **Silence**. No “complete birth” server nag. |
| ④ | Logged out | N/A (account tokens) | Yuel/Syel **no** server push (unlike Yuun device-anon). |
| ⑤ | Pro expired, queue still has rows | Rows stay `queued` | Send skip (silent). Re-Pro may resume. Do **not** bulk-expire on expiry. |
| ⑥ | Pro expired, app not reopened | Syel `isPro` sticky until register | Accept silence until next open. |
| ⑦ | Free/oneshot ran LLM then dropped | — | Yuel situational = Pro only; Syel oneshot = `reading_ready` only. |
| ⑧ | Logout / push off | Delete token/sub | Do **not** clear queue (resume on re-login). |
| ⑨ | Bond soft-deleted | — | **Expire** that `bondId` queued rows. |
| ⑩ | Multi-bond same day | — | ≤1 / user / day; highest score. |
| ⑪ | Accept harvest locale | Per-side language | Inviter and accepter each get fuel in **their** language (not both accepter). Locales compared after collapse (`zh` ≡ `zh-CN`). **If languages differ and A cannot relocalize** (no inviter locale / no birthData) → **inviter silent** (do not inject accepter-language copy). |
| ⑫ | `/pair` harvest `bondId` null | — | Known gap; bind/backfill deferred. |
| ⑬ | Empty Syel replace | — | **Do not** expire-all when new windows empty. |
| ⑭ | Oneshot vs Pro window | — | Oneshot = `reading_ready` only. |
| ⑮ | Miss D25–D27 recapture | — | No rule recapture until next reading. |
| ⑯ | Mark `sent` before Expo | — | Optimistic loss accepted; retry deferred. |
| ⑰ | Syel 09 + 21 | — | **Day and evening may each send ≤1** if kinds differ (aligned with code). |
| ⑱ | Multi-device | — | One device / user / day wins. |
| ⑲ | TZ travel without re-register | — | Wrong slot until next register; accept. |
| ⑳ | Locale change, no new reading | Old queue | **No** retranslate. |

Deferred implementation (documented only): relationTier scoring, hard TTL, rest-theme cooldown ≥3d, `sourceReadingId`→bond resolve, Expo send rollback, KV vs D1 dual registry for Kindred events, waitUntil→await harvest.

---

## Per-app fuel

### Yuun (`auspice_push_subs`)
- **Slots:** 08 morning, 20 evening (eventful only), month-start 09 timeline (Pro).
- **Fuel:** deterministic almanac + `birthday_reminders` + node teaser. No reading-harvest LLM.
- **Deep links:** `day` → Today; timeline → `/timeline` (+ node); birthday → person when possible.

### Yuel (`kindred_push_queue` + `push_tokens`)
- **Slot:** 19:00 local, ≤1 / user / day.
- **Fuel:** union of harvest rows from active bonds/reports; same-day pick by priority (dated today > conditionals; relationTier scoring not yet implemented).
- **Caps:** ≤5 queued per bond; ≤20 queued per user; expire stale.
- **Row contract:** `fireOn | bondId | triggerKind | title | body | sourceReadingId | locale | status`.
- **Pro:** harvest + send require `kindred_pro` (or universe).
- **Bond remove:** expire queued rows for that `bondId`.

### Syel (`faceoracle_push_subs` + `faceoracle_push_queue`)
- **Slots:** 09:00 (qi / observe / daytime), 21:00 (rest / pacing). **≤1 per user per slot**; same calendar day may get both if kinds differ.
- **Fuel:** **latest Pro reading replaces** prior window **only when new windows.length > 0**. Oneshot = `reading_ready` only (no long window).
- **Month-start dedupe:** if queue already covered the month-start event (`fireOn=YYYY-MM-01` queued/sent, or `startMonth` in data), skip D1–D3 rule event fallback. Unrelated mid-month rest/observe fuel does **not** block the fallback.
- **Deeplink kinds:** `rest` → home (not recapture); `recapture` → capture; `event`/`timeline`/`observe` → timeline.
- **Allowed copy:** 气机窗, 作息, 气色自我观察, rule-based recapture (~D25).
- **Forbidden:** disease names, prescriptions, organ diagnosis, fearmongering.
- **Pro:** `faceoracle_pro` | `universe_pro` on register and targets.

### Kanyu
- No periodic push (V1).

---

## Compliance (Syel)

- Settings disclosure: reminders are self-observation, not medical advice.
- Harvest / template denylist: 病名、药、针灸处方、确诊口吻.
- Rest-theme cooldown ≥3 days for same theme key — **not implemented yet** (debt).

---

## Risk & debt register (parallel tracks)

### Security (urgent, separate PR — not in corpus/locale work)

| Sev | Issue | Status |
|---|---|---|
| Crit | `/api/notify/*` catch-all → unauthenticated send; web HMAC skip | **Fixed** — catch-all removed; svc-notify `/expo-push/*` requires Internal-Key; `workers_dev: false` |
| High | Yuun client-trusted `isPro` without `u`; sticky timeline | **Fixed** — fail-closed without `u`; `portfolio_user_id` + live entitlement on targets |
| High | `push_tokens` conflict reassigns `userId` | **Fixed** — 409 if token bound to another account |
| High | Lock-screen PII (names) | **Fixed** — birthday uses relation/亲友; relationship + bond_matched abstract |
| Med | Kindred trusts `data.route` | **Fixed** — client route allowlist |
| Med | Auspice birthday CRUD by `deviceId` only | Residual — rate limit / device proof later |

### Product / code smells (backlog)

| # | Smell | Note |
|---|---|---|
| ㉑ | Mild resonance beats strong tension in Yuel scoring | **Fixed** — intensity-based `synastryRank` |
| ㉒ | Dated beats same-day synastry conditional | **Fixed** — matching conditional outranks dated |
| ㉓ | LLM `fireOn` has no calendar/transit anchor | Heuristic accepted for now |
| ㉔ | Yuun relation nudge: resonance-only, no `personId` | Yuun track |
| ㉕ | Yuun morning can stack daily + birthdays + relation | Per-device budget later |
| ㉗ | Yuel “daily push” toggle owns synastry cron | Settings copy/split later |
| ㉘ | Silent empty window vs retention KPI | **Keep silence**; in-app empty + Syel recapture |
| ㉙ | Schema claims `sourceReadingId` bond resolve; send never reads it | Gap |
| ㉚ | Harvest only in `waitUntil` | Report OK, fuel may never land |
| ㉜ | `reading_ready` before fuel replace | Short race |
| ㉝ | `expiresAt` written, send ignores | Dead column |
| ㉞ | Kindred logout clears all `push_tokens` for user (omnibus) | Table isolation later |
| ㉟ | Cap eviction unordered; null `bondId` skips per-bond cap | Add ORDER BY later |
| ㊱ | Multi-device `seenUsers` unordered | Accept |
| ㊲ | Lunar birthday ignores leap month | Yuun track |
| ㊳ | Rule chrome locale collapses to EN | LLM follows reading; chrome later |

---

## Smoke checklist

1. Opt in + OS permission → D1 register row; TZ in `TIMEZONE_POOL` representative.
2. `GET …/push/targets?timezoneId=&date=` with `X-Internal-Key` includes test device.
3. Tap → correct deep link (cold start included); Syel `rest` ≠ capture.
4. Yuel: bond path after Pro report → `kindred_push_queue` rows with `bond_id`; delete bond → those rows expired.
5. Syel Pro: `is_pro=1` from entitlement; Hant cron titles Traditional; Pro reading writes `faceoracle_push_queue`; empty harvest leaves prior queue.
6. Syel evening: `hour=21` targets returns rest-kind fuel when present.
7. Accept bond: inviter and accepter queue `locale` match each side’s language when they differ.

```bash
# Examples (set INTERNAL_KEY)
curl -sS -H "X-Internal-Key: $INTERNAL_KEY" \
  "https://api.hexastral.com/api/auspice/push/targets?slot=morning&timezoneId=Asia/Shanghai&date=$(date +%F)"
curl -sS -H "X-Internal-Key: $INTERNAL_KEY" \
  "https://api.hexastral.com/api/kindred/push/targets?timezoneId=Asia/Shanghai&date=$(date +%F)"
curl -sS -H "X-Internal-Key: $INTERNAL_KEY" \
  "https://api.hexastral.com/api/physiognomy/push/targets?timezoneId=Asia/Shanghai&date=$(date +%F)&hour=9"
curl -sS -H "X-Internal-Key: $INTERNAL_KEY" \
  "https://api.hexastral.com/api/physiognomy/push/targets?timezoneId=Asia/Shanghai&date=$(date +%F)&hour=21"
```

---

## P0 / P1 / P2 (engineering map)

| Phase | Work |
|---|---|
| P0 | Yuel bonds→queue+bondId+Pro send; Syel default remind+entitlement targets+Hant copy; Yuun register entitlement+deeplinks |
| P1 | Reading secondary harvest LLM → dated windows; Syel 21:00 slot; locale-quality prompts; bond expire; no empty wipe; month dedupe; rest deeplink |
| P2 | Purge auspice/faceoracle subs; gate omnibus fortune; metrics; security Crit notify proxy |

---

## Schema sketch (P1 harvest)

Shared logical fields (tables may differ):

`fireOn | localHour | priority | title | body | dataJson | sourceReadingId | expiresAt | locale`

- Yuel: + `bondId`, `relationTier` (tier column deferred); **union** across bonds.
- Syel: replace-all for `userId` on new Pro reading **only if windows non-empty**.
