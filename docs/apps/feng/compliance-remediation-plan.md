# Kanyu — Compliance & quality remediation plan

**Source**: Deep audit 2026-07-08 (deterministic layer, synthesis, UI, chat, ASO).  
**Goal**: Close App Store 4.3(b) gaps without changing the「文化研习 / 场所分析」positioning.  
**Branch**: `cursor/feng-report-digest-6a27` (digest + remediation).

---

## Principles

1. **Deterministic layer is authoritative** — Chat and digest narrate from `computeJson`, never invent stars.
2. **Hard audit on all user-visible LLM text** — Synthesis already uses `auditFengSynthesisHits`; chat must match.
3. **Disclaimers at every export surface** — Report pages, digest cover, share PNG, chat header.
4. **No percentile 风水指数** — Qualitative chips only (digest).

---

## Work packages

### WP0 — Chat feng forbidden audit (P0) ✅ shipped

| Item | Owner | Acceptance |
|------|-------|------------|
| After `screenChatText`, when `readingType === 'feng'`, run `auditFengSynthesisHits` on reply | `hexastral-api` `routes/chat.ts` | 金蟾/文昌塔/提升运势 in reply → localized refusal, not persisted as-is |
| Re-export `auditFengSynthesisHits` from `portfolio-voice-spec.ts` | `hexastral-api` | Importable in routes |
| Unit test: refusal helper + audit integration shape | `hexastral-api` | `bun test` green |

**Out of scope**: LLM rewrite retry on chat (cost/latency); synthesis keeps retry.

---

### WP1 — Chat persona + compute context (P1) ✅ shipped

| Item | Owner | Acceptance |
|------|-------|------------|
| Add `PromptDomain: 'feng'` — 堪舆研习伙伴，禁灵物/禁改运承诺 | `svc-astro` `system-role.ts` | `chat.prompt.test.ts` snapshot for `primary.type === 'feng'` |
| Map `feng → 'feng'` in `DOMAIN_BY_READING` | `svc-astro` `chat.ts` | Feng chat no longer uses generic `fate` persona |
| `buildFengChatPrimaryText(chapters, computeJson, dataQuality)` | `hexastral-api` `feng-chat-context.ts` | Primary context = chapters + `## 确定性排盘摘要` appendix |
| Load `computeJson` + `dataQuality` in `reading-context-builder` feng case | `hexastral-api` | Chat sees sit/face, patterns, formLi verdicts |
| Unit tests for appendix builder | `hexastral-api` | Parses minimal fixture, includes 坐向 + 格局 |

---

### WP1b — Digest cover compliance (P1) ✅ shipped

| Item | Owner | Acceptance |
|------|-------|------------|
| Digest cover: `report_chapter_micro_disclaimer` + `report_legal_disclaimer` | `feng-app` `[siteId].tsx` | First screen matches chapter/close legal posture |
| Soften zh/zh-Hant headline: 真旺 → 传统上视为形理同参 | `feng-app` `i18n.ts` | No outcome-promise tone on overview |

---

### WP2 — Share + golden + digest hardening (P2) ✅ shipped

| Item | Owner | Acceptance |
|------|-------|------------|
| Share card footer: entertainment-only line (4 locales) | `ShareableFengCard` + `i18n` | PNG export includes disclaimer |
| `portfolio-voice-golden.json`: feng pass + fail samples | `hexastral-api` | Golden test uses `auditFengSynthesisHits` for feng tier |
| `deriveReportDigest`: dedupe exterior by palace; optional `visionShaCount` | `scenario-feng` | Unit tests for headline priority + dedupe |
| `scenario-feng` `bun test` script | `scenario-feng/package.json` | CI can run digest tests |

---

### WP3 — Deferred (post-V1)

| Item | Rationale |
|------|-----------|
| Mapillary CC-BY-SA attribution in report UI | Legal; needs designer placement |
| VLM post-audit on vision/interior JSON | Lower risk; synthesis gate catches most |
| `GET /api/feng/sites` digest preview for home list | Needs API shape change |
| Staging manual spot-check (3 site archetypes) | Human QA per `app-review-qa-checklist.md` |

---

## Verification matrix

```bash
# Automated (run before merge)
bun test packages/portfolio-voice/src/index.test.ts
bun test packages/scenario-feng/src/lib/report-digest.test.ts
bun test apps/hexastral-api/src/lib/feng-chat-context.test.ts
bun test apps/hexastral-api/src/lib/portfolio-voice.golden.test.ts
bun test services/svc-astro/src/routes/chat.prompt.test.ts
cd packages/astro-core && bun scripts/feng-sample-report.ts  # deterministic eyeball

# Manual (staging, fresh reports)
# 1. Six chapters: no 金蟾/文昌塔/提升运势
# 2. Digest cover: legal lines visible
# 3. Chat: "门口放金蟾" → refusal or ordinary furnishings only
# 4. Share PNG: footer disclaimer visible
```

---

## Rollout

1. Merge PR #9 (digest + remediation) to `main`.
2. Deploy `hexastral-api` + `svc-astro` + `svc-feng` (synthesis unchanged this pass).
3. Ship `feng-app` build with digest + share disclaimer.
4. Run manual checklist before next App Store submission.
