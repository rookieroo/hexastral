/**
 * Draft quality assessment for (new-site)/review — blockers vs soft warnings.
 */

import { normalizeResidenceType } from '@/lib/feng-pricing-client'
import type { SiteDraft } from '@/lib/siteDraft'

export type DraftQualitySeverity = 'block' | 'warn'

export type DraftQualityIssueId =
  | 'incomplete'
  | 'flat_floor'
  | 'build_year'
  | 'move_in_year'
  | 'unknown_build'
  | 'no_floorplan'
  | 'facing_unconfirmed'
  | 'floorplan_orient_unconfirmed'
  | 'orient_facing_mismatch'
  | 'apartment_floor_missing'

export interface DraftQualityIssue {
  id: DraftQualityIssueId
  severity: DraftQualitySeverity
}

function hasBaseFields(d: SiteDraft): boolean {
  return (
    typeof d.lat === 'number' &&
    typeof d.lng === 'number' &&
    typeof d.formattedAddress === 'string' &&
    d.formattedAddress.length > 0 &&
    typeof d.facingDegTrue === 'number' &&
    typeof d.magneticDeclination === 'number' &&
    !!d.buildYearAccuracy
  )
}

/** Hard requirements to create a site (extends base location/facing fields). */
export function isDraftReady(
  d: SiteDraft
): d is Required<
  Pick<
    SiteDraft,
    | 'lat'
    | 'lng'
    | 'formattedAddress'
    | 'facingDegTrue'
    | 'magneticDeclination'
    | 'buildYearAccuracy'
  >
> &
  SiteDraft {
  if (!hasBaseFields(d)) return false
  const residence = normalizeResidenceType(d.residenceType)
  if (residence === 'flat' && typeof d.floor !== 'number') return false
  if (
    (d.buildYearAccuracy === 'exact' || d.buildYearAccuracy === 'decade') &&
    typeof d.buildYear !== 'number'
  ) {
    return false
  }
  if (d.buildYearAccuracy === 'moveIn' && typeof d.moveInYear !== 'number') return false
  return true
}

function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function orientFacingDeltaDeg(orientDeg: number, facingDeg: number): number {
  const delta = Math.abs(normDeg(orientDeg - facingDeg))
  return Math.min(delta, 360 - delta)
}

/** Review-screen issues — blockers prevent submit; warnings are informational. */
export function assessDraftQuality(d: SiteDraft): DraftQualityIssue[] {
  const issues: DraftQualityIssue[] = []

  if (!hasBaseFields(d)) {
    issues.push({ id: 'incomplete', severity: 'block' })
    return issues
  }

  const residence = normalizeResidenceType(d.residenceType)
  if (residence === 'flat' && typeof d.floor !== 'number') {
    issues.push({ id: 'flat_floor', severity: 'block' })
  }
  if (
    (d.buildYearAccuracy === 'exact' || d.buildYearAccuracy === 'decade') &&
    typeof d.buildYear !== 'number'
  ) {
    issues.push({ id: 'build_year', severity: 'block' })
  }
  if (d.buildYearAccuracy === 'moveIn' && typeof d.moveInYear !== 'number') {
    issues.push({ id: 'move_in_year', severity: 'block' })
  }

  if (d.buildYearAccuracy === 'unknown') {
    issues.push({ id: 'unknown_build', severity: 'warn' })
  }
  if (!d.floorplanImages?.length) {
    issues.push({ id: 'no_floorplan', severity: 'warn' })
  }
  if (!d.facingConfirmed) {
    issues.push({ id: 'facing_unconfirmed', severity: 'block' })
  }
  if (d.floorplanImages?.length && !d.floorplanOrientConfirmed) {
    issues.push({ id: 'floorplan_orient_unconfirmed', severity: 'block' })
  }
  if (
    d.floorplanImages?.length &&
    typeof d.floorplanOrientDeg === 'number' &&
    typeof d.facingDegTrue === 'number' &&
    orientFacingDeltaDeg(d.floorplanOrientDeg, d.facingDegTrue) > 30
  ) {
    issues.push({ id: 'orient_facing_mismatch', severity: 'block' })
  }
  if (residence === 'apartment' && d.floor == null) {
    issues.push({ id: 'apartment_floor_missing', severity: 'warn' })
  }

  return issues
}

export function hasDraftBlockers(issues: DraftQualityIssue[]): boolean {
  return issues.some((i) => i.severity === 'block')
}
