# Xingqi reading regression checklist

Run after deploying `hexastral-api` (prompt density, compliance, VLM gates, `natalFacts`, push Hant).

## Preflight

- [ ] `cd apps/hexastral-api && bun deploy` succeeded
- [ ] Device/simulator on latest client build with these changes
- [ ] DEV: `setXingqiDevLocale` for `zh` then `zh-Hant` if needed

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

- [ ] Paywall copy: oneshot = sealed brief; Pro = archive + qi layer
- [ ] Pro: Living FAB → Timeline / What-if / Chat / regen

## Fail notes

Record jobId + locale + symptom if density/compliance/ai_failed regresses.
