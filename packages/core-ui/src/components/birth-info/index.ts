/**
 * Birth-info entry — unified multi-step flow for collecting 八字 birth data.
 *
 * See docs/birth-info-form-spec.md for the full design contract and
 * docs/decisions/0008-three-layer-architecture.md §"What to do with
 * existing over-extracted packages" for the rationale for putting this
 * in core-ui instead of a per-scenario package.
 */

export {
  type BirthCalendar,
  BirthDateField,
  type BirthDateFieldLabels,
  type BirthDateFieldProps,
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
  formatBirthDateInput,
} from './BirthDateField'
export { BirthDateStep } from './BirthDateStep'
export { BirthGenderStep } from './BirthGenderStep'
export { BirthInfoForm } from './BirthInfoForm'
export { BirthPlaceStep } from './BirthPlaceStep'
export {
  BirthProgressIndicator,
  type BirthProgressIndicatorProps,
} from './BirthProgressIndicator'
export { BirthReviewStep } from './BirthReviewStep'
export { BirthTimeStep } from './BirthTimeStep'
export { birthInfoCopyForLocale } from './defaultCopy'
export { type LunarDateValue, LunarDateWheels } from './LunarDateWheels'
export type {
  BirthInfoCopy,
  BirthInfoFormProps,
  BirthInfoStep,
  BirthInfoValue,
  BirthStepProps,
} from './types'
