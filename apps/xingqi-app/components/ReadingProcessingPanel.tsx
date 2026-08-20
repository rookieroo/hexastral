/**
 * Full-screen reading progress — filled polaroid stack + phase copy + bar.
 * Upload is foreground-bound; after job 202 (extract/queue), user can dismiss.
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OffsetPhotoStack } from '@/components/OffsetPhotoStack'
import { XingqiLoader } from '@/components/XingqiLoader'
import type { Locale } from '@/lib/i18n'
import { partLabels, readingProcessingCopy } from '@/lib/living-copy'
import type { CapturePart } from '@/lib/reading-draft'
import { periodPhotoMap } from '@/lib/period-photos'
import type { ReadingJobPhase } from '@/lib/reading-job'
import { POLAROID_FAN_W, POLAROID_STACK_H } from '@/lib/stack-layout'

/**
 * Live period sandbox overwrites the same file paths — always bust + no disk cache
 * so we never paint the previous seal while uploading new shots.
 */
async function loadLivePeriodUris(): Promise<Partial<Record<CapturePart, string>>> {
  const map = await periodPhotoMap()
  const bust = `t=${Date.now()}`
  const out: Partial<Record<CapturePart, string>> = {}
  if (map.palm_l) out.palm_l = `${map.palm_l}?${bust}`
  if (map.palm_r) out.palm_r = `${map.palm_r}?${bust}`
  if (map.face) out.face = `${map.face}?${bust}`
  return out
}

export function ReadingProcessingPanel({
  locale,
  phase,
  progress,
  onDismiss,
}: {
  locale: Locale
  phase: ReadingJobPhase
  progress: number
  /** Shown after extract queues — return to timeline while cloud continues. */
  onDismiss?: () => void
}) {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const labels = partLabels(locale)
  const copy = readingProcessingCopy(locale, phase)
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})
  const pct = Math.max(4, Math.min(100, Math.round(progress)))
  const canDismiss =
    Boolean(onDismiss) &&
    (phase === 'extracting' || phase === 'queued' || phase === 'interpreting')

  useEffect(() => {
    let cancelled = false
    void loadLivePeriodUris().then((next) => {
      if (!cancelled) setUris(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + 56,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.xl,
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ width: POLAROID_FAN_W, height: POLAROID_STACK_H }}>
          <OffsetPhotoStack
            uris={uris}
            labels={labels}
            activePart='face'
            spread={1}
            ritual={1}
            compact
            instantPose
            interactive={false}
            photoCache='none'
          />
        </View>

        <XingqiLoader label={copy.title} />

        <View style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 300 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: '600',
              textAlign: 'center',
              letterSpacing: 0.02,
            }}
          >
            {copy.title}
          </Text>
          <Text
            style={{
              color: colors.secondary,
              fontSize: 14,
              lineHeight: 20,
              textAlign: 'center',
            }}
          >
            {copy.hint}
          </Text>
        </View>

        <View style={{ width: '100%', maxWidth: 280, gap: spacing.xs }}>
          <View
            style={{
              height: 3,
              backgroundColor: colors.separator,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 3,
                width: `${pct}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <Text
            style={{
              color: colors.dim,
              fontSize: 11,
              letterSpacing: 1,
              textAlign: 'center',
            }}
          >
            {`${pct}%`}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        <Text
          style={{
            color: colors.dim,
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
          }}
        >
          {copy.leave}
        </Text>
        {canDismiss ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole='button'
            accessibilityLabel={
              locale === 'zh' || locale === 'zh-Hant'
                ? '返回首页'
                : locale === 'ja'
                  ? 'ホームに戻る'
                  : 'Back to home'
            }
            style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }}
          >
            <Text style={{ color: colors.secondary, fontSize: 15 }}>
              {locale === 'zh'
                ? '返回首页查看进度'
                : locale === 'zh-Hant'
                  ? '返回首頁查看進度'
                  : locale === 'ja'
                    ? 'ホームで進捗を見る'
                    : 'Back to home'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
