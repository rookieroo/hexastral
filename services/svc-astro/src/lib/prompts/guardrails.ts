/**
 * Enhanced guardrails for svc-astro system prompts.
 *
 * Quality nudges only — no compliance checklist in the prompt.
 * Hard-forbidden phrases are audited post-generation (portfolio-voice).
 */

import { buildJargonBanSection } from './jargon-ban'

const DEFAULT_CLOSING_MOTTO = '观照自身，自强不息'

/**
 * @param closingMotto - Sign-off motto (can be domain-specific)
 * @param _locale - Kept for call-site compatibility; unused (no compliance block)
 */
export function buildEnhancedGuardrails(
  closingMotto = DEFAULT_CLOSING_MOTTO,
  _locale = 'zh'
): string {
  return [
    '## Writing bar',
    '- 命盘锚点 + 近窗与后半场大运带 + 可执行一步；完整段落，不要短句清单。',
    '- 真话优先，要有 aha；空心好话与圆滑均衡 = 失败。',
    `- 收束给能动性（"${closingMotto}"），但不要用鼓励把短板说没。`,
    '',
    buildJargonBanSection(),
  ].join('\n')
}

export function buildEnhancedCrisisFraming(): string {
  return [
    '## 短板写法',
    '- 先点名机制与可能翻车的场景，再给可执行缓冲。',
    '- 不要用「成长机遇」把痛点说没；真话在前。',
  ].join('\n')
}
