/**
 * Minimal draft shape for BirthForm city patches (self prefix only).
 * No bonds / partner fields — Xingqi is a solo physiognomy funnel.
 */

export interface OnboardingDraft {
  selfBirthCity: string
  selfBirthLat: number | null
  selfBirthLng: number | null
  selfBirthTimezone: string | null
}
