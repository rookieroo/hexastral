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

export function draftPeriodCopy(
  locale: Locale,
  opts?: { incomplete?: boolean }
): { title: string; excerpt: string } {
  if (opts?.incomplete) {
    switch (locale) {
      case 'zh':
        return { title: '未完成', excerpt: '点按继续解读' }
      case 'zh-Hant':
        return { title: '未完成', excerpt: '點按繼續解讀' }
      case 'ja':
        return { title: '未完了', excerpt: 'タップして続行' }
      default:
        return { title: 'Unfinished', excerpt: 'Tap to continue reading' }
    }
  }
  switch (locale) {
    case 'zh':
      return { title: '新一期', excerpt: '须更新面部 · 掌纹可沿用' }
    case 'zh-Hant':
      return { title: '新一期', excerpt: '須更新面部 · 掌紋可沿用' }
    case 'ja':
      return { title: '新しい一期', excerpt: '顔を更新 · 手相は継承可' }
    default:
      return { title: 'New period', excerpt: 'Update face · palms may carry' }
  }
}

/** Capture dock hint when a prior reading can supply missing features. */
export function periodCarryHint(locale: Locale): string {
  switch (locale) {
    case 'zh':
      return '须更新面部 · 左右掌可沿用上次特征'
    case 'zh-Hant':
      return '須更新面部 · 左右掌可沿用上次特徵'
    case 'ja':
      return '顔は必須 · 手相は前回の特徴を継承可'
    default:
      return 'Face required · palms may reuse last extract'
  }
}

export function slotCarryLabel(locale: Locale, kind: 'new' | 'carried'): string {
  if (kind === 'new') {
    switch (locale) {
      case 'zh':
        return '新'
      case 'zh-Hant':
        return '新'
      case 'ja':
        return '新'
      default:
        return 'New'
    }
  }
  switch (locale) {
    case 'zh':
      return '沿用'
    case 'zh-Hant':
      return '沿用'
    case 'ja':
      return '継承'
    default:
      return 'Carried'
  }
}

