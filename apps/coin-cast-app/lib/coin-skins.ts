import AsyncStorage from '@react-native-async-storage/async-storage'

/** Locales the skin copy is authored for (mirrors the satellite i18n set). */
type SkinLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

/**
 * Coin skin registry. Each skin = a pair of cap textures (字面 / 背面) baked as
 * PNG. Metro only resolves STATIC `require()` literals, so every skin lists its
 * two requires inline (never build the path dynamically).
 *
 * Two kinds of 碑拓 (ink-rubbing) skin:
 *  - skins/original/* — ORIGINAL in-house designs (八卦/太极/五行…), owned IP,
 *    no real-coin copying, no scripture. Design system: original/ART-BRIEF.md.
 *  - skins/huaxia/back-su-yin.png — the shared plain 素背 reverse (also the free
 *    default coin). The old PD-extracted 五銖/開元 were retired (gray provenance,
 *    huaxia/SOURCING.md) and replaced by originals — the vault is now 100% owned IP.
 */

export type CoinSkinId =
  | 'classic'
  | 'bagua'
  | 'taiji'
  | 'wuxing-jin'
  | 'wuxing-mu'
  | 'wuxing-shui'
  | 'wuxing-huo'
  | 'wuxing-tu'
  | 'beidou'
  | 'luoshu'

export interface CoinSkin {
  id: CoinSkinId
  /** Pro-gated (needs an active Pro entitlement) vs free default. */
  pro: boolean
  /** 字面 cap (阳爻) texture — RN asset module id. */
  yang: number
  /** 背面 cap (阴爻) texture — RN asset module id. */
  yin: number
  label: Record<SkinLocale, string>
  /** Era · script provenance, shown under the name. */
  note: Record<SkinLocale, string>
}

/** Shared 素背 (plain reverse) rubbing for the huaxia skins until per-coin backs land. */
const SU_BACK = require('../components/casting-scene/textures/skins/huaxia/dist/back-su-yin.png')
/** Default coin's 字面 (front) — plain rubbing + 四出文 so heads/tails read apart. */
const SU_FACE = require('../components/casting-scene/textures/skins/huaxia/dist/back-su-yang.png')

