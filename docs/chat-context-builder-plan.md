# Chat Context Enrichment — plan

> **Status**: code complete (2026-05-21) — CC.1 (`reading-context-builder.ts` + chat.ts refactor), CC.2 (user brief), CC.3 (cross-reading joins, natal recomputed via astro-core), CC.4 (cross-app memory — **dedicated `cross_app_memory_enabled` column**, migration `0001`, `user_id`-indexed cross-target recall, yuan + feng settings toggle), CC.5 (svc-astro structured prompt + primary-type persona + legacy fallback), CC.6 (size guard + unit test). **Remaining**: CC.7's 8-scenario QA matrix is **manual** (needs a running DB/sim — not available in this sandbox). All four workspaces typecheck; new code Biome-clean; 24 api tests pass. **Deploy order**: ship svc-astro *before* hexastral-api (payload skew), and run migration `0001` (`bun db:migrate:prod`).
> **Decision records**: no new ADR needed (server-side change only).
> **Created**: 2026-05-20.
> **Prerequisite**: Phase K · **K.5 only** (chat moved to yuan-app + feng-app) so this work lands in the new homes. It does **not** depend on K.1 (fate-app), K.2, K.3, or on the Cycle plan — so once K.5 lands, this plan can run **in parallel with Cycle** (it is a Wave-3 track in [ROADMAP.md](./ROADMAP.md)). CC.6's cost guard consumes K.4's shared guard (Wave-1 foundation). At ~5 days and directly monetizing the two flagships' Pro chat, it is high-ROI — do not leave it for last.

## Why

Pro chat is now (post-Phase-K) Yuán + Fēng's订阅价值兑现 layer. The current
chat backend ([apps/hexastral-api/src/routes/chat.ts](../apps/hexastral-api/src/routes/chat.ts))
gives the LLM:
- L1 — the primary reading's interpretation text ✓
- L4 — Cloudflare AI Search vector recall (same-app only, opt-in) ✓
- L5 — last 6 chat messages ✓

Missing (and what makes Pro chat substantively richer):
- L2 — User profile (name, locale, birth info, subscription)
- L3 — Cross-reading heuristic joins (physiognomy + natal, pair + both natals, etc.)
- L4+ — Cross-app memory (e.g. a prior Yuán synastry reading surfacing in a Fēng chat)

Without these layers, Pro chat reads like a basic reading-summarizer.
With them, it reads like "the AI knows you across the suite" — that's the
moat the matrix architecture is supposed to deliver.

---

## 0. TL;DR — seven sub-steps

| Step | What | Days |
|---|---|---|
| **CC.1** ✅ | `reading-context-builder.ts` scaffold + chat.ts refactor | 0.5 |
| **CC.2** ✅ | L2 User Brief layer (birthTimeIndex→hour mapped) | 0.5 |
| **CC.3** ✅ | L3 Cross-Reading heuristic joins (natal recomputed via astro-core) | 1-1.5 |
| **CC.4** ✅ | L4+ Cross-App memory — **dedicated `cross_app_memory_enabled` column** (not reuse), migration 0001, `user_id`-indexed cross-target `$eq` recall, yuan + feng settings toggle | 1 |
| **CC.5** ✅ | System prompt restructure (svc-astro) — structured bundle + primary-type persona + legacy fallback | 0.5 |
| **CC.6** ✅ | Size guard (`trimContextBundle`, 4KB cap, priority drop) + unit test. Cost/model-routing defers to K.4 (unbuilt). | 0.5 |
| **CC.7** ◑ | `trimContextBundle` unit test done; full 8-scenario QA matrix + svc-astro prompt snapshot pending | 0.5 |

Total: **~5 days** focused.

**Dependencies**:
- CC.1 → all (scaffold first)
- CC.5 ← CC.1, CC.2, CC.3 (consumes their outputs)
- CC.7 ← all
- CC.2, CC.3, CC.4 can parallelize once CC.1 lands
- Run after Phase K · K.5 so chat surfaces are already in yuan-app/feng-app

---

## 1. CC.1 — `reading-context-builder.ts` scaffold (0.5 days)

### File

`apps/hexastral-api/src/lib/reading-context-builder.ts` (new).

