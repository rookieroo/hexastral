import { describe, expect, it } from 'bun:test'
import {
  assessDraftQuality,
  hasDraftBlockers,
  isDraftReady,
  type DraftQualityIssueId,
} from './draft-quality'
import type { SiteDraft } from './siteDraft'

function baseDraft(overrides: Partial<SiteDraft> = {}): SiteDraft {
  return {
    lat: 22.28,
    lng: 114.16,
    formattedAddress: 'Test Address, Hong Kong',
    facingDegTrue: 180,
    magneticDeclination: -2,
    buildYearAccuracy: 'exact',
    buildYear: 2010,
    facingConfirmed: true,
    residenceType: 'apartment',
    floor: 12,
    ...overrides,
  }
}

function issueIds(issues: ReturnType<typeof assessDraftQuality>): DraftQualityIssueId[] {
  return issues.map((i) => i.id)
}

describe('assessDraftQuality', () => {
  it('returns incomplete blocker when base fields missing', () => {
    const issues = assessDraftQuality({})
    expect(issueIds(issues)).toEqual(['incomplete'])
    expect(hasDraftBlockers(issues)).toBe(true)
  })

  it('blocks flat without floor number', () => {
    const issues = assessDraftQuality(
      baseDraft({ residenceType: 'flat', floor: undefined })
    )
    expect(issues.some((i) => i.id === 'flat_floor' && i.severity === 'block')).toBe(true)
  })

  it('blocks exact/decade build year without buildYear', () => {
    for (const buildYearAccuracy of ['exact', 'decade'] as const) {
      const issues = assessDraftQuality(
        baseDraft({ buildYearAccuracy, buildYear: undefined })
      )
      expect(issues.some((i) => i.id === 'build_year' && i.severity === 'block')).toBe(true)
    }
  })

  it('blocks moveIn accuracy without moveInYear', () => {
    const issues = assessDraftQuality(
      baseDraft({ buildYearAccuracy: 'moveIn', buildYear: undefined, moveInYear: undefined })
    )
    expect(issues.some((i) => i.id === 'move_in_year' && i.severity === 'block')).toBe(true)
  })

  it('warns on unknown build year accuracy', () => {
    const issues = assessDraftQuality(
      baseDraft({ buildYearAccuracy: 'unknown', buildYear: undefined })
    )
    expect(issues.some((i) => i.id === 'unknown_build' && i.severity === 'warn')).toBe(true)
    expect(hasDraftBlockers(issues)).toBe(false)
  })

  it('warns when no floor plan uploaded', () => {
    const issues = assessDraftQuality(baseDraft({ floorplanImages: undefined }))
    expect(issues.some((i) => i.id === 'no_floorplan' && i.severity === 'warn')).toBe(true)
  })

  it('blocks when facing not confirmed', () => {
    const issues = assessDraftQuality(baseDraft({ facingConfirmed: false }))
    expect(issues.some((i) => i.id === 'facing_unconfirmed' && i.severity === 'block')).toBe(true)
  })

  it('blocks floor plan without orient confirmation', () => {
    const issues = assessDraftQuality(
      baseDraft({
        floorplanImages: [{ key: 'fp-1' }],
        floorplanOrientConfirmed: false,
      })
    )
    expect(
      issues.some((i) => i.id === 'floorplan_orient_unconfirmed' && i.severity === 'block')
    ).toBe(true)
  })

  it('blocks orient vs facing mismatch over 30 degrees', () => {
    const issues = assessDraftQuality(
      baseDraft({
        floorplanImages: [{ key: 'fp-1' }],
        floorplanOrientConfirmed: true,
        floorplanOrientDeg: 0,
        facingDegTrue: 90,
      })
    )
    expect(issues.some((i) => i.id === 'orient_facing_mismatch' && i.severity === 'block')).toBe(
      true
    )
  })

  it('warns apartment without floor (non-blocking)', () => {
    const issues = assessDraftQuality(
      baseDraft({ residenceType: 'apartment', floor: undefined })
    )
    expect(
      issues.some((i) => i.id === 'apartment_floor_missing' && i.severity === 'warn')
    ).toBe(true)
    expect(hasDraftBlockers(issues)).toBe(false)
  })

  it('clean draft has no blockers', () => {
    const issues = assessDraftQuality(baseDraft())
    expect(hasDraftBlockers(issues)).toBe(false)
  })
})

describe('isDraftReady', () => {
  it('requires flat floor and build year when accuracy demands it', () => {
    expect(isDraftReady(baseDraft())).toBe(true)
    expect(isDraftReady(baseDraft({ residenceType: 'flat', floor: undefined }))).toBe(false)
    expect(
      isDraftReady(baseDraft({ buildYearAccuracy: 'moveIn', moveInYear: 2022, buildYear: undefined }))
    ).toBe(true)
  })
})
