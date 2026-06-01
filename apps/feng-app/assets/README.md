# Fēng / 風 — Designer Brief

Two raster assets are required before App Store submission. The placeholders
under `apps/feng-app/assets/` are not in this repo yet; check them in once a
designer delivers.

## icon.png

- **Dimensions**: 1024 × 1024 px, sRGB, no alpha.
- **Backdrop**: 墨青 ink-teal `#0F1E26`.
- **Mark**: seal-script 風 (Fēng) in 铜金 copper-gold `#B08D5B`.
- **Negative space**: a faint 24-Mountain tick ring (15% opacity) around the
  glyph. Reference the in-app `BaguaCompassOverlay` rendering for proportions.
- **Avoid**: gradients, photographic textures, drop shadows. The icon must
  read at 60 × 60 px (Spotlight) and 29 × 29 px (Settings).

## splash.png

- **Dimensions**: 1242 × 2688 px (iPhone Pro Max), centred logo.
- **Backdrop**: same `#0F1E26`.
- **Composition**: seal-script 風 at ~30% canvas width, centred at 45%
  vertical. No subtitle copy.
- **Resize mode**: contain (defined in `app.json`), so the same source works
  across all device sizes.

## adaptive-icon-android/ (optional)

If shipping Android in V1.1, add `assets/adaptive-icon-foreground.png`
(1024 × 1024) with the glyph only — the background colour is configured
in `app.json` (`#0F1E26`).

---

Once the assets are in:

```sh
cd apps/feng-app
bun typecheck       # confirm nothing regresses
bun ios             # boots the dev client
```