### API

```ts
export type ReadingType =
  | 'natal'
  | 'stellar'
  | 'yiching'
  | 'pair'
  | 'physiognomy'
  | 'report'
  | 'feng'        // new in Phase K · K.5

export interface BirthBrief {
  year: number
  month: number
  day: number
  hour: number | null     // 0-23; mapped from users.birthTimeIndex (时辰 index 0-11), null = unknown
  gender: 'male' | 'female' | 'other' | null
  city: string | null
}

export interface UserBrief {
  name: string | null
  locale: string
  birthInfo: BirthBrief | null
  plan: 'free' | 'monthly' | 'annual' | 'lifetime'
}

export interface RelatedReadingSummary {
  type: ReadingType
  summary: string         // 100-300 chars
  ageDays: number         // how recent
}

export interface ReadingContextBundle {
  user: UserBrief
  primary: { type: ReadingType; text: string }
  related: RelatedReadingSummary[]
  memory: { context: string; hitCount: number }
}

export async function buildReadingContext(input: {
  db: AppDb
  env: CloudflareBindings
  userId: string
  readingType: ReadingType
  readingId: string
  query: string           // latest user message for memory search
  targetApp: 'fate' | 'yuan' | 'feng' | 'coincast' | 'dreamoracle' | 'numerology' | 'cycle' | 'faceoracle'  // 'hexastral' retired → 'fate'
  flags: { crossAppMemory: boolean }
}): Promise<ReadingContextBundle>
```

### Refactor chat.ts

Replace inline `getReadingContext()` call with `buildReadingContext()`.
The function lives in `routes/chat.ts` currently — extract to `lib/`,
keep chat.ts thin.

### CC.1 acceptance gate

- chat.ts compiles using new bundle for current reading types
- Functional parity with current behavior (only L1 + L5 + L4 wired so far)
- No semantic change in output
- If `feng` union has not landed yet, keep it behind the K.5 gate

---

## 2. CC.2 — L2 User Brief layer (0.5 days)

### Query

Single `SELECT users` by userId. Birth fields are already denormalized on
`users` in current schema (`birthSolarDate`, `birthTimeIndex`, `birthGender`, etc.).

> **Shape mapping (don't skip):** the schema stores `birthSolarDate` (text `YYYY-MM-DD`) +
> `birthTimeIndex` (a 时辰 index, **0-11**, *not* a 0-23 hour) + `birthGender`. `buildReadingContext`
> must parse the date and map `birthTimeIndex → hour` (子=23/0, 丑=1-3, … → a representative hour),
> or carry the index through and let the prompt render the 时辰. Do **not** assume `birthTimeIndex`
> is already a 0-23 hour — it will be off by up to 2× and corrupt any 时柱-derived inference.

### Format

```
USER PROFILE
Name: {users.displayName || 'anonymous'}
Locale: {users.locale}
Birth: {YYYY-MM-DD HH (gender), city || 'unknown'} — when available
Subscription: {users.subscriptionPlan || 'free'}
```

~50-100 tokens.

### Privacy

- If no birth fields on `users`, omit birth block.
- v1 does not add birth-visibility schema changes; cross-app usage privacy is
  controlled by CC.4 opt-in flag.

### CC.2 acceptance gate

- buildReadingContext returns populated `user` for typical users
- Anonymous chats (no userId): user = `{ locale, plan: 'free', birthInfo: null, name: null }`
- Manual: query returns in < 50ms p95

---

## 3. CC.3 — L3 Cross-Reading heuristic joins (1-1.5 days)

### Heuristic table

```ts
const RELATED_READINGS_RULES: Record<ReadingType, ReadingType[]> = {
  // physiognomy: pair user's natal for fuller body-mind reading
  physiognomy: ['natal'],

  // pair (synastry): join BOTH parties' natals
  pair: ['natal'],   // self natal; partner natal handled specially via pairReadings.partnerUserId

  // report chapter: pull natal + most recent stellar
  report: ['natal', 'stellar'],

  // yiching: natal as background context (optional — too tangential, default OFF for v1)
  yiching: [],

  // feng-shui: 命卦 needs bazi for 八宅
  feng: ['natal'],

  // stellar/natal: don't join other primary types (would recurse)
  stellar: [],
  natal: ['yiching'],   // if user asked yiching recently, surface it
}
```

> **Natal is computed, not stored (post-Phase K).** No app persists a 八字 natal *reading* anymore —
> `fate-app` computes 八字/紫微 client-side and stores only birth-info (`users.*` + portfolio
> birth-info). So a `'natal'` entry above is **not** a stored-reading query: derive 日主/用神/五行 by
> recomputing from L2's `birthInfo` via `@zhop/astro-core` (cheap + deterministic; same primitives
> fate-app uses). Prefer surfacing computed 日主/用神 in L2 so the LLM doesn't guess. Only
> reading-persisting types (`stellar` · `pair` · `report` · `physiognomy` · `feng` · `yiching` · `cycle`)
> are fetched as stored readings. L4 cross-app memory likewise contains only those — never a fate natal.

