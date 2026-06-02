# ADR-0022: MingPan disposition — donor to Kindred, not a launch

- Status: Accepted
- Date: 2026-06-02
- Builds on: [ADR-0021](0021-kindred-v2-solo-first-mingpan-frame.md)
- Amends: [ADR-0019](0019-v1-wave-narrowed-cycle-feng-yuan.md) (MingPan handling + restart triggers)

## Context

ADR-0019 froze MingPan with restart triggers (Auspice shipped + stable 30d,
DAU ≥ 1000, crash-free ≥ 99.5%), planning its V1.x return as the "lifelong
chart depth" node sitting above yuan/feng in the funnel graph.

ADR-0021 then made Kindred solo-first: Kindred's lead feature is now the
same 八字紫微合参 report MingPan was built to deliver, produced by the same
pipeline MingPan pioneered (`/api/natal` + `/api/report/chapter/*`).

That collapses MingPan's reason to exist as a standalone App Store product:

1. **Its three designed jobs are all absorbed or invalidated:**
   - *八字 search-traffic capture + funnel to flagships* — Kindred now targets
     those users directly. The cross-app funnel hop (install-to-install
     conversion is typically single-digit percent) is pure loss compared to
     the user landing in Kindred and getting the same report immediately.
   - *Birth-chart capture into portfolio memory* — Kindred v2 captures the
     identical chart at onboarding.
   - *ADR-0018 design-language reference* — a repository role, not an App
     Store role; it keeps working while frozen.

2. **Launching both is an Apple Guideline 4.3(b) (spam / duplicate apps)
   exposure.** Post-ADR-0021 the two apps share the same core feature, the
   same compute libs, the same report content, the same design language, and
   the same fresh publisher (UseONE, LLC — no review track record). Before
   ADR-0021 the differentiation was real (solo-only vs pair-only products);
   after it, the only difference is that Kindred has *more*.

3. **The keyword overlap is already material.** Kindred's ASO keywords
   already include 四柱 / 五行 / 日主 / 中华命学; MingPan's only unique ASO
   asset is the head-term app *name* ("MingPan / 八字四柱") and the
   EDUCATION-category positioning.

Note: ADR-0019 records the reserved bundle ID as `com.hexastral.mingpan`,
while `apps/ming-pan-app/app.json` ships `com.hexastral.fate`. Both remain
reserved; neither has been released.

## Decision

1. **MingPan never ships as a standalone app.** It is removed from all launch
   planning. ADR-0019's restart triggers for MingPan are void (numerology's
   triggers are unaffected).

2. **The relationship is: MingPan is Kindred's donor.**
   - **Code**: the frame — shell structure, compute libs (`lib/natal.ts`,
     `lib/ziwei.ts`, `lib/reading.ts`, `lib/reading-cache.ts`), report UI,
     chart views — is ported into kindred-app per ADR-0021 phases K1–K2.
   - **ASO**: the anti-spam EDUCATION positioning copy and keyword research in
     `apps/ming-pan-app/aso-metadata.json` migrate into Kindred's ASO surface;
     Kindred's description now leads with the solo reading ("先读懂自己，
     再读懂你们"), then the pair reading.
   - **Repo**: `apps/ming-pan-app` stays frozen (must keep building and
     typechecking, per the ADR-0019 maintenance floor) until K1/K2 are
     verified in production; then it is archived following the ADR-0016
     pattern.
   - **Bundle IDs** (`com.hexastral.fate`, `com.hexastral.mingpan`) stay
     reserved — reservation costs nothing and forecloses nothing.

3. **Narrow revival clause** (replaces the ADR-0019 triggers). MingPan may be
   revived only as a *thin acquisition shell* — chart calculator + funnel
   card, **no report** — and only when BOTH hold:
   - Kindred has shipped, has been stable ≥ 60 days, and organic acquisition
     is the *measured* bottleneck (not assumed);
   - Search-ranking data shows Kindred cannot rank for solo-八字 head terms
     from its LIFESTYLE listing.

   The thin shell avoids 4.3(b) because it does not duplicate Kindred's
   report — it computes a chart and hands the user to Kindred.

## Consequences

### Positive

- One launch surface; all reviews, ratings, and ranking signals concentrate
  on Kindred.
- No duplicate-app exposure on the publisher's first contact with App Review.
- MingPan's ~3,200 LOC of working components and libs get a second life
  inside the product that actually ships, instead of rotting in a frozen app.
- One fewer app to drag through every Expo SDK upgrade, locale addition, and
  API change.

### Negative

- The EDUCATION-category positioning — a clean, defensible anti-spam surface —
  goes unused unless the revival clause fires.
- If Kindred's LIFESTYLE listing cannot rank for 八字 head terms, acquisition
  suffers until the revival clause is exercised (this is a measured, bounded
  risk, not an unbounded one).
- ADR-0019's MingPan launch choreography (paired submission, W-ordering)
  becomes dead weight in the historical record.

## References

- [ADR-0021](0021-kindred-v2-solo-first-mingpan-frame.md) — the solo-first pivot this disposition follows from
- [ADR-0019](0019-v1-wave-narrowed-cycle-feng-yuan.md) §Frozen apps + §Restart triggers — superseded for MingPan
- [ADR-0016](0016-archive-non-utility-apps.md) — the archive pattern to apply after K1/K2 verify
- `apps/ming-pan-app/aso-metadata.json` — ASO copy to migrate into Kindred
- `apps/ming-pan-app/README.md` — donor status note
- Apple App Review Guideline 4.3(b) — duplicate apps from one developer
