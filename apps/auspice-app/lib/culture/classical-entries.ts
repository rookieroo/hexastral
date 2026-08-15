/**
 * Classical register — 典籍置顶 entries for the 「黄历原声」 voice mode.
 *
 * Each 节气 carries its 《月令七十二候集解》 three-pentad original; each 节日
 * carries one canonical classical line. zh-Hans renders the 简体通书 form,
 * zh-Hant the 正体 — same register, per the plan (docs/apps/yuun/classical-mode-plan.md).
 * Cultural-reference quoting only: no auspicious/inauspicious assertions.
 */

import type { Locale } from '@/lib/i18n'

export interface ClassicalEntry {
  /** 原文 — the classical line. */
  text: string
  /** 出处 — source citation, e.g. 《月令七十二候集解》. */
  source: string
}

type EntryPair = Record<'zh-Hans' | 'zh-Hant', ClassicalEntry>

const JIEQI: Record<string, EntryPair> = {
  'jieqi-lichun': {
    'zh-Hans': {
      text: '一候东风解冻，二候蛰虫始振，三候鱼陟负冰。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候東風解凍，二候蟄蟲始振，三候魚陟負冰。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-yushui': {
    'zh-Hans': { text: '一候獭祭鱼，二候候雁北，三候草木萌动。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候獺祭魚，二候候雁北，三候草木萌動。', source: '《月令七十二候集解》' },
  },
  'jieqi-jingzhe': {
    'zh-Hans': { text: '一候桃始华，二候仓庚鸣，三候鹰化为鸠。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候桃始華，二候倉庚鳴，三候鷹化為鳩。', source: '《月令七十二候集解》' },
  },
  'jieqi-chunfen': {
    'zh-Hans': { text: '一候玄鸟至，二候雷乃发声，三候始电。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候玄鳥至，二候雷乃發聲，三候始電。', source: '《月令七十二候集解》' },
  },
  'jieqi-qingming': {
    'zh-Hans': { text: '一候桐始华，二候田鼠化为鴽，三候虹始见。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候桐始華，二候田鼠化為鴽，三候虹始見。', source: '《月令七十二候集解》' },
  },
  'jieqi-guyu': {
    'zh-Hans': {
      text: '一候萍始生，二候鸣鸠拂其羽，三候戴胜降于桑。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候萍始生，二候鳴鳩拂其羽，三候戴勝降于桑。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-lixia': {
    'zh-Hans': { text: '一候蝼蝈鸣，二候蚯蚓出，三候王瓜生。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候螻蟈鳴，二候蚯蚓出，三候王瓜生。', source: '《月令七十二候集解》' },
  },
  'jieqi-xiaoman': {
    'zh-Hans': { text: '一候苦菜秀，二候靡草死，三候麦秋至。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候苦菜秀，二候靡草死，三候麥秋至。', source: '《月令七十二候集解》' },
  },
  'jieqi-mangzhong': {
    'zh-Hans': { text: '一候螳螂生，二候鵙始鸣，三候反舌无声。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候螳螂生，二候鵙始鳴，三候反舌無聲。', source: '《月令七十二候集解》' },
  },
  'jieqi-xiazhi': {
    'zh-Hans': { text: '一候鹿角解，二候蜩始鸣，三候半夏生。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候鹿角解，二候蜩始鳴，三候半夏生。', source: '《月令七十二候集解》' },
  },
  'jieqi-xiaoshu': {
    'zh-Hans': { text: '一候温风至，二候蟋蟀居宇，三候鹰始鸷。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候溫風至，二候蟋蟀居宇，三候鷹始鷙。', source: '《月令七十二候集解》' },
  },
  'jieqi-dashu': {
    'zh-Hans': {
      text: '一候腐草为萤，二候土润溽暑，三候大雨时行。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候腐草為螢，二候土潤溽暑，三候大雨時行。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-liqiu': {
    'zh-Hans': { text: '一候凉风至，二候白露降，三候寒蝉鸣。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候涼風至，二候白露降，三候寒蟬鳴。', source: '《月令七十二候集解》' },
  },
  'jieqi-chushu': {
    'zh-Hans': { text: '一候鹰乃祭鸟，二候天地始肃，三候禾乃登。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候鷹乃祭鳥，二候天地始肅，三候禾乃登。', source: '《月令七十二候集解》' },
  },
  'jieqi-bailu': {
    'zh-Hans': { text: '一候鸿雁来，二候玄鸟归，三候群鸟养羞。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候鴻雁來，二候玄鳥歸，三候群鳥養羞。', source: '《月令七十二候集解》' },
  },
  'jieqi-qiufen': {
    'zh-Hans': { text: '一候雷始收声，二候蛰虫坯户，三候水始涸。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候雷始收聲，二候蟄蟲坯戶，三候水始涸。', source: '《月令七十二候集解》' },
  },
  'jieqi-hanlu': {
    'zh-Hans': {
      text: '一候鸿雁来宾，二候雀入大水为蛤，三候菊有黄华。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候鴻雁來賓，二候雀入大水為蛤，三候菊有黃華。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-shuangjiang': {
    'zh-Hans': {
      text: '一候豺乃祭兽，二候草木黄落，三候蛰虫咸俯。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候豺乃祭獸，二候草木黃落，三候蟄蟲鹹俯。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-lidong': {
    'zh-Hans': {
      text: '一候水始冰，二候地始冻，三候雉入大水为蜃。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候水始冰，二候地始凍，三候雉入大水為蜃。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-xiaoxue': {
    'zh-Hans': {
      text: '一候虹藏不见，二候天气上升地气下降，三候闭塞而成冬。',
      source: '《月令七十二候集解》',
    },
    'zh-Hant': {
      text: '一候虹藏不見，二候天氣上升地氣下降，三候閉塞而成冬。',
      source: '《月令七十二候集解》',
    },
  },
  'jieqi-daxue': {
    'zh-Hans': { text: '一候鹖鴠不鸣，二候虎始交，三候荔挺出。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候鶡鴠不鳴，二候虎始交，三候荔挺出。', source: '《月令七十二候集解》' },
  },
  'jieqi-dongzhi': {
    'zh-Hans': { text: '一候蚯蚓结，二候麋角解，三候水泉动。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候蚯蚓結，二候麋角解，三候水泉動。', source: '《月令七十二候集解》' },
  },
  'jieqi-xiaohan': {
    'zh-Hans': { text: '一候雁北乡，二候鹊始巢，三候雉始雊。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候雁北鄉，二候鵲始巢，三候雉始雊。', source: '《月令七十二候集解》' },
  },
  'jieqi-dahan': {
    'zh-Hans': { text: '一候鸡乳，二候征鸟厉疾，三候水泽腹坚。', source: '《月令七十二候集解》' },
    'zh-Hant': { text: '一候雞乳，二候徵鳥厲疾，三候水澤腹堅。', source: '《月令七十二候集解》' },
  },
}

const FESTIVALS: Record<string, EntryPair> = {
  chunjie: {
    'zh-Hans': { text: '爆竹声中一岁除，春风送暖入屠苏。', source: '王安石《元日》' },
    'zh-Hant': { text: '爆竹聲中一歲除，春風送暖入屠蘇。', source: '王安石《元日》' },
  },
  yuanxiao: {
    'zh-Hans': { text: '东风夜放花千树，更吹落、星如雨。', source: '辛弃疾《青玉案·元夕》' },
    'zh-Hant': { text: '東風夜放花千樹，更吹落、星如雨。', source: '辛棄疾《青玉案·元夕》' },
  },
  qingming: {
    'zh-Hans': { text: '清明时节雨纷纷，路上行人欲断魂。', source: '杜牧《清明》' },
    'zh-Hant': { text: '清明時節雨紛紛，路上行人欲斷魂。', source: '杜牧《清明》' },
  },
  duanwu: {
    'zh-Hans': { text: '路漫漫其修远兮，吾将上下而求索。', source: '屈原《离骚》' },
    'zh-Hant': { text: '路漫漫其修遠兮，吾將上下而求索。', source: '屈原《離騷》' },
  },
  qixi: {
    'zh-Hans': { text: '金风玉露一相逢，便胜却人间无数。', source: '秦观《鹊桥仙》' },
    'zh-Hant': { text: '金風玉露一相逢，便勝卻人間無數。', source: '秦觀《鵲橋仙》' },
  },
  zhongqiu: {
    'zh-Hans': { text: '但愿人长久，千里共婵娟。', source: '苏轼《水调歌头》' },
    'zh-Hant': { text: '但願人長久，千里共嬋娟。', source: '蘇軾《水調歌頭》' },
  },
  chongyang: {
    'zh-Hans': { text: '遥知兄弟登高处，遍插茱萸少一人。', source: '王维《九月九日忆山东兄弟》' },
    'zh-Hant': { text: '遙知兄弟登高處，遍插茱萸少一人。', source: '王維《九月九日憶山東兄弟》' },
  },
  dongzhi: {
    'zh-Hans': { text: '邯郸驿里逢冬至，抱膝灯前影伴身。', source: '白居易《邯郸冬至夜思家》' },
    'zh-Hant': { text: '邯鄲驛里逢冬至，抱膝燈前影伴身。', source: '白居易《邯鄲冬至夜思家》' },
  },
}

/** Classical 置顶 entry for a culture id — null when the entry has none. */
export function classicalEntryFor(id: string, locale: Locale): ClassicalEntry | null {
  const pair = JIEQI[id] ?? FESTIVALS[id]
  if (!pair) return null
  return pair[locale === 'zh-Hant' ? 'zh-Hant' : 'zh-Hans'] ?? null
}
