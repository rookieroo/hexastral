/**
 * @zhop/astro-i18n — explanations type definitions
 *
 * 解释字典与 labelize 字典分离：
 * - labelize: 将原始 token 转为目标语言短标签
 * - explainTerm: 提供该 token 的一句话教学解释（≤80 字符）
 */

import type { TokenCategory } from './types'

export type ExplanationDict = Partial<Record<TokenCategory, Record<string, string>>>
