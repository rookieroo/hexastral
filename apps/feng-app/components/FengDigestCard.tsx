/**
 * FengDigestCard — qualitative report summary (格局 / 宅命 / 外局 chips + headline).
 *
 * No percentile score. Chips and headline are derived deterministically from
 * `deriveReportDigest()` — the same 沈氏 compute the chapters narrate.
 */

import {
  deriveReportDigest,
  patternQualityTone,
  type DigestFocusItem,
  type DigestHeadline,
  type DigestPattern,
  type DigestTone,
  type FengComputeJson,
  type ReportDigest,
} from '@zhop/scenario-feng'
import { Text, View } from 'react-native'
import type { Strings } from '@/lib/i18n'
import { FENG_PAPER, spacing } from '@/lib/theme'

const PAPER = {
  bg: FENG_PAPER.sheet,
  ink: FENG_PAPER.ink,
  inkSoft: FENG_PAPER.inkSoft,
  bronze: FENG_PAPER.bronze,
  cinnabar: FENG_PAPER.cinnabar,
  hair: FENG_PAPER.hair,
}

const TONE_COLOR: Record<DigestTone, string> = {
  accent: PAPER.bronze,
  neutral: PAPER.inkSoft,
  caution: PAPER.cinnabar,
  danger: PAPER.cinnabar,
}

function patternChipLabel(pattern: DigestPattern, t: Strings): string {
  if (pattern.kind === '平局') return t.digest_pattern_ping
  if (pattern.rescued === true) {
    return t.digest_pattern_rescued.replace('{pattern}', pattern.kind)
  }
  if (pattern.rescued === false) {
    return t.digest_pattern_unrescued.replace('{pattern}', pattern.kind)
  }
  return pattern.kind
}

function exteriorChipLabel(exterior: ReportDigest['exterior'], t: Strings): string {
  if (exterior.tier === 'clean') return t.digest_exterior_clean
  if (exterior.tier === 'sha_heavy') {
    return t.digest_exterior_sha.replace('{count}', String(exterior.shaCount))
  }
  return t.digest_exterior_sha_light.replace('{count}', String(exterior.shaCount))
}

function concordChipLabel(concord: ReportDigest['concord'], t: Strings): string | null {
  if (concord === 'matched') return t.digest_concord_matched
  if (concord === 'mismatched') return t.digest_concord_mismatched
  return null
}

function focusLine(item: DigestFocusItem, t: Strings): string {
  return t.digest_focus_line
    .replace('{palace}', item.palace)
    .replace('{verdict}', item.verdict)
}

function headlineText(headline: DigestHeadline, t: Strings): string {
  switch (headline.type) {
    case 'pattern_rescue':
      return headline.rescued
        ? t.digest_headline_pattern_rescued.replace('{pattern}', headline.pattern)
        : t.digest_headline_pattern_unrescued.replace('{pattern}', headline.pattern)
    case 'focus':
      return t.digest_headline_focus
        .replace('{palace}', headline.palace)
        .replace('{verdict}', headline.verdict)
    case 'exterior_sha':
      return t.digest_headline_exterior_sha.replace('{count}', String(headline.count))
    case 'concord_mismatch':
      return t.digest_headline_concord_mismatch
    case 'ping':
      return t.digest_headline_ping
  }
}

function chartIdentityLine(digest: ReportDigest, t: Strings): string {
  return t.digest_chart_line
    .replace('{sit}', digest.chartLine.sitMountain)
    .replace('{face}', digest.chartLine.faceMountain)
    .replace('{buildYuan}', String(digest.chartLine.buildYuan))
    .replace('{currentYuan}', String(digest.chartLine.currentYuan))
    .replace('{method}', digest.chartLine.chartMethod)
}

function DigestChip({ label, tone }: { label: string; tone: DigestTone }) {
  const color = TONE_COLOR[tone]
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  )
}

export interface FengDigestCardProps {
  digest: ReportDigest
  t: Strings
  /** List row — chips only, no headline block. */
  compact?: boolean
}

export function FengDigestCard({ digest, t, compact }: FengDigestCardProps) {
  const concordLabel = concordChipLabel(digest.concord, t)
  const confidenceNote =
    digest.confidence === 'high' || digest.confidence === 'omitted'
      ? null
      : digest.confidence === 'medium'
        ? t.digest_confidence_medium
        : t.digest_confidence_low

  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: PAPER.hair,
        backgroundColor: PAPER.bg,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      {!compact ? (
        <Text style={{ color: PAPER.inkSoft, fontSize: 12, lineHeight: 18 }}>
          {chartIdentityLine(digest, t)}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        <DigestChip
          label={patternChipLabel(digest.pattern, t)}
          tone={patternQualityTone(digest.pattern.quality)}
        />
        {concordLabel ? (
          <DigestChip
            label={concordLabel}
            tone={digest.concord === 'matched' ? 'accent' : 'caution'}
          />
        ) : null}
        <DigestChip
          label={exteriorChipLabel(digest.exterior, t)}
          tone={
            digest.exterior.tier === 'clean'
              ? 'neutral'
              : digest.exterior.tier === 'sha_light'
                ? 'caution'
                : 'danger'
          }
        />
        {confidenceNote ? (
          <DigestChip label={confidenceNote} tone='caution' />
        ) : null}
      </View>

      {!compact ? (
        <>
          <Text
            style={{
              color: PAPER.ink,
              fontSize: 17,
              fontWeight: '600',
              lineHeight: 26,
            }}
          >
            {headlineText(digest.headline, t)}
          </Text>

          {digest.focus.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              {digest.focus.map((item) => (
                <Text
                  key={`${item.palace}-${item.verdict}`}
                  style={{ color: TONE_COLOR[item.tone], fontSize: 13, lineHeight: 20 }}
                >
                  {focusLine(item, t)}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={{ color: PAPER.inkSoft, fontSize: 10, lineHeight: 15 }}>
            {t.digest_not_score}
          </Text>
        </>
      ) : null}
    </View>
  )
}

/** Convenience wrapper when only compute JSON is available. */
export function FengDigestFromCompute({
  compute,
  confidence,
  t,
  compact,
}: {
  compute: FengComputeJson | null | undefined
  confidence?: ReportDigest['confidence']
  t: Strings
  compact?: boolean
}) {
  const digest = deriveReportDigest(compute, confidence)
  if (!digest) return null
  return <FengDigestCard digest={digest} t={t} compact={compact} />
}
