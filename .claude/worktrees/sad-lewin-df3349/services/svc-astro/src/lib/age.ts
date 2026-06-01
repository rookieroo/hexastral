/**
 * Age utilities for prompt personalisation.
 *
 * Computes user age from a YYYY-M-D solar birth date and maps it to a
 * named bracket that drives advice framing in all LLM prompts.
 */

export type AgeBracket = 'youth' | 'prime' | 'midlife' | 'mature' | 'elder'

const BRACKET_LABELS: Record<AgeBracket, string> = {
  youth: '青年期 (18-25)',
  prime: '壮年期 (26-35)',
  midlife: '中年期 (36-50)',
  mature: '成熟期 (51-65)',
  elder: '晚年期 (65+)',
}

const BRACKET_FRAMING: Record<AgeBracket, string> = {
  youth: '侧重事业起步、感情探索与自我定位，建议富有朝气、激励性强',
  prime: '侧重事业冲刺、财富积累与家庭建立，建议务实进取',
  midlife: '侧重家庭平衡、职场迭代与健康维护，建议稳健兼顾',
  mature: '侧重财富传承、健康养生与人生智慧，建议深远通透',
  elder: '侧重精神修养、家族传承与生命意义，建议温暖豁达',
}

/**
 * Calculate age in full years from a solar birth date string (YYYY-M-D or YYYY-MM-DD).
 * Uses April 15, 2026 as the reference date when today is unavailable.
 */
export function calculateAge(solarBirthDate: string, today = new Date()): number {
  const parts = solarBirthDate.split('-').map(Number)
  const birthYear = parts[0] ?? 1990
  const birthMonth = parts[1] ?? 1
  const birthDay = parts[2] ?? 1

  let age = today.getFullYear() - birthYear
  const monthDiff = today.getMonth() + 1 - birthMonth
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age--
  }
  return Math.max(0, age)
}

export function getAgeBracket(age: number): AgeBracket {
  if (age < 26) return 'youth'
  if (age < 36) return 'prime'
  if (age < 51) return 'midlife'
  if (age < 66) return 'mature'
  return 'elder'
}

/**
 * Build a standardised "用户画像" prompt block injected into every SKU prompt.
 *
 * @param solarBirthDate - YYYY-M-D (from chart or birth info)
 * @param language       - resolved language code (e.g. 'zh-CN', 'en', 'ko')
 */
export function buildAgeLanguageBlock(solarBirthDate: string, language: string): string {
  const age = calculateAge(solarBirthDate)
  const bracket = getAgeBracket(age)
  return [
    '## 用户画像',
    `- 年龄：${age}岁（${BRACKET_LABELS[bracket]}）`,
    `- 语言：${language}`,
    `- 解读侧重：${BRACKET_FRAMING[bracket]}`,
    '',
    '请根据以上年龄段与语言，调整建议的侧重点和表达方式。',
  ].join('\n')
}
