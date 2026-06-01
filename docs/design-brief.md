收到。先记录现状：hexastral-app icon 是「黑底 + 半新月体（half-illuminated celestial sphere）」，简约耐看，符合「命」字本体（天体观察）。这一档可以作为整个 matrix 的视觉基准——其他 app 的 icon 都应在同一克制度下做。

下面给出**完整资产需求**、**Android/iOS 切割规则**，以及**逐 app 可直接喂给 Claude Design / GPT-4o image / Midjourney / DALL-E 3 的英文 prompt**。

## 1. 资产清单矩阵（按 app × 类别）

| App | 1. iOS icon | 2. Android icon (前景+背景) | 3. Splash | 4. ASC 截图 ×3 | 5. App 内 SVG | 6. Share poster bg | 7. Onboarding 视觉 |
|---|---|---|---|---|---|---|---|
| **HexAstral** (已有) | ✓ | ✗ adaptive 未拆 | placeholder | — | seal-loading | — | — |
| **Yuán** 緣 | — | — | placeholder | — | YuanSeal 已有 SVG | `ShareableChapterCard` 已有 layout，缺背景纹理 | `RevealMoment` 五条金线 SVG 已有 |
| **Fēng** 風 | — | — | placeholder | — | bagua/24山 已有；缺 `feng-loading` 印章 | — | FacingCalibrator 卫星底图（占位 gradient） |
| **Compass** 羅 | — | — | placeholder | — | dial 已有 | n/a Tier 3 | n/a Tier 3 |
| **Coin Cast** 卦 | — | — | placeholder | — | `CoinCastSealLogo` 占位 | `CoinCastSharePoster` 缺 wood-grain 纹理 | onboarding 三铜钱 |
| **Face Oracle** 面 | — | — | placeholder | — | 缺 face frame guide overlay SVG | `FaceOracleSharePoster` 缺 ink-wash 背景 | — |
| **Dream Oracle** 夢 | — | — | placeholder | — | 缺 night sky decorative SVG | `DreamSharePoster` 缺 indigo 星图 | — |
| **Numerology** 1 | — | — | placeholder | — | `NumerologyResultCard` 数字模板需正稿 | NumerologySharePoster 整张待设计 | — |
| **共享：core-ui** | n/a | n/a | n/a | n/a | empty-data / empty-bonds / empty-sites / empty-readings / empty-permission · error-mountain / error-network / error-permission-denied（共 8 张，[brief §3](docs/phase-f-designer-brief.md)） | n/a | n/a |
| **hexastral-web** | favicon + apple-touch-icon | — | n/a | n/a | OG image per route (8 routes × `/feng /yuan /compass /coin-cast /face-oracle /dream-oracle /numerology /`)  | n/a | n/a |

**总数粗算**：
- 8 套 app icon × 2 (iOS / Android) = 16 张
- 8 张 splash
- 8 张 OG image
- 8 张 EmptyState/ErrorState SVG（共享）
- ~10 张 app 内品牌 SVG（per-app loading seal / share bg / decorative）
- ASC 截图 8 app × 3 屏 × 4 locale = 96 张（最大头，可以分批）

---

## 2. iOS vs Android Icon 切割规则（一次说清）

**iOS** 一张 1024×1024，全角填色到边。系统自动施加 squircle 圆角（约 22% radius）；不要自己画圆角。glyph 可占到 80% canvas。

**Android Adaptive Icon**（必须）：拆成两层
- **背景层** 1024×1024：纯品牌色或微纹理，**满铺**
- **前景层** 1024×1024：**glyph 只能放在中央 66%（676×676）的安全圈内**，其余透明 PNG。Launcher 会用 circle / squircle / rounded-rect / teardrop 等多种 mask 切割——超出 676 的部分一定被裁。

Expo 配置（每个 app `app.json`）：
```json
{
  "ios":     { "icon": "./assets/icon.png" },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/icon-android-foreground.png",
      "backgroundImage": "./assets/icon-android-background.png",
      "backgroundColor": "#9B2226"
    }
  }
}
```

**给设计师的 deliverable 建议**：每 app 交付 3 个 PNG
1. `icon.png` 1024×1024（iOS master，glyph 80%）
2. `icon-android-foreground.png` 1024×1024（透明 PNG，glyph 居中 66% 内）
3. `icon-android-background.png` 1024×1024（纯色或微纹理）

---

## 3. 全局风格 prompt prefix（每个 prompt 都用）

