# Assets Production Workflow

> **Audience**: independent developer with **no designer on the team** and
> **no professional Figma background**. You ship code; this doc gets you to
> ship the visual assets the App Store and the marketing pages need.
>
> **Scope**: every digital asset listed in
> [phase-f-designer-brief.md](phase-f-designer-brief.md) and the Phase G
> capability audit — but **without** a designer hire. You will produce all
> of it yourself in 3–4 weekends.
>
> **Last updated**: 2026-05-17

---

## 0. TL;DR — the four-week solo plan

| Week | What you ship | Tool | Hours |
|---|---|---|---|
| 1 | Figma file scaffold + 7 CJK glyphs traced from 碑帖 | Figma | 12 |
| 2 | 8 app icons (iOS + Android adaptive) + 8 splash | Figma | 16 |
| 3 | Shared `core-ui` 8 SVGs + per-app onboarding visuals + share poster bgs | Figma + Claude Design | 12 |
| 4 | ASC screenshots (8 apps × 3 screens × 4 locales = 96 images) | iOS Simulator + Figma | 16 |

**Total: ~56 hours**, spread over 4 calendar weeks at ~14 h/week. That's the floor — pad +30% for the first time you touch Figma.

If you have to cut: drop the non-EN ASC locales (saves 12 h) and accept "Coming soon" on JP/ZH listings for V1; recover them as fast-follow.

---

## 1. The independent developer's design-tool reality

### 1.1 The honest Figma case

**Yes, Figma is effectively required.** Not because it's the best vector editor — it isn't (Affinity Designer 2 has cleaner Bézier tools, Sketch has tighter macOS feel). It's required because the **whole loop** — design tokens → component instances → dev mode → marketing asset export → screenshot composition — has no real alternative for solo work.

Specifically the things you can't easily get elsewhere:

- **Tokens Studio plugin** syncs Figma color/spacing/type variables ↔ your TypeScript `@zhop/hexastral-tokens` source. One source of truth, no manual sync.
- **Auto-layout** lets you build ASC screenshots that re-flow when you swap locale text.
- **Variables** let you toggle 4 locales on the same screenshot template (vs. duplicating 4 files).
- **Components** mean one icon master propagates everywhere.
- **Free tier** (3 files, unlimited drafts) covers a solo dev through V1.

### 1.2 What you DON'T need

- Pro subscription ($15/mo) — only useful when you have ≥2 collaborators or need >3 files.
- FigJam — Excalidraw / pen-on-paper is fine for whiteboarding.
- Figma Slides — Keynote ships free with macOS.

### 1.3 Honest alternatives by use case

| If you only need… | Use instead of Figma | Cost |
|---|---|---|
| Edit one SVG icon | VS Code + SVG preview extension | free |
| Resize PNG | `pngquant`, `optipng`, `sips` (macOS built-in) | free |
| Photo color-pick | Digital Color Meter (macOS built-in) | free |
| Static landing-page hero | Affinity Designer 2 | $70 one-time |
| Raster touch-up | Pixelmator Pro | $40 one-time |
| Browser-based "Photoshop" | Photopea | free |
| Cross-team design system | Penpot (FOSS) | self-host free |

**Time-to-productive estimate** for a programmer with zero prior Figma:

- Hour 0–4: nothing makes sense, you fight the canvas
- Hour 4–10: you can copy-paste shapes, do basic alignment, export PNG
- Hour 10–20: auto-layout clicks, you understand components, you stop fighting
- Hour 20+: you're as fast as a junior designer for layout work; you'll never approach senior designers for original illustration but you don't need to

### 1.4 Curriculum (first 8 hours, free)

1. Figma official tutorial — 60 min (figma.com/resources/learn-design)
2. "Figma in 24 minutes" YouTube by Mizko — 1× speed = 24 min
3. Practice: rebuild Apple's Clock app icon — 90 min (forces alignment + boolean)
4. Practice: rebuild Yuán seal icon (using their `緣` rubbing from §3) — 2 h
5. Auto-layout deep-dive — Figma's own 30-min walkthrough
6. Components & variants — 60 min
7. Tokens Studio plugin install + read the README — 30 min

After these, you can produce 80 % of what this monorepo needs.

---

## 2. Software & accounts (one-time setup)

### 2.1 Required

