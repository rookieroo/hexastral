import { describe, expect, it } from 'bun:test'
import { auditFengSynthesisHits } from '@zhop/portfolio-voice'
import golden from './portfolio-voice-golden.json'
import { auditInterpretationAgainstForbiddenList } from './portfolio-voice-spec'

describe('portfolio voice golden set', () => {
  it('allows gentle Daoist phrasing', () => {
    for (const text of golden.passagesShouldHaveNoForbiddenHits) {
      expect(auditInterpretationAgainstForbiddenList(text)).toEqual([])
    }
  })

  it('flags coercive / medical doom samples', () => {
    for (const text of golden.passagesExpectedToFailAudit) {
      expect(auditInterpretationAgainstForbiddenList(text).length).toBeGreaterThan(0)
    }
  })

  it('allows compliant feng synthesis phrasing', () => {
    for (const text of golden.fengPassagesShouldHaveNoForbiddenHits) {
      expect(auditFengSynthesisHits(text)).toEqual([])
    }
  })

  it('flags feng talisman / outcome-promise samples', () => {
    for (const text of golden.fengPassagesExpectedToFailAudit) {
      expect(auditFengSynthesisHits(text).length).toBeGreaterThan(0)
    }
  })
})
