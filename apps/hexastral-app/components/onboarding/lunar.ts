import type { solarToLunar } from '@zhop/astro-core/lunar'
import type { TranslationKeys } from '@/lib/i18n'

export function getLocalizedLunarText(
  ld: ReturnType<typeof solarToLunar>,
  t: (k: TranslationKeys) => string
) {
  const animalIdx = ((((ld.year - 4) % 60) + 60) % 60) % 12
  const animal = t(`ob_animal_${animalIdx}` as TranslationKeys)
  const fmt = t((ld.isLeap ? 'ob_lunar_fmt_leap' : 'ob_lunar_fmt') as TranslationKeys)
  return fmt
    .replace('{year}', String(ld.year))
    .replace('{ganZhi}', ld.yearGanZhi ?? '')
    .replace('{animal}', animal)
    .replace('{monthName}', ld.monthName ?? String(ld.month))
    .replace('{dayName}', ld.dayName ?? String(ld.day))
    .replace('{month}', String(ld.month))
    .replace('{day}', String(ld.day))
}
