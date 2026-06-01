/**
 * 黄历 宜忌 verbs — localized chip labels.
 *
 * The server's `goodFor` / `avoid` arrays return CJK verbs straight from
 * astro-core (e.g. "嫁娶", "动土"). For non-CN locales the chip should show
 * a localized rendering — this module is the lookup table. zh-Hans is
 * pass-through (canonical form); zh-Hant maps to traditional characters;
 * ja maps to standard 四柱推命 vocabulary (mostly kanji); en provides
 * concise English glosses suitable for narrow chip rendering.
 *
 * Coverage: ~40 most-common 宜忌 verbs in the astro-core 黄历 output. Any
 * verb without a mapping falls back to the source CJK string — graceful
 * degradation, no broken UI.
 */

import type { Locale } from './i18n'

const ZH_HANT: Record<string, string> = {
  嫁娶: '嫁娶',
  出行: '出行',
  入宅: '入宅',
  移徙: '移徙',
  开市: '開市',
  交易: '交易',
  立券: '立券',
  求医: '求醫',
  求嗣: '求嗣',
  求财: '求財',
  祈福: '祈福',
  祭祀: '祭祀',
  沐浴: '沐浴',
  理发: '理髮',
  修造: '修造',
  动土: '動土',
  破土: '破土',
  安葬: '安葬',
  上梁: '上樑',
  入殓: '入殮',
  进人口: '進人口',
  经络: '經絡',
  牧养: '牧養',
  纳畜: '納畜',
  捕捉: '捕捉',
  畋猎: '畋獵',
  取鱼: '取魚',
  栽种: '栽種',
  解除: '解除',
  安香: '安香',
  平治道涂: '平治道塗',
  修饰垣墙: '修飾垣牆',
  谢土: '謝土',
  开光: '開光',
  安床: '安床',
  治病: '治病',
  入学: '入學',
  雕刻: '雕刻',
  纳财: '納財',
  斋醮: '齋醮',
  见贵: '見貴',
  除服: '除服',
  疗病: '療病',
  涂泥: '塗泥',
  诉讼: '訴訟',
  破屋: '破屋',
  拆卸: '拆卸',
  登高: '登高',
  行船: '行船',
  入仓: '入倉',
  补垣: '補垣',
  塞穴: '塞穴',
  筑堤: '築堤',
}

const JA: Record<string, string> = {
  嫁娶: '婚姻',
  出行: '外出',
  入宅: '入居',
  移徙: '移転',
  开市: '開店',
  交易: '取引',
  立券: '契約',
  求医: '受診',
  求嗣: '子授け',
  求财: '金運',
  祈福: '祈祷',
  祭祀: '祭祀',
  沐浴: '入浴',
  理发: '理髪',
  修造: '修繕',
  动土: '起工',
  破土: '破土',
  安葬: '葬儀',
  上梁: '棟上げ',
  入殓: '納棺',
  进人口: '入家',
  经络: '針灸',
  牧养: '牧畜',
  纳畜: '畜入',
  捕捉: '捕獲',
  畋猎: '狩猟',
  取鱼: '漁',
  栽种: '植栽',
  解除: '解除',
  安香: '香炉',
  平治道涂: '道普請',
  修饰垣墙: '塀補修',
  谢土: '土地神祭',
  开光: '開眼',
  安床: '床入れ',
  治病: '治療',
  入学: '入学',
  雕刻: '彫刻',
  纳财: '財収',
  斋醮: '斎戒',
  见贵: '貴人',
  除服: '喪明け',
  疗病: '治療',
  涂泥: '左官',
  诉讼: '訴訟',
  破屋: '解体',
  拆卸: '撤去',
  登高: '登山',
  行船: '乗船',
  入仓: '入庫',
  补垣: '塀補修',
  塞穴: '穴塞ぎ',
  筑堤: '築堤',
}

const EN: Record<string, string> = {
  嫁娶: 'Wedding',
  出行: 'Travel',
  入宅: 'Move in',
  移徙: 'Relocate',
  开市: 'Open biz',
  交易: 'Trading',
  立券: 'Signing',
  求医: 'Medical',
  求嗣: 'Offspring',
  求财: 'Wealth',
  祈福: 'Blessing',
  祭祀: 'Worship',
  沐浴: 'Bathing',
  理发: 'Haircut',
  修造: 'Build',
  动土: 'Groundbreak',
  破土: 'Grave dig',
  安葬: 'Burial',
  上梁: 'Ridge beam',
  入殓: 'Encoffin',
  进人口: 'New family',
  经络: 'Acupunct',
  牧养: 'Husbandry',
  纳畜: 'Livestock',
  捕捉: 'Catch',
  畋猎: 'Hunt',
  取鱼: 'Fishing',
  栽种: 'Planting',
  解除: 'Dissolve',
  安香: 'Incense',
  平治道涂: 'Roadwork',
  修饰垣墙: 'Wall repair',
  谢土: 'Earth thanks',
  开光: 'Consecrate',
  安床: 'Bed setup',
  治病: 'Treatment',
  入学: 'School',
  雕刻: 'Carving',
  纳财: 'Wealth in',
  斋醮: 'Fasting rite',
  见贵: 'Meet patron',
  除服: 'End mourning',
  疗病: 'Treatment',
  涂泥: 'Plastering',
  诉讼: 'Lawsuit',
  破屋: 'Demolish',
  拆卸: 'Dismantle',
  登高: 'Climb high',
  行船: 'Sailing',
  入仓: 'Store grain',
  补垣: 'Wall mend',
  塞穴: 'Seal holes',
  筑堤: 'Build dike',
}

/**
 * Translate a 黄历 宜忌 verb into the user's locale. Pass-through for
 * `zh-Hans` (canonical form). Falls back to the source CJK string when the
 * verb isn't in the locale's table — no broken chips for obscure verbs.
 */
export function localizeYijiVerb(verb: string, locale: Locale): string {
  switch (locale) {
    case 'zh-Hans':
      return verb
    case 'zh-Hant':
      return ZH_HANT[verb] ?? verb
    case 'ja':
      return JA[verb] ?? verb
    case 'en':
      return EN[verb] ?? verb
    default:
      return verb
  }
}
