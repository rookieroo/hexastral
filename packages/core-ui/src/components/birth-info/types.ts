/**
 * Shared types for the BirthInfoForm flow.
 *
 * See docs/birth-info-form-spec.md for the contract this package implements.
 */

import type { LunarDate } from '@zhop/astro-core'
import type { ReactNode } from 'react'
import type { CityRecord } from '../CityPicker'
import type { ShichenIndex } from '../ShichenPicker'

export type BirthInfoStep = 'date' | 'time' | 'gender' | 'place' | 'review'

export interface BirthInfoValue {
  /** ISO 8601 date YYYY-MM-DD. Always solar (server-canonical). */
  solarDate: string
  /** Lunar date if the user entered lunar; echo-back for the review screen.
   *  Uses the existing `LunarDate` from `@zhop/astro-core`. */
  lunarDate?: LunarDate
  /** 0–11 shichen index, or null if user skipped. */
  timeIndex: ShichenIndex | null
  /** 男 / 女 — 八字 mandates one. */
  gender: '男' | '女'
  /** Localized city name for review display. */
  city: string
  /** Decimal lat / lng + IANA timezone — required for 真太阳时 correction. */
  lat: number
  lng: number
  timezone: string
}

export interface BirthInfoCopy {
  dateTitle: string
  dateSubtitle?: string
  dateSolarLabel: string
  dateLunarLabel: string

  timeTitle: string
  timeSubtitle?: string
  timeSkipLabel: string

  genderTitle: string
  genderSubtitle?: string
  genderMale: string
  genderFemale: string

  placeTitle: string
  placeSubtitle?: string
  placeSearchPlaceholder: string

  reviewTitle: string
  reviewSubtitle?: string
  reviewLabels: {
    solarDate: string
    lunarDate: string
    timeIndex: string
    gender: string
    city: string
  }
  reviewTimeUnknown: string
  reviewSubmit: string
  reviewSubmitLoading: string
  reviewEditCue: string

  next: string
}

export interface BirthInfoFormProps {
  /** Existing draft (resume) or empty (fresh entry). */
  value: Partial<BirthInfoValue>
  /** Called on each step's commit — caller persists into its draft store. */
  onChange: (next: Partial<BirthInfoValue>) => void
  /** Called when the user taps Submit on the review screen. */
  onSubmit: (final: BirthInfoValue) => Promise<void> | void
  /** Per-app brand accent (required). Examples: yuan cinnabar `#9B2226`,
   *  feng copper `#B08D5B`, hexastral mono falls back to `colors.text`. */
  accent: string
  /** Optional decorative element rendered above the first step's title. */
  crown?: ReactNode
  /** Localized strings — apps pass their own; defaults provided in
   *  `defaultCopy.ts` for `en` / `zh`. */
  copy: BirthInfoCopy
  /** Geocode search callback — same shape as CityPicker's `search` prop. */
  searchCity: (query: string) => Promise<CityRecord[]>
  /** Optional top-cities offline fallback. */
  topCities?: CityRecord[]
  /** Locale forwarded to CityPicker + DateTimePicker. */
  locale?: string
  /** Skip specific steps. E.g. yuan fill-other passes ['review']. */
  skipSteps?: BirthInfoStep[]
}

/** Props shared by every step component. */
export interface BirthStepProps {
  value: Partial<BirthInfoValue>
  onChange: (next: Partial<BirthInfoValue>) => void
  onNext: () => void
  accent: string
  copy: BirthInfoCopy
  step: number
  totalSteps: number
  crown?: ReactNode
  locale?: string
}
