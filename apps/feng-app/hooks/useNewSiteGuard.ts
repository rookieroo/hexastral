/**
 * Step guards for (new-site) — redirect when prerequisite draft fields are missing.
 */

import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { normalizeResidenceType } from '@/lib/feng-pricing-client'
import { loadDraft, type SiteDraft } from '@/lib/siteDraft'

export type NewSiteGuardStep = 'building' | 'floorplan' | 'review'

function hasAddressFields(d: SiteDraft): boolean {
  return (
    typeof d.lat === 'number' &&
    typeof d.lng === 'number' &&
    typeof d.formattedAddress === 'string' &&
    d.formattedAddress.length > 0 &&
    typeof d.facingDegTrue === 'number' &&
    typeof d.magneticDeclination === 'number'
  )
}

function hasBuildingFields(d: SiteDraft): boolean {
  if (!d.buildYearAccuracy) return false
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

/** Returns true once the draft passes guards for `step`. Redirects otherwise. */
export function useNewSiteGuard(step: NewSiteGuardStep): boolean {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const d = await loadDraft()
      if (!hasAddressFields(d)) {
        router.replace('/(new-site)/address')
        return
      }
      if ((step === 'floorplan' || step === 'review') && !hasBuildingFields(d)) {
        router.replace('/(new-site)/building')
        return
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [router, step])

  return ready
}
