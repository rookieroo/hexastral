/**
 * i18n keys for report chapter slugs — shared by History and Report screens.
 */

import type { ChapterSlug } from '@/lib/hooks/useReportManifestQuery'
import type { TranslationKeys } from '@/lib/i18n'

export const REPORT_CHAPTER_TITLE_KEYS: Record<ChapterSlug, TranslationKeys> = {
  ch1_personality: 'report_ch1_title',
  ch2_dimensions_static: 'report_ch2_title',
  ch2_dimensions_dynamic: 'report_ch2_title',
  ch3_stellar: 'report_ch3_title',
  ch4_timeline: 'report_ch4_title',
  ch5_hidden: 'report_ch5_title',
  ch6_action: 'report_ch6_title',
}
