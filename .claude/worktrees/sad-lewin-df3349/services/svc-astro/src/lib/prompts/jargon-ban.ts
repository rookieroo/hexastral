/**
 * Jargon ban list — terms that must NOT appear naked in user-facing output.
 *
 * Each banned term carries alarming or fatalistic connotations for modern users
 * unfamiliar with classical metaphysics. The replacements preserve the underlying
 * meaning in accessible, psychologically-grounded language.
 *
 * Enforcement: injected via `buildJargonBanSection()` into every system prompt.
 */

interface BannedTerm {
  /** Original classical Chinese term */
  term: string
  /** Psychological / behavioral equivalent */
  replacement: string
}

export const JARGON_BAN_LIST: BannedTerm[] = [
  { term: '八字', replacement: '命格分析' },
  { term: '紫微斗数', replacement: '星宫格局' },
  { term: '紫微', replacement: '星宫' },
  { term: '七杀', replacement: '突破型能量 / 将帅格局' },
  { term: '羊刃', replacement: '锋芒爆发期 / 执行力高度集中' },
  { term: '空亡', replacement: '能量蛰伏期 / 内修积累阶段' },
  { term: '伤官见官', replacement: '个性与规则的张力时期' },
  { term: '自坐', replacement: '自我驱动型格局' },
  { term: '起运', replacement: '大运开启' },
  { term: '交运', replacement: '大运交接期' },
  { term: '绝命', replacement: '最大挑战方位 / 需谨慎能量方向' },
  { term: '五鬼', replacement: '内部摩擦能量 / 内耗倾向' },
  { term: '六煞', replacement: '关系消耗期 / 人际摩擦节点' },
  { term: '祸害', replacement: '障碍积聚节点 / 需要疏导的能量' },
  { term: '孤辰', replacement: '独立成长能量 / 自主型人格' },
  { term: '寡宿', replacement: '内在独立倾向 / 自给自足格局' },
  { term: '克妻', replacement: '感情高消耗能量模式' },
  { term: '克夫', replacement: '关系主导型能量格局' },
  { term: '伤官', replacement: '创新突破能量 / 个性表达驱力' },
]

/**
 * Builds the jargon ban guardrail section for system prompts.
 * Informs the LLM which terms to rephrase and how.
 */
export function buildJargonBanSection(): string {
  const entries = JARGON_BAN_LIST.map(
    (item) => `  - 禁止在用户文本中使用「${item.term}」→ 改用「${item.replacement}」或其心理/行为等价描述`,
  ).join('\n')

  return [
    '## 术语替换铁律（用户可见文本中严格执行）',
    '内部推理可使用命理原术语，但最终 JSON 输出的所有用户文本字段必须使用以下替代表达：',
    entries,
    '（唯一例外：输出语言为中文且 isPro=true 时，可在替代描述后括号标注原术语，如"突破型能量（七杀）"）',
  ].join('\n')
}
