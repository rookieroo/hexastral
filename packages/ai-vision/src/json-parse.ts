/**
 * Best-effort parse of model JSON (vision / chat structured output).
 * Models often emit trailing commas, markdown fences, or truncated objects.
 */

import { stripThinking } from './router'

function stripMarkdownFence(text: string): string {
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(text.trim())
  return fenced?.[1]?.trim() ?? text.trim()
}

/** Common model slip: trailing commas before } or ]. */
function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, '$1')
}

/**
 * Fix unescaped newlines / control chars inside JSON string values (best-effort).
 * Does not attempt full JSON5 — only patterns that frequently break Gemini Flash.
 */
function escapeControlCharsInStrings(text: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (escaped) {
      out += ch
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      out += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }
    if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
      if (ch === '\n') out += '\\n'
      else if (ch === '\r') out += '\\r'
      else out += '\\t'
      continue
    }
    out += ch
  }
  return out
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Parse a model JSON blob into an object. Throws if all repair attempts fail.
 */
export function parseModelJsonObject<T>(raw: string): T {
  const cleaned = stripMarkdownFence(stripThinking(raw))
  const candidates = [
    cleaned,
    stripTrailingCommas(cleaned),
    escapeControlCharsInStrings(stripTrailingCommas(cleaned)),
  ]

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const sliced = cleaned.slice(start, end + 1)
    candidates.push(sliced, stripTrailingCommas(sliced), escapeControlCharsInStrings(stripTrailingCommas(sliced)))
  }

  for (const c of candidates) {
    const parsed = tryParse<T>(c)
    if (parsed && typeof parsed === 'object') return parsed
  }

  throw new Error(`vlm_invalid_json:${cleaned.slice(0, 160)}`)
}
