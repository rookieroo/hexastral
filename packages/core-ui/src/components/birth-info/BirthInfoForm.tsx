/**
 * BirthInfoForm — the composite 5-step + review flow.
 *
 * Default flow: date → time → gender → place → review.
 *
 * State machine:
 *   - Holds the active step internally (no router needed).
 *   - Each step calls `onNext()` to advance; review's edit shortcut calls
 *     `onEdit(step)` to jump backward.
 *   - Every commit flows through the parent via `onChange(partial)` so the
 *     parent can persist into AsyncStorage / its draft store.
 *   - Submit is parent-driven via `onSubmit(final)` — the form does not
 *     navigate post-submit; the parent decides where to go next.
 *
 * Apps that want a different ordering or want to skip a step (e.g. yuan
 * fill-other passing `skipSteps={['review']}`) can compose the individual
 * step exports directly instead of using this composite.
 */

import { useCallback, useState } from 'react'
import { BirthDateStep } from './BirthDateStep'
import { BirthGenderStep } from './BirthGenderStep'
import { BirthPlaceStep } from './BirthPlaceStep'
import { BirthReviewStep } from './BirthReviewStep'
import { BirthTimeStep } from './BirthTimeStep'
import type { BirthInfoFormProps, BirthInfoStep, BirthInfoValue } from './types'

const DEFAULT_ORDER: ReadonlyArray<BirthInfoStep> = ['date', 'time', 'gender', 'place', 'review']

export function BirthInfoForm({
  value,
  onChange,
  onSubmit,
  accent,
  crown,
  copy,
  searchCity,
  topCities,
  locale,
  skipSteps,
  requireTime,
  placeOptional,
  timeInputStyle,
  allowPreciseTime,
}: BirthInfoFormProps) {
  const order = DEFAULT_ORDER.filter((s) => !skipSteps?.includes(s))
  const [current, setCurrent] = useState<BirthInfoStep>(order[0] ?? 'date')

  // When user uses "EDIT" on the review screen we jump back to that step,
  // but their next advance should return to review — NOT walk forward through
  // the remaining steps. `returnTo` holds that pending jump.
  const [returnTo, setReturnTo] = useState<BirthInfoStep | null>(null)

  const advance = useCallback(() => {
    if (returnTo) {
      const target = returnTo
      setReturnTo(null)
      setCurrent(target)
      return
    }
    setCurrent((cur) => {
      const idx = order.indexOf(cur)
      const next = order[idx + 1]
      return next ?? cur
    })
  }, [order, returnTo])

  const editStep = useCallback(
    (target: BirthInfoStep) => {
      if (!order.includes(target)) return
      setReturnTo('review')
      setCurrent(target)
    },
    [order]
  )

  const stepNum = order.indexOf(current) + 1
  const totalSteps = order.length

  const sharedProps = {
    value,
    onChange,
    onNext: advance,
    accent,
    copy,
    step: stepNum,
    totalSteps,
    locale,
    requireTime,
    placeOptional,
    timeInputStyle,
    allowPreciseTime,
  }

  switch (current) {
    case 'date':
      return <BirthDateStep {...sharedProps} crown={crown} />
    case 'time':
      return <BirthTimeStep {...sharedProps} searchCity={searchCity} topCities={topCities} />
    case 'gender':
      return <BirthGenderStep {...sharedProps} />
    case 'place':
      return <BirthPlaceStep {...sharedProps} searchCity={searchCity} topCities={topCities} />
    case 'review':
      return (
        <BirthReviewStep
          {...sharedProps}
          skipSteps={skipSteps}
          onEdit={editStep}
          onSubmit={async (final: BirthInfoValue) => {
            await onSubmit(final)
          }}
        />
      )
  }
}
