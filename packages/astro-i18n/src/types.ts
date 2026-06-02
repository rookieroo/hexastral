/**
 * @zhop/astro-i18n — types & token categories
 *
 * Pure-data dictionary package. Translates canonical Chinese metaphysics tokens
 * (天干, 地支, 五行, 十神, 格局, 神煞, 紫微星, 四化, 亮度, 12宫, 时辰)
 * into target locale strings.
 *
 * Used by:
 *   - hexastral-app (RN) render layer
 *   - hexastral-web (Next.js) /r/[id] SSR + OG images
 *   - svc-astro Worker prompt construction
 */

export type Locale = 'zh' | 'zh-Hant' | 'en' | 'ja' | 'ko' | 'de' | 'es' | 'vi' | 'th'

export type TokenCategory =
  | 'stem' // 10 天干
  | 'branch' // 12 地支
  | 'element' // 5 五行
  | 'yinyang' // 2 阴阳
  | 'shishen' // 10 十神
  | 'shishenCategory' // 5 比劫/食伤/财星/官杀/印绶
  | 'geju' // 24 格局
  | 'gejuQuality' // 3 上中下
  | 'dayMasterStrength' // 5 极强/偏强/中和/偏弱/极弱
  | 'shensha' // 8 神煞
  | 'shenshaPolarity' // 3 吉凶中
  | 'palace' // 12 宫
  | 'mutagen' // 4 化禄/化权/化科/化忌
  | 'brightness' // 7 庙旺得利平不陷
  | 'shichen' // 12 时辰
  | 'shichenAnimal' // 12 生肖
  | 'ziweiMajor' // 14 主星
  | 'ziweiAux' // 6 辅星 (含文昌文曲)
  | 'fiveElementsClass' // 5 局: 木三局, 金四局, 水二局, 火六局, 土五局

/**
 * One translation map per locale.
 * Keys are canonical Chinese tokens; values are localized strings.
 *
 * Convention: keys MUST be present in the canonical zh dictionary.
 * Missing keys in a non-zh dictionary fall back to en, then to the canonical key.
 */
export type Dictionary = {
  [Category in TokenCategory]: Record<string, string>
}
