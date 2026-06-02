/**
 * Gender display adapter
 *
 * DB/API/types store gender as '男'|'女' (Chinese canonical).
 * This helper maps to locale-specific display strings via i18n keys.
 */

import type { TranslationKeys } from '@/locales/zh'

type Gender = '男' | '女'

/**
 * Get localized gender display string.
 *
 * @param gender - '男' or '女' from DB/API
 * @param t - Translation function from useI18n()
 * @returns Localized string (e.g. "Male", "男", "남성")
 */
export function genderLabel(gender: Gender, t: (key: TranslationKeys) => string): string {
  return gender === '男' ? t('gender_male') : t('gender_female')
}
