/**
 * Cycle accent variant — user-pickable brand-color flavor. Default 朱泥
 * (terra) honors ADR-0010 §6; users who find the red overwhelming can pick
 * 苍墨 / 靛青 / 赭金. The variant is persisted in AsyncStorage and lifted
 * into the root provider so a switch re-themes the whole app instantly.
 *
 * Palette values live in `@zhop/hexastral-tokens/satellites`. This module
 * only owns the persisted preference + the picker option labels.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CycleAccentVariant } from '@zhop/hexastral-tokens/satellites'
import { createContext, useContext } from 'react'
import type { Locale } from './i18n'

export type { CycleAccentVariant }

const STORAGE_KEY = 'cycle.accent.variant'
export const DEFAULT_ACCENT_VARIANT: CycleAccentVariant = 'terra'

const VALID_VARIANTS: ReadonlySet<CycleAccentVariant> = new Set(['terra', 'ink', 'azurite', 'gold'])

export async function getAccentVariant(): Promise<CycleAccentVariant> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw && VALID_VARIANTS.has(raw as CycleAccentVariant)) return raw as CycleAccentVariant
  } catch {}
  return DEFAULT_ACCENT_VARIANT
}

export async function setAccentVariant(v: CycleAccentVariant): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, v)
  } catch {}
}

/**
 * Picker-display label for each variant, per locale. The label uses the
 * 黄历 vocabulary the variant references — 朱泥/苍墨/靛青/赭金 in CJK,
 * descriptive en glosses.
 */
export const ACCENT_VARIANT_LABELS: Record<
  Locale,
  Record<CycleAccentVariant, { name: string; hint: string }>
> = {
  'zh-Hans': {
    terra: { name: '朱泥', hint: '黄历默认' },
    ink: { name: '苍墨', hint: '深墨色' },
    azurite: { name: '靛青', hint: '深蓝' },
    gold: { name: '赭金', hint: '古铜金' },
  },
  'zh-Hant': {
    terra: { name: '朱泥', hint: '黃曆預設' },
    ink: { name: '蒼墨', hint: '深墨色' },
    azurite: { name: '靛青', hint: '深藍' },
    gold: { name: '赭金', hint: '古銅金' },
  },
  ja: {
    terra: { name: '朱泥', hint: '既定' },
    ink: { name: '蒼墨', hint: '濃墨色' },
    azurite: { name: '藍', hint: '濃藍' },
    gold: { name: '古金', hint: '古銅金' },
  },
  en: {
    terra: { name: 'Terra', hint: 'Almanac red' },
    ink: { name: 'Ink', hint: 'Warm black' },
    azurite: { name: 'Azurite', hint: 'Deep blue' },
    gold: { name: 'Brass', hint: 'Antique gold' },
  },
}

// ── Context for the picker to mutate the lifted variant state ─────────────

interface AccentContextValue {
  variant: CycleAccentVariant
  setVariant: (v: CycleAccentVariant) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

export const AccentProvider = AccentContext.Provider

export function useAccentVariant(): AccentContextValue {
  const ctx = useContext(AccentContext)
  if (!ctx) {
    throw new Error('useAccentVariant must be called inside <AccentProvider>')
  }
  return ctx
}
