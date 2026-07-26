/**
 * Feng prose locale gate — FaceOracle ratios with classical-term whitelist.
 */

const CLASSICAL_KEEP =
  /山\s*[1-9]\s*向\s*[1-9]|[坎艮震巽离離坤兑兌乾]|旺山旺向|替卦|下卦|兼向|飞星|飛星|八宅|形煞|来龙|來龍|水口|二五交加|文昌|交剑|斗牛/g

function scrubClassical(text: string): string {
  return text.replace(CLASSICAL_KEEP, ' ')
}

export function fengCjkRatio(text: string): number {
  const scrubbed = scrubClassical(text)
  if (!scrubbed) return 0
  const cjk = scrubbed.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.join('').length ?? 0
  const letters = scrubbed.replace(/\s/g, '').length
  if (letters < 24) return 0
  return cjk / letters
}

export function fengKanaRatio(text: string): number {
  if (!text) return 0
  const kana = text.match(/[\u3040-\u30ff]/g)?.join('').length ?? 0
  const letters = text.replace(/\s/g, '').length
  if (letters < 24) return 0
  return kana / letters
}

export function fengLatinRatio(text: string): number {
  if (!text) return 0
  const latin = text.match(/[A-Za-z]/g)?.join('').length ?? 0
  const letters = text.replace(/\s/g, '').length
  if (letters < 24) return 0
  return latin / letters
}

/**
 * True when body looks wrong for the requested locale.
 * - en: CJK ratio > 0.18 after scrubbing classical terms
 * - ja: Latin > 0.5 OR (CJK > 0.3 && kana < 0.05)
 * - zh*: always ok for this gate (portfolio-voice handles EN leak separately)
 */
export function fengBodyLooksWrongLocale(locale: string, sampleText: string): boolean {
  if (!sampleText || sampleText.trim().length < 24) return false
  if (locale.startsWith('zh')) return false
  if (locale.startsWith('ja')) {
    const latin = fengLatinRatio(sampleText)
    const cjk = fengCjkRatio(sampleText)
    const kana = fengKanaRatio(sampleText)
    if (latin > 0.5) return true
    if (cjk > 0.3 && kana < 0.05) return true
    return false
  }
  // en (default for non-zh/ja)
  return fengCjkRatio(sampleText) > 0.18
}

export function fengChaptersLocaleOk(
  locale: string,
  chapters: Array<{ title: string; goldenLine: string; body: string }>
): { ok: true } | { ok: false; rewriteSuffix: string } {
  const blob = chapters.map((c) => `${c.title}\n${c.goldenLine}\n${c.body}`).join('\n')
  if (!fengBodyLooksWrongLocale(locale, blob)) return { ok: true }
  return {
    ok: false,
    rewriteSuffix: `\n\nREWRITE REQUIRED — locale=${locale}: rewrite ALL chapter prose in the target language. Keep classical 汉字 terms (山N向M, 八卦宫, 格局名) but surrounding sentences must match locale.`,
  }
}
