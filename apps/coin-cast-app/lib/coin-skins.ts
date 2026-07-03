import AsyncStorage from '@react-native-async-storage/async-storage'

/** Locales the skin copy is authored for (mirrors the satellite i18n set). */
type SkinLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

/**
 * Coin skin registry. Each skin = a pair of cap textures (字面 / 背面) baked as
 * PNG. Metro only resolves STATIC `require()` literals, so every skin lists its
 * two requires inline (never build the path dynamically).
 *
 * Three tiers:
 *  - classic — the free default (素钱): plain 碑拓 rubbing, 四出文 front vs plain back.
 *  - 华夏钱币史 — 卦钱六爻原创套 SVG（dist/rub/ 碑拓；seal/ink 同目录）。
 *    photo tiers remain in huaxia/dist for gallery comparison.
 *  - 原创 (bagua/taiji/wuxing…) — ORIGINAL in-house vector 碑拓 designs, owned IP, no
 *    real-coin copying, no scripture. They share the plain SU_BACK reverse.
 *    Design system: original/ART-BRIEF.md.
 */

export type CoinSkinId =
  | 'classic'
  // 华夏钱币史 — realistic two-sided bronze, extracted from PD/CC0 coin photos.
  | 'banliang'
  | 'wuzhu'
  | 'daquan'
  | 'kaiyuan'
  | 'daguan'
  | 'hongwu'
  // 原创 — owned-IP vector 碑拓 designs.
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

/** Shared plain 素背 (reverse) rubbing for the 原创 vector skins (which have no back art). */
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
  // ── 华夏钱币史 — realistic bronze, real obverse (字面) + real/plain reverse (背面).
  //    Baked by huaxia/gen-huaxia.py from PD/CC0 photos (see huaxia/SOURCING.md). ──
  // ── 半两 / 五铢：形制研读 → dark 青铜设计（design/）；其余华夏币仍为写实照片。 ──
  {
    id: 'banliang',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/banliang-yang.png'),
    yin: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/banliang-yin.png'),
    label: { en: 'Ban Liang', zh: '半两', 'zh-Hant': '半兩', ja: '半両' },
    note: {
      en: 'Cast · oracle rubbing',
      zh: '起卦 · 半两',
      'zh-Hant': '起卦 · 半兩',
      ja: '起卦 · 半両',
    },
  },
  {
    id: 'wuzhu',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/wuzhu-yang.png'),
    yin: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/wuzhu-yin.png'),
    label: { en: 'Wu Zhu', zh: '五铢', 'zh-Hant': '五銖', ja: '五銖' },
    note: {
      en: 'Stalk · oracle rubbing',
      zh: '揲爻 · 五铢',
      'zh-Hant': '揲爻 · 五銖',
      ja: '揲爻 · 五銖',
    },
  },
  {
    id: 'daquan',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/daquan-yang.png'),
    yin: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/daquan-yin.png'),
    label: { en: 'Da Quan', zh: '大泉五十', 'zh-Hant': '大泉五十', ja: '大泉五十' },
    note: {
      en: 'Change · oracle rubbing',
      zh: '变卦 · 大泉',
      'zh-Hant': '變卦 · 大泉',
      ja: '変卦 · 大泉',
    },
  },
  {
    id: 'kaiyuan',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/kaiyuan-yang.png'),
    yin: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/kaiyuan-yin.png'),
    label: { en: 'Kaiyuan', zh: '开元通宝', 'zh-Hant': '開元通寶', ja: '開元通宝' },
    note: {
      en: 'Flow · oracle rubbing',
      zh: '流通 · 开元',
      'zh-Hant': '流通 · 開元',
      ja: '流通 · 開元',
    },
  },
  {
    id: 'daguan',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/daguan-yang.png'),
    yin: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/daguan-yin.png'),
    label: { en: 'Da Guan', zh: '大观通宝', 'zh-Hant': '大觀通寶', ja: '大觀通宝' },
    note: {
      en: 'Gaze · oracle rubbing',
      zh: '观象 · 大观',
      'zh-Hant': '觀象 · 大觀',
      ja: '観象 · 大観',
    },
  },
  {
    id: 'hongwu',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/hongwu-yang.png'),
    yin: require('../components/casting-scene/textures/skins/huaxia/design/dist/rub/hongwu-yin.png'),
    label: { en: 'Hong Wu', zh: '洪武通宝', 'zh-Hant': '洪武通寶', ja: '洪武通宝' },
    note: {
      en: 'Yin-yang · oracle rubbing',
      zh: '阴阳 · 洪武',
      'zh-Hant': '陰陽 · 洪武',
      ja: '陰陽 · 洪武',
    },
  },
  {
    id: 'bagua',
    pro: true,
    yang: require('../components/casting-scene/textures/skins/original/dist/bagua-yang.png'),
    yin: require('../components/casting-scene/textures/skins/original/dist/bagua-yin.png'),
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
    yin: require('../components/casting-scene/textures/skins/original/dist/taiji-yin.png'),
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

export const COIN_SKIN_UI: Record<SkinLocale, { title: string; hint: string; locked: string; faceYang: string; faceYin: string }> = {
  en: { title: 'Coin skin', hint: 'The coin you cast with', locked: 'Pro', faceYang: 'Obv', faceYin: 'Rev' },
  zh: { title: '卦钱皮肤', hint: '你摇卦用的那枚铜钱', locked: 'Pro', faceYang: '字', faceYin: '背' },
  'zh-Hant': { title: '卦錢皮膚', hint: '你搖卦用的那枚銅錢', locked: 'Pro', faceYang: '字', faceYin: '背' },
  ja: { title: '卦銭スキン', hint: '占いに使う銅銭', locked: 'Pro', faceYang: '表', faceYin: '裏' },
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
