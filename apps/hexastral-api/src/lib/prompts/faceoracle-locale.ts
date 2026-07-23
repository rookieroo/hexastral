/**
 * FaceOracle / Syel locale block — aligned with Yuel (svc-astro hehun) Route B:
 * keep 汉字 load-bearing terms; meaning in target-language prose; app tap-to-gloss.
 * zh: no English leakage. en/ja: no romanization-as-primary.
 */

export function resolveFaceoracleOutputLang(locale: string): {
  code: 'zh-CN' | 'zh-TW' | 'ja' | 'en'
  name: string
  isCjkOutput: boolean
} {
  if (locale.startsWith('zh-Hant') || locale === 'zh-TW') {
    return { code: 'zh-TW', name: '繁體中文', isCjkOutput: true }
  }
  if (locale.startsWith('zh')) {
    return { code: 'zh-CN', name: '简体中文', isCjkOutput: true }
  }
  if (locale.startsWith('ja')) {
    return { code: 'ja', name: '日本語', isCjkOutput: false }
  }
  return { code: 'en', name: 'English', isCjkOutput: false }
}

/**
 * Writer map for the model only — effect hints. Pinyin must NOT appear in JSON
 * output (Yuel policy: keep 汉字; meaning in surrounding prose).
 */
const FACEORACLE_WRITER_HINTS_EN = [
  '形气 — form–qi / physiognomic presence (keep 汉字 in output)',
  '气机 — qi in motion / dynamic tendency',
  '宜留意 — worth noting (not fate)',
  '三停 — three facial zones',
  '五岳 — five facial peaks',
  '十二宫 — twelve facial palaces',
  '天庭 — upper forehead',
  '印堂 — glabella',
  '山根 — nasal root',
  '额宽 — forehead width',
  '颧骨 — cheekbones',
  '法令纹 — nasolabial folds',
  '耳垂 — earlobe',
  '骨相 — bone structure',
  '气色 — complexion / vitality hue',
  '气血 / 敛 / 浮阳 / 敛浮阳 — TCM lexicon for pacing (not diagnosis)',
  '生命线 / 智慧线 / 感情线 / 事业线 — major palm lines',
  '金星丘 / 木星丘 / 土星丘 / 太阳丘 / 水星丘 / 月丘 / 火星丘 — mounts',
  '日主 / 用神 / 大运 / 流年 — natal contrast tokens',
].join('\n')

const FACEORACLE_WRITER_HINTS_JA = [
  '形气 — 形と気（漢字のまま残す）',
  '气机 — 気の流れ・動態',
  '宜留意 — 留意すべき点（運命の断定ではない）',
  '三停 / 五岳 / 十二宫 — 面相の区分',
  '天庭 / 印堂 / 山根 / 额宽 / 颧骨 / 法令纹 / 耳垂 / 骨相 — 位点',
  '气色 / 气血 / 敛 / 浮阳 — 中医の「象」語彙（診治ではない）',
  '生命线 / 智慧线 / 感情线 / 事业线 — 主紋',
  '金星丘…火星丘 — 丘位',
  '日主 / 用神 / 大运 / 流年 — 命盤対照',
].join('\n')

/** English tokens that must not appear in zh user-facing prose. */
export const FACEORACLE_ZH_ENGLISH_DENYLIST = [
  'future',
  'tension',
  'palm',
  'support',
  'caution',
  'main',
  'reef',
  'remedy',
  'overview',
  'horizon',
  'natal',
  'dynamic',
  'evidence',
  'golden',
  'chapter',
  'locus',
  'mount',
  'line',
  'window',
] as const

