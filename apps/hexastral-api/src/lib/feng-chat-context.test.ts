import { describe, expect, it } from 'bun:test'
import { buildFengChatPrimaryText } from './feng-chat-context'

const MINIMAL_COMPUTE = {
  flyingStars: {
    sitMountain: { name: '子' },
    faceMountain: { name: '午' },
    buildYuanYun: { yuanYun: 8 },
    currentYuanYun: { yuanYun: 9 },
    chartMethod: '下卦',
  },
  patterns: [{ kind: '双星会向', quality: 'auspicious' }],
  baZhai: { concord: { verdict: '宅命相配', concordant: true } },
  formLi: {
    palaces: [
      {
        palace: '巽',
        findings: [{ verdict: '旺财', reason: 'test' }],
      },
    ],
  },
}

describe('buildFengChatPrimaryText', () => {
  it('appends sit/face, patterns, and form-li lines', () => {
    const text = buildFengChatPrimaryText(
      '[{"kind":"flying_stars","title":"玄空","goldenLine":"g","body":"b"}]',
      JSON.stringify(MINIMAL_COMPUTE),
      JSON.stringify({ flyingStarsConfidence: 'high' })
    )
    expect(text).toContain('坐子向午')
    expect(text).toContain('双星会向')
    expect(text).toContain('宅命相配')
    expect(text).toContain('巽·旺财')
    expect(text).toContain('AUTHORITATIVE')
  })

  it('surfaces non-high flying-star confidence', () => {
    const text = buildFengChatPrimaryText(
      '[]',
      JSON.stringify(MINIMAL_COMPUTE),
      JSON.stringify({ flyingStarsConfidence: 'low' })
    )
    expect(text).toContain('飞星置信: low')
  })
})
