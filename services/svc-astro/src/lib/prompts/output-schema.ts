/**
 * Output schema helpers — shared across all svc-astro AI prompts.
 *
 * All reading schemas include a mandatory `shareQuote` field:
 *   - ≤20 chars in the target locale
 *   - Punchy, viral-optimized one-liner for social sharing cards
 *   - No fortune prediction or fate claim
 *   - Distinct from `summary` (which is a reading summary); shareQuote is
 *     crafted specifically for hexastral-app's share card UI
 */

/**
 * Inline JSON comment for the `shareQuote` field in prompt output schemas.
 * Paste this into the JSON template string for the LLM to see.
 *
 * @param locale - Target locale code (e.g. 'en', 'zh-CN')
 */
export function buildShareQuoteFieldDescription(locale: string): string {
  const isZh = locale.startsWith('zh')
  if (isZh) {
    return '"shareQuote": "社交分享金句（≤20字，朗朗上口，不含吉凶断言，适合截图分享卡片——类似\'木火通明，热烈绽放\'）"'
  }
  return '"shareQuote": "social sharing quote (≤20 chars, punchy tagline for share card — like \'Fire meets Wood: unstoppable growth\'. No fate/fortune claim)"'
}

/**
 * Validation rule appended to prompt instructions for shareQuote enforcement.
 */
export function buildShareQuoteRule(locale: string): string {
  const isZh = locale.startsWith('zh')
  if (isZh) {
    return '- shareQuote 必须 ≤20字：像品牌口号或广告语，扎心且正能量，禁止包含"必然"、"注定"等宿命词汇'
  }
  return '- shareQuote must be ≤20 chars: like a brand tagline — punchy and empowering, never "you are destined to..." or "fate says..."'
}
