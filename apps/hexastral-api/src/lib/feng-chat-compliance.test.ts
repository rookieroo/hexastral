import { describe, expect, it } from 'bun:test'
import { auditFengChatReply, fengChatComplianceRefusal } from './feng-chat-compliance'

describe('feng chat compliance', () => {
  it('blocks talisman phrases', () => {
    const { blocked, hits } = auditFengChatReply('建议在门口放一只金蟾，增强财气。')
    expect(blocked).toBe(true)
    expect(hits.some((h) => h.pattern === '金蟾')).toBe(true)
  })

  it('allows ordinary furnishing advice', () => {
    const { blocked } = auditFengChatReply('巽宫可放绿植与书架，传统上认为有助于空间节奏。')
    expect(blocked).toBe(false)
  })

  it('refusal is localized', () => {
    expect(fengChatComplianceRefusal('zh')).toContain('灵物')
    expect(fengChatComplianceRefusal('en')).toContain('talismans')
  })
})
