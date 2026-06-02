# Intro scene assets — AI generation guide

The onboarding intro (`app/(onboarding)/intro.tsx`) renders its scenery
procedurally by default (see `components/IntroScene.tsx`). This directory is
the drop-in slot for AI-generated raster plates that replace the procedural
sky + ground with richer texture, while the stick figures stay vector
(tintable, reanimated-driven).

This file also contains the prompt recipes for generating clean stick-figure
cutouts — those are NOT used inside the app (in-app figures are
`components/StickFigure.tsx`), but are needed for App Store screenshots,
web landing pages, and social/share material.

## 1. Backdrop plates (used by the app)

Two full-bleed plates. The app cross-fades `dim` → `bright` at the end of the
parable (when the pair sits down and the sky lights up).

| File | Content | Spec |
|------|---------|------|
| `backdrop-dim.png` | Night sky + planet ground, sparse faint stars, **no galaxy** | 1290x2796 (9:19.5), PNG, sRGB, < 600 KB |
| `backdrop-bright.png` | Same composition, stars brighter + milky-way band upper right | same |

Both plates MUST share the same composition (same horizon line, same ground
shape) so the cross-fade reads as the sky lighting up, not a scene cut. Use
image-to-image / seed reuse: generate `bright` first, then derive `dim` from
it by reducing the sky, or vice versa.

The ground rim must sit at ~62-65% of the frame height (the figures' feet are
placed at `height * 0.62`), and the center-bottom area must stay clear of
detail — the figures composite there.

### Prompt — backdrop-bright.png

```
Dark night scene on a small planet, hand-drawn ink illustration style.
The curved rocky surface of the planet fills the bottom third of the frame,
horizon arc peaking at about 63% of the frame height, weathered stone
texture with fine grain on the rim, surface fading to pure black at the
bottom edge.
Deep charcoal-black sky filled with many small scattered stars of varying
brightness, a soft diagonal milky way galaxy band sweeping from the upper
center toward the middle right edge, faint ivory glow.
Monochrome palette: near-black (#0B0B0C), charcoal greys, ivory white
(#F5F0E8) highlights only.
Absolutely no characters, no figures, no people, no animals, no text,
no moon, no sun, no buildings.
The area just above the center of the horizon arc kept dark and empty
(characters will be composited there).
Vertical 9:19.5 phone wallpaper aspect ratio, flat illustration,
subtle paper/ink texture, no lens flare, no photographic effects.
```

### Prompt — backdrop-dim.png

Same prompt with these lines swapped in:

```
...sparse faint small stars, dim and quiet sky, no galaxy, no milky way...
```

(Or derive it from `backdrop-bright.png` in an editor: delete the galaxy
band layer, drop star layer opacity to ~40%.)

### Enabling the plates

1. Drop both PNGs into this directory.
2. In `components/IntroScene.tsx`, switch on the two `require()` lines in the
   "AI backdrop plate slot" section.
3. The procedural stars/ground/galaxy turn off automatically
   (`HAS_BACKDROP_PLATES`); figures, glow and dust stay vector on top.

## 2. Stick-figure cutouts (marketing / screenshots / web only)

The in-app figure is vector (`StickFigure.tsx`, poses: `stand / walk / lookL /
lookR / talk / hug / sit`). Generate raster cutouts only for material outside
the app. To keep all poses consistent, repeat this character block verbatim
at the start of every prompt:

```
A single minimalist stick figure character, hand-drawn ink brush style,
ivory white strokes on pure black background (#000000), round slightly
oval head, tapered brush strokes with visible ink texture and stroke
entry/exit (笔锋), thin limbs with a slight belly in the middle of each
stroke, subtle ink pooling dots at the joints, faint soft glow around
the lines.
```

Then append one pose line:

| Pose | Prompt suffix |
|------|---------------|
| stand | `standing upright, arms relaxed at sides, legs slightly apart, front view.` |
| walk frame 1 | `walking, side view, contact pose — both feet on the ground, legs scissored apart.` |
| walk frame 2 | `walking, side view, passing pose — legs together, one foot lifted slightly.` |
| walk frame 3 | `walking, side view, mid-stride — front foot lifted high, arms counter-swinging.` |
| walk frame 4 | `walking, side view, push-off pose — back foot pushing off the ground.` |
| lookL / lookR | `standing, head turned to the left, curious searching posture.` (mirror for R) |
| talk | `standing, one arm raised gesturing as if speaking, front view.` |
| hug | `two identical stick figures embracing, arms wrapped around each other, side view.` |
| sit | `sitting cross-legged on the ground, hands resting on knees, side view.` |

And always end with the cutout constraints:

```
Full body, centered, feet on a consistent baseline, nothing cropped.
Isolated character only — no ground, no shadow, no stars, no horizon,
no speech bubbles, no text, no background elements of any kind.
Flat orthographic view, consistent scale across all images,
1:2 portrait canvas, high resolution.
```

### Consistency between generations

- Midjourney: pass one accepted result as `--cref` (character reference) +
  fix `--seed` for the batch.
- SD / 即梦 / 可灵: img2img on the accepted `stand` result, low denoise
  (0.3-0.45), one pose change per generation.
- Alternative: generate a single pose sheet
  (`character pose sheet, 7 poses in a horizontal row, same character,
  evenly spaced`) and crop — best consistency, more cleanup work.

### Post-processing

1. Figures are light-on-black: key out the background with luminance → alpha
   (Photoshop: black background + blend mode Screen also works for dark
   compositions), or run `rembg`.
2. Export as transparent PNG, trim to content + 8 px padding, keep the
   baseline consistent across poses.
3. For vector needs (web, lottie): trace the PNG in Illustrator / potrace.

## 3. Optional particle sprites

```
Small cluster of tiny glowing dust particles, scattered specks, ivory
white on pure black background, soft glow, varying sizes, no other
elements, no text.
```

Used only if marketing material needs them; the in-app dust is procedural
(`WalkDust` in `IntroScene.tsx`).
