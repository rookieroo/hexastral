/**
 * Chat content moderation (App Store 1.2 — AI/UGC objectionable-content filter).
 *
 * A deterministic, bilingual (zh/en) heuristic net applied to BOTH the user's
 * message (before the LLM) and the AI reply (before persist/return). It is a
 * coarse first line — the LLM provider's own safety is the second — but it
 * satisfies the "method for filtering objectionable content" requirement and
 * blocks the clearly-egregious categories without a network call.
 *
 * Tuned conservative to avoid false-positives on legit 风水/命理 questions
 * (财位, 化煞, 桃花位 etc. are fine — only intent + explicit terms trip it).
 */

export type ModerationCategory =
  | 'sexual_minors'
  | 'sexual'
  | 'hate_violence'
  | 'self_harm'
  | 'illicit'

export interface ModerationResult {
  allowed: boolean
  category?: ModerationCategory
}

// Each category: patterns that, if matched, block. Kept narrow + explicit.
const RULES: ReadonlyArray<{ category: ModerationCategory; patterns: RegExp[] }> = [
  {
    // Highest priority — any sexual content involving minors.
    category: 'sexual_minors',
    patterns: [
      /\b(child|minor|underage|pre-?teen|loli|shota)\b[^.\n]{0,40}\b(sex|porn|nude|naked|fuck)/i,
      /\b(sex|porn|nude|naked|fuck)\b[^.\n]{0,40}\b(child|minor|underage|kid|pre-?teen)/i,
      /(儿童|未成年|幼女|幼童|萝莉)[^。\n]{0,20}(性|裸|色情|强奸|做爱)/,
    ],
  },
  {
    category: 'self_harm',
    patterns: [
      /\b(how|best way|easiest way)\b[^.\n]{0,30}\b(kill myself|suicide|end my life|hang myself)/i,
      /(怎么|如何|最好的方法)[^。\n]{0,15}(自杀|自尽|结束自己|了结自己)/,
    ],
  },
  {
    category: 'illicit',
    patterns: [
      /\bhow to\b[^.\n]{0,30}\b(make|build|synthesi[sz]e)\b[^.\n]{0,30}\b(bomb|meth|explosive|nerve agent|ricin)/i,
      /(怎么|如何)[^。\n]{0,15}(制作|制造|合成)[^。\n]{0,15}(炸弹|冰毒|毒品|爆炸物|神经毒)/,
    ],
  },
  {
    category: 'hate_violence',
    patterns: [
      /\b(kill|murder|exterminate|gas)\b[^.\n]{0,20}\b(all|every)\b[^.\n]{0,20}\b(jews|muslims|blacks|gays|women)\b/i,
      /(杀光|灭绝|消灭)[^。\n]{0,10}(所有|全部)?[^。\n]{0,6}(犹太|黑人|穆斯林|同性恋)/,
    ],
  },
  {
    category: 'sexual',
    patterns: [
      /\b(write|generate|describe)\b[^.\n]{0,30}\b(explicit|graphic)\b[^.\n]{0,20}\b(sex|porn|erotica)/i,
      /(写|生成|描述)[^。\n]{0,15}(露骨|色情|情色)[^。\n]{0,10}(小说|内容|场景)/,
    ],
  },
]

/** Screen a chunk of text. Returns the first tripped category, if any. */
export function screenChatText(text: string): ModerationResult {
  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(text)) return { allowed: false, category: rule.category }
    }
  }
  return { allowed: true }
}

/** Localized safe refusal shown in place of a blocked message/reply. */
export function moderationRefusal(locale: string | null | undefined): string {
  const l = (locale ?? 'zh').toLowerCase()
  if (l.startsWith('ja')) {
    return 'ご質問にはお答えできません。風水・命理に関する内容でお気軽にどうぞ。'
  }
  if (l.startsWith('en')) {
    return "I can't help with that. Feel free to ask anything about your feng-shui reading."
  }
  return '抱歉，这个问题我无法回答。欢迎就你的风水报告提出任何疑问。'
}
