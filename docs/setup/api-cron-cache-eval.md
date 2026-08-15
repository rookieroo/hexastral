# API / cron / cache evaluation

**Date:** 2026-07-26  
**Scope:** `apps/hexastral-api` + `services/*` (Workers, crons, queues, caches). Read-only; no code changes.  
**Method:** Code + wrangler config (no production log sampling). Inferences marked as such.

---

## 1. Executive summary

1. **P0 — `svc-notify` weekly purge cron** — was `0 3 * * *` (daily) vs code `0 3 * * 0` (never matched; Cloudflare also rejects weekday `0`). Fixed to wrangler+code `0 3 * * SUN` (Quartz 1=Sun).
2. **P0 — Push timezone exact-match + representative pool → silent miss for common IANA zones** (`Asia/Hong_Kong`, `Singapore`, `Taipei`, …). Same root cause as the Yuun push audit: register stores real IANA; cron only queries pool representatives.
3. ~~**P1 — Legacy `runHourlyFortunePush` (omnibus / `push_tokens` + `daily_almanac`) still runs every hour**~~ — **RESOLVED 2026-08**: removed from the `scheduled()` task list (the function definition still exists in `svc-notify/src/index.ts` as dead code — flagged unused by biome; delete it). Hourly cron now runs only the 7 satellite runners.
4. **P1 — Fortune queue consumer uses UTC `today` for almanac lookup**, not the user’s local date carried on the message → wrong/missing row near timezone edges → fallback copy still sent (wasted + wrong content). (Legacy queue; moot once the consumer is deleted with the omnibus path.)
5. **Caches are mostly intentional and sound for pre-PMF** (Auspice Cache API, explain GUARD_KV, charts D1, geocode/feng R2). Highest mismatch risk is **bonds timeline deliberately uncached** (OK while N small) and **signal today** miss path that can lazy-build + LLM under burst.

---

## 2. Cron / queue effectiveness matrix

| Worker | Schedule (wrangler) | Code branch | Downstream | Empty-exit behavior | Verdict |
|---|---|---|---|---|---|
| **svc-signal** | `0 0 * * *` | `runDailyCron` | `eligible-users` → compute → `upsert` | Always paginates all tokened+traited users | **OK / Medium cost** — idempotent upsert; recomputes even if row exists |
| **svc-notify** | `0 * * * *` | Full hourly fan-out (7 runners) | See §2.1 | Zone filter early-return per runner if no TZ at hour | **OK structure; High waste risk** (see P0/P1) |
| **svc-notify** | `0 3 * * SUN` | Purge when `event.cron === '0 3 * * SUN'` | Stale token purge | Early return | **Fixed** (was daily `0 3 * * *` + invalid weekday `0`) |
| **hexastral-api** | `0 4 * * *` | expire invitations; feng annual; feng prune; RC reconcile | D1 + optional RC REST (cap 100) | Bounded / skip if no RC key | **Reasonable** |
| **daily-fortune queue** | — | Per-message almanac + Expo | `/api/internal/almanac/today` | Fallback body on miss | **P1 date bug** |
| **feng-analyze / faceoracle-reading** | Event | Analyze / reading jobs | LLM/vision | N/A | **OK** |
| **ad-convert** | Event | Vendor CAPI | Meta/Google/… | Silent skip if secrets missing | **OK** |

### 2.1 svc-notify hourly runners (every tick)

| Runner | Local hour | API | Send path |
|---|---|---|---|
| `runAuspicePush` morning/evening | 08 / 20 | `/api/auspice/push/targets` | Direct Expo |
| `runAuspiceTimelinePush` | 09 + month-start | `/api/auspice/timeline/push/targets` | Direct Expo |
| `runKindredPush` | 10 | `/api/kindred/push/targets` | Direct Expo |
| `runKindredTimelinePush` | 09 | `/api/kindred/timeline/push/targets` | Direct Expo |
| `runFaceoraclePush` | 09 / 21 | `/api/physiognomy/push/targets` | Direct Expo |

**Empty-hour cost (inferred):** ~36 TZ × 7 filter passes of `Intl` formatting; no API if no zone matches. Cheap CPU, still 24 Worker invocations/day × dual trigger at 03:00.

**Upper-bound API calls when zones match (e.g. UTC+8 at 08:00):** typically **1 zone** in pool (`Asia/Shanghai`) × ceil(N/200) pages × product lines that share that hour. Auspice morning + fortune morning can both fire for Shanghai-at-8.

### 2.2 Confirmed P0: cron string mismatch

```text
wrangler.jsonc:  "crons": ["0 * * * *", "0 3 * * *"]   // daily 03:00 UTC
code:            if (event.cron === '0 3 * * 0') purge… // Sunday only — never equals wrangler string
```

Cloudflare passes the **configured cron expression** as `event.cron`. Therefore:

