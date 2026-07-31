/**
 * Fatalistic / fearmongering phrase ban — NOT a classical-term wipe.
 *
 * Route B (Yuel/Syel): load-bearing 汉字 terms (七杀、八字、日主…) stay in
 * output; meaning lives in surrounding plain prose + app tap-gloss.
 * This list only blocks ironclad / fearmongering / relationship-harm labels
 * that should never appear naked in user-facing text.
 *
 * Enforcement: injected via `buildJargonBanSection()` into system prompts.
 */

interface BannedTerm {
  /** Phrase that must not appear naked */
  term: string
  /** Psychological / behavioral equivalent */
  replacement: string
}

/** Only fearmongering / ironclad-adjacent labels — classical craft terms are allowed. */
export const JARGON_BAN_LIST: BannedTerm[] = [
  { term: '绝命', replacement: '最大挑战方位 / 需谨慎的能量方向' },
  { term: '五鬼', replacement: '内部摩擦能量 / 内耗倾向' },
  { term: '六煞', replacement: '关系消耗期 / 人际摩擦节点' },
  { term: '祸害', replacement: '障碍积聚节点 / 需要疏导的能量' },
  { term: '克妻', replacement: '感情高消耗能量模式' },
  { term: '克夫', replacement: '关系主导型能量格局' },
  { term: '孤辰', replacement: '独立成长能量 / 自主型人格' },
  { term: '寡宿', replacement: '内在独立倾向 / 自给自足格局' },
]

/**
 * Builds the jargon ban guardrail section for system prompts.
 */
export function buildJargonBanSection(): string {
  const entries = JARGON_BAN_LIST.map(
    (item) =>
      `  - 禁止在用户文本中使用「${item.term}」→ 改用「${item.replacement}」或其心理/行为等价描述`
  ).join('\n')

  return [
    '## 恐吓/定论措辞禁令（用户可见文本）',
    '命理原术语（七杀、八字、日主、刑冲…）可以汉字原词保留，并用白话承接含义。',
    '以下恐吓或关系伤害定论措辞不得原样出现：',
    entries,
  ].join('\n')
}