export function readingBriefCopy(locale: Locale): {
  lociCta: string
  chaptersCta: string
  suggestionLabel: string
  summaryLabel: string
} {
  switch (locale) {
    case 'zh':
      return {
        lociCta: '照片标注',
        chaptersCta: '完整五章',
        suggestionLabel: '宜留意',
        summaryLabel: '摘要',
      }
    case 'zh-Hant':
      return {
        lociCta: '照片標註',
        chaptersCta: '完整五章',
        suggestionLabel: '宜留意',
        summaryLabel: '摘要',
      }
    case 'ja':
      return {
        lociCta: '写真で見る',
        chaptersCta: '五章を開く',
        suggestionLabel: '留意',
        summaryLabel: '要約',
      }
    default:
      return {
        lociCta: 'On your photo',
        chaptersCta: 'Full five chapters',
        suggestionLabel: 'Suggestion',
        summaryLabel: 'Summary',
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
  close: string
  selectSlot: string
  continueBirth: string
  continueUnlock: string
  continueReading: string
  nextSlot: string
} {
  switch (locale) {
    case 'zh':
      return {
        quality: '高清、完整、光线均匀。模糊或裁切会让报告变浅。',
        empty: '点选槽位 · 拍照或相册 · 本机可查看草稿',
        privacy: '本机保留可查看草稿；提取时短暂上传，处理后删除原图。',
        camera: '拍照',
        retake: '重拍',
        library: '相册',
        replaceLibrary: '从相册替换',
        done: '完成',
        close: '关闭',
        selectSlot: '点选一张再更新',
        continueBirth: '继续填写生辰',
        continueUnlock: '继续到解锁',
        continueReading: '开始解读',
        nextSlot: '下一张',
      }
    case 'zh-Hant':
      return {
        quality: '高清、完整、光線均勻。模糊或裁切會讓報告變淺。',
        empty: '點選槽位 · 拍照或相簿 · 本機可查看草稿',
        privacy: '本機保留可查看草稿；提取時短暫上傳，處理後刪除原圖。',
        camera: '拍照',
        retake: '重拍',
        library: '相簿',
        replaceLibrary: '從相簿替換',
        done: '完成',
        close: '關閉',
        selectSlot: '點選一張再更新',
        continueBirth: '繼續填寫生辰',
        continueUnlock: '繼續到解鎖',
        continueReading: '開始解讀',
        nextSlot: '下一張',
      }
    case 'ja':
      return {
        quality: '鮮明・全体・均一な光。ぼやけやトリミングはリーディングが薄くなります。',
        empty: '枠を選ぶ · カメラまたはアルバム · 端末で下書き確認',
        privacy: '端末に下書きを保持。抽出のため短時間アップロードし、処理後に原画像を削除します。',
        camera: 'カメラ',
        retake: '撮り直す',
        library: 'アルバム',
        replaceLibrary: 'アルバムから差し替え',
        done: '完了',
        close: '閉じる',
        selectSlot: '枠を選んでから更新',
        continueBirth: '生辰情報へ',
        continueUnlock: '購入手続きへ',
        continueReading: '解読を開始',
        nextSlot: '次へ',
      }
    default:
      return {
        quality: 'Sharp, complete, even light. Blur or crop makes a thin reading.',
        empty: 'Tap a slot · camera or library · draft stays viewable on device',
        privacy: 'Drafts stay on device for viewing; briefly uploaded for extract, then deleted.',
        camera: 'Camera',
        retake: 'Retake',
        library: 'Library',
        replaceLibrary: 'Replace from library',
        done: 'Done',
        close: 'Close',
        selectSlot: 'Select a slot to update',
        continueBirth: 'Continue to birth info',
        continueUnlock: 'Continue to unlock',
        continueReading: 'Start reading',
        nextSlot: 'Next',
      }
  }
}

export function deepNextReadingCopy(locale: Locale): {
  label: string
  hint: string
} {
  switch (locale) {
    case 'zh':
      return {
        label: '下次深度解读',
        hint: '默认短简；开启后下一期生成完整五章。首读不受此开关影响。',
      }
    case 'zh-Hant':
      return {
        label: '下次深度解讀',
        hint: '預設短簡；開啟後下一期生成完整五章。首讀不受此開關影響。',
      }
    case 'ja':
      return {
        label: '次回は深度解読',
        hint: '通常は短簡。オンにすると次の一期は五章。初回は対象外。',
      }
    default:
      return {
        label: 'Deep reading next time',
        hint: 'Default is the short brief. When on, your next period uses five chapters. First seal is always deep.',
      }
  }
}

type ProcessingPhase =
  | 'uploading'
  | 'extracting'
  | 'queued'
  | 'interpreting'
  | 'idle'
  | 'done'
  | 'failed'

export function readingProcessingCopy(
  locale: Locale,
  phase: ProcessingPhase
): { title: string; hint: string; leave: string } {
  const key =
    phase === 'uploading'
      ? 'upload'
      : phase === 'extracting'
        ? 'extract'
        : phase === 'queued'
          ? 'queue'
          : phase === 'interpreting'
            ? 'interpret'
            : 'default'

  const pack = {
    upload: {
      zh: {
        title: '上传照片',
        hint: '正在安全传送左掌、右掌与面部…',
        leave: '请保持打开直至上传完成。上传后即可离开，云端会继续提取与解读。',
      },
      hant: {
        title: '上傳照片',
        hint: '正在安全傳送左掌、右掌與面部…',
        leave: '請保持打開直至上傳完成。上傳後即可離開，雲端會繼續提取與解讀。',
      },
      ja: {
        title: '写真を送信中',
        hint: '左掌・右掌・顔を安全に送信しています…',
        leave: '送信完了までアプリを開いたままに。送信後は閉じてもクラウドで抽出・解読が続きます。',
      },
      en: {
        title: 'Uploading photos',
        hint: 'Securely sending left palm, right palm, and face…',
        leave: 'Keep the app open until upload finishes. After that you can leave — the cloud continues.',
      },
    },
    extract: {
      zh: {
        title: '提取形气特征',
        hint: '云端正在结构化左掌、右掌与面部…',
        leave: '已上传，可离开。回首页可查看进度，完成后会通知你。',
      },
      hant: {
        title: '提取形氣特徵',
        hint: '雲端正在結構化左掌、右掌與面部…',
        leave: '已上傳，可離開。回首頁可查看進度，完成後會通知你。',
      },
      ja: {
        title: '形気の特徴を抽出中',
        hint: 'クラウドが左掌・右掌・顔を構造化しています…',
        leave: '送信済み。アプリを閉じても大丈夫。ホームで進捗を確認できます。',
      },
      en: {
        title: 'Extracting form features',
        hint: 'Cloud is structuring left palm, right palm, and face…',
        leave: 'Uploaded — you can leave. Check progress on home; we notify when ready.',
      },
    },
    queue: {
      zh: {
        title: '排队解读',
        hint: '特征已就绪，等待云端席位…',
        leave: '已入队，可离开。回首页可查看进度，完成后会通知你。',
      },
      hant: {
        title: '排隊解讀',
        hint: '特徵已就緒，等待雲端席位…',
        leave: '已入隊，可離開。回首頁可查看進度，完成後會通知你。',
      },
      ja: {
        title: '解読待ち',
        hint: '特徴は準備完了。クラウドの順番待ち…',
        leave: 'キュー済み。アプリを閉じても大丈夫。ホームで進捗を確認できます。',
      },
      en: {
        title: 'Queued for reading',
        hint: 'Features ready — waiting for a cloud slot…',
        leave: 'Queued — you can leave. Check progress on home; we notify you when ready.',
      },
    },
    interpret: {
      zh: {
        title: '撰写形气简报',
        hint: '五章简报正在密封成稿…',
        leave: '云端撰写中，可离开。回首页可查看进度。',
      },
      hant: {
        title: '撰寫形氣簡報',
        hint: '五章簡報正在密封成稿…',
        leave: '雲端撰寫中，可離開。回首頁可查看進度。',
      },
      ja: {
        title: '形気ブリーフを執筆中',
        hint: '五章のブリーフを密封しています…',
        leave: 'クラウド執筆中。閉じても大丈夫。ホームで進捗を確認できます。',
      },
      en: {
        title: 'Writing your brief',
        hint: 'Sealing the five-chapter form brief…',
        leave: 'Writing in the cloud — you can leave. Check progress on home.',
      },
    },
    default: {
      zh: {
        title: '形气解读进行中',
        hint: '完整流程通常需要几分钟。',
        leave: '可离开应用，完成后会通知你。',
      },
      hant: {
        title: '形氣解讀進行中',
        hint: '完整流程通常需要幾分鐘。',
        leave: '可離開應用，完成後會通知你。',
      },
      ja: {
        title: '形気リーディング中',
        hint: '全体で数分かかることがあります。',
        leave: 'アプリを閉じても大丈夫です。完了したらお知らせします。',
      },
      en: {
        title: 'Reading in progress',
        hint: 'This usually takes a few minutes.',
        leave: 'You can leave — we will notify you when ready.',
      },
    },
  } as const

  const row = pack[key]
  switch (locale) {
    case 'zh':
      return row.zh
    case 'zh-Hant':
      return row.hant
    case 'ja':
      return row.ja
    default:
      return row.en
  }
}

/** Timeline draft row while a cloud job is queued / interpreting. */
export function runningJobDraftCopy(
  locale: Locale,
  opts: { phase: ProcessingPhase; progress: number }
): { title: string; excerpt: string } {
  const pct = Math.max(0, Math.min(100, Math.round(opts.progress)))
  const phaseLabel =
    opts.phase === 'uploading'
      ? ({ zh: '上传中', hant: '上傳中', ja: '送信中', en: 'Uploading' } as const)
      : opts.phase === 'extracting'
        ? ({ zh: '提取中', hant: '提取中', ja: '抽出中', en: 'Extracting' } as const)
        : opts.phase === 'interpreting'
          ? ({ zh: '撰写中', hant: '撰寫中', ja: '執筆中', en: 'Writing' } as const)
          : ({ zh: '排队中', hant: '排隊中', ja: '待機中', en: 'Queued' } as const)
  switch (locale) {
    case 'zh':
      return { title: '解读中', excerpt: `${phaseLabel.zh} · ${pct}% · 点按查看` }
    case 'zh-Hant':
      return { title: '解讀中', excerpt: `${phaseLabel.hant} · ${pct}% · 點按查看` }
    case 'ja':
      return { title: '解読中', excerpt: `${phaseLabel.ja} · ${pct}% · タップで詳細` }
    default:
      return { title: 'In progress', excerpt: `${phaseLabel.en} · ${pct}% · Tap for progress` }
  }
}
