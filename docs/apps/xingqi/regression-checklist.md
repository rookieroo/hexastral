# Xingqi reading regression checklist

Run after co-deploying **svc-astro + hexastral-api + Syel client** (VLM/`skinTone`, brief `points`, deep/shallow meters, glossary UX). Do not ship client-only against an old API or half-migrated D1.

## Co-deploy order (same window)

1. [ ] `cd services/svc-astro && bun run deploy` — face extract includes `skinTone` (schema `xingqi-vlm-v11`+)
2. [ ] `cd apps/hexastral-api` — if not applied: `bun db:migrate:prod` for `0044_*` (deep/shallow meters), then `bun run deploy` (brief `points[]`, quota 402s)
3. [ ] Syel client build with matching glossary / hideEmpty / marker / brief UI
4. [ ] Smoke below before calling the rollout done

## Preflight

- [ ] Device/simulator on the **new** client against the **new** API
- [ ] DEV: `setXingqiDevLocale` for `zh` then `zh-Hant` if needed

## Glossary / annotation smoke (this follow-up)

- [ ] Hant deep read: tap `浮陽` / `浮陽外越` → gloss opens (not dead text)
- [ ] Face-only period update: home / processing stack has **no empty palm ghosts** (`hideEmpty`)
- [ ] New shallow brief: `points[]` + near-window events when model returns them; first open shows虚线 tip → Terms
- [ ] New extract → locus (face **and** palm): marker ink follows face `skinTone` contrast, not only theme accent
- [ ] Symbol glossary: seven mount seals distinct at ~28px (see [mount-glyphs-mock.html](./mount-glyphs-mock.html))

## Capture / VLM gates

- [ ] Sharp full face + both palms → extract succeeds, reading can enqueue
- [ ] Blurry / cropped face → `photo_quality_low` toast/alert asking retake (not a shallow report)
- [ ] Wrong part (e.g. face photo on palm step if forced) → `modality_mismatch` retake copy

## Oneshot brief thickness (zh)

- [ ] Five chapters present (overview / face / palms / natal / horizon)
- [ ] Face/palms show citations under 形气依据 when model returns them
- [ ] Natal chapter shows **本命气机** strip: day pillar / DaYun / LiuNian
- [ ] Period/advice cover career · love · health (events.axis and/or advice text)
- [ ] Bottom CTA: **解锁档案与气机层 · Pro** (not “再解读”)
- [ ] No Living FAB / chat for non-Pro

## zh-Hant chrome

- [ ] Device locale Traditional → chapter titles / alerts / paywall in 繁体 (not Hans)
- [ ] After a Hant reading: push title/body 繁体 if Pro push enabled

## Pro smoke

- [ ] Paywall copy: one-shot **$9.99** deep; Pro **$14.99**/mo · **$99.99**/yr — 3 deep/mo · 1 Face brief/day · first seal deep
- [ ] Usage: deep x/3 (UTC month) + shallow today (UTC day) — not photo slots
- [ ] First Pro enqueue forces oneshot; deep-next default off
- [ ] 402 `deep_quota_exhausted` / `shallow_daily_exhausted` map to paywall / wait copy
- [ ] Pro: Living FAB → Timeline / What-if / Chat (**no** same-photo regen entry)

## Fail notes

Record jobId + locale + symptom if density/compliance/ai_failed regresses.
