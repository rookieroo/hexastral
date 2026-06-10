# Kindred imagery assets — AI generation guide

Two asset families defined by [ADR-0021](../../../../docs/decisions/0021-kindred-v2-solo-first-mingpan-frame.md) §7.
Neither is used by the intro animation (see `../intro/README.md` for that);
these are for report chapters, App Store material, and share posters.

## 1. Q版 mascot (marketing / display only)

A chibi rendition of the Kindred stick figure. Used in App Store screenshots,
share posters, empty states. The in-app parable keeps the ink-brush vector
figure (`components/StickFigure.tsx`) — do not swap it.

Character block (repeat verbatim in every prompt):

```
A cute chibi character derived from a minimalist ink stick figure:
oversized round head (about 40% of total height), tiny simple body,
ivory white ink brush strokes with visible texture on pure black
background, two small dot eyes, no mouth or a tiny single-stroke mouth,
soft warm glow around the lines, hand-drawn East Asian ink painting
feel, gentle and warm personality.
```

Pose suffixes (one per generation):

| Use | Prompt suffix |
|---|---|
| App icon / hero | `sitting cross-legged, hands on knees, eyes closed, serene.` |
| Empty state (no bonds) | `standing and looking up at a single star, hopeful.` |
| Waiting for partner | `sitting and hugging knees, patient, a faint red thread trailing from one finger.` |
| Report ready | `jumping with both arms up, delighted, small motion lines.` |
| Pair / share poster | `two chibi figures sitting shoulder to shoulder, one leaning head on the other.` |

Constraints tail (always append):

```
Full body, centered, nothing cropped, isolated character only — no ground,
no background elements, no text. Consistent proportions across all images,
1:1 square canvas, high resolution.
```

Consistency: same approach as the intro figures — lock one accepted result as
character reference (`--cref` / img2img low denoise) for the rest of the set.

## 2. Chapter 实物意象 (physical-object metaphors)

One object per chapter kind, rendered in the same ink style. Used in
ChapterCard headers, ShareableChapterCard, and the locked-chapter list.

Style block (repeat verbatim in every prompt):

```
A single object rendered as a Chinese ink painting (水墨画), ivory and
warm gold ink on pure black background, confident brush strokes with
dry-brush texture (飞白), generous negative space, one small area of
muted cinnabar red (#9B2226) as the only accent color, museum-quality
minimalism, no text, no border, no seal stamp.
```

Object prompts:

| Chapter | Object | Prompt suffix |
|---|---|---|
| first_impression | 茶盏 | `a small tea cup with steam rising, tea being poured from above, the moment of a first meeting.` |
| communication | 信笺 | `a folded paper letter partially open, a few illegible ink strokes visible on it.` |
| conflict | 磨石 | `a whetstone with a blade being sharpened against it, a few sparks as tiny cinnabar dots.` |
| complement | 榫卯 | `a mortise and tenon wooden joint, two interlocking wooden pieces shown slightly apart, fitting perfectly.` |
| monthly_outlook | 月相 | `a horizontal strip of eight moon phases from new moon to full moon, the full moon touched with gold.` |
| long_term_advice | 年轮 | `a tree trunk cross-section showing many growth rings, one ring highlighted in cinnabar.` |
| solo · personality | 印章 | `a carved stone seal (chop) standing upright next to its red imprint on paper.` |
| solo · timeline | 罗盘 | `a Chinese geomantic compass (luopan) viewed from above, needle pointing with a subtle gold glint.` |

Constraints tail (always append):

```
Object centered with generous margin, 1:1 square canvas, consistent
brush style and stroke weight across the whole set, dark background
exactly #0B0B0C, high resolution.
```

### Export specs

| Asset | File | Size |
|---|---|---|
| Chapter header | `chapter-{kind}.png` | 600x600, < 150 KB |
| Share poster variant | `chapter-{kind}@poster.png` | 1080x1080, < 400 KB |
| Q版 poses | `mascot-{pose}.png` | 800x800, transparent PNG after background removal |

Drop exports into this directory; consuming components reference them by the
file names above (wiring happens in K4, see ADR-0021 phases).
