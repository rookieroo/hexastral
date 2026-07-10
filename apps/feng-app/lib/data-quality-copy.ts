/**
 * Map machine-readable dataQuality.notes to user-facing closing-page bullets.
 */

import type { Strings } from '@/lib/i18n'

export function humanizeDataQualityNotes(notes: string[], t: Strings): string[] {
  const lines: string[] = []
  const seen = new Set<string>()

  const push = (line: string) => {
    if (seen.has(line)) return
    seen.add(line)
    lines.push(line)
  }

  for (const note of notes) {
    if (note === 'floorplan=false') {
      push(t.dq_no_floorplan)
      continue
    }
    if (note.startsWith('flying_stars_omitted=') || note === 'build_year=unknown') {
      push(t.dq_build_year_unknown)
      continue
    }
    if (note === 'birth_profile=false') {
      push(t.dq_no_birth_profile)
      continue
    }
    if (note.startsWith('pin_offset_m=')) {
      push(t.dq_pin_offset)
      continue
    }
    if (note.startsWith('orient_facing_delta_deg=')) {
      push(t.dq_orient_facing_delta)
      continue
    }
    if (note === 'apartment_floor_missing=true (street form less relevant above ground)') {
      push(t.dq_apartment_floor_missing)
      continue
    }
    if (note === 'flat_floor_missing=true (street 形煞 attenuation skipped)') {
      push(t.dq_flat_floor_missing)
      continue
    }
    if (note === 'terrain.flat_urban=true (砂/水 chapters scoped to direction-only)') {
      push(t.dq_flat_urban)
      continue
    }
    if (note.startsWith('residence_heuristic_mismatch=')) {
      push(t.dq_residence_mismatch)
      continue
    }
  }

  return lines
}

export function formatLaiLongLine(palace: string, t: Strings): string {
  return t.report_lai_long.replace('{palace}', palace)
}