| Tool | Where | Cost | Notes |
|---|---|---|---|
| Figma desktop app | figma.com/downloads | free | macOS, Windows, Linux |
| iOS Simulator | Xcode (Mac App Store) | free | for ASC screenshots |
| Homebrew tools | `brew install pngquant optipng imagemagick` | free | image post-processing |

### 2.2 Figma plugins (install once)

| Plugin | Purpose |
|---|---|
| **Tokens Studio** | Sync Figma variables ↔ your TS tokens |
| **Iconify** | 200 K free icon search; outputs SVG |
| **Image Tracer** | Raster → vector (for tracing 碑帖 photos) |
| **TinyImage Compressor** | Pre-export PNG/SVG optimization |
| **Unsplash** | Pull free stock photos into the canvas |
| **Content Reel** | Fake user names / dates for ASC screenshots |
| **Lorem Ipsum (Latin + Chinese)** | Quick placeholder text |

### 2.3 Optional (purchases that pay off)

| Item | Cost | When useful |
|---|---|---|
| Affinity Designer 2 | $70 one-time | When you outgrow Figma's vector tools (rare for this scope) |
| Procreate (iPad) | $13 one-time | If you want to hand-draw ink-wash brushstrokes |
| Adobe Fonts subscription | $5/mo | Access to thousands of CJK display fonts; cancel after Week 2 |

---

## 3. The 7 asset source categories — where the real material comes from

This is the heart of the doc. Each subsection lists **public-domain or CC-licensed sources** for one material type. **All URLs verified as of 2026-05-17** — verify before downloading because museum URL schemes do drift.

### 3.1 CJK glyphs from 碑帖 (calligraphy rubbings)

You need **6 traditional Chinese characters** + 1 ancient pictograph. Each must come from a real historical 字帖, not from a font menu and not from AI.

| Character | Era / Source you want | Why this one | Where to get free high-res |
|---|---|---|---|
| **緣** | 吴让之 (Wu Rangzhi, 1799–1870) 篆书千字文 | Soft seal-script — matches Yuán's "warm thread" tone | Internet Archive: search `wu rangzhi seal script` |
| **風** | 泰山刻石 (Tai Shan Stele, 219 BCE, Li Si) | Most authoritative Qin-dynasty seal script; "風" lower portion suggests mountain wind | Wikimedia Commons: search `Tai Shan stone inscription` |
| **羅** | 石鼓文 (Stone Drums, ~700 BCE) — older 大篆 | Compass = primal instrument; pair with the oldest extant Chinese script | Palace Museum Taipei digital archive |
| **面** | 甲骨文 (Oracle bone script, ~1200 BCE) | Original 面 is "eye in face contour" — 5 strokes, perfect for an icon | Wikimedia: `Chinese oracle bone characters` |
| **夢** | 王羲之 (Wang Xizhi) 十七帖 行书 | Running script captures dream's elusive feeling; printed-font 夢 reads dead | Palace Museum Beijing high-res scans |
| **命** | (already used) — keep existing icon | — | — |

#### Where to actually download (concrete URLs)

| Source | URL | License | Notes |
|---|---|---|---|
| **故宫博物院数字文物库** | https://digicol.dpm.org.cn | personal/non-commercial use OK; commercial requires email request (free for indie) | Best Chinese-character source globally |
| **国立故宫博物院 Open Data** | https://theme.npm.edu.tw/opendata | CC-BY 4.0 | Wang Xizhi, Su Shi, Tang/Song dynasty work |
| **Wikimedia Commons** | https://commons.wikimedia.org/wiki/Category:Chinese_calligraphy | Public Domain / CC | Search by character + dynasty |
| **Library of Congress Asian Reading Room** | https://www.loc.gov/free-to-use/ | Public Domain | Qing-dynasty rubbings; English UI |
| **Internet Archive 字帖 scans** | https://archive.org (search `seal script` / `篆書`) | Public Domain | Whole books scanned; pick a page |
| **The Met Open Access** | https://www.metmuseum.org/art/collection/search#!?showOnly=openaccess | CC0 | Smaller CJK collection but PD |
| **National Museum of Asian Art (Smithsonian)** | https://asia.si.edu | CC0 | Coin photos, bronze rubbings |

#### How to trace a glyph in Figma — the 20-minute workflow

