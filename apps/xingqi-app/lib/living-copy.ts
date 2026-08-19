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
        body: '左右滑动切换五章。点虚线术语看释义（含拼音）。长按句子可复制、追问或高亮。右下角进入人生时间线 / 假如 / 追问。首页「本期」是最近一次形气；「档案」收纳往期。人生时间线是大运主轴。',
        glossary: '查看符号说明',
        begin: '开始阅读',
      }
    case 'zh-Hant':
      return {
        title: '如何閱讀本期形氣',
        body: '左右滑動切換五章。點虛線術語看釋義（含拼音）。長按句子可複製、追問或高亮。右下角進入人生時間線 / 假如 / 追問。首頁「本期」是最近一次形氣；「檔案」收納往期。人生時間線是大運主軸。',
        glossary: '查看符號說明',
        begin: '開始閱讀',
      }
    case 'ja':
      return {
        title: '読み方',
        body: '左右スワイプで五章を切替。点線の用語をタップしてかな付きの解説を見る。長押しでコピー・質問・ハイライト。右下から人生タイムライン / もしも / 質問へ。ホームの「今回」は直近の形気、「アーカイブ」に過去分。人生タイムラインは大運の軸です。',
        glossary: '記号の説明',
        begin: '読む',
      }
    default:
      return {
        title: 'How to read this',
        body: 'Swipe five chapters. Tap dotted terms for glosses (face form 面相 / palm form 掌相 terms with pinyin where shown). Long-press to copy, chat, or highlight. Corner FAB opens life axis / what-if / chat. Home “Latest” is the current form-qi reading; History holds older ones. Life axis is the DaYun trunk.',
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
        tapHint: '行をタップしてその節点の読み解きを開く。',
        help: '扶',
        harm: '克',
        even: '平',
        realCol: '現実',
        altCol: 'もしも',
        forkRow: '{age} 歳で分岐',
        mergeRow: '{age} 歳で合流',
        loading: '読み解き中…',
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

/** Part labels for the photo strip (左手/右手/顔). */
export function partLabels(locale: Locale): { palmL: string; palmR: string; face: string } {
  switch (locale) {
    case 'zh':
      return { palmL: '左掌', palmR: '右掌', face: '面' }
    case 'zh-Hant':
      return { palmL: '左掌', palmR: '右掌', face: '面' }
    case 'ja':
      return { palmL: '左手', palmR: '右手', face: '顔' }
    default:
      return { palmL: 'L palm', palmR: 'R palm', face: 'Face' }
  }
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
      return { formLabel: 'Form-qi map', birth: 'Birth' }
  }
}

/** Account / device case — not the generic word Settings. */
export function sealCaseCopy(locale: Locale): {
  title: string
  newPeriod: string
  refreshPeriod: string
} {
  switch (locale) {
    case 'zh':
      return { title: '印匣', newPeriod: '新一期', refreshPeriod: '更新本期' }
    case 'zh-Hant':
      return { title: '印匣', newPeriod: '新一期', refreshPeriod: '更新本期' }
    case 'ja':
      return { title: '文箱', newPeriod: '新しい一期', refreshPeriod: '今期を更新' }
    default:
      return { title: 'Case', newPeriod: 'New period', refreshPeriod: 'Refresh period' }
  }
}

export function draftPeriodCopy(locale: Locale): { title: string; excerpt: string } {
  switch (locale) {
    case 'zh':
      return { title: '新一期', excerpt: '点此录入' }
    case 'zh-Hant':
      return { title: '新一期', excerpt: '點此錄入' }
    case 'ja':
      return { title: '新しい一期', excerpt: 'タップして撮影' }
    default:
      return { title: 'New period', excerpt: 'Tap to capture' }
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
      return 'Form-qi reading'
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
        pulseLabel: 'Form-qi state',
        statusLabel: 'Now',
        attentionLabel: 'Watch',
        actionLabel: 'Key',
      }
  }
}

