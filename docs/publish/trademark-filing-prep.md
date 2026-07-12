# US Trademark Filing Prep — Batch 1 (Yuel · Yuun · Kanyu)

> **Goal:** File US §1(b) Intent-to-Use applications **immediately after Yuun App Store
> approval** (same week as Yuel ASC shell + ITU batch), so priority dates lock before
> scaled GTM.
>
> **Batch scope (founder 2026-07-11):**
>
> | Mark | Classes | App | Bundle |
> |---|---|---|---|
> | **YUEL** | 9 + 42 + 45 | `kindred-app` | `com.hexastral.kindred` |
> | **YUUN** | **9 only** | `auspice-app` | `com.hexastral.auspice` |
> | **KANYU** | 9 + 42 | `feng-app` | `com.hexastral.feng` |
>
> **Not in this batch:** Yaul (`coin-cast-app`) — W4.
>
> **Companion:** [trademark-clearance-and-filing.md](./trademark-clearance-and-filing.md)
> (knockout + ID drafts) · [asc-yuun-yuel-guide.md](./asc-yuun-yuel-guide.md)

*Not legal advice — hand this pack to filing counsel.*

---

## 1. ITU vs Statement of Use — what you need when

| Stage | When | Specimen required? | Purpose |
|---|---|---|---|
| **§1(b) ITU application** | **Yuun approved → same week** | **No** | Lock US priority date cheaply |
| **Notice of Allowance** | ~3–8 months after filing | No | USPTO says mark looks registrable |
| **Statement of Use (SOU)** | **Within 6 months of NOA** (extendable) | **Yes — per class** | Convert to registration after **commerce** |

**Commerce** = app **downloadable + purchasable** on US App Store (subscription or IAP counts).

You can prepare **90% of the ITU packet now**; specimens are a **post-launch** task.

---

## 2. Applicant block (pre-filled — counsel verifies)

Copy into each TEAS application:

| Field | Value |
|---|---|
| **Owner / Applicant** | UseONE, LLC |
| **Entity type** | Limited liability company |
| **State of organization** | Delaware |
| **Citizenship** | United States |
| **Street address** | 4023 Kennett Pike #50100 |
| **City / State / ZIP** | Wilmington, DE 19807 |
| **Email (correspondence)** | `[confirm: legal@hexastral.com or concact@useone.tech]` |
| **Phone** | `[founder phone]` |
| **Authorized signatory** | `[Managing Member name — must match LLC records]` |
| **Mark format** | Standard characters (typed word mark, no logo, no color claim) |
| **Filing basis** | §1(b) Intent to use in commerce |
| **Mark literal** | `YUEL` / `YUUN` / `KANYU` (three separate applications) |

**Counsel still needs:** EIN letter or LLC formation certificate (Certificate of Formation), operating agreement signatory page if asked.

---

## 3. Goods & services IDs (TEAS — per mark)

Counsel must map each draft below to the **current USPTO ID Manual** entry. Wording intentionally avoids horoscope / fortune-telling.

### YUEL — classes 9, 42, 45

| Class | Draft identification |
|---|---|
| **9** | Downloadable mobile application software for generating personal birth charts and for analyzing and comparing the relational compatibility of two persons based on Chinese metaphysics (BaZi / Four Pillars); downloadable software featuring computer-generated relationship and personality analysis. |
| **42** | Providing online non-downloadable software for generating personal birth charts and analyzing relational compatibility between two persons; software as a service (SAAS) featuring software for personality and relationship-compatibility analysis. |
| **45** | Online social networking services; providing personal introduction and relationship-compatibility analysis services rendered via a mobile application. |

### YUUN — class 9 only

| Class | Draft identification |
|---|---|
| **9** | Downloadable mobile application software featuring a Chinese lunisolar calendar and almanac, solar-term and festival reference information, family birthday reminders, and a personal life-timeline based on Chinese metaphysics (BaZi / Four Pillars). |

*Class 42 deferred — add later via new application or amendment if counsel advises; MVP filing is cl-9 only per founder.*

### KANYU — classes 9, 42

| Class | Draft identification |
|---|---|
| **9** | Downloadable mobile application software for analyzing residential and commercial sites using Chinese feng shui principles (Flying Star, Eight Mansions); downloadable software featuring computer-generated site-layout and orientation analysis from user-supplied floor plans and photographs. |
| **42** | Providing online non-downloadable software for site-layout and feng shui orientation analysis; software as a service (SAAS) featuring software for building-site evaluation and spatial-harmony reference information. |

---

## 4. Pre-filing materials checklist (do **before** counsel files)