1. **Download** the rubbing photo — pick highest resolution available (≥2000px on long edge).
2. **Open Figma**, create a frame `1024×1024`, set background to your brand color (e.g. cinnabar `#9B2226`).
3. **Drag the photo** onto the frame — it becomes an Image fill on a rectangle. Resize so the glyph fills ~80 % of frame.
4. **Drop opacity to 30 %** — you'll trace over it.
5. **Pen Tool (P)** — click to set anchor points along the OUTSIDE of each stroke. Don't try to be smooth; the irregularity is the soul.
   - Pen tool tip: hold `Option` to convert sharp corner to curve handle, drag to set tangent
   - To close a path, click the first anchor again
6. For complex glyphs (緣 is ~14 strokes), do **one stroke at a time** as separate vector paths, then `Union` (`⌘ Option U`) all paths into one shape at the end.
7. **Set fill** to gold (`#C4A882`). **Delete** the reference image layer.
8. **Export as SVG**: select shape → Export → SVG → 1x. Drop into `apps/<app>/assets/seals/<glyph>.svg`.

The first glyph takes 2 hours. By the third, you'll be at 30 minutes.

#### Don't want to trace? (the lazier path)

Use a real seal-script OpenType font:

| Font | License | Where |
|---|---|---|
| 王漢宗篆書 (Wang Hann-Tzong Seal) | Free for any use | https://justfont.com or search `wt cool font` |
| **Source Han Serif Heavy** (`SourceHanSerifCN-Heavy.otf`) | SIL OFL (free commercial) | https://github.com/adobe-fonts/source-han-serif |
| 花園明朝 (Hanazono Mincho) | Free | http://fonts.jp/hanazono/ — has rare 古字 |
| I.Ming | OFL | https://github.com/ichitenfont/I.Ming |
| 方正小篆体 | Commercial — ~CNY 1500/yr | https://www.foundertype.com — skip unless flush |

Type the character in Figma, choose font, convert to outlines (`⌘ Shift O`), then **manually rough up** a couple stroke endings with the Pen tool. Pure-font icons read as "machine-set", which violates the Ink Brutalism brief.

### 3.2 Real coin / bronze / instrument photos

For CoinCast's three bronze coins. Don't draw them — photograph or use museum images.

| What you need | Where | License |
|---|---|---|
| 乾隆通宝 (Qianlong Tongbao) high-res | 故宫数字文物库 search "通宝" | non-commercial OK |
| Smithsonian National Numismatic Collection | https://www.si.edu/object/numismatics | CC0 |
| Wikimedia "Cash coin" category | https://commons.wikimedia.org/wiki/Category:Cash_coins | Public Domain |

Process in Figma:
1. Place photo, **Plugin: Image Tracer** → tracing mode `Logo (B/W)` → trace
2. Result is a vector with too many anchor points — `Object → Simplify` (3rd-party Pencil-Tool plugin) or hand-clean with Pen
3. Stack 3 traced coins in triangle layout, fill with matte bronze `#8B5A1F`

### 3.3 Textures (wood / ink / paper / stone)

For backgrounds. Always use ≤8 % opacity per the brand brief — texture should be felt, not seen.

| Texture | Source | License |
|---|---|---|
| Wood grain | https://unsplash.com (search "wood grain") | Unsplash License (free, no attribution required) |
| Wood grain (commercial-safe) | https://www.pexels.com | Pexels License (CC0-ish) |
| Ink-wash brushstrokes | https://www.freepik.com filter "Free" + commercial license check; or trace from 八大山人 paintings on Wikimedia | varies |
| Rice paper texture | https://www.toptal.com/designers/subtlepatterns | CC BY-SA |
| Stone rubbing texture | Take a photo of any limestone surface yourself, desaturate | yours |

**Procedure**:
1. Download raw image
2. Figma → place in icon frame as Image fill
3. Set blend mode to `Multiply` or `Overlay`
4. Drop fill opacity to **6–8 %** (the brief is strict here)
5. Test against the brand color — you should barely see it

### 3.4 Vector icons (replacing where `lucide-react-native` falls short)

