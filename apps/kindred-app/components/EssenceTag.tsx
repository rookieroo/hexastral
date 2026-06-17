/**
 * EssenceTag — the relationship's 静态本质 as a small 意象 chip, replacing the
 * blunt numeric compatibility score on the threads list + home.
 *
 * Founder note (2026-06): "列表页很直接的打分(53)有时候这有点伤人,是否采用另外
 * 一套标准…比如生克平三种意象". A bare 0–100 reads as a verdict on a person; the
 * three fixed essences (相生 / 比和 / 相克) read as a *relationship shape* — and
 * 克 is softened by naming its 解法 (通关), so even a clash says "there is a way
 * through", never "you scored low".
 *
 * The finer "from → to" dynamic (the founder's optional deeper read) is carried
 * by the report's InkCenterpiece morph, not crammed into a list row.
 *
 * Essence derivation is the SAME source of truth as the centerpiece
 * (`elementRelation`), so the chip and the ink never disagree.
 */

import { kindredDark, kindredPaper } from '@zhop/hexastral-tokens/kindred'
import { isCjkLocale, kindredFonts } from '@zhop/scenario-kindred'
import { Text, View } from 'react-native'
import { elementRelation, hasValidElements, type Relation } from '@/components/ink/InkCenterpiece'
import { resolveLocale } from '@/lib/i18n'

interface EssenceCopy {
  label: string
  /** 解法 hint — only the clashing essence carries one ("there is a way through"). */
  remedy: string | null
  tone: 'warm' | 'neutral' | 'soft'
}

const COPY_CJK: Record<Relation, EssenceCopy> = {
  generate: { label: '相生', remedy: null, tone: 'warm' },
  peer: { label: '比和', remedy: null, tone: 'neutral' },
  overcome: { label: '相克', remedy: '通关', tone: 'soft' },
}

const COPY_EN: Record<Relation, EssenceCopy> = {
  generate: { label: 'Generative', remedy: null, tone: 'warm' },
  peer: { label: 'Resonant', remedy: null, tone: 'neutral' },
  overcome: { label: 'Tempering', remedy: 'a path', tone: 'soft' },
}

const TONE_COLOR_DARK: Record<EssenceCopy['tone'], string> = {
  warm: kindredDark.accent,
  neutral: kindredDark.text,
  soft: kindredDark.textSecondary,
}

const TONE_COLOR_PAPER: Record<EssenceCopy['tone'], string> = {
  warm: kindredPaper.cinnabar,
  neutral: kindredPaper.ink,
  soft: kindredPaper.inkSoft,
}

export interface EssenceTagProps {
  aElement?: string | null
  bElement?: string | null
  /** Defaults to the app locale; pass to avoid a redundant resolve in a list. */
  locale?: string
  /** Render with paper-document ink colors (the home/list are 宣纸 now). */
  onPaper?: boolean
  /** List context — show only the essence word, no 解法 sub-line. A thread row needs
   *  one scannable signal; the remedy (通关 / "a path") is detail that belongs in the
   *  report, not stacked under a list item. */
  compact?: boolean
}

/**
 * Renders null when elements are missing/legacy — callers fall back to their
 * own affordance (a chevron on the list, nothing on the home row).
 */
export function EssenceTag({ aElement, bElement, locale, onPaper, compact }: EssenceTagProps) {
  if (!hasValidElements(aElement ?? undefined, bElement ?? undefined)) return null
  const lc = locale ?? resolveLocale()
  const cjk = isCjkLocale(lc)
  const relation = elementRelation(aElement ?? undefined, bElement ?? undefined)
  const copy = (cjk ? COPY_CJK : COPY_EN)[relation]
  const serif = cjk ? kindredFonts.cjk : kindredFonts.serif
  const tone = onPaper ? TONE_COLOR_PAPER : TONE_COLOR_DARK
  const remedyColor = onPaper ? kindredPaper.muted : kindredDark.textMuted

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text
        style={{
          fontFamily: serif,
          fontSize: cjk ? 17 : 15,
          letterSpacing: cjk ? 2 : 0.3,
          color: tone[copy.tone],
        }}
      >
        {copy.label}
      </Text>
      {copy.remedy && !compact ? (
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 9.5,
            letterSpacing: cjk ? 1.5 : 0.5,
            marginTop: 2,
            color: remedyColor,
          }}
        >
          {copy.remedy}
        </Text>
      ) : null}
    </View>
  )
}