/** Home care notes + compact period strip chrome. */
export function homeCareCopy(locale: Locale): {
  pace: string
  rest: string
  body: string
  fallbacks: [string, string, string]
} {
  switch (locale) {
    case 'zh':
      return {
        pace: '作息',
        rest: '睡眠',
        body: '饮食',
        fallbacks: [
          '这几天尽量按时吃饭，晚上别拖到太晚。',
          '有三晚争取在午夜前睡下，气色会稳一些。',
          '少熬夜赶工。节奏比硬扛更重要。',
        ],
      }
    case 'zh-Hant':
      return {
        pace: '作息',
        rest: '睡眠',
        body: '飲食',
        fallbacks: [
          '這幾天盡量按時吃飯，晚上別拖到太晚。',
          '有三晚爭取在午夜前睡下，氣色會穩一些。',
          '少熬夜趕工。節奏比硬扛更重要。',
        ],
      }
    case 'ja':
      return {
        pace: 'ペース',
        rest: '睡眠',
        body: '食事',
        fallbacks: [
          'この数日は決まった時間に食事を。夜は遅くしすぎない。',
          '三日は深夜前に眠る。形が疲れているときは休息から。',
          '徹夜を減らす。無理よりリズム。',
        ],
      }
    default:
      return {
        pace: 'Pace',
        rest: 'Rest',
        body: 'Meals',
        fallbacks: [
          'Keep regular meals this week. Skip late dinners when evenings feel rushed.',
          'Sleep before midnight on three nights. The form looks tired when rest is thin.',
          'Ease off late nights. Pace matters more than pushing through.',
        ],
      }
  }
}

export function homePeriodStripCopy(locale: Locale): { label: string } {
  switch (locale) {
    case 'zh':
      return { label: '近窗' }
    case 'zh-Hant':
      return { label: '近窗' }
    case 'ja':
      return { label: '近い窓' }
    default:
      return { label: 'Near window' }
  }
}

export function captureStudioCopy(locale: Locale): {
  quality: string
  empty: string
  privacy: string
  camera: string
  retake: string
  library: string
  replaceLibrary: string
  done: string
  continueBirth: string
  continueUnlock: string
  nextSlot: string
} {
  switch (locale) {
    case 'zh':
      return {
        quality: '高清、完整、光线均匀。模糊或裁切会让报告变浅。',
        empty: '点选槽位 · 拍照或相册 · 仅存本机',
        privacy: '原图仅存本机；分析时上传，服务器处理完不保留。',
        camera: '拍照',
        retake: '重拍',
        library: '相册',
        replaceLibrary: '从相册替换',
        done: '完成',
        continueBirth: '继续填写生辰',
        continueUnlock: '继续到解锁',
        nextSlot: '下一张',
      }
    case 'zh-Hant':
      return {
        quality: '高清、完整、光線均勻。模糊或裁切會讓報告變淺。',
        empty: '點選槽位 · 拍照或相簿 · 僅存本機',
        privacy: '原圖僅存本機；分析時上傳，伺服器處理完不保留。',
        camera: '拍照',
        retake: '重拍',
        library: '相簿',
        replaceLibrary: '從相簿替換',
        done: '完成',
        continueBirth: '繼續填寫生辰',
        continueUnlock: '繼續到解鎖',
        nextSlot: '下一張',
      }
    case 'ja':
      return {
        quality: '鮮明・全体・均一な光。ぼやけやトリミングはリーディングが薄くなります。',
        empty: '枠を選ぶ · カメラまたはアルバム · この端末のみ',
        privacy: '写真は端末に保存。抽出のためだけにアップロードし、サーバーでは破棄します。',
        camera: 'カメラ',
        retake: '撮り直す',
        library: 'アルバム',
        replaceLibrary: 'アルバムから差し替え',
        done: '完了',
        continueBirth: '生辰情報へ',
        continueUnlock: '購入手続きへ',
        nextSlot: '次へ',
      }
    default:
      return {
        quality: 'Sharp, complete, even light. Blur or crop makes a thin reading.',
        empty: 'Tap a slot · camera or library · on this device only',
        privacy: 'Photos stay on device; uploaded only for extraction, then discarded server-side.',
        camera: 'Camera',
        retake: 'Retake',
        library: 'Library',
        replaceLibrary: 'Replace from library',
        done: 'Done',
        continueBirth: 'Continue to birth info',
        continueUnlock: 'Continue to unlock',
        nextSlot: 'Next',
      }
  }
}