| Source | License | Use case |
|---|---|---|
| **Lucide** (already in your apps) | MIT | First choice; check existing usage before pulling new |
| **Iconify** (Figma plugin) | various, mostly MIT/Apache | Pulls from 200+ icon sets (Tabler, Phosphor, etc.) |
| **Heroicons** | MIT | Tailwind's; clean, monoline |
| **Phosphor Icons** | MIT | 4 weights — useful for "minimal vs prominent" |
| **Remix Icon** | Apache 2 | Excellent CJK coverage |

For app-specific symbols (bagua sectors, 24山 markers, hexagram lines) — these are already SVG components in `@zhop/scenario-feng` and `@zhop/scenario-yuan`. Don't redraw; reuse.

### 3.5 Fonts beyond CJK seal-script

For Roman numerals (Numerology), system text, marketing copy.

| Font | License | Where | Use |
|---|---|---|---|
| **Bodoni Moda** | OFL | Google Fonts | Numerology "1" icon, marketing display |
| **GFS Didot** | OFL | Google Fonts | Alternative classical Roman |
| **Inter** | OFL | https://rsms.me/inter | UI text, ASC screenshot overlays |
| **Source Han Sans/Serif** | OFL | Adobe + Google | CJK body text on screenshots |
| **PingFang SC** | Apple system | iOS built-in | iOS native rendering for screenshots |
| **Noto Sans CJK** | OFL | Google Fonts | Cross-platform CJK |

Avoid: any font that requires "free for personal use only" — these will bite you on App Store rejection.

### 3.6 Real-device screenshots for App Store Connect

See §6 — this gets its own section because it's the largest workload.

### 3.7 Empty / Error illustrations — the case for AI here

This is the **one** category where AI (Claude Design specifically) produces directly usable output. Geometric, abstract, single-stroke — no recognizable real-world content.

Prompt template for Claude Design (one chat, batch 8 SVGs):

```
For each of the following concepts, output an inline SVG.
Common spec: viewBox="0 0 240 240", stroke="currentColor",
strokeWidth="1.5", fill="none", no gradients, no filters, no text.
Pure geometric abstraction — only circles, lines, arcs, polygons.

Concepts (output 8 SVGs):
1. empty-data — open scroll silhouette suggesting "nothing written yet"
2. empty-bonds — two concentric circles with a hairline gap between them
3. empty-sites — a stylized mountain (山 silhouette) with a missing dot at base
4. empty-readings — twelve radial lines from a center point, no labels
5. empty-permission — a square seal with a small hairline lock inside it
6. error-mountain — a tilted mountain with one stroke broken near the peak
7. error-network — a circle interrupted by a single zig-zag line
8. error-permission-denied — a square seal with a diagonal slash across it

Output: 8 SVG code blocks, each labeled with the concept slug.
```

Drop each SVG into `packages/core-ui/src/illustrations/<slug>.svg`. Reference from `<EmptyState illustration={...} />`.

---

## 4. The single Figma file

One file, structured like the monorepo. No fragmentation.

### 4.1 File-level structure

```
File: "HexAstral Brand Assets"
├── Cover (page)
│   └── Index, contact, version
├── 🎨 Tokens & Variables (page)
│   └── Colors / typography / spacing — synced via Tokens Studio
│       to packages/hexastral-tokens
├── 📐 Shared Components (page)
│   ├── Seals: Section with 6 traced CJK glyphs
│   ├── Empty/Error illustrations (8 SVGs)
│   ├── Brand mark variations (HexAstral wordmark)
│   └── App Store overlay templates (headline + sub style)
├── HexAstral (page)
│   ├── icon-master
│   ├── splash
│   ├── ASC screenshots — 3 screens × 4 locales
│   └── OG image (web)
├── Yuán (page)        — same shape
├── Fēng (page)        — same shape
├── Compass (page)     — icon + splash only (Tier 3 — no screenshots needed)
├── CoinCast (page)    — same shape
├── FaceOracle (page)  — same shape
├── DreamOracle (page) — same shape
└── Numerology (page)  — same shape
```

### 4.2 Tokens Studio sync (one-time setup)

1. Install Tokens Studio for Figma plugin
2. Plugin → Settings → Sync providers → GitHub
3. Repo: `your-org/hexastral`, branch `tokens`
4. File path: `packages/hexastral-tokens/figma-tokens.json`
5. Push direction: pull from GitHub
6. Build a tiny CI step in `packages/hexastral-tokens` that converts `palette.ts` → `figma-tokens.json` (see `scripts/sync-satellite-colors.mjs` for a starting pattern)