- Purge branch **never runs**.
- Every day at 03:00 UTC, the second trigger runs the **same hourly fan-out** as `0 * * * *` → **double enqueue / double Auspice send** for any zone that is at 08/09/19/20 at that UTC hour (e.g. some Pacific zones at local evening/morning depending on DST).

---

## 3. Internal API heat & wasted calls

### 3.1 Push-targets family

| Path | Caller | Pagination | Work per page | Scale risk |
|---|---|---|---|---|
| `GET /api/notify/push-targets` | fortune hourly | OFFSET + limit≤500 | Join tokens + notif prefs filter | OFFSET worsens with table size |
| `GET /api/auspice/push/targets` | auspice hourly | OFFSET | **Heavy:** birthday batch + per-sub message render | Grows with `auspice_push_subs` |
| `GET /api/auspice/timeline/push/targets` | month-start 09 | OFFSET | Pro + timeline prefs + node pick | Rare (1st of month) |
| `GET /api/kindred/push/targets` | 19:00 | OFFSET | Synastry snippet | Active Yuel users |
| `GET /api/physiognomy/push/targets` | 09:00 | OFFSET | Pro events window | Syel Pro only |

**Wasted when:**

- Zone in pool has **zero** subscribers → still **1 empty page** query (cheap).
- Device TZ ∉ pool → **0 queries forever** for that device (silent miss — not “waste”, but **failed delivery**).
- Fortune path still queried for retired omnibus tokens (if any remain in `push_tokens`).

**Status (code, 2026-07):** register paths canonicalize via `@zhop/timezone-pool`; migration `0031_canonicalize_push_timezones.sql` remaps known aliases on `push_tokens` / `auspice_push_subs` / `faceoracle_push_subs` (apply with `bun db:migrate:prod` when ready). Offset-only rare zones still need re-register. Remaining roadmap: replace OFFSET with keyset; gate or delete `runHourlyFortunePush` if omnibus is dead.

### 3.2 Almanac pipeline

| Path | Role | Issue |
|---|---|---|
| `GET eligible-users` | svc-signal | INNER JOIN `push_tokens` — duplicate user if multi-device (possible duplicate upserts same day) |
| `POST upsert` | svc-signal | Idempotent; **no skip-if-fresh** → full recompute daily for all eligible (acceptable pre-PMF) |
| `GET today` | queue consumer | **Uses UTC date** in consumer (`toISOString().slice(0,10)`), ignores message timezone |

### 3.3 hexastral-api daily 04:00

| Job | Waste profile |
|---|---|
| Expire invitations | Bounded; necessary |
| Feng annual refresh | Cap / 立春-gated; OK |
| Feng job prune | OK |
| RC reconcile | Cap 100/day; skip without API key — OK |

---

## 4. Public API & cache scorecard

| Domain | Mechanism | TTL / policy | Score | Notes |
|---|---|---|---|---|
| **Auspice** `/day` with `date=` | CF Cache API + `max-age=600` | 10 min | **Good** | Explicit date only; bare “today” intentionally uncached (midnight) |
| **Auspice** month / bootstrap / ICS | Same edge pattern / Cache-Control | Short | **Good / Acceptable** | ICS “recompute on poll” by design; edge helps |
| **Signal today** | `withEdgeCache` GUARD_KV | 300s | **Good with caveat** | Miss can lazy chart + LLM — burst after expiry still costly |
| **Explain / makeif / timeline explain** | GUARD_KV | 24h–~30d | **Good** | Keys must include locale/context (spot-check OK in code comments) |
| **Charts** natal/stellar | D1 `user_charts` + global interpretations | Permanent until hash change | **Good** | Correct for deterministic charts |
| **Auspice Pro timeline** | D1 by context hash | ~30d | **Good** | |
| **Bonds timeline** | None (recompute) | — | **Acceptable pre-PMF** | Explicit tradeoff vs stale risk; revisit if N bonds grows |
| **Geocode** | KV `GEOCODE_CACHE` | 24h | **Good** | |
| **Feng maps / annotate** | R2 caches | Long | **Good** | Cuts vendor rebill |
| **Push register** | No content cache | — | **N/A** | Write path; rate-limit / anon Auspice register separate concern |
| **Flags** | Cache-Control 60s | Short | **Good** | |
| **Media** | immutable long cache | 1y | **Good** | |

**Not a problem:** Removing `FORTUNE_CACHE` — D1 almanac as SoT is coherent; fix the **date key**, don’t necessarily re-add KV.

---

## 5. Client poll assessment