```
STYLE BIBLE — paste at top of every asset prompt:

Aesthetic: Ink Brutalism + 金石玄学 (gold-stone Chinese metaphysics).
Rule out: glossy gradients, neon glow, web3 holographic, drop shadows,
3D bevels, faux-paper texture, faux-marble texture, emoji, lens flare,
sparkles, magical particles, photoreal sky.
Allow: flat fills, hairline strokes (0.5–1.5px), seal-script (篆書) glyphs,
classical numerals, subtle ink-wash gradient ONLY where noted, deep matte
finish, full-bleed brand color to canvas edge.
Reference vibe: Pentagram identity work, Hara Kenya's MUJI poster minimalism,
Song-dynasty rubbing imprints (拓片), Apple OS-built-in app icons (Compass,
Stocks, Watch) for the formal restraint.
Composition: Apple squircle-aware (full-bleed background, glyph centered).
Output: 1024×1024 PNG, sRGB, no transparency on iOS variants.
Do NOT: write any text other than the single specified glyph. No taglines.
No "HEXASTRAL" wordmark inside the icon — Apple shows the app name itself.
```

---

## 4. 逐 app prompt（iOS icon + Android foreground + splash）

下面每个 app 给 3 个 prompt。把 STYLE BIBLE 拼到每个的前面。

### 4.1 Yuán 緣

**iOS icon (1024×1024)**
```
A single deep cinnabar-red (#9B2226) full-bleed square canvas.
Centered: a large traditional seal-script character "緣" (Yuán) in soft
ink-gold (#C4A882), drawn as if printed by a stone seal — slightly uneven
edges, subtle ink-bleed at the strokes, no shadow. Character height
~70% of canvas. The character should feel pressed INTO the cinnabar,
not floating ON it. Single glyph only. Background remains pure flat cinnabar
to the four corners.
```

**Android foreground (1024×1024, transparent)**
```
Transparent PNG. ONLY the seal-script character "緣" in ink-gold (#C4A882),
centered, character height ~58% of canvas (must fit within the central
676×676 safe zone). No background fill. Same stone-seal texture as the iOS
master. Nothing else on the canvas.
Background layer (separate file): pure flat cinnabar #9B2226 fill.
```

**Splash (1284×2778, portrait)**
```
Same cinnabar #9B2226 ground. Centered both axes: the same seal-script "緣"
glyph in ink-gold, occupying ~30% of canvas height. No animation cue, no
loading spinner — those are owned by the runtime. No wordmark, no tagline,
no progress bar. The splash is a single still meditation moment before the
app opens.
```

### 4.2 Fēng 風

**iOS icon**
```
A full-bleed square canvas in deep ink-teal (墨青, #0F1E26 — almost black
with a cold blue undertone). Centered: the seal-script character "風"
(Fēng) in matte copper-gold (#B08D5B), height ~70% of canvas. The character
should feel etched / engraved, not painted — think bronze relief on slate.
Hairline 1px copper outline tracing the inner stroke contour, just visible.
No glow. Pure flat ink-teal to corners.
```

**Android foreground (1024×1024, transparent)** — same as iOS but glyph height 58%, transparent background. **Android background**: solid ink-teal #0F1E26.

**Splash (1284×2778)**
```
Ink-teal #0F1E26 ground. Centered: seal-script "風" in copper #B08D5B at
30% canvas height. Below the glyph, a hairline 0.5px copper horizontal rule
80px wide, centered, exactly 120px below the glyph baseline. That rule is
the only secondary element. No wordmark. No tagline.
```

### 4.3 Compass 羅 (Tier 3, shares Fēng palette)

**iOS icon**
```
Ink-teal #0F1E26 full bleed. Centered: a minimalist needle compass — a
single sharp diamond-shape needle in copper #B08D5B (north tip) and warm
ivory #E6E2D6 (south tip), oriented vertically with north up. Behind the
needle, a single hairline 1px copper circle at 88% canvas diameter. No
cardinal letters (N/E/S/W), no degree markings, no 24-mountain ring —
the icon is the instrument, not the dial. Pure ink-teal everywhere else.
```

**Android foreground**: needle + hairline circle, scaled to 58% canvas, transparent bg. **Android background**: ink-teal #0F1E26.

**Splash**
```
Ink-teal #0F1E26 ground. Centered: the same needle from the icon at 30%
canvas height. Below the needle, a single small seal-script "羅" glyph in
copper at 8% canvas height. No further chrome.
```

### 4.4 Coin Cast 卦

**iOS icon**
```
A full-bleed deep amber #B8741F square. Centered, three small bronze
ancient Chinese coins (方孔铜钱 — round outer with square inner hole)
overlapping in a triangular cluster — top coin slightly offset right, two
below offset left and centered. Coins are matte bronze (#8B5A1F to
#D49555 ink-wash, NO metallic gloss), each ~30% of canvas diameter. Very
subtle warm wood-grain texture in the amber background — barely visible,
under 8% opacity. No coin face details (no Hanzi on the coins, just the
square hole). No glyph "卦" — the coins ARE the brand mark.
```