### 4.1 Legal entity — `[human]`

- [ ] Delaware Certificate of Formation (PDF) for UseONE, LLC
- [ ] EIN confirmation letter (IRS CP 575 or 147C)
- [ ] Confirm **managing member** name + title for TEAS signature
- [ ] Engage US trademark attorney **or** confirm self-file TEAS Plus risk appetite

### 4.2 Clearance search — `[counsel / human with USPTO access]`

Must run on **live** USPTO TESS / tmsearch (automated tools cannot — see main TM doc §0).

| Mark | Search strings | Classes |
|---|---|---|
| YUEL | YUEL, YULE, YUELL, YUELLE, YUELEE, YUELAN, YUELUQU | 9, 42, 45 |
| YUUN | YUUN, YUN, YUNE, YOON, YUNN, YUUM | **9** |
| KANYU | KANYU, KAN YU, KANYOO, CANYU | 9, 42 |

- [ ] Phonetic / sound-alike sweep completed — attach counsel memo PDF
- [ ] 2(d) risk memo for YUEL cl-9 electronics cluster (YUELEE/YUELAN…) — goods distance argument
- [ ] Kanyu: no exact **KANYU** app in US App Store (verify iTunes Search API before filing)

In-house knockout already done for YUEL/YUUN → [trademark-clearance-and-filing.md](./trademark-clearance-and-filing.md) §2–3. **Kanyu knockout not yet run** — add before filing.

### 4.3 Brand consistency pack — `[repo-ready ✓]`

Counsel and examiner care that the **mark on the application = mark in commerce**.

| Asset | Path / value | Status |
|---|---|---|
| Store display name | `aso-metadata.json` → `appName` | Yuel / Yuun / Kanyu ✓ |
| Device name | `app.json` → `expo.name` | Same ✓ |
| Bundle IDs | See §0 table | Permanent — do not change |
| Developer name (ASC) | UseONE, LLC | Match applicant |
| Brand domains | `yuel.hexastral.com`, `yuun.hexastral.com`, `kanyu.hexastral.com` | Live on hexastral-web |
| Deep-link domains | `yuel.app`, `yuun.app` | Register + confirm UseONE, LLC registrant |
| Kanyu domain | `kanyu.app` (Squarespace, exp 2026-10-04) or `kanyu.hexastral.com` | `[verify kanyu.app registrant in Squarespace dashboard]` |

**RDAP snapshot (2026-07-11):** `yuel.app` + `yuun.app` resolve (Google `.app`, registrar Cloudflare, exp **2036-06-10**). `kanyu.app` resolves (registrar Squarespace, exp **2026-10-04**). Public RDAP **redacts registrant** — WHOIS/RDAP cannot confirm UseONE, LLC; screenshot the registrar dashboard (Cloudflare / Squarespace) for the attorney packet.

- [ ] Screenshot: domain registrar WHOIS/RDAP showing **UseONE, LLC** for `yuel.app`, `yuun.app`
- [ ] Export PDF: one-page brand sheet per mark (name + tagline + category from `aso-metadata.json`)

### 4.4 App positioning one-pagers — `[repo-ready ✓]`

Attach to counsel packet so IDs stay aligned with actual product:

| Mark | SSOT | One-line positioning |
|---|---|---|
| YUEL | `apps/kindred-app/aso-metadata.json` | BaZi two-chart relationship typology; invite flow; not horoscope |
| YUUN | `apps/auspice-app/aso-metadata.json` | Chinese almanac + life timeline; Reference category |
| KANYU | `apps/feng-app/aso-metadata.json` | Classical site / feng shui spatial analysis; per-site IAP |

- [ ] Confirm `_doNotUse` words never appear in goods/services IDs or specimens

### 4.5 Fee budget — `[founder]`