### Resolution logic per related type

For each related type:
1. **If the related type is `natal`**: skip the DB — recompute 日主/用神/五行 from L2 `birthInfo` via astro-core. For all other (reading-persisting) types: query the most recent stored reading of that type for `userId`
2. Filter: created within last 60 days
3. Extract summary: first 200 chars of `interpretation` text (or `summary` field if present)
4. Annotate with `ageDays`

### Size guards

- Maximum 2 related readings (drop excess if rules return more)
- Each summary ≤ 200 chars / ~50 tokens
- Total related ≤ 600 chars / ~150 tokens

### Special: pair reading partner natal

For `pair` reading: pull both `userId` natal AND `partnerUserId` natal (when synastry is between two registered users). If partner is unregistered (single-user synastry), only self natal.

### CC.3 acceptance gate

- Each ReadingType produces correct related set
- Recency filter rejects > 60-day-old readings
- Summary truncation never breaks mid-character (UTF-8 safe)
- Pair reading correctly resolves partner's natal when both are registered

---

## 4. CC.4 — L4+ Cross-App Memory opt-in (1 day)

### DB strategy — **implemented: dedicated column (2026-05-21)**

> **Decision (revised from the v1 draft):** added a dedicated
> `users.cross_app_memory_enabled` column (migration `0001`) instead of reusing
> `portfolioMemoryEnabled`. Reusing would silently broaden an existing *same-app*
> opt-in into *cross-app* recall — a privacy regression. The two are now distinct:
> `portfolioMemoryEnabled` = same-app recall; `cross_app_memory_enabled` = explicit
> cross-app opt-in. Memory runs if **either** is on (cross-app implies recall on);
> scope is cross-app only when the cross-app flag is set.

### Server side

Extend `searchPortfolioReadingMemory` in `apps/hexastral-api/src/lib/portfolio-memory.ts`:

Current:
```ts
filters: { user_target: { $eq: `${userId}:${targetApp}` } }
```

When cross-app memory is enabled (**`$like` is NOT a supported AI Search operator** —
the index now also writes a standalone `user_id` metadata field, matched with `$eq`):
```ts
filters: { user_id: { $eq: userId } }   // any target, same user
```

### UI toggle

Yuán-app (and Fēng-app) settings:
- New row: "Cross-app memory" toggle
- Stored in users table via existing `PATCH /api/user/:userId`
- Default: off

### Privacy semantics

- Default off — a reading saved in one app (e.g. Yuán synastry) stays in that app's scope unless the user explicitly enables cross-app recall
- Explicit notice in onboarding (one-time): "Enable to let chat reference your readings across all HexAstral apps"
- Same-user-only — never cross to other users' memory

### CC.4 acceptance gate

- Toggle reflects from API → AI Search filter
- Cross-app query returns hits from other targetApps when enabled
- Disabled (default) preserves current behavior

---

## 5. CC.5 — System prompt restructure (0.5 days + svc-astro)

### Update svc-astro `/chat`

Accept structured `ReadingContextBundle` in request body (was previously
flat `readingContext: string` + `memoryContext: string`).

### Prompt template