**Android foreground**: 3 coins only at 58% scale, transparent. **Android background**: amber #B8741F with the subtle wood-grain.

**Splash**
```
Amber #B8741F ground. Centered: the same three-coin cluster from the icon
at 32% canvas height. Wood-grain background texture stays at ≤8% opacity.
No glyph, no wordmark.
```

### 4.5 Face Oracle 面

**iOS icon**
```
Full-bleed jade green #3F7B5C square. Centered: a minimalist face profile
silhouette — a single elegant SE Asian face profile facing left, rendered
as a 1.5px ink-wash brushstroke outline in warm ivory #F0EBE0. The face
should be schematic, not photorealistic — three strokes total: one for the
forehead-nose-chin contour, one for the eye line, one for the lips. No
hair, no ear detail, no shading. Profile height ~65% of canvas. Pure jade
elsewhere.
```

**Android foreground**: profile silhouette at 55% canvas, transparent. **Android background**: jade #3F7B5C.

**Splash**
```
Jade #3F7B5C ground. Centered: the same profile silhouette at 32% canvas
height. A single hairline 0.5px ivory horizontal rule 120px wide, 100px
below the chin baseline. No glyph, no wordmark.
```

### 4.6 Dream Oracle 夢

**iOS icon**
```
Full-bleed deep indigo #3C3E76 square — night-sky depth without being
purple. Centered: a single crescent moon in matte silver #C8C9D6,
facing right (waxing), ~55% of canvas diameter. NO stars around it. NO
clouds. NO sparkles. The moon has a soft inner gradient from a slightly
brighter silver #DDE0EB on the lit edge to a darker #A8AAB8 on the inner
terminator — but this gradient is ONLY within the moon shape, not in the
background. The indigo background stays pure flat.
```

**Android foreground**: crescent moon at 50% canvas, transparent. **Android background**: indigo #3C3E76.

**Splash**
```
Indigo #3C3E76 ground. Centered: the same silver crescent at 30% canvas
height. Below the moon at 60% canvas height, a single tiny "夢" seal-script
glyph in silver at 6% canvas height — barely a whisper. No wordmark.
```

### 4.7 Numerology 1

**iOS icon**
```
Full-bleed warm ivory #F5F0E8 square (light mode default — Numerology is
the Western-market wedge per ADR-0004, accessible/minimal). Centered: a
single classical numeral "1" in deep violet #5B3F8A, rendered as a
classical Roman numeral display face (think Bodoni Display or Didone),
extra-thin contrast — hairline horizontals, thick verticals. Numeral height
~75% of canvas. Below the "1" baseline, a single hairline 0.5px violet
horizontal rule 30% canvas width. No serifs that overshoot. No other digit.
The "1" is both the brand and the central concept (life-path).
```

**Android foreground**: numeral "1" + small underline at 60% canvas height, transparent. **Android background**: ivory #F5F0E8.

**Splash**
```
Ivory #F5F0E8 ground. Centered: the same violet "1" + underline at 32%
canvas height. No glyph, no wordmark.
```

---

## 5. Share poster 背景 prompts（1080×1920，per app）

每个 app 的 ShareableChapterCard / SharePoster 已有 layout，只需要**底纹背景图**。Designer 出一张 1080×1920 PNG，由 app 内 `<View>` 叠 chapter text + seal + URL。

```
COMMON FORMAT: 1080×1920 portrait PNG, brand color full-bleed.
Center 60% canvas must remain visually quiet — that's where the golden line
goes. Decoration may live in the outer 20% top/bottom.

Yuán  — cinnabar #9B2226 base with a single faint 緣 seal watermark
        in upper-right corner at 8% opacity, ~200px wide.
Fēng  — ink-teal #0F1E26 base with a faint 24-mountain ring etched at
        bottom-center, 80% opacity copper hairlines, 600px diameter,
        only the lower half visible (fades into the canvas edge).
CoinCast — amber #B8741F base with subtle wood-grain (≤8% opacity)
        + a single faint 卦 hexagram (six horizontal lines) watermark
        upper-right, 8% opacity bronze.
FaceOracle — jade #3F7B5C base with a single faint ink-wash brushstroke
        diagonally from upper-left to lower-right, 10% opacity ivory.
DreamOracle — indigo #3C3E76 base with three tiny silver dots (stars,
        not sparkles) in upper third, total <2% of canvas area.
Numerology — ivory #F5F0E8 base with a single faint violet "1" watermark
        upper-right, 6% opacity, ~180px tall.
```

---

## 6. Onboarding 视觉（per app）

仅 Tier 1 卫星 + 旗舰需要。SatelliteOnboarding 已有 layout，只需要 hero 区一张 SVG。

