import { describe, expect, it } from 'bun:test'
import { buildComplianceInstructionBlock } from '@zhop/portfolio-voice'
import { buildChatSystemPrompt } from './chat'

describe('svc-astro prompt compliance snapshots', () => {
  it('chat system prompt includes compliance block and avoids fortune-teller framing', () => {
    const prompt = buildChatSystemPrompt({
      locale: 'zh',
      context: {
        user: { name: 'Test', locale: 'zh', birthInfo: null, plan: 'free' },
        primary: { type: 'pair', text: 'Sample synastry excerpt.' },
        related: [],
        memory: { context: '', hitCount: 0 },
      },
    })
    expect(prompt).toContain('合规与口吻')
    expect(prompt).toContain('不是预测')
    expect(prompt).not.toContain('AI 命理师')
    expect(prompt).not.toContain('本月运势')
  })

  it('buildComplianceInstructionBlock covers en locale', () => {
    const block = buildComplianceInstructionBlock('en')
    expect(block).toContain('entertainment')
    expect(block).toContain('NOT prediction')
  })

  it('feng chat uses the feng persona, not the generic fate advisor', () => {
    const prompt = buildChatSystemPrompt({
      locale: 'zh',
      context: {
        user: { name: 'Test', locale: 'zh', birthInfo: null, plan: 'free' },
        primary: { type: 'feng', text: 'Sample feng report excerpt.' },
        related: [],
        memory: { context: '', hitCount: 0 },
      },
    })
    expect(prompt).toContain('堪舆')
    expect(prompt).toContain('灵物')
    expect(prompt).not.toContain('面相气场三个独立维度')
  })

  it('forbids JSON / markdown fences and locks simplified Chinese for zh', () => {
    const prompt = buildChatSystemPrompt({
      locale: 'zh',
      context: {
        user: { name: 'Test', locale: 'en', birthInfo: null, plan: 'free' },
        primary: { type: 'physiognomy', text: 'Sample face reading.' },
        related: [],
        memory: { context: '', hitCount: 0 },
      },
    })
    expect(prompt).toContain('禁止 Markdown 代码块')
    expect(prompt).toContain('请用简体中文回答')
    expect(prompt).not.toContain('Please reply in English')
  })
})