export function buildFaceoracleLanguageBlock(locale: string): string {
  const { code, name, isCjkOutput } = resolveFaceoracleOutputLang(locale)

  if (isCjkOutput) {
    return [
      '',
      `## Output language — ${name} (${code})`,
      `所有面向用户的 JSON 文本字段必须使用${name}书写。JSON 字段名保持英文。`,
      code === 'zh-TW'
        ? '使用繁體中文（台灣/港澳用字），不要輸出簡體字。'
        : '使用简体中文。',
      '禁止在任何中文文本字段中夹杂英文单词或英文句式（禁止 future / tension / palm / support / caution / main / reef 等）。',
      '禁止用英文标签起句（如 "Palm tension…"、"Future…"）。JSON 键名除外。',
      '术语可用原词（天庭、气机、用神…）；首次可用白话承接，勿堆砌不加解释的文言口号。',
      '语气：警示与预告——「形上可见…，气机上宜留意…（窗口）」。不作命运断语。',
      '负面窗口用「节奏 / 内修参考」包装，但仍须点名具体位点与日期；禁止空泛鸡汤。',
      '健康轴：用形气与古典中医意象做警示对照（气色/气血/敛浮阳等「象」），不作诊治。',
      '事业 / 爱情 / 健康三轴必须在 events 与 advice 中各至少出现一次（用中文写轴名含义，勿写英文轴标签）。',
      '只输出纯 JSON。',
    ].join('\n')
  }

  const termHints = code === 'ja' ? FACEORACLE_WRITER_HINTS_JA : FACEORACLE_WRITER_HINTS_EN

  return [
    '',
    `## Cross-lingual output — ${name} (${code}) — Yuel-aligned`,
    'Internal reasoning may use Chinese metaphysics vocabulary.',
    'ALL user-facing JSON string values (goldenLine, evidence, dynamic, reef, remedy, counterpoint,',
    'overview, faceSection, palm*Section, natalContrast, periodDiff, advice, events.theme, events.note,',
    'AND every loci[].locus + loci[].reading)',
    `MUST be written in ${name}. JSON keys stay English.`,
    '',
    '### 命理 / 形气 terms — keep Chinese characters; meaning in the prose',
    '- Write load-bearing terms in Chinese characters ONLY: 天庭, 印堂, 山根, 生命线, 金星丘, 日主, 用神, 大运, 流年, 形气, 气机, 八字…',
    '- NEVER romanize as the primary word ("tiāntíng", "Qi Sha", "San He" are FORBIDDEN in output).',
    '- Carry the MEANING in the surrounding sentence: e.g. "the upper forehead shows lift (天庭)" — NOT "tiāntíng (forehead)".',
    '- Sparse: a few Chinese terms per paragraph max. Sentences must read fully without knowing 命理.',
    '- The app shows tap-to-explain gloss — do not invent English coinages for classical terms.',
    '',
    '### Hard negatives',
    `- Do NOT write full Simplified/Traditional Chinese sentences when locale is ${code}.`,
    '- Do NOT leave a chapter field as bare Chinese with no target-language prose.',
    '- Do NOT produce one-word generic advice (“stay balanced”, “keep healthy”) as a whole field.',
    '',
    '### Writer glossary (model-only; pinyin must NOT appear in JSON)',
    termHints,
    '',
    '### Tone (paid brief — not free chatty photo reading)',
    code === 'ja'
      ? '警告・予告の観察調。漢字術語はそのまま。断定運勢を避ける。具体的な宮位・線・日付は残す。'
      : [
          'Sharp cultural brief. Every paragraph must name at least one locus or dated window.',
          'Prefer concrete pressure over “balanced / steady / grounded” filler.',
          'Pattern: form shows X at [汉字 locus]; qi worth noting Y (window). Never guaranteed fate.',
        ].join(' '),
    code === 'ja'
      ? '健康軸：形気と古典中医の意象で警告的対照。診治ではない。'
      : 'Health axis: form-qi plus classical TCM imagery as cautionary contrast — not diagnosis.',
    '',
    'Output pure JSON only.',
  ].join('\n')
}

/** Short reminder appended to each user prompt (recency bias). */
export function buildFaceoracleLanguageReminder(locale: string): string {
  const { code, name, isCjkOutput } = resolveFaceoracleOutputLang(locale)
  if (isCjkOutput) {
    return [
      '',
      `【语言 — 严守】全部面向用户的 JSON 字符串必须用${name}。`,
      '禁止夹杂英文词（future / tension / palm / support / caution / main / reef 等）。',
      '术语用汉字原词；白话承接含义。只输出纯 JSON。',
    ].join('\n')
  }
  if (code === 'ja') {
    return [
      '',
      '【出力言語 — 厳守】JSON の文章はすべて自然な日本語。',
      '命理・形気の専門用語（天庭・生命线・用神・大运 等）は漢字のまま残す——ローマ字化・英訳造語禁止。',
      'アプリがタップ解説を表示する。純 JSON のみ。',
    ].join('\n')
  }
  return [
    '',
    `OUTPUT LANGUAGE — CRITICAL: all user-facing JSON prose in ${name}.`,
    'KEEP 形气/命理 terms in Chinese characters (天庭, 生命线, 用神…). Do NOT romanize.',
    'Meaning in English around the term; app provides tap gloss. Pure JSON only.',
  ].join('\n')
}

