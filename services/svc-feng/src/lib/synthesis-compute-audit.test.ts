import { describe, expect, test } from 'bun:test'
import { auditSynthesisAgainstCompute } from './synthesis-compute-audit'

describe('synthesis-compute-audit', () => {
  test('passes when room mentions match roomFindings', () => {
    const result = auditSynthesisAgainstCompute(
      [
        {
          kind: 'personal_fit',
          title: '室内',
          goldenLine: '主卧宜静',
          body: '客厅与主卧的飞星组合需留意。',
        },
      ],
      {
        roomFindings: [{ roomType: '主卧' }, { roomType: '客厅' }],
        patterns: [{ kind: '双星到向' }],
      }
    )
    expect(result.ok).toBe(true)
  })

  test('fails when synthesis cites a room not in roomFindings', () => {
    const result = auditSynthesisAgainstCompute(
      [
        {
          kind: 'personal_fit',
          title: '室内',
          goldenLine: '注意书房',
          body: '书房门不宜对灶。',
        },
      ],
      { roomFindings: [{ roomType: '客厅' }], patterns: [] }
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.violations.some((v) => v.term === '书房')).toBe(true)
      expect(result.rewriteSuffix).toContain('书房')
    }
  })
})