| Client | Endpoint | Interval | Cap | Verdict |
|---|---|---|---|---|
| **Feng** `useAnalyzeJob` | `GET /api/feng/jobs/:id` | **800ms** (comment in API said 200ms — **doc drift**) | 5 min | **Acceptable** for multi-minute analyze; ~375 GETs worst case |
| **Kindred** `useSynastryReport` | `GET /api/bonds/:id` | 2.5s × 16 | ~40s | **Acceptable** progressive chapters |
| **Syel** `pollFaceReadingJob` | physiognomy jobs | 1.5s | 20 min | **Acceptable** for long VLM+LLM; network grace before fail |
| **IAP webhook wait** (feng purchase) | purchase available | 500ms × 24 | ~12s | **Acceptable** post-purchase |

Pre-PMF: no need to replace with WebSockets. Optional later: longer interval after first “running” stage, or server push on job complete.

---

## 6. Push chapter (link to Yuun audit)

| Issue | Severity | Overlap |
|---|---|---|
| TZ pool exact match → HK/SG/TW silent miss + local defer | **P0** | Yuun push audit |
| Relationship nudge always-on | P1 product | Yuun audit |
| Fortune UTC date in queue | **P1** | This eval |
| Cron 03:00 double fan-out | **P0** | This eval |

---

## 7. Suggested roadmap (do not implement in this pass)

| Order | Action | Why |
|---|---|---|
| 1 | Align wrangler cron with code (`0 3 * * 0` **or** change code to `0 3 * * *` + purge-only branch) | Stop double fan-out; restore purge |
| 2 | TZ canonicalization: map IANA → pool id on register **or** query by UTC offset | Fix silent non-delivery |
| 3 | Confirm `push_tokens` live set; gate/remove `runHourlyFortunePush` if omnibus dead | Cut dead product fan-out |
| 4 | Pass **local date** (or timezone) into fortune queue messages; consumer must not use UTC-only | Correct almanac body |
| 5 | Keyset pagination on push-targets when N grows | Latency/cost |
| 6 | Metrics: `zonesMatched`, `pagesFetched`, `messagesSent`, `emptyExit`, TZ histogram | Observability |
| 7 | Soft: fix feng jobs comment 200→800ms; consider skip-if-fresh on signal upsert | Hygiene |

---

## 8. Explicit non-problems

- Hourly cron scanning TZ pool with early return when no hour match — cheap and clear.
- Auspice dual channel (server XOR local via `serverPush.active`) — design is sound; broken only when “active” + TZ miss.
- LLM explain KV caching — appropriate cost guard.
- Chart D1 cache — correct for deterministic natal/stellar.
- Feng/Kindred/Syel poll cadences — chatty but bounded; fine pre-PMF.
- hexastral-api 04:00 jobs — purposeful and capped.
- Request-driven services (astro, mailer, geocode, feng, ad-convert) — no cron waste.

---

## 9. Priority index

| Pri | ID | Finding |
|---|---|---|
| **P0** | C1 | svc-notify `0 3 * * *` vs `0 3 * * 0` → purge dead + daily double fan-out |
| **P0** | C2 | TIMEZONE_POOL exact IANA match → common zones never targeted |
| **P1** | F1 | Legacy fortune hourly path still live beside satellite pushes |
| **P1** | F2 | Queue almanac `today` is UTC, not local |
| **P1** | F3 | Auspice `push/targets` heavy per-page work + OFFSET (scale) |
| **P1** | F4 | eligible-users multi-token duplicate risk |
| **P2** | O1 | No structured cron metrics |
| **P2** | O2 | Feng API comment says 200ms poll; client uses 800ms |
| **P2** | O3 | Bonds timeline uncached (OK now; revisit at scale) |
| **P2** | O4 | Signal edge TTL miss → expensive loader under burst |

---

## Primary code references

- [`services/svc-notify/wrangler.jsonc`](../services/svc-notify/wrangler.jsonc) — cron expressions  
- [`services/svc-notify/src/index.ts`](../services/svc-notify/src/index.ts) — `scheduled`, runners, queue, `TIMEZONE_POOL`  
- [`services/svc-signal/src/index.ts`](../services/svc-signal/src/index.ts) — daily almanac cron  
- [`apps/hexastral-api/src/index.ts`](../apps/hexastral-api/src/index.ts) — 04:00 scheduled  
- [`apps/hexastral-api/src/routes/notify.ts`](../apps/hexastral-api/src/routes/notify.ts) — push-targets  
- [`apps/hexastral-api/src/routes/auspice.ts`](../apps/hexastral-api/src/routes/auspice.ts) — edge cache + push targets  
- [`apps/hexastral-api/src/lib/cache-layer.ts`](../apps/hexastral-api/src/lib/cache-layer.ts)  
- [`packages/scenario-feng/src/hooks/useAnalyzeJob.ts`](../packages/scenario-feng/src/hooks/useAnalyzeJob.ts) — 800ms poll  
- [`packages/scenario-kindred/src/hooks/useSynastryReport.ts`](../packages/scenario-kindred/src/hooks/useSynastryReport.ts) — 2.5s × 16  
