/**
 * Defensive JSON extraction from LLM output text.
 *
 * Handles common LLM response formats:
 * - Bare JSON object
 * - JSON wrapped in ```json ... ``` markdown fences
 * - JSON preceded by explanatory text ("Here is the analysis:\n{...}")
 * - Trailing garbage after closing brace
 *
 * Uses non-greedy approach: finds the first `{` and matches to its balanced `}`.
 * More reliable than greedy /\{[\s\S]*\}/ which can fail on nested objects
 * when the LLM emits extra text after the JSON.
 */
export function extractJson(text: string): string | null {
  // Strip markdown fences first
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()

  const source = stripped.length > 0 ? stripped : text

  // Find the first opening brace
  const start = source.indexOf('{')
  if (start === -1) return null

  // Walk forward tracking brace depth
  let depth = 0
  let inString = false
  let escapeNext = false

  for (let i = start; i < source.length; i++) {
    const ch = source[i]!

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (ch === '\\' && inString) {
      escapeNext = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return source.slice(start, i + 1)
      }
    }
  }

  // Unbalanced — fall back to greedy match on original text
  const fallback = text.match(/\{[\s\S]*\}/)
  return fallback?.[0] ?? null
}