Once wired, when you change a brand color in TypeScript, it auto-updates every Figma instance.

### 4.3 Page-template for each app (copy as you create new ones)

```
[App] page:
┌─────────────────────────────────────────────────────────┐
│  Section: Icon                                          │
│    icon-ios-master    1024×1024                         │
│    icon-android-fg    1024×1024 transparent             │
│    icon-android-bg    1024×1024 solid                   │
├─────────────────────────────────────────────────────────┤
│  Section: Splash                                        │
│    splash-master      1284×2778                         │
├─────────────────────────────────────────────────────────┤
│  Section: Onboarding hero                               │
│    onboarding-hero    600×600 SVG                       │
├─────────────────────────────────────────────────────────┤
│  Section: Share poster                                  │
│    share-bg-1080x1920                                   │
├─────────────────────────────────────────────────────────┤
│  Section: App Store screenshots                         │
│    EN: hero, funnel, pricing — each 1290×2796           │
│    ZH: hero, funnel, pricing                            │
│    ZH-Hant: hero, funnel, pricing                       │
│    JA: hero, funnel, pricing                            │
└─────────────────────────────────────────────────────────┘
```

Use Figma **Variables** with a `locale` mode (EN / ZH / ZH-Hant / JA). Build the screenshot template once and switch modes to swap text.

### 4.4 Export workflow

Each terminal frame has export settings attached:

- iOS icons: PNG 1x
- Splash: PNG 1x
- ASC screenshots: PNG 1x
- Onboarding/empty/error: SVG (no @2x — vector)
- Share poster bg: PNG 1x

`File → Export...` exports everything tagged. Output to `~/Desktop/figma-export/` then move into the repo:

```bash
# Copy from Figma export dump into repo
cp ~/Desktop/figma-export/yuan/icon-ios-master.png \
   apps/yuan-app/assets/icon.png
cp ~/Desktop/figma-export/yuan/icon-android-fg.png \
   apps/yuan-app/assets/icon-android-foreground.png
# etc.
```

Compress before commit (every PNG ≤ 100 KB target):

```bash
pngquant --quality=85-95 apps/yuan-app/assets/icon.png \
  --output apps/yuan-app/assets/icon.png --force
```

---

## 5. Per-asset class playbook

### 5.1 App icon (highest priority — blocks App Store submission)

For each of 8 apps:

1. **Pick the glyph** from §3.1's table
2. **Download** the 碑帖 source from §3.1's URL table
3. **Create Figma frame** `1024×1024`, fill brand color
4. **Trace glyph** in 80 % canvas (iOS) — see §3.1 workflow
5. **Duplicate frame** → resize glyph to 58 % for Android foreground; export glyph layer only as transparent PNG → `icon-android-foreground.png`
6. **Duplicate again** → solid brand fill, no glyph → `icon-android-background.png`
7. **Test on real iOS Springboard**: AirDrop the iOS PNG to your phone, set as iMessage app icon preview, eyeball at 60×60 effective size
8. **Test Android**: open https://www.androidstudio.org/icon-preview or use Android Studio's `New → Image Asset` to preview through circle/squircle/teardrop masks

Commit paths:
```
apps/<app>/assets/icon.png                         # iOS
apps/<app>/assets/icon-android-foreground.png      # Android adaptive fg
apps/<app>/assets/icon-android-background.png      # Android adaptive bg
```

Update `app.json` for Android:
```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/icon-android-foreground.png",
      "backgroundImage": "./assets/icon-android-background.png",
      "backgroundColor": "#9B2226"
    }
  }
}
```

### 5.2 Splash

For each of 8 apps:

1. Create Figma frame `1284×2778`
2. Fill brand color
3. Drop in the seal glyph from §5.1 at 30 % canvas height, centered
4. Export PNG → `apps/<app>/assets/splash.png`
5. Compress with `pngquant`

### 5.3 Onboarding hero (Tier 1 satellites only — 4 apps)

For each of 4 apps:

1. Look up the concept in [phase-g-designer-brief equivalent above §6](#)
2. Build in Figma as SVG (no raster)
3. Use `currentColor` for stroke so RN can tint at consume-time
4. Export SVG → `apps/<app>/assets/onboarding-hero.svg`
5. Consume in `(auth)/onboarding.tsx`:

```tsx
import OnboardingHero from '@/assets/onboarding-hero.svg'
// in SatelliteOnboarding's heroSlot prop
<OnboardingHero width={240} height={240} color={colors.accent} />
```

(requires `react-native-svg-transformer` — already in your monorepo)

### 5.4 Share poster background (Tier 1 satellites + Yuán)

For each of 5:

1. Frame `1080×1920`
2. Brand color full bleed
3. Decoration in outer 20 % top/bottom only (center 60 % must stay quiet for chapter text)
4. Per-app decoration ideas from §3 of the prior brief
5. Export PNG → `apps/<app>/assets/share-poster-bg.png`
6. Consume in the satellite's `<SharePoster>` component as `<ImageBackground>`

### 5.5 Empty / Error illustrations (8 SVGs, shared)

Per §3.7 — use Claude Design once, batch all 8.

```
packages/core-ui/src/illustrations/
  empty-data.svg
  empty-bonds.svg
  empty-sites.svg
  empty-readings.svg
  empty-permission.svg
  error-mountain.svg
  error-network.svg
  error-permission-denied.svg
```

Wire into `<EmptyState illustration={<EmptyData />} />` — auto-tinted by `currentColor`.

### 5.6 OG images for hexastral-web (8 routes)

For each of: `/`, `/yuan`, `/feng`, `/compass`, `/coin-cast`, `/face-oracle`, `/dream-oracle`, `/numerology`

1. Frame `1200×630` (OG standard)
2. Brand color + glyph + 1-line route headline
3. Use Figma Variables for locale modes
4. Export PNG → `apps/hexastral-web/public/og/<route>.png`
5. Reference in Next.js metadata:

```tsx
export const metadata = {
  openGraph: {
    images: ['/og/yuan.png'],
  },
}
```

---

## 6. App Store Connect screenshots — full workflow

**The bulk of your design time.** 96 images. Plan a full week.

### 6.1 Pre-flight

#### 6.1.1 Add a DEV locale switcher to each app

In each app's `(tabs)/me.tsx` (or `settings.tsx`), bottom of the screen, gated on `__DEV__`:

```tsx
{__DEV__ && (
  <View style={{ marginTop: 32, padding: 16, borderWidth: 0.5, borderColor: colors.separator }}>
    <Text style={{ fontSize: 11, color: colors.secondary, marginBottom: 8 }}>
      DEV · LOCALE
    </Text>
    {['en', 'zh', 'zh-Hant', 'ja'].map((loc) => (
      <Pressable
        key={loc}
        onPress={async () => {
          await AsyncStorage.setItem('satellite_locale', loc) // or app-specific key
          DevSettings.reload()
        }}
        style={{ paddingVertical: 8 }}
      >
        <Text style={{ color: colors.text }}>{loc}</Text>
      </Pressable>
    ))}
  </View>
)}
```

The `AsyncStorage` key varies per app — check the existing i18n.ts for the right key (e.g., `numerology_locale`, `satellite_locale`).

#### 6.1.2 Clean status bar

```bash
xcrun simctl status_bar booted override \
  --time "9:41" \
  --batteryState charged --batteryLevel 100 \
  --wifiBars 3 \
  --cellularMode active --cellularBars 4
```

Run this once per Simulator boot. Persists until reset.

#### 6.1.3 Pick the device

Apple requires 6.7" display screenshots at minimum. Use **iPhone 15 Pro Max** Simulator (or 14 Pro Max — same resolution 1290×2796).

```bash
# List available simulators
xcrun simctl list devices

# Boot the right one
xcrun simctl boot "iPhone 15 Pro Max"
open -a Simulator
```

### 6.2 The capture loop (per app)

For each app (8 apps), repeat:

1. **Build app to Simulator** (whichever workflow you use — `bunx expo run:ios --device "iPhone 15 Pro Max"` or `bun ios` from app dir)
2. **Set locale** via the DEV switcher (`en`)
3. **Navigate** to screen 1 (hero — per [phase-f-designer-brief §2.3](phase-f-designer-brief.md))
4. **Capture**:
   ```bash
   xcrun simctl io booted screenshot ~/Desktop/screens/<app>-en-01-hero.png
   ```
5. Navigate to screen 2 (funnel — result page with `SatelliteFlagshipUpsellCard` visible)
6. Capture: `<app>-en-02-funnel.png`
7. Navigate to screen 3 (pricing — Me tab with Upgrade visible; or for Tier 3, app's main interaction)
8. Capture: `<app>-en-03-pricing.png`
9. **Switch locale** to `zh`, repeat 3-8 with `<app>-zh-*.png`
10. Switch to `zh-Hant`, repeat
11. Switch to `ja`, repeat

Per app: 12 raw screenshots (3 screens × 4 locales).

### 6.3 The overlay loop (Figma)

For each app:

1. Drop the 12 raw screenshots into the app's Figma page
2. Place each into a frame at 1290×2796 (or 1284×2778 if older spec)
3. Build a **headline overlay template**:
   - Top 18 % of frame: large headline + sub
   - Use brand color background OR brand color text on the captured screenshot
   - Use Variables modes to switch all 4 locales' text
4. Apply overlay to each of the 12 screenshots
5. Export PNG 1× × 12 frames → `~/Desktop/figma-export/<app>/`

### 6.4 Upload to App Store Connect

For each app's listing:

1. App Store Connect → My Apps → [App] → Distribution → App Store
2. Each locale tab → Screenshots section
3. Drag 3 screenshots into "6.7-Inch Display" slot
4. Verify they preview correctly
5. Save

Repeat for 4 locales × 8 apps = 32 listing updates. Block half a day.

### 6.5 Shortcut for Tier 3 (Compass)

Compass needs ASC screenshots too — it's still an App Store listing. But it has only one screen (the dial), so:

1. Capture dial screen in 4 locales (locale only affects the small "Use for feng-shui" CTA)
2. Make 3 stylized variants in Figma:
   - "True north" headline overlay
   - "Magnetic declination" overlay
   - "Use this bearing for feng-shui" funnel overlay (deep-link CTA visible)
3. 12 images total

---

## 7. Where AI fits — honest mapping

| Task | Best tool | Why |
|---|---|---|
| Trace a 碑帖 glyph | Figma Pen tool | AI seal-script is wrong |
| Compose 3 coins into a triangle | Figma | AI can't do precise placement |
| Draw 8 abstract empty/error SVGs | **Claude Design / Code agent** | Geometric, no semantic correctness needed |
| Pick a brand color | Real museum photo + Digital Color Meter | Don't ask AI |
| Write headline copy for ASC screenshots | Claude (text only) | Iterate via chat |
| Generate an ink-wash brushstroke texture | Photograph real ink OR trace from 八大山人 | AI ink-wash is identifiably synthetic |
| Resize PNG batch | `sips` (macOS) or `pngquant` | Don't waste AI tokens |
| Build moodboard | **Pinterest** (with curation) — not AI | Museum + real designer work > Stable Diffusion noise |
| Compose ASC screenshot text overlay | Figma | Reusable templates |

**Rule of thumb**: AI for **geometric abstraction without cultural specificity** (empty states), and **text** (copy, prompts). Everything else: real source + human placement.

---

## 8. From zero — your first Friday afternoon

If you've never opened Figma:

**14:00–14:30** — Install Figma, install Tokens Studio + Iconify + Image Tracer plugins.

**14:30–15:00** — Figma official "Get started" tutorial (60 min compressed to 30 by skipping marketing).

**15:00–16:00** — Rebuild Apple's Compass app icon from memory. You'll learn: frames, fills, alignment, boolean operations.

**16:00–18:00** — Trace the `緣` glyph from a real rubbing:
1. Go to https://commons.wikimedia.org/wiki/Category:Chinese_calligraphy
2. Search "緣 seal script" — pick any clean rubbing photo
3. Drag photo into a 1024×1024 cinnabar (`#9B2226`) frame
4. Drop opacity to 30 %
5. Pen tool, click around each stroke's outline
6. Union the paths, fill `#C4A882`
7. Export as PNG → drop into `apps/yuan-app/assets/icon.png`
8. Run `cd apps/yuan-app && bun dev` — see your trace on the device

If that worked, you've done the hardest part. The remaining 7 apps are repetition.

---

## 9. Sign-off checklist before commit

For every asset:

- [ ] File size ≤ 100 KB for PNG icons / splash
- [ ] File size ≤ 50 KB for SVG illustrations
- [ ] Compressed via `pngquant` (PNG) or SVGO (SVG)
- [ ] Visible at 60 px (icon test — Apple's actual home-grid size)
- [ ] Brand color matches `packages/hexastral-tokens/src/satellites.ts` HEX exactly
- [ ] No text inside icon other than the single specified glyph
- [ ] Android version respects 66 % safe zone
- [ ] No AI-generated imagery in App Store screenshots (Apple rejects)
- [ ] License of any external source asset is compatible with commercial use AND attribution requirements satisfied

---

## 10. Resource appendix

### 10.1 Museum / archive URLs

| Source | URL | License notes |
|---|---|---|
| 故宫博物院数字文物库 | https://digicol.dpm.org.cn | Personal / non-commercial OK; commercial use needs email permission (free) |
| 国立故宫博物院 Open Data | https://theme.npm.edu.tw/opendata | CC BY 4.0 |
| Wikimedia Commons (Chinese calligraphy) | https://commons.wikimedia.org/wiki/Category:Chinese_calligraphy | Mostly PD; check each file |
| Library of Congress Free to Use | https://www.loc.gov/free-to-use/ | Public Domain |
| Internet Archive | https://archive.org | Various; PD or CC for historical material |
| The Met Open Access | https://www.metmuseum.org/art/collection/search#!?showOnly=openaccess | CC0 |
| Smithsonian Open Access | https://www.si.edu/openaccess | CC0 |
| Unsplash | https://unsplash.com | Unsplash License (free, no attribution required) |
| Pexels | https://www.pexels.com | Pexels License |

### 10.2 Free seal-script & display fonts

| Font | Source | License |
|---|---|---|
| Source Han Serif | https://github.com/adobe-fonts/source-han-serif | SIL OFL |
| Source Han Sans | https://github.com/adobe-fonts/source-han-sans | SIL OFL |
| Hanazono Mincho | http://fonts.jp/hanazono/ | Free |
| I.Ming | https://github.com/ichitenfont/I.Ming | SIL OFL |
| Bodoni Moda | https://fonts.google.com/specimen/Bodoni+Moda | OFL |
| GFS Didot | https://fonts.google.com/specimen/GFS+Didot | OFL |
| Inter | https://rsms.me/inter | OFL |

### 10.3 Figma plugins (linked above, repeated here for one-shot install)

- Tokens Studio for Figma
- Iconify
- Image Tracer
- TinyImage Compressor
- Unsplash
- Content Reel
- Lorem Ipsum

### 10.4 Reference reading (free)

- Figma — Auto-Layout deep dive: https://help.figma.com/hc/en-us/articles/360040451373
- Figma — Variables & Modes: https://help.figma.com/hc/en-us/articles/15145852043927
- Apple Human Interface Guidelines — App Icons: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Apple HIG — App Store screenshots: https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots
- Android adaptive icon spec: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive

### 10.5 Related repo docs

- [phase-f-designer-brief.md](phase-f-designer-brief.md) — original designer brief (now a spec reference rather than a hire trigger)
- [decisions/0004-satellite-funnel-pattern.md](decisions/0004-satellite-funnel-pattern.md) — locked brand colors per app
- [decisions/0006-satellite-tiers.md](decisions/0006-satellite-tiers.md) — which apps need full asset sets
- `packages/hexastral-tokens/src/satellites.ts` — exact HEX values
- `packages/hexastral-tokens/src/palette.ts` — flagship + foundation palette

---

## 11. When to break this workflow

If you have a real designer to hire (~$3–8 k for this whole scope):

1. Hand them [phase-f-designer-brief.md](phase-f-designer-brief.md) and §3 of this doc as material sourcing
2. They do §5 (icons + splash + onboarding + share posters) in ~2 weeks
3. You still do §6 (ASC screenshots) — only the dev knows when the right screen state is captured

If you become a Figma operator yourself, you'll still benefit from a designer for the **conceptual** assets (per-app onboarding hero, share poster decoration) which need taste more than tool skill.

**A reasonable middle path**: ship V1 with the self-produced assets from this workflow, hire a designer for the post-launch refresh once you have D7/D30 data to know which surfaces matter.
