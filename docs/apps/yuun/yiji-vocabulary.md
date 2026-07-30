# Yuun 宜忌 vocabulary

SSOT for display labels and reverse-择日 search aliases. Algorithm facts stay in
[`packages/astro-core/src/almanac.ts`](../../../packages/astro-core/src/almanac.ts)
(`OFFICER_YIJI` → `DailyAlmanac.goodFor` / `avoid`).

## Layers

| Layer | What | Mutable? |
|---|---|---|
| Canonical | zh-Hans CJK verbs from `OFFICER_YIJI` | Append-only; never rename in place |
| Display mode | `modern` \| `traditional` via `formatYijiVerb` / `formatYijiList` | Local preference |
| Search aliases | Hot words → event id or verb list (`YIJI_SEARCH_ALIASES`) | Expand entry points only |

Do **not**:

- Merge 二十八宿 / 黄黑道 / 彭祖 into `goodFor`/`avoid` in this milestone
- Mix 五行 `dos`/`donts` into 宜忌 chips
- Invent OFFICER_YIJI rows for “AI / 游戏” etc. — aliases only
- Put localized chrome into Explain / analytics fields — always `宜 ${canonical}` / `忌 ${canonical}`

## Defaults (locale-aware)

| Locale | Default mode |
|---|---|
| `en` | `modern` |
| `zh-Hans` / `zh-Hant` / `ja` | `traditional` |

Explicit Settings toggle persists on-device (`auspice.yiji.displayMode`) and does
**not** flip when the user changes language. Cleared on account delete. Not
account-synced.

Server push column `auspice_push_subs.yiji_mode` is device-scoped; null → same
locale default as the App.

## Surfaces

- App / share / local push: `useYijiDisplayMode` + shared formatter
- Widget: formatted strings in App Group payload (cache key includes mode)
- Watch: prefs `yijiMode` → bootstrap; public `/day` fallback uses `WatchYijiVocab`
- Offline `AlmanacEngine.officerYiJi`: traditional canonical only (must match `OFFICER_YIJI`)

## Code

- Registry: `packages/astro-core/src/yiji-vocabulary.ts`
- App preference: `apps/auspice-app/lib/yiji-display-mode.ts`
- Thin shims: `apps/auspice-app/lib/yiji-vocab.ts`, `apps/hexastral-web/lib/yiji-i18n.ts`
