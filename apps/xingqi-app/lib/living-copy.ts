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
        body: '左右滑动切换六章。点虚线术语看释义（含拼音）。长按句子可复制、追问或高亮。右下角进入人生时间线 / 假如 / 追问。首页「本期」是最近一次形气；「档案」收纳往期。人生时间线是大运主轴。',
        glossary: '查看符号说明',
        begin: '开始阅读',
      }
    case 'zh-Hant':
      return {
        title: '如何閱讀本期形氣',
        body: '左右滑動切換六章。點虛線術語看釋義（含拼音）。長按句子可複製、追問或高亮。右下角進入人生時間線 / 假如 / 追問。首頁「本期」是最近一次形氣；「檔案」收納往期。人生時間線是大運主軸。',
        glossary: '查看符號說明',
        begin: '開始閱讀',
      }
    case 'ja':
      return {
        title: '読み方',
        body: '左右スワイプで六章を切替。点線の用語をタップして注釈（拼音付き）。長押しでコピー・質問・ハイライト。右下から人生タイムライン / もしも / 質問へ。ホームの「今回」は直近の形気、「アーカイブ」に過去分。人生タイムラインは大運の軸です。',
        glossary: '記号の説明',
        begin: '読む',
      }
    default:
      return {
        title: 'How to read this',
        body: 'Swipe six chapters. Tap dotted terms for glosses (with pinyin). Long-press to copy, chat, or highlight. Corner FAB opens life axis / what-if / chat. Home “Latest” is the current form reading; History holds older ones. Life axis is the DaYun trunk.',
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

/** Three-axis chip labels for the home verdict card. */
export function axisLabels(locale: Locale): { career: string; love: string; health: string } {
  switch (locale) {
    case 'zh':
      return { career: '事业', love: '爱情', health: '健康' }
    case 'zh-Hant':
      return { career: '事業', love: '愛情', health: '健康' }
    case 'ja':
      return { career: '仕事', love: '恋愛', health: '健康' }
    default:
      return { career: 'Career', love: 'Love', health: 'Health' }
  }
}

/** Fullscreen locus viewer chrome — actions layered on top of the shared explorer copy. */
export function locusViewerCopy(locale: Locale): {
  openChapter: string
  recapture: string
} {
  switch (locale) {
    case 'zh':
      return { openChapter: '打开报告本章', recapture: '重拍此张' }
    case 'zh-Hant':
      return { openChapter: '打開報告本章', recapture: '重拍此張' }
    case 'ja':
      return { openChapter: '該当章を開く', recapture: '撮り直す' }
    default:
      return { openChapter: 'Open report chapter', recapture: 'Retake' }
  }
}

/** Part labels for the photo strip (左掌/右掌/面). */
export function partLabels(locale: Locale): { palmL: string; palmR: string; face: string } {
  if (locale === 'en') return { palmL: 'L palm', palmR: 'R palm', face: 'Face' }
  return { palmL: '左掌', palmR: '右掌', face: '面' }
}

/** Home secondary row + strip section labels. */
export function homeInputsCopy(locale: Locale): {
  formLabel: string
  birth: string
} {
  switch (locale) {
    case 'zh':
      return { formLabel: '形气对照', birth: '生辰' }
    case 'zh-Hant':
      return { formLabel: '形氣對照', birth: '生辰' }
    case 'ja':
      return { formLabel: '形気対照', birth: '生辰' }
    default:
      return { formLabel: 'Form map', birth: 'Birth' }
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

/** Home archive chrome — featured card + short preview. */
export function homeArchiveCopy(locale: Locale): {
  latestLabel: string
  openHint: string
  recentLabel: string
  viewAll: (count: number) => string
  archiveTitle: string
  swipeHint: string
  pulseLabel: string
  statusLabel: string
  attentionLabel: string
  actionLabel: string
} {
  switch (locale) {
    case 'zh':
      return {
        latestLabel: '本期',
        openHint: '点开完整报告 · 左滑删除',
        recentLabel: '更早',
        viewAll: (count) => `全部档案 · ${count}`,
        archiveTitle: '档案',
        swipeHint: '点开查看；左滑删除。',
        pulseLabel: '形气状态',
        statusLabel: '当下',
        attentionLabel: '宜留意',
        actionLabel: '可对照',
      }
    case 'zh-Hant':
      return {
        latestLabel: '本期',
        openHint: '點開完整報告 · 左滑刪除',
        recentLabel: '更早',
        viewAll: (count) => `全部檔案 · ${count}`,
        archiveTitle: '檔案',
        swipeHint: '點開查看；左滑刪除。',
        pulseLabel: '形氣狀態',
        statusLabel: '當下',
        attentionLabel: '宜留意',
        actionLabel: '可對照',
      }
    case 'ja':
      return {
        latestLabel: '今回',
        openHint: 'レポートを開く · 左スワイプで削除',
        recentLabel: '以前',
        viewAll: (count) => `すべて · ${count}`,
        archiveTitle: 'アーカイブ',
        swipeHint: 'タップで開く。左スワイプで削除。',
        pulseLabel: '形気の状態',
        statusLabel: 'いま',
        attentionLabel: '留意',
        actionLabel: '対照',
      }
    default:
      return {
        latestLabel: 'Latest',
        openHint: 'Open full report · swipe left to delete',
        recentLabel: 'Earlier',
        viewAll: (count) => `All history · ${count}`,
        archiveTitle: 'History',
        swipeHint: 'Tap to open. Swipe left to delete.',
        pulseLabel: 'Form pulse',
        statusLabel: 'Now',
        attentionLabel: 'Watch',
        actionLabel: 'Key',
      }
  }
}
