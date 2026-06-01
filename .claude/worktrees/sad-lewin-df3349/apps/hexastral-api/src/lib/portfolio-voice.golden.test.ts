import { describe, expect, it } from 'bun:test'
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
})
