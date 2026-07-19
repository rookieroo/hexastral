/**
 * Shared 4-locale labels for archive vs life axis vs what-if (Phase 4 polish).
 */

import type { Locale } from './i18n'
import { isZhHant } from './locale-zh'

export function livingLayerLabels(locale: Locale): {
  timeline: string
  whatif: string
  chat: string
  regenerate: string
} {
  switch (locale) {
    case 'zh':
      return {
        timeline: '人生时间线',
        whatif: '假如',
        chat: '追问',
        regenerate: '用当前语言重生成',
      }
    case 'zh-Hant':
      return {
        timeline: '人生時間線',
        whatif: '假如',
        chat: '追問',
        regenerate: '用目前語言重新生成',
      }
    case 'ja':
      return {
        timeline: '人生タイムライン',
        whatif: 'もしも',
        chat: '質問',
        regenerate: '今の言語で再生成',
      }
    default:
      return {
        timeline: 'Life axis',
        whatif: 'What-if',
        chat: 'Chat',
        regenerate: 'Regenerate in this language',
      }
  }
}

export function archiveSectionLabel(locale: Locale, isPro: boolean): string {
  if (isPro) {
    switch (locale) {
      case 'zh':
        return '档案'
      case 'zh-Hant':
        return '檔案'
      case 'ja':
        return 'アーカイブ'
      default:
        return 'HISTORY'
    }
  }
  switch (locale) {
    case 'zh':
      return '近期'
    case 'zh-Hant':
      return '近期'
    case 'ja':
      return '最近'
    default:
      return 'RECENT'
  }
}

export function primerCopy(locale: Locale): {
  title: string
  body: string
  glossary: string
  begin: string
} {
  switch (locale) {
    case 'zh':
      return {
        title: '如何阅读本期形气',
        body: '左右滑动切换六章。点虚线术语看释义（含拼音）。长按句子可复制、追问或高亮。右下角进入人生时间线 / 假如 / 追问。首页「档案」是往期形气；人生时间线是大运主轴。',
        glossary: '查看符号说明',
        begin: '开始阅读',
      }
    case 'zh-Hant':
      return {
        title: '如何閱讀本期形氣',
        body: '左右滑動切換六章。點虛線術語看釋義（含拼音）。長按句子可複製、追問或高亮。右下角進入人生時間線 / 假如 / 追問。首頁「檔案」是往期形氣；人生時間線是大運主軸。',
        glossary: '查看符號說明',
        begin: '開始閱讀',
      }
    case 'ja':
      return {
        title: '読み方',
        body: '左右スワイプで六章を切替。点線の用語をタップして注釈（拼音付き）。長押しでコピー・質問・ハイライト。右下から人生タイムライン / もしも / 質問へ。ホームの「アーカイブ」は過去の形気、人生タイムラインは大運の軸です。',
        glossary: '記号の説明',
        begin: '読む',
      }
    default:
      return {
        title: 'How to read this',
        body: 'Swipe six chapters. Tap dotted terms for glosses (with pinyin). Long-press to copy, chat, or highlight. Corner FAB opens life axis / what-if / chat. Home “History” is past form readings; Life axis is the DaYun trunk.',
        glossary: 'Symbol glossary',
        begin: 'Begin',
      }
  }
}

export function makeIfDiffCopy(locale: Locale): {
  header: string
  tapHint: string
  help: string
  harm: string
  even: string
  realCol: string
  altCol: string
  forkRow: string
  mergeRow: string
  loading: string
  failed: string
} {
  switch (locale) {
    case 'zh':
      return {
        header: '现实 vs 假如',
        tapHint: '点一行展开该节点的推演叙述。',
        help: '扶',
        harm: '克',
        even: '平',
        realCol: '现实',
        altCol: '假如',
        forkRow: '{age} 岁分叉',
        mergeRow: '{age} 岁回归',
        loading: '推演中…',
        failed: '加载失败 · 再试',
      }
    case 'zh-Hant':
      return {
        header: '現實 vs 假如',
        tapHint: '點一行展開該節點的推演敘述。',
        help: '扶',
        harm: '克',
        even: '平',
        realCol: '現實',
        altCol: '假如',
        forkRow: '{age} 歲分叉',
        mergeRow: '{age} 歲回歸',
        loading: '推演中…',
        failed: '載入失敗 · 再試',
      }
    case 'ja':
      return {
        header: '現実 vs もしも',
        tapHint: '行をタップしてその節点の叙述を開く。',
        help: '扶',
        harm: '克',
        even: '平',
        realCol: '現実',
        altCol: 'もしも',
        forkRow: '{age} 歳で分岐',
        mergeRow: '{age} 歳で合流',
        loading: '推演中…',
        failed: '失敗 · 再試行',
      }
    default:
      return {
        header: 'Real vs what-if',
        tapHint: 'Tap a row to expand that node’s narrative.',
        help: 'Help',
        harm: 'Harm',
        even: 'Even',
        realCol: 'Real',
        altCol: 'Alt',
        forkRow: 'Fork at {age}',
        mergeRow: 'Merge at {age}',
        loading: 'Exploring…',
        failed: 'Failed · retry',
      }
  }
}

/** History row title — chrome i18n, never raw LLM overview. */
export function formReadingListTitle(locale: Locale): string {
  switch (locale) {
    case 'zh':
      return '形气解读'
    case 'zh-Hant':
      return '形氣解讀'
    case 'ja':
      return '形気リーディング'
    default:
      return 'Form reading'
  }
}

/** Short badge for frozen generation locale on a reading. */
export function readingLocaleBadge(readingLocale: string | null | undefined): string | null {
  if (!readingLocale) return null
  if (isZhHant(readingLocale)) return '繁'
  if (readingLocale.startsWith('zh')) return '简'
  if (readingLocale.startsWith('ja')) return 'JA'
  if (readingLocale.startsWith('en')) return 'EN'
  return readingLocale.slice(0, 2).toUpperCase()
}