/**
 * Rough CJK ratio of chapter/event prose — used to reject drifted English jobs.
 * Includes Han + kana (so Japanese also scores high — do NOT use alone for ja).
 */
export function faceoracleCjkRatio(text: string): number {
  if (!text) return 0
  const cjk = text.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
  const letters = text.replace(/\s/g, '').length
  if (letters < 24) return 0
  return cjk / letters
}

/** Hiragana + katakana share of non-whitespace chars (Japanese signal). */
export function faceoracleKanaRatio(text: string): number {
  if (!text) return 0
  const kana = text.match(/[\u3040-\u30ff]/g)?.join('').length ?? 0
  const letters = text.replace(/\s/g, '').length
  if (letters < 24) return 0
  return kana / letters
}

/** Latin letters share of non-whitespace chars (English leakage signal). */
export function faceoracleLatinRatio(text: string): number {
  if (!text) return 0
  const latin = text.match(/[A-Za-z]/g)?.join('').length ?? 0
  const letters = text.replace(/\s/g, '').length
  if (letters < 24) return 0
  return latin / letters
}

/** True if a short field is mostly CJK (catches a Chinese goldenLine inside an English body). */
export function faceoracleFieldLooksCjk(text: string): boolean {
  const t = text.trim()
  if (t.length < 8) return false
  const cjk = t.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
  const letters = t.replace(/\s/g, '').length
  if (letters === 0) return false
  return cjk / letters > 0.4
}

/** True if a short field is mostly Latin (English leakage inside a Japanese body). */
export function faceoracleFieldLooksLatin(text: string): boolean {
  const t = text.trim()
  if (t.length < 12) return false
  const latin = t.match(/[A-Za-z]/g)?.join('').length ?? 0
  const letters = t.replace(/\s/g, '').length
  if (letters === 0) return false
  return latin / letters > 0.55
}

/** zh body contains banned English craft tokens or too much Latin. */
export function faceoracleZhLooksEnglishLeaky(sampleText: string): boolean {
  if (!sampleText || sampleText.trim().length < 20) return false
  const lower = sampleText.toLowerCase()
  for (const w of FACEORACLE_ZH_ENGLISH_DENYLIST) {
    const re = new RegExp(`(?:^|[^a-z])${w}(?:[^a-z]|$)`, 'i')
    if (re.test(lower)) return true
  }
  // Whole-body Latin ratio (catches multi-word English phrases).
  return faceoracleLatinRatio(sampleText) > 0.08
}

/**
 * Whole-body locale drift. Language-split:
 * - zh: English token / Latin leakage
 * - en: CJK ratio too high → Chinese leakage
 * - ja: Latin-heavy (English) OR Han-heavy without kana (Chinese)
 */
export function faceoracleBodyLooksWrongLocale(locale: string, sampleText: string): boolean {
  const { code, isCjkOutput } = resolveFaceoracleOutputLang(locale)
  if (isCjkOutput) return faceoracleZhLooksEnglishLeaky(sampleText)
  if (code === 'ja') {
    const latin = faceoracleLatinRatio(sampleText)
    const cjk = faceoracleCjkRatio(sampleText)
    const kana = faceoracleKanaRatio(sampleText)
    if (latin > 0.5) return true
    if (cjk > 0.3 && kana < 0.05) return true
    return false
  }
  return faceoracleCjkRatio(sampleText) > 0.18
}

/**
 * Per-field guard — a single Chinese goldenLine inside otherwise-English chapters
 * used to pass the whole-body ratio check. For ja, only flag Latin-dominant
 * fields. For zh, flag Latin-dominant fields / denylist hits.
 */
export function faceoracleFieldsLookWrongLocale(
  locale: string,
  fields: readonly string[]
): boolean {
  const { code, isCjkOutput } = resolveFaceoracleOutputLang(locale)
  if (isCjkOutput) {
    return fields.some((f) => faceoracleZhLooksEnglishLeaky(f) || faceoracleFieldLooksLatin(f))
  }
  if (code === 'ja') {
    return fields.some((f) => faceoracleFieldLooksLatin(f))
  }
  return fields.some((f) => faceoracleFieldLooksCjk(f))
}