```
You are HexAstral's classical Chinese metaphysics reading interpreter.
Answer using ONLY the structured context below.

## USER PROFILE
{user.name || 'Anonymous user'} (locale: {user.locale})
{user.birthInfo && `Born {year}-{month}-{day} {hour}时, {gender}, {city}.`}
Subscription: {user.plan}

## PRIMARY READING ({primary.type})
{primary.text}

## RELATED CONTEXT (same user, recent)
{for each related: `[{type}, {ageDays}d ago] {summary}`}

## PAST MEMORY (top hits)
{memory.context}

## CONVERSATION HISTORY
{geminiMessages (last 6)}

## NEW USER MESSAGE
{message}

## RULES
- Use only facts from the context above. Do not invent.
- When making cross-reading inferences, cite the source layer:
  "您的紫薇盘 X 宫 + 此次面相 Y 特征显示..."
- If birth info is missing, do not infer it from name or other hints.
- Respond in {user.locale}.
- Keep response within 250 words unless user explicitly asks for more.
```

### CC.5 acceptance gate

- svc-astro accepts new bundle shape
- chat.ts passes bundle correctly
- Pro chat replies cite layers ("From your natal..." / "Cross-referencing your physiognomy...")
- No regressions in existing chat scenarios

---

## 6. CC.6 — Size + cost guards (0.5 days)

### Total context budget

Hard cap: **4KB / ~1000 tokens** total context (excluding system prompt boilerplate).

### Priority drop order (when over)

```
Drop in this order until under cap:
  1. L4 cross-app memory (lowest priority)
  2. L4 same-app memory (next)
  3. L3 oldest related reading
  4. L3 second related reading
  5. L1 truncate to first 1500 chars
```

L2 (user brief) is always kept — it's small + critical.

### Implementation

`buildReadingContext` returns the full bundle; chat.ts (or a separate
`trimContextBundle` util) applies priority-drop just before sending to svc-astro.

### Token accounting

- Per-layer rough token count tracked via `(chars / 3.5)` heuristic
- Logged per call: `{layer: 'l1', tokens: 420, layer: 'l2', tokens: 60, ...}`
- Future: replace with real tokenizer if cost becomes critical (CJK-heavy text
  can be underestimated by char heuristics).

### Model routing + cost alignment (Phase K · K.4/K.5 policy)

Use shared model policy instead of plan-local assumptions:
- Free/default route: `Gemini 3.1 Flash-lite` → fallback `Gemini 3.1 Flash`
- Deep/subscription route: `Gemini 3.1 Flash` → fallback `Gemini 3.1 Pro` →
  fallback `Claude Sonnet 4.6`
- `Claude Opus 4.7` is explicit premium escalation only, not default routing

Conservative cost mode (v1):
- no periodic reward refill/streak mint logic in guards
- hard daily limits + global budget cap + cache/template fallback

### Debug header

In dev mode, response includes:
```
x-chat-context-tokens: 850
x-chat-context-layers: l1,l2,l3,l4-same,l5
```

### CC.6 acceptance gate

- Synthetic large case (user with 10 related readings, large interp) trims to under 4KB
- No silent loss — header shows which layers got dropped
- Production logs include token counts for monitoring

---

## 7. CC.7 — Test scenarios + manual QA (0.5 days)

### Test scenarios

| Scenario | Layers active | Acceptance |
|---|---|---|
| New user, no birth info, single yiching reading | L1, L5 | Prompt has no USER birth block; doesn't invent it |
| Complete birth info, fresh natal | L1, L2, L5 | Reply uses 日主 / 用神 from L2 |
| Same user has natal + 7-day-old physiognomy; chat in physiognomy | L1, L2, L3 (natal), L5 | Reply cross-references "结合您的命盘..." |
| Pair reading, both parties registered | L1, L2, L3 (both natals) | Reply mentions both parties' day-masters |
| Pro chat in yuan, crossAppMemory enabled, user has a prior Fēng report | L1, L2, L3, L4-cross (Fēng report memory), L5 | Memory hits include the Fēng report extract; natal facts come from L2 birth brief (recomputed), not memory |
| Same as above but crossAppMemory disabled | Same minus L4-cross | Memory hits only from yuan |
| Free user (post-K.1 Pro-only) | N/A | 402 pro_required (already implemented) |
| Synthetic over-cap (1000-char question + huge related + memory) | Dropped to 4KB | Header lists dropped layers |

