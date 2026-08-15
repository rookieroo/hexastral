/**
 * Almanac copy — 黄历首页四语文案与格式助手.
 *
 * zh-Hans/zh-Hant：原文行话（竖排）；ja：竖排白话（日文可竖排）；
 * en：横排白话（拉丁字不做竖排）。文言判语/日签仍 zh-only（黄历模式
 * 对 en/ja 是「布局 + 白话术语」，不是文言翻译）。
 */

import { branchRelationSummary, type EarthlyBranch } from '@zhop/astro-core'

const WEEKDAYS: Record<'zh-Hans' | 'zh-Hant' | 'ja' | 'en', string[]> = {
  'zh-Hans': ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  'zh-Hant': ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const ANIMAL_EN: Record<string, string> = {
  子: 'Rat',
  丑: 'Ox',
  寅: 'Tiger',
  卯: 'Rabbit',
  辰: 'Dragon',
  巳: 'Snake',
  午: 'Horse',
  未: 'Goat',
  申: 'Monkey',
  酉: 'Rooster',
  戌: 'Dog',
  亥: 'Pig',
}
const ANIMAL_JA: Record<string, string> = {
  子: '鼠',
  丑: '牛',
  寅: '虎',
  卯: '兎',
  辰: '竜',
  巳: '蛇',
  午: '馬',
  未: '羊',
  申: '猿',
  酉: '鶏',
  戌: '犬',
  亥: '猪',
}
const ELEMENT_EN: Record<string, string> = {
  木: 'Wood',
  火: 'Fire',
  土: 'Earth',
  金: 'Metal',
  水: 'Water',
}
const ELEMENT_JA: Record<string, string> = { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' }
const QUADRANT_EN: Record<string, string> = {
  青龙: 'Azure Dragon of the East',
  玄武: 'Black Tortoise of the North',
  白虎: 'White Tiger of the West',
  朱雀: 'Vermilion Bird of the South',
}
const QUADRANT_JA: Record<string, string> = {
  青龙: '東方青龍',
  玄武: '北方玄武',
  白虎: '西方白虎',
  朱雀: '南方朱雀',
}
const HOUR_GOD_EN: Record<string, string> = {
  青龙: 'Azure Dragon',
  明堂: 'Hall of Light',
  天刑: 'Heavenly Punishment',
  朱雀: 'Vermilion Bird',
  金匮: 'Golden Casket',
  天德: 'Heavenly Virtue',
  白虎: 'White Tiger',
  玉堂: 'Jade Hall',
  天牢: 'Heavenly Prison',
  玄武: 'Black Tortoise',
  司命: 'Master of Fate',
  勾陈: 'Curved Array',
}

export interface AlmanacCopy {
  /** 竖排条可用（CJK 竖排；en=false 改横排）。 */
  vertical: boolean
  sectionPillars: string
  sectionInfo: string
  sectionHours: string
  sectionGods: string
  rowElement: string
  rowClash: string
  rowDayGod: string
  rowOfficer: string
  rowPengZu: string
  rowMansion: string
  godWealth: string
  godJoy: string
  yangGongNote: string
  goodWord: string
  badWord: string
  emptyMeaning: string
  forYouLabel: string
  weekday(d: Date): string
  gregorian(d: Date): string
  /** 组件/竖排用短公历（7月28日 / JAN 9）。 */
  gregorianShort(d: Date): string
  /** 组件用星期 chip（周四 · 9 / THU 9），对齐原生 weekdayChip。 */
  weekdayChip(d: Date): string
  /** 竖排条用农历（无空格无括号，避免换行）。 */
  lunarStrip(lunarDate: { month: number; day: number; monthName: string; dayName: string }): string
  /** 竖排条用岁次（无括号）。 */
  yearStrip(stem: string, branch: string, animal: string): string
  lunarLine(lunarDate: { month: number; day: number; monthName: string; dayName: string }): string
  yearLine(stem: string, branch: string, animal: string): string
  ganZhiSuffix: string
  officerDaySuffix: string
  dayGodPrefix: string
  stripMansion: string
  clashText(clashAnimal: string, evilDirection: string): string
  pengzuText(stem: string, branch: string): string
  nayinLine(nayin: string): string
  animal(branch: string): string
  quadrant(mansion: { quadrant: string }): string
  hourGodName(god: string): string | null
  relationSentence(dayBranch: string): string | null
  meaningFootnote: string
}

export function almanacCopy(locale: string): AlmanacCopy {
  if (locale.startsWith('en')) {
    return {
      vertical: false,
      sectionPillars: 'FOUR PILLARS',
      sectionInfo: "TODAY'S ALMANAC",
      sectionHours: 'AUSPICIOUS HOURS',
      sectionGods: 'FORTUNE DIRECTIONS',
      rowElement: 'Element',
      rowClash: 'Clash',
      rowDayGod: 'Day god',
      rowOfficer: 'Officer',
      rowPengZu: 'Peng Zu',
      rowMansion: 'Mansion',
      godWealth: 'Wealth',
      godJoy: 'Joy',
      yangGongNote: 'Yang Gong taboo day — avoid major affairs',
      goodWord: 'Auspicious',
      badWord: 'Caution',
      emptyMeaning: 'No glossary entry yet.',
      forYouLabel: 'For you',
      weekday: (d) => WEEKDAYS.en[d.getDay()] ?? '',
      gregorian: (d) => `${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      gregorianShort: (d) =>
        `${(MONTHS_EN[d.getMonth()] ?? '').slice(0, 3).toUpperCase()} ${d.getDate()}`,
      weekdayChip: (d) =>
        `${WEEKDAYS.en[d.getDay()]?.slice(0, 3).toUpperCase() ?? ''} ${d.getDate()}`,
      lunarStrip: (ld) => `Lunar ${ld.month}/${ld.day}`,
      yearStrip: (stem, branch, animal) => `${stem}${branch} · ${animal}`,
      lunarLine: (ld) => `Lunar ${ld.month}/${ld.day}`,
      yearLine: (stem, branch, animal) => `${stem}${branch} year · ${animal}`,
      ganZhiSuffix: ' day',
      officerDaySuffix: '',
      dayGodPrefix: 'Day god ',
      stripMansion: 'Mansion ',
      clashText: (animal, dir) =>
        `Clash ${ANIMAL_EN[animal] ?? animal} · ${dir ? `bad direction ${dir}` : ''}`.trim(),
      pengzuText: (stem, branch) => `${stem} · ${branch}`,
      nayinLine: (nayin) => {
        const el = ELEMENT_EN[nayin[nayin.length - 1] ?? ''] ?? ''
        return el ? `Element ${el}` : nayin
      },
      animal: (b) => ANIMAL_EN[b] ?? b,
      quadrant: (m) => QUADRANT_EN[m.quadrant] ?? m.quadrant,
      hourGodName: (g) => HOUR_GOD_EN[g] ?? null,
      relationSentence: (dayBranch) => relationSentence(dayBranch, 'en'),
      meaningFootnote: 'Per the Tongshu & Wikipedia almanac glossary · cultural reference',
    }
  }
  if (locale.startsWith('ja')) {
    return {
      vertical: true,
      sectionPillars: '四柱五行',
      sectionInfo: '今日の黄暦',
      sectionHours: '時辰吉凶',
      sectionGods: '吉神方位',
      rowElement: '五行',
      rowClash: '冲煞',
      rowDayGod: '値神',
      rowOfficer: '建除',
      rowPengZu: '彭祖',
      rowMansion: '星宿',
      godWealth: '財神',
      godJoy: '喜神',
      yangGongNote: '楊公忌日 大事勿用',
      goodWord: '吉',
      badWord: '凶',
      emptyMeaning: 'この用語の解説はまだありません。',
      forYouLabel: 'あなたへ',
      weekday: (d) => WEEKDAYS.ja[d.getDay()] ?? '',
      gregorian: (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      gregorianShort: (d) => `${d.getMonth() + 1}月${d.getDate()}日`,
      weekdayChip: (d) => {
        const wd = ['日', '月', '火', '水', '木', '金', '土']
        return `${wd[d.getDay()] ?? ''} · ${d.getDate()}`
      },
      lunarStrip: (ld) => `旧暦${ld.month}月${ld.day}日`,
      yearStrip: (stem, branch) => `歳次${stem}${branch}年`,
      lunarLine: (ld) => `旧暦 ${ld.month}月${ld.day}日`,
      yearLine: (stem, branch, animal) => `歳次${stem}${branch}年（${animal}）`,
      ganZhiSuffix: '日',
      officerDaySuffix: '日',
      dayGodPrefix: '値神',
      stripMansion: '',
      clashText: (animal, dir) => `冲${ANIMAL_JA[animal] ?? animal}煞${dir}`,
      pengzuText: (stem, branch) => `${stem} ${branch}`,
      nayinLine: (nayin) => nayin,
      animal: (b) => ANIMAL_JA[b] ?? b,
      quadrant: (m) => QUADRANT_JA[m.quadrant] ?? m.quadrant,
      hourGodName: (g) => g,
      relationSentence: (dayBranch) => relationSentence(dayBranch, 'ja'),
      meaningFootnote: '通書とウィキペディア「黄暦」に基づく整理 · 文化参考',
    }
  }
  if (locale.includes('hant')) {
    return {
      vertical: true,
      sectionPillars: '生辰八字五行',
      sectionInfo: '當日信息',
      sectionHours: '時辰吉凶',
      sectionGods: '吉神方位',
      rowElement: '五行',
      rowClash: '沖煞',
      rowDayGod: '值神',
      rowOfficer: '建除',
      rowPengZu: '彭祖',
      rowMansion: '星宿',
      godWealth: '財神',
      godJoy: '喜神',
      yangGongNote: '楊公忌日 大事勿用',
      goodWord: '吉',
      badWord: '凶',
      emptyMeaning: '此詞暫無釋義收錄。',
      forYouLabel: '於你',
      weekday: (d) => WEEKDAYS['zh-Hant'][d.getDay()] ?? '',
      gregorian: (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      gregorianShort: (d) => `${d.getMonth() + 1}月${d.getDate()}日`,
      weekdayChip: (d) => {
        const wd = ['日', '一', '二', '三', '四', '五', '六']
        return `週${wd[d.getDay()] ?? ''} · ${d.getDate()}`
      },
      lunarStrip: (ld) => `${ld.monthName}${ld.dayName}`,
      yearStrip: (stem, branch) => `歲次${stem}${branch}年`,
      lunarLine: (ld) => `${ld.monthName}${ld.dayName}`,
      yearLine: (stem, branch, animal) => `歲次${stem}${branch}年（${animal}）`,
      ganZhiSuffix: '日',
      officerDaySuffix: '日',
      dayGodPrefix: '值神',
      stripMansion: '',
      clashText: (animal, dir) => `沖${animal}煞${dir}`,
      pengzuText: (stem, branch) => `${stem} ${branch}`,
      nayinLine: (nayin) => nayin,
      animal: (b) => b,
      quadrant: (m) => QUADRANT_JA[m.quadrant] ?? m.quadrant,
      hourGodName: (g) => g,
      relationSentence: (dayBranch) => relationSentence(dayBranch, 'zh-Hant'),
      meaningFootnote: '釋義據《通書》與維基百科「黃曆」條目整理 · 文化參考',
    }
  }
  return {
    vertical: true,
    sectionPillars: '生辰八字五行',
    sectionInfo: '当日信息',
    sectionHours: '时辰吉凶',
    sectionGods: '吉神方位',
    rowElement: '五行',
    rowClash: '冲煞',
    rowDayGod: '值神',
    rowOfficer: '建除',
    rowPengZu: '彭祖',
    rowMansion: '星宿',
    godWealth: '财神',
    godJoy: '喜神',
    yangGongNote: '杨公忌日 大事勿用',
    goodWord: '吉',
    badWord: '凶',
    emptyMeaning: '此词暂无释义收录。',
    forYouLabel: '于你',
    weekday: (d) => WEEKDAYS['zh-Hans'][d.getDay()] ?? '',
    gregorian: (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
    gregorianShort: (d) => `${d.getMonth() + 1}月${d.getDate()}日`,
    weekdayChip: (d) => {
      const wd = ['日', '一', '二', '三', '四', '五', '六']
      return `周${wd[d.getDay()] ?? ''} · ${d.getDate()}`
    },
    lunarStrip: (ld) => `${ld.monthName}${ld.dayName}`,
    yearStrip: (stem, branch) => `岁次${stem}${branch}年`,
    lunarLine: (ld) => `${ld.monthName}${ld.dayName}`,
    yearLine: (stem, branch, animal) => `岁次${stem}${branch}年（${animal}）`,
    ganZhiSuffix: '日',
    officerDaySuffix: '日',
    dayGodPrefix: '值神',
    stripMansion: '',
    clashText: (animal, dir) => `冲${animal}煞${dir}`,
    pengzuText: (stem, branch) => `${stem} ${branch}`,
    nayinLine: (nayin) => nayin,
    animal: (b) => b,
    quadrant: (m) => QUADRANT_JA[m.quadrant] ?? m.quadrant,
    hourGodName: (g) => g,
    relationSentence: (dayBranch) => relationSentence(dayBranch, 'zh-Hans'),
    meaningFootnote: '释义据《通书》与维基百科「黄历」条目整理 · 文化参考',
  }
}

/** 刑冲害合句 — 四语。 */
function relationSentence(dayBranch: string, locale: string): string | null {
  const rel = branchRelationSummary(dayBranch as EarthlyBranch)
  const copy = almanacCopy(locale)
  const parts: string[] = []
  if (rel.clash)
    parts.push(
      locale === 'en' ? `clashes with ${copy.animal(rel.clash)}` : `与${copy.animal(rel.clash)}相冲`
    )
  if (rel.harm)
    parts.push(
      locale === 'en' ? `harms ${copy.animal(rel.harm)}` : `与${copy.animal(rel.harm)}相害`
    )
  if (rel.triple.length > 0)
    parts.push(
      locale === 'en'
        ? `triple harmony with ${rel.triple.map(copy.animal).join(' & ')}`
        : `与${rel.triple.map(copy.animal).join('、')}三合`
    )
  if (rel.combine)
    parts.push(
      locale === 'en'
        ? `six-harmony with ${copy.animal(rel.combine)}`
        : `与${copy.animal(rel.combine)}六合`
    )
  if (rel.punish.length > 0)
    parts.push(
      locale === 'en'
        ? `punishes ${rel.punish.map(copy.animal).join(' & ')}`
        : `与${rel.punish.map(copy.animal).join('、')}相刑`
    )
  if (parts.length === 0) return null
  return locale === 'en' ? `Today ${parts.join(', ')}.` : `今日${parts.join('，')}。`
}
