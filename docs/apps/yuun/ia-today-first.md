# Yuun — Today-First IA (2026-07)

Navigation SSOT for the Today-first home pivot. Code truth: `apps/auspice-app/`.

## Positioning

**Yuun is a Chinese almanac (中华黄历).** Daily yi/ji (宜忌), solar terms, lunisolar dates, and an optional personal layer (For you) from your birth chart. We disclose 黄历 honestly — yi/ji is not hidden behind a generic "calendar utility" frame.

Compliance register: cultural reference and personal reflection only; not prediction or professional advice. See Terms §3 and in-app `legalDisclaimerShort`.

## Navigation

| Surface | Route | Role |
|---------|-------|------|
| **Today** | `/(tabs)/` | Week strip + yi/ji + For you (push anchor) |
| **Calendar** | inline on Today | Chevron under the week strip expands the full month grid in place (`CalendarExpandPanel`); week strip itself swipes horizontally across days |
| **Settings** | `/(tabs)/me` | Profile, Library, Notifications, Calendars, Legal |
| Swipe left on Today | → Settings | ADR-0018 `SWIPE_TO_ME` preserved |
| Swipe right on Today | (inert) | No `/calendar` 负一屏 — calendar is inline, not a swipe target |

No bottom tab bar. Today header: title only + Settings icon drill-in.

## Today zones

1. **Almanac** — yi/ji, share, solar term, festival chip
2. **Personal** — For you card (or birth CTA); push lands here via `?focus=personal`
3. **Explore** — **expanded by default**; today's culture snippet

## Settings groups

- **Profile** — birth info (powers For you)
- **Library** — reading, timeline, make-if, event, people, glossary
- **Notifications** — daily, evening, timeline reminders
- **Calendars & sync** — Apple 黄历 feed, Pro personal calendar, remote timezone
- **Legal** — privacy, terms, disclaimer

## Lunar display

UI locale ≠ lunar visibility. All locales see lunisolar day names (初一, … or localized). Solar terms localized per locale (`lib/calendar-display.ts`). en skips rating cell shading only.

## Push

Morning daily: title (干支/festival) + yi/ji summary + optional For you line. Tap → Today with `focus=personal`. Hook text renders inside PersonalCard, not a separate hero block.

## Device smoke (pre-submit)

See [pre-submit-smoke.md](./pre-submit-smoke.md).

## ASC / screenshots

S1 = Today yi/ji + For you. S2 = Calendar month grid (inline-expanded on Today). 6-shot deck — no Widget/Watch. See [screenshot-direction.md](../../publish/screenshot-direction.md) §1.