```
COMMON: SVG, viewBox 600x600, currentColor stroke for tinting from RN.
Single concept per app, no text inside the SVG (text is layered by RN).

Yuán  — two seal-script characters (人 left, 人 right) connected by 5
        thin gold curving threads. Each 人 ~120px tall, threads 0.75px.
Fēng  — a stylized 山 (mountain) silhouette with the seal-script 風
        small above-left, suggesting "wind over mountain." 1.5px strokes.
CoinCast — three concentric circles (the falling coin in motion), with
        a single bronze dot center. No coins shown — just the implied
        landing.
FaceOracle — a frame-guide oval (the camera viewfinder shape) with
        three cardinal alignment ticks. 1.5px stroke.
DreamOracle — a horizontal line bisecting the canvas with a small
        crescent moon above and a faint reflection below. Asks the user
        to "describe what you saw."
Numerology — a 3-row 3-column dot grid (suggesting numerological matrix)
        with one cell highlighted. Each dot 12px.
```

---

## 7. Core-UI EmptyState / ErrorState（一次性出 8 张，共享）

已经写在 [phase-f-designer-brief §3](docs/phase-f-designer-brief.md)，照搬该 brief 即可。关键是 `currentColor` SVG — 不同 app 实例化时 tint 成各自品牌色。

```
ALL: SVG, viewBox 240x240, single stroke 1.5px, no fill, `currentColor`
on stroke so consumer apps can tint.

empty-data       — open scroll silhouette
empty-bonds      — two seals with a gap between
empty-sites      — 山 (mountain) silhouette minus a small house
empty-readings   — blank natal chart silhouette (12 sector lines, no glyphs)
empty-permission — a locked seal (small lock icon on a square seal)
error-mountain   — a tilted 山 with one stroke broken
error-network    — a cracked stone outline
error-permission — a crossed-out seal
```

---

## 8. ASC 截图（96 张，最大头）

这是工作量最大的一块。建议**Designer 先出每 app 一套 EN 截图（3 屏）**，其他 3 个 locale 用 [SwiftShot](https://github.com/apple/swiftshot) 或 Figma plugin 批量本地化文本。

每 app 3 屏选取：
- **Hero 屏**（per app）
  - HexAstral: 命 tab daily home with FateHomeHero + golden line
  - Yuán: chapter pager mid-reading with cinnabar share button visible
  - Fēng: annotated satellite + 6-chapter index
  - Compass: full-screen dial with 24山 ring
  - CoinCast: coin-toss animation moment + hexagram result
  - FaceOracle: face capture screen with frame guide
  - DreamOracle: interpretation result with night sky
  - Numerology: life-path number hero + personal-year strip
- **Funnel 屏**: result.tsx with SatelliteFlagshipUpsellCard visible
- **Pricing 屏**: Me tab with Upgrade row visible (Tier 1 only)

ASC 截图建议**用真实截图 + Figma 文字 overlay**，不要 AI 生成——Apple 审核更严，AI 生成内容可能被打回。

---

## 9. 优先级（如果预算分批）

| 批次 | 资产 | 阻塞 |
|---|---|---|
| **P0 必须 launch 前** | 8 app icon + 8 splash | 阻塞 App Store 提审 |
| **P1 launch 同步** | ASC 截图 EN 版（24 张） | 阻塞 store listing |
| **P2 launch +2 周** | core-ui 8 张 SVG | 提升 EmptyState 美感 |
| **P3 launch +4 周** | per-app onboarding SVG + share poster 底纹 | 提升 onboarding 完成率 + 分享转化 |
| **P4 V1.1** | OG image × 8 路由 | 提升 hexastral-web 点击率 |
| **P5 V1.1** | 其余 locale 截图（72 张） | 仅在该 locale 上架前需要 |

---

## 10. 给 Designer / 给模型的额外指示（必读）

- **不要写文字 in icon**——除了规定的那 1 个 glyph，绝不出现 wordmark 或 tagline
- **不要 metallic gradient**——金色用 matte #C4A882 / #B08D5B，不用真的金属反射
- **每个品牌色 sample 都不要饱和过度**——参考 Apple Watch face 的调色，宁可稍 muted 也不要 saturated
- **测试 Android 安全圈**：iOS master 出完，把 glyph 缩到 66% 居中再看一次——如果看起来太小，意味着原始 iOS 版本 glyph 占比就高了，需要克制
- **测试 dark/light 设备背景**：把每个 icon 放在 iOS dark home grid 旁边，确保对比度足够（特别是 Numerology 的 ivory 底——iOS 浅色主屏背景下会"消失"，需要在 ivory 外加 0.5px 极淡边框 #E8E1D2）