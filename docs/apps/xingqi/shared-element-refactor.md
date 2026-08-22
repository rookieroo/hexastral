# Syel Home → Report: Shared-Element + Quality Refactor

> **Status:** Implemented in working tree (uncommitted) · 2026-08-22 · Issues **1–5 +
> 5b + report/brief photo mounts + 2 v2 + reduced motion**. Device QA pending.
> Code is SSOT — refresh after merges.
>
> Related: [home-ui-mock.html](./home-ui-mock.html) · [regression-checklist.md](./regression-checklist.md)

## Progress snapshot

| Issue | Summary | Code | Device QA |
|---|---|---|---|
| 1 | Off-focus tap → scroll | ✅ | Pending |
| 2 v1 | `part` → chapter deep-link | ✅ | Pending |
| 2 draft | 新一期 slot → capture part | ✅ | Pending |
| 2 v2 | Citation highlight + scroll | ✅ `ChapterCard` | Pending |
| 3 | Excerpt quiet kicker | ✅ | Pending |
| 4 | Single-flight nav | ✅ | Pending |
| 5 + 5b | Modal flight + measured target | ✅ | Pending |
| Photos | Report plate snapshots | ✅ `InkCenterpiece` | Pending |
| Brief hero | Shallow card photo + flight | ✅ `BriefPhotoHero` | Pending |
| Reduced motion | Skip flight animation | ✅ `reduced-motion.ts` | Pending |

**Uncommitted:** `PeriodPhotoWheel`, `index.tsx`, `result.tsx`, `brief.tsx`,
`InkCenterpiece`, `ChapterCard`, `ChapterPager`, `BriefPhotoHero`, flight bus,
`open-reading.ts`, `locus.tsx`, `_layout.tsx`, this doc.

---

## Guiding principle

**Quality = restraint.** Wheel excerpt is a quiet kicker; **photo → report mount**
is the emotional peak. Report and brief show the **same local snapshot** on the
宣纸 plate so the flight is a true continuation.

---

## Issue 1 — Off-focus tap scrolls ✅

`PeriodPhotoWheel`: focus gate `0.18` → `snapTo`; near-focus → navigate + optional flight.

---

## Issue 2 — Part threading ✅

### v1 — chapter deep-link

Wheel / locus → `openReadingScreen({ part })` → `chapter` + `part` params →
`result.tsx` sets `chapterIndex`.

### Draft row

`onPressDraft(part)` → `beginOnboarding(part)` → `CaptureStudioScreen` `part` prop.

### v2 — citation highlight ✅

- `ChapterCard` `highlightCitationLocus` — flat accent border on matching citation
  (`c.locus` / `c.part`).
- Auto-scroll via `measureLayout` to citation in evidence layer.
- `result.tsx` passes highlight when current chapter matches `partParam`
  (face on face chapter; palm_l/r on palms chapter).

---

## Issues 3–4 ✅

Excerpt 15/21 kicker; `openReadingScreen` nav lock for locus + wheel.

---

## Issue 5 — Shared element ✅

```
Wheel → measureInWindow → setFlightSource
     → /result or /brief
     → load snapshots → photo mount → setFlightTarget
     → SharedElementFlight (Modal) morph → dissolve
     → InkCenterpiece deferEntrance clears → plate visible
```

| Chapter / surface | Photos |
|---|---|
| `face` | face snapshot |
| `palms` | palm_l + palm_r |
| overview / natal / horizon | ink only |
| **`/brief` hero** | tapped part (fallback face) |

**Reduced motion:** no `setFlightSource`; bus cleared; instant push only.

**No snapshot:** `result` / `brief` abort flight; grace timeout → `clearFlight()`.

---

## Files

| File | Role |
|---|---|
| `components/PeriodPhotoWheel.tsx` | Wheel UX + flight source |
| `app/(app)/index.tsx` | Draft part handoff |
| `lib/open-reading.ts` | Nav lock + params |
| `app/result.tsx` | Photos + measure + highlight |
| `app/brief.tsx` | Hero + flight measure |
| `components/reading/BriefPhotoHero.tsx` | Brief 宣纸 hero |
| `components/reading/ChapterCard.tsx` | Citation highlight |
| `components/reading/ChapterPager.tsx` | Pass highlight to current page |
| `components/reading/InkCenterpiece.tsx` | Plate + photos + deferEntrance |
| `lib/shared-element-flight.ts` | Bus + `retriesRemaining` |
| `components/SharedElementFlight.tsx` | Modal animation |
| `lib/reduced-motion.ts` | Reduce motion sync read |
| `app/_layout.tsx` | Flight Modal + ReducedMotionMount |

---

## Verification

**Automated:** `bun typecheck` · lint changed paths.

**Manual**
- [ ] Off-focus tap → scroll only.
- [ ] Focused tap → flight lands on report/brief photo mount.
- [ ] `palm_l` → palms chapter + highlighted left citation scrolled into view.
- [ ] Reduce Motion ON (iOS Settings) → no Modal flight.
- [ ] Shallow brief → hero photo visible; wheel tap flies to hero if snapshot exists.
- [ ] No snapshot → open report/brief, no stuck Modal.

---

## Not in scope

- Pan `moved` flag on wheel.
- Haptics inside report.
- Single-tree `useMagicMove`.
