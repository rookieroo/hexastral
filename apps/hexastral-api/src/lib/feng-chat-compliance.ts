/**
 * Kanyu chat compliance — post-LLM audit + safe refusal when feng-forbidden
 * phrases slip through svc-astro guardrails.
 */
import { auditFengSynthesisHits } from '@zhop/portfolio-voice'

/** Localized refusal when auditFengSynthesisHits trips on a chat reply. */
export function fengChatComplianceRefusal(locale: string | null | undefined): string {
  const tag = (locale ?? 'zh').toLowerCase()
  if (tag.startsWith('ja')) {
    return '申し訳ありません。この製品では金蟾・文昌塔などの霊物や「開運」目的の置物はお勧めしません。レポートの普通の設え・家具配置の参照のみご利用ください（文化学習用）。'
  }
  if (tag.startsWith('zh-hant') || tag === 'zh-tw') {
    return '抱歉，這類靈物或「改運」擺件不在本產品的建議範圍內。請參考報告中的普通陳設與家具移位建議，僅供文化研習參照。'
  }
  if (tag.startsWith('zh')) {
    return '抱歉，这类灵物或「改运」摆件不在本产品的建议范围内。请参考报告中的普通陈设与家具移位建议，仅供文化研习参照。'
  }
  return 'Sorry — talismans and luck-changing objects are outside what this product recommends. Please use the report\'s ordinary furnishing and layout suggestions only (cultural study, not professional advice).'
}

export function auditFengChatReply(text: string): { blocked: boolean; hits: ReturnType<typeof auditFengSynthesisHits> } {
  const hits = auditFengSynthesisHits(text)
  return { blocked: hits.length > 0, hits }
}