export const COIN_SKINS: readonly CoinSkin[] = [
  {
    id: 'classic',
    pro: false,
    yang: SU_FACE,
    yin: SU_BACK,
    label: { en: 'Plain', zh: '素钱', 'zh-Hant': '素錢', ja: '無文銭' },
    note: {
      en: 'Plain rubbing · default',
      zh: '素拓 · 默认',
      'zh-Hant': '素拓 · 預設',
      ja: '無文拓 · 標準',
    },
  },
  {
    id: 'bagua',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/bagua-yang.png'),
    yin: SU_BACK,
    label: { en: 'Bagua', zh: '八卦钱', 'zh-Hant': '八卦錢', ja: '八卦銭' },
    note: {
      en: 'Original · Fuxi eight trigrams',
      zh: '原创 · 先天八卦',
      'zh-Hant': '原創 · 先天八卦',
      ja: 'オリジナル · 先天八卦',
    },
  },
  {
    id: 'taiji',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/taiji-yang.png'),
    yin: SU_BACK,
    label: { en: 'Taiji', zh: '太极', 'zh-Hant': '太極', ja: '太極' },
    note: {
      en: 'Original · yin-yang',
      zh: '原创 · 阴阳',
      'zh-Hant': '原創 · 陰陽',
      ja: 'オリジナル · 陰陽',
    },
  },
  {
    id: 'wuxing-jin',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/wuxing-jin-yang.png'),
    yin: SU_BACK,
    label: { en: 'Wuxing · Metal', zh: '五行·金', 'zh-Hant': '五行·金', ja: '五行·金' },
    note: {
      en: 'Original · Five Elements',
      zh: '原创 · 五行',
      'zh-Hant': '原創 · 五行',
      ja: 'オリジナル · 五行',
    },
  },
  {
    id: 'wuxing-mu',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/wuxing-mu-yang.png'),
    yin: SU_BACK,
    label: { en: 'Wuxing · Wood', zh: '五行·木', 'zh-Hant': '五行·木', ja: '五行·木' },
    note: {
      en: 'Original · Five Elements',
      zh: '原创 · 五行',
      'zh-Hant': '原創 · 五行',
      ja: 'オリジナル · 五行',
    },
  },
  {
    id: 'wuxing-shui',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/wuxing-shui-yang.png'),
    yin: SU_BACK,
    label: { en: 'Wuxing · Water', zh: '五行·水', 'zh-Hant': '五行·水', ja: '五行·水' },
    note: {
      en: 'Original · Five Elements',
      zh: '原创 · 五行',
      'zh-Hant': '原創 · 五行',
      ja: 'オリジナル · 五行',
    },
  },
  {
    id: 'wuxing-huo',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/wuxing-huo-yang.png'),
    yin: SU_BACK,
    label: { en: 'Wuxing · Fire', zh: '五行·火', 'zh-Hant': '五行·火', ja: '五行·火' },
    note: {
      en: 'Original · Five Elements',
      zh: '原创 · 五行',
      'zh-Hant': '原創 · 五行',
      ja: 'オリジナル · 五行',
    },
  },
  {
    id: 'wuxing-tu',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/wuxing-tu-yang.png'),
    yin: SU_BACK,
    label: { en: 'Wuxing · Earth', zh: '五行·土', 'zh-Hant': '五行·土', ja: '五行·土' },
    note: {
      en: 'Original · Five Elements',
      zh: '原创 · 五行',
      'zh-Hant': '原創 · 五行',
      ja: 'オリジナル · 五行',
    },
  },
  {
    id: 'beidou',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/beidou-yang.png'),
    yin: SU_BACK,
    label: { en: 'Big Dipper', zh: '北斗七星', 'zh-Hant': '北斗七星', ja: '北斗七星' },
    note: {
      en: 'Original · star chart',
      zh: '原创 · 星象',
      'zh-Hant': '原創 · 星象',
      ja: 'オリジナル · 星図',
    },
  },
  {
    id: 'luoshu',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/luoshu-yang.png'),
    yin: SU_BACK,
    label: { en: 'Luo Shu', zh: '洛书', 'zh-Hant': '洛書', ja: '洛書' },
    note: {
      en: 'Original · nine-palace grid',
      zh: '原创 · 九宫',
      'zh-Hant': '原創 · 九宮',
      ja: 'オリジナル · 九宮',
    },
  },
] as const

export const DEFAULT_SKIN_ID: CoinSkinId = 'classic'

const KEY_SELECTED_SKIN = 'coincast_selected_skin_v1'

export function getCoinSkin(id: CoinSkinId): CoinSkin {
  return COIN_SKINS.find((s) => s.id === id) ?? COIN_SKINS[0]!
}

export async function loadSelectedSkinId(): Promise<CoinSkinId> {
  try {
    const v = await AsyncStorage.getItem(KEY_SELECTED_SKIN)
    if (v && COIN_SKINS.some((s) => s.id === v)) return v as CoinSkinId
  } catch (err) {
    console.warn('[coin-skins] read selected failed', err)
  }
  return DEFAULT_SKIN_ID
}

export async function saveSelectedSkinId(id: CoinSkinId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SELECTED_SKIN, id)
  } catch (err) {
    console.warn('[coin-skins] write selected failed', err)
  }
}

export const COIN_SKIN_UI: Record<SkinLocale, { title: string; hint: string; locked: string }> = {
  en: { title: 'Coin skin', hint: 'The coin you cast with', locked: 'Pro' },
  zh: { title: '卦钱皮肤', hint: '你摇卦用的那枚铜钱', locked: 'Pro' },
  'zh-Hant': { title: '卦錢皮膚', hint: '你搖卦用的那枚銅錢', locked: 'Pro' },
  ja: { title: '卦銭スキン', hint: '占いに使う銅銭', locked: 'Pro' },
}

export function coinSkinUi(locale: string) {
  return COIN_SKIN_UI[locale as SkinLocale] ?? COIN_SKIN_UI.en
}

export function coinSkinLabel(skin: CoinSkin, locale: string): string {
  return skin.label[locale as SkinLocale] ?? skin.label.en
}

export function coinSkinNote(skin: CoinSkin, locale: string): string {
  return skin.note[locale as SkinLocale] ?? skin.note.en
}