### Manual QA checklist

- [ ] Each scenario triggers expected prompt content
- [ ] Latency p95 < 5s end-to-end
- [ ] Token/cost envelope stays within route budget tiers (Flash-lite/Flash default,
      Pro/Sonnet only on escalation paths)
- [ ] Cross-app toggle UI works (yuan-app + feng-app settings)
- [ ] No regressions in existing chat replies

### CC.7 acceptance gate

- All 8 scenarios pass
- Manual checklist green
- No new errors in logs over 24h preview deploy

---

## 8. Validation gates (apply throughout)

- `bun typecheck` for hexastral-api + svc-astro
- Local D1 smoke test for any route/query changes
- End-to-end chat test via curl with realistic payloads
- Memory cost monitoring during first week post-deploy

---

## 9. Risk register

| Risk | Mitigation |
|---|---|
| Token budget creep → cost / latency double-blow | Hard cap 4KB + priority drop in CC.6 |
| LLM hallucination citing fake "your natal says..." when L2 absent | Prompt rules block invention; structured "if X not present, do not infer" instruction |
| Cross-app memory privacy leak (e.g. yuan合盘 content surfacing in an unrelated app's chat) | Default off + UI toggle + same-user-only scope |
| Latency added per layer (each is a DB query) | Parallelize queries (Promise.all in buildReadingContext); target < 200ms p95 added |
| L3 heuristic table not capturing real user need | Telemetry on chat reply "this didn't address my X" pattern; iterate |
| Partner natal in pair reading not registered → privacy default | Skip partner natal if partnerUserId is null or unregistered |
| AI Search cross-app filter performance | Test with 100+ rows per user before shipping |

---

## 10. Open questions

1. **Birth-info visibility column** — current schema has no `birthInfo.visibility`; keep out-of-scope for v1 or spin into dedicated privacy ADR?
2. **Pair-reading partner natal join** — verify pairReadings table has partnerUserId; what if partner only entered birth data, never created account?
3. **L3 yiching as natal join** — current heuristic table has `natal → yiching` (natal user's recent yiching is recalled). Is this useful or noise? Default off, A/B later.
4. **Free-tier chat blocked** — currently Pro-only (chat.ts throws `402 pro_required`). No special handling needed in this plan.
5. **CrossAppMemory copy** — how to phrase the opt-in toggle without scaring privacy-conscious users? Recommend: short label + tooltip explaining "same user, same Hexastral account, never shared outside"
6. **Faceoracle / image-based memory** — physiognomy summaries are text (the AI's interpretation), not the photo itself. Confirm physiognomyReadings table stores text summary. If not, may need a `summary` extraction step.
7. **Cycle (黄历) memory inclusion** — when Cycle satellite lands, should its astro-day memory be queryable? Likely yes for relevant questions ("what's a good day for X?"). Add `'cycle'` to portfolio-memory targets.

---

## 11. What this plan does NOT do

- Add new reading types beyond Phase K · K.5 additions
- Build a frontend interaction beyond ensuring chat works
- Implement embedded / vector pre-compute (uses existing Cloudflare AI Search)
- Touch the Pro paywall gate (already in chat.ts)
- Add RAG over public knowledge corpus (separate future phase)

---

## 12. Suggested execution order

> Globally this is a **Wave-3 track** (parallel with Cycle), gated only on K.5 (chat transfer)
> + K.4 (shared guard). Internal CC.* order below:

1. CC.1 (scaffold + refactor) — foundation
2. CC.2 (L2 user brief) — small win, builds confidence
3. CC.3 (L3 heuristic joins) — biggest single feature
4. CC.5 (prompt restructure) — pulls CC.1-3 together
5. CC.4 (L4+ cross-app + opt-in) — independent; can slot anywhere after CC.1
6. CC.6 (guards) — must come before production
7. CC.7 (test) — last, gates the whole

Sequential is fine for a 5-day budget. If two engineers parallelize: CC.1 → (CC.2 + CC.3 + CC.4 in parallel) → (CC.5 + CC.6) → CC.7.