USPTO TEAS Plus (verify current fee at [uspto.gov](https://www.uspto.gov)):

| Application | Classes | USPTO (≈$250/class) |
|---|---|---|
| YUEL | 3 | ≈ $750 |
| YUUN | 1 | ≈ $250 |
| KANYU | 2 | ≈ $500 |
| **Subtotal USPTO** | **6** | **≈ $1,500** |

Add counsel fees (often $1.5k–4k for batch clearance + 3 ITU filings). Madrid / JP **not** in this batch.

---

## 5. Post-launch specimens (Statement of Use) — prepare shot list now

When each app is **live + purchasable on US App Store**, capture within 1 week of approval.

### Class 9 (all three marks)

**One screenshot per mark** — App Store product page (Safari or ASC preview):

- Mark **YUEL / YUUN / KANYU** visible in app **Name** field
- “Get” or price visible (proves downloadable software)
- US storefront URL in browser chrome optional but helpful
- PNG, no editing that removes the mark

### Class 42 (Yuel, Kanyu only)

**In-app screenshot** showing:

- Mark in header, splash, or Settings → About (“Yuel by UseONE, LLC”)
- User actively using the **cloud/SaaS** feature (report chapter, site analysis, chat)
- Date stamp via iOS status bar acceptable

Suggested screens:

| Mark | Cl 42 specimen screen |
|---|---|
| YUEL | Full 命书 chapter open **or** bond synastry chapter with mark in nav |
| KANYU | Site analysis report generated (not empty state) |

### Class 45 (Yuel only)

**In-app screenshot** of **invite / bond social flow**:

- “Invite partner” or bond list with **Yuel** branding
- Proves social introduction / compatibility service — not just static chart

**File naming convention:**

```
specimens/yuel-cl9-appstore.png
specimens/yuel-cl42-reading.png
specimens/yuel-cl45-invite.png
specimens/yuun-cl9-appstore.png
specimens/kanyu-cl9-appstore.png
specimens/kanyu-cl42-report.png
```

Store under `docs/publish/specimens/` (gitignored if large) or counsel portal.

---

## 6. Execution timeline (aligned with App Review)

```
T-0  (now → Yuun review)
  □ LLC docs + domain WHOIS screenshots
  □ Engage counsel; send this pack + trademark-clearance-and-filing.md
  □ Counsel runs live USPTO search (incl. KANYU)
  □ Set yuun.com backorder watch (expires 2026-09-07)

T+0  (Yuun approved — target: same week)
  □ File 3× ITU applications (YUEL 9/42/45, YUUN 9, KANYU 9/42)
  □ ASC: Yuel app record created; names match marks exactly

T+1  (Yuel live on US App Store)
  □ Capture Yuel cl 9/42/45 specimens
  □ Note earliest commerce date on calendar (SOU date of first use)

T+2  (Yuun already live)
  □ Capture Yuun cl 9 specimen if not done at T+0

T+3  (Kanyu W3 — app live)
  □ Capture Kanyu cl 9/42 specimens

T+NOA (per mark, months later)
  □ File Statement of Use per mark within 6 months of Notice of Allowance
  □ Pay SOU fee per class
```

**Yuun cl-9 only:** SOU needs **one** specimen. No cl-42/45 for Yuun in this batch.

---

## 7. What repo cannot do (human-only)

| Task | Owner |
|---|---|
| USPTO live phonetic search | Counsel or founder via browser |
| TEAS payment + submit | Counsel or authorized signatory |
| LLC formation PDFs | Founder |
| Domain registrant change to LLC | Founder / ops |
| App Store screenshots for specimens | Founder at approval |
| Kanyu preliminary knockout | Counsel (use §4.2 KANYU strings) |

---

## 8. Attorney handoff email (template)

```
Subject: UseONE LLC — 3 US ITU trademark applications (YUEL / YUUN / KANYU)

Applicant: UseONE, LLC (Delaware)
Address: 4023 Kennett Pike #50100, Wilmington, DE 19807

Please file three §1(b) Intent-to-Use standard-character applications:

1. YUEL — classes 9, 42, 45 (IDs attached — relationship/BaZi app)
2. YUUN — class 9 only (IDs attached — almanac/timeline app)
3. KANYU — classes 9, 42 (IDs attached — site analysis app)

Attachments:
- trademark-filing-prep.md (this pack)
- trademark-clearance-and-filing.md (YUEL/YUUN knockout)
- aso-metadata.json ×3 (brand consistency)
- [LLC certificate] [EIN letter] [domain WHOIS screenshots]
- [counsel clearance memo after live USPTO search]

Timeline: file within [DATE — week of Yuun approval].
Defer: Madrid, JP national, Yaul.
```

---

## 9. Quick self-check before counsel files

- [ ] Mark spellings exactly `YUEL`, `YUUN`, `KANYU` (all caps in application; commerce may use Title Case)
- [ ] Applicant is **UseONE, LLC**, not personal name
- [ ] App Store **Name** fields will match (not “Yuel: Birth Chart…” as the registered mark — counsel may advise subtitle vs mark)
- [ ] No filing for **Yaul** yet
- [ ] Yuun filing is **1 class (9)** not 9+42

> **Mark vs App Store title:** USPTO mark = **YUUN**. ASC title may be
> `Yuun: Life Timeline & Almanac` — specimen must show **YUUN** as the
> distinctive portion; counsel handles disclaimer of descriptive matter if needed.
