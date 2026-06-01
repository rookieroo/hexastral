# @zhop/core-ui

Shared UI primitives for HexAstral apps — flagships and satellites alike.

Phase F mandate (per [`docs/phase-f-plan.md` §2](../../docs/phase-f-plan.md#2-design-system-foundation--zhopcore-ui-weeks-12-parallel-with-1)): **every surviving app consumes this package**. No app-local `Button.tsx` / `Card.tsx` / `theme.ts` palette files past Phase F.

## Quick start

```tsx
import { CoreUIProvider, Button, Card, Text, useTheme } from '@zhop/core-ui'

export default function Root() {
  return (
    <CoreUIProvider brand="feng" mode="dark">
      <YourApp />
    </CoreUIProvider>
  )
}

function YourApp() {
  const { colors, spacing } = useTheme()
  return (
    <Card variant="elevated" padding="lg">
      <Text variant="title">Hello</Text>
      <Button variant="primary" onPress={() => {}}>
        Continue
      </Button>
    </Card>
  )
}
```

## Brand keys

The `brand` prop locks per-app accent colors. Defined in `@zhop/hexastral-tokens` so the registry is one place:

| Brand | Tier | Accent (light / dark) |
|---|---|---|
| `hexastral` | Flagship | ink brown / ink gold |
| `yuan` | Flagship | cinnabar #9B2226 / ink gold |
| `feng` | Flagship | 墨青 #0F1E26 / copper #B08D5B |
| `compass` | Satellite (Fēng feeder) | copper |
| `coincast` | Satellite | amber + wood-grain |
| `faceoracle` | Satellite | jade green |
| `dreamoracle` | Satellite | indigo + silver |
| `numerology` | Satellite | violet/blue |

Adding a new brand requires:
1. ADR amendment (currently ADR-0004).
2. Palette entry in `packages/hexastral-tokens/src/satellites.ts`.
3. New union member in `CoreUIBrand` (provider.tsx).

## V1 components

| Component | Use for |
|---|---|
| `<Button>` | Primary CTAs. Variants: primary / secondary / ghost / destructive. |
| `<Card>` | Surface containers with elevation. Variants: flat / elevated / outlined. |
| `<Text>` | All text — must use a variant from the typography ramp. |
| `<Pill>` | Small label chips for status, chapter kinds, filters. |
| `<Divider>` | Hairline separators. |
| `<EmptyState>` | "No data yet" surfaces. |
| `<LoadingSkeleton>` + `<LoadingTextBlock>` | Shimmer placeholders during data fetch. |
| `<ErrorState>` | Inline or fullscreen error with retry. |

## V1 hooks + motion helpers

| Export | Use for |
|---|---|
| `useTheme()` | Read the active brand's colors, spacing, typography, motion, elevation. |
| `useHaptic()` | Trigger haptic feedback by named preset. |
| `usePressScale()` | Reanimated worklet for tap-state scale-down. |
| `useShimmer()` | Looping opacity animation for skeleton placeholders. |

## Migration checklist (per app)

When refactoring an app to use core-ui:

1. Wrap root in `<CoreUIProvider brand="..." mode="...">`.
2. Delete the app's local `theme.ts` palette file.
3. Replace any `import { theme } from '@/lib/theme'` with `useTheme()`.
4. Replace inline `<View style={{ borderWidth, padding }}>` cards with `<Card>`.
5. Replace inline `<Pressable>` buttons with `<Button>`.
6. Replace inline `<Text style={{ fontSize: NN }}>` with `<Text variant="...">`.
7. Replace inline empty/loading/error blocks with the matching primitives.
8. Verify Biome lint passes — Phase F lints reject hardcoded color strings.

## V2 (not in scope)

- `<Input>` — text / multiline / select primitives
- `<PageTransition>` — Reanimated layout animations
- Brand illustration library (per-satellite SVG glyphs)
- Web parity via `@zhop/core-ui/web` entry (Tailwind theme generator)
