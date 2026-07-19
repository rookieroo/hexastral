/**
 * FaceOracle locale block — Route B parity with svc-astro i18n-prompt.
 * Reasoning may use Chinese metaphysics terms; all user-facing JSON prose
 * must be native in the target locale.
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

/** Glossary presentation for non-zh locales (Route B). */
const FACEORACLE_TERM_HINTS_EN = [
  '形气 → xíngqì (形气) — form–qi / physiognomic presence',
  '气机 → qìjī (气机) — flow of qi / dynamic tendency',
  '宜留意 → yí liúyì (宜留意) — worth noting (not fate)',
  '三停 → sāntíng (三停) — three facial zones',
  '五岳 → wǔyuè (五岳) — five facial “mountains”',
  '十二宫 → shí’èrgōng (十二宫) — twelve facial palaces',
  '日主 → rìzhǔ (日主) — day master',
  '用神 → yòngshén (用神) — useful god / balancing element',
  '大运 → dàyùn (大运) — decade luck',
  '流年 → liúnián (流年) — year luck',
].join('\n')

const FACEORACLE_TERM_HINTS_JA = [
  '形气 → 形気（けいき）— 形と気の現れ',
  '气机 → 気機（きき）— 気の流れ・動態',
  '宜留意 → 留意すべき点（運命の断定ではない）',
  '三停 → 三停 — 顔の上中下三区分',
  '五岳 → 五岳 — 顔の五つの「山」',
  '十二宫 → 十二宮 — 顔の十二宮位',
  '日主 → 日主 — 日柱の干',
  '用神 → 用神 — バランスを取る要素',
  '大运 → 大運 — 十年運',
  '流年 → 流年 — 年運',
].join('\n')

export function buildFaceoracleLanguageBlock(locale: string): string {
  const { code, name, isCjkOutput } = resolveFaceoracleOutputLang(locale)

  if (isCjkOutput) {
    return [
      '',
      `## Output language — ${name} (${code})`,
      `所有面向用户的 JSON 文本字段必须使用${name}书写。JSON 字段名保持英文。`,
      code === 'zh-TW'
        ? '使用繁體中文（台灣/港澳用字），不要輸出簡體字。'
        : '使用简体中文，不要夹杂英文整句。',
      '术语可用原词；正文必须是完整句子，禁止只有标签或口号。',
      '语气：警示与预告——「形上可见…，气机上宜留意…（窗口）」。不作命运断语。',
      '负面窗口用「节奏 / 内修参考」包装，但仍须点名具体位点与日期；禁止空泛鸡汤替代 citations。',
      '健康轴：非医疗诊断；可谈气色与起居节奏；必要时一句宜咨询专业医师。',
      '事业 / 爱情 / 健康三轴必须在 events 与 advice 中各至少出现一次。',
      '只输出纯 JSON。',
    ].join('\n')
  }

  const termHints = code === 'ja' ? FACEORACLE_TERM_HINTS_JA : FACEORACLE_TERM_HINTS_EN

  return [
    '',
    `## Cross-lingual output — ${name} (${code})`,
    'Internal reasoning may use Chinese metaphysics vocabulary (your strongest reasoning corpus).',
    `ALL user-facing JSON string values (goldenLine, evidence, dynamic, reef, remedy, counterpoint,`,
    `overview, faceSection, palm*Section, natalContrast, periodDiff, advice, events.theme, events.note)`,
    `MUST be written in ${name}. JSON keys stay English.`,
    '',
    '### Hard negatives',
    `- Do NOT write Simplified or Traditional Chinese sentences when locale is ${code}.`,
    '- Do NOT leave any chapter field in Chinese. Glossary tokens may appear once as',
    '  “romanization (汉字) — short gloss”, then surrounding prose stays in the target language.',
    '- Do NOT produce one-word generic advice (“stay balanced”, “keep healthy”) as a whole field.',
    '',
    '### Glossary presentation (Route B)',
    termHints,
    '',
    '### Tone',
    code === 'ja'
      ? '警告・予告の観察調。「形に見える…、気の流れでは留意…」。断定運勢を避ける。具体的な宮位・線・日付は残す。空虚な励ましで代替しない。'
      : 'Warning + foreshadowing study tone. Pattern: “form shows…; qi-flow worth noting… (window).” Never guaranteed fate. Keep named loci and dated windows — do not replace them with empty pep talk.',
    code === 'ja'
      ? '健康軸は医療診断ではない。气色・生活リズムのみ。必要なら専門医への相談を一行。'
      : 'Health axis is non-medical: complexion and pacing only; optionally one line to consult a clinician.',
    'Glossary: after first “romanization (汉字) — gloss”, reuse the romanization or English gloss — do not repeat messy bilingual half-terms.',
    '',
    'Output pure JSON only.',
  ].join('\n')
}

/**
 * Rough CJK ratio of chapter/event prose — used to reject drifted English/Japanese jobs.
 */
export function faceoracleCjkRatio(text: string): number {
  if (!text) return 0
  const cjk = text.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
  const letters = text.replace(/\s/g, '').length
  if (letters < 24) return 0
  return cjk / letters
}

export function faceoracleBodyLooksWrongLocale(
  locale: string,
  sampleText: string
): boolean {
  const { isCjkOutput } = resolveFaceoracleOutputLang(locale)
  if (isCjkOutput) return false
  return faceoracleCjkRatio(sampleText) > 0.35
}
