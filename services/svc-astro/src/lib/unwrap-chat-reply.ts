/**
 * Normalize chat LLM output into plain prose for the mobile bubble.
 *
 * Models sometimes emit ```json {"response":"..."} ``` (habit from structured
 * report endpoints). Chat must never surface that envelope to the user.
 */

import { extractJson } from './extract-json'

const PROSE_KEYS = ['response', 'reply', 'answer', 'message', 'content', 'text'] as const

function proseFromObject(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  for (const key of PROSE_KEYS) {
    const v = o[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/**
 * If `raw` is a JSON envelope or fenced JSON with a known prose key, return the
 * inner string; otherwise return the trimmed original.
 */
export function unwrapChatReply(raw: string): string {
  const text = raw.trim()
  if (!text) return text

  const fullFence = text.match(/^```(?:json|JSON)?\s*([\s\S]*?)```\s*$/)
  const candidate = (fullFence?.[1] ?? text).trim()

  if (candidate.startsWith('{')) {
    try {
      const fromBare = proseFromObject(JSON.parse(candidate) as unknown)
      if (fromBare) return fromBare
    } catch {
      // fall through to extractJson
    }
  }

  const extracted = extractJson(text)
  if (extracted) {
    try {
      const fromExtracted = proseFromObject(JSON.parse(extracted) as unknown)
      if (fromExtracted) return fromExtracted
    } catch {
      // keep original
    }
  }

  return text
}
