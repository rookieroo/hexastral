/**
 * (new-site)/review — step 6 of 6.
 *
 * Confirm summary → POST /api/feng/sites → enqueue analyze → poll job.
 * On stage='done' navigates into (report)/[siteId]. On 'failed' shows the
 * server message inline + lets the user retry.
 */

import { useCreateSite } from '@zhop/scenario-feng'
import { type Href, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { useAuth } from '@/lib/auth'
import { type FengBirthInfo, fetchBirthInfo } from '@/lib/birth-info'
import { hasFengAnalyzeAccess } from '@/lib/purchase'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { clearDraft, isDraftReady, loadDraft, type SiteDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

export default function ReviewScreen() {
  const router = useRouter()
  const { userId } = useAuth()
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const insets = useSafeAreaInsets()
  const createSite = useCreateSite()

  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const [creating, setCreating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // undefined = not yet checked; null = none on file; value = birth info present.
  const [birthInfo, setBirthInfo] = useState<FengBirthInfo | null | undefined>(undefined)

  useEffect(() => {
    void (async () => setDraft(await loadDraft()))()
  }, [])

  // Re-check birth info each time the screen regains focus, so returning from
  // the (birth-info) form reflects immediately (birth info unlocks 命卦 ch2).
  useFocusEffect(
    useCallback(() => {
      let alive = true
      fetchBirthInfo()
        .then((bi) => {
          if (alive) setBirthInfo(bi)
        })
        .catch(() => {
          if (alive) setBirthInfo(null)
        })
      return () => {
        alive = false
      }
    }, [])
  )

  const confirm = async () => {
    if (hasSubmitted || creating) return
    if (!draft || !isDraftReady(draft)) {
      setSubmitError('Draft is incomplete — go back and finish each step.')
      return
    }
    if (!userId) return

    const entitled = await hasFengAnalyzeAccess(userId)
    if (!entitled) {
      router.push({ pathname: '/paywall', params: { intent: 'analyze' } } as Href)
      return
    }

    setHasSubmitted(true)
    setSubmitError(null)
    setCreating(true)
    try {
      const fpImages = draft.floorplanImages ?? []
      const cover = fpImages[0]
      const site = await createSite({
        name: draft.name ?? t.new_site_default_name,
        label: draft.label,
        lat: draft.lat,
        lng: draft.lng,
        formattedAddress: draft.formattedAddress,
        facingDegTrue: draft.facingDegTrue,
        magneticDeclination: draft.magneticDeclination,
        doorDegTrue: draft.doorDegTrue,
        buildYear: draft.buildYear,
        buildYearAccuracy: draft.buildYearAccuracy,
        moveInYear: draft.moveInYear,
        floor: draft.floor,
        floorplanKey: cover ? cover.key : undefined,
        floorplan: cover
          ? {
              orientDeg: draft.floorplanOrientDeg ?? 0,
              images: fpImages.map((im) => ({ key: im.key, label: im.label })),
              centerNorm: draft.floorplanCenterNorm,
            }
          : undefined,
      })
      // Hand off to the report screen, which OWNS the analyze job: it runs the
      // pipeline, shows the computed shell (排盘/坐向/tiles) within seconds, and
      // streams the written chapters in when synthesis finishes (two-phase).
      await clearDraft()
      router.replace({
        pathname: '/(report)/[siteId]',
        params: { siteId: site.id, autoAnalyze: '1' },
      } as Href)
    } catch (err) {
      setHasSubmitted(false)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('403') || msg.includes('paywall')) {
        setSubmitError(t.new_site_review_error_paywall)
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setSubmitError(t.new_site_review_error_network)
      } else {
        setSubmitError(msg)
      }
      setCreating(false)
    }
  }

  const labels: Array<{ label: string; value: string }> = []
  if (draft) {
    labels.push({ label: t.new_site_review_address, value: draft.formattedAddress ?? '—' })
    if (typeof draft.facingDegTrue === 'number') {
      labels.push({
        label: t.new_site_review_building_facing,
        value: `${Math.round(draft.facingDegTrue)}°`,
      })
    }
    if (typeof draft.doorDegTrue === 'number') {
      labels.push({
        label: t.new_site_review_unit_door,
        value: `${Math.round(draft.doorDegTrue)}°`,
      })
    }
    if (typeof draft.buildYear === 'number') {
      labels.push({ label: t.new_site_review_buildYear, value: String(draft.buildYear) })
    } else if (draft.buildYearAccuracy && draft.buildYearAccuracy !== 'unknown') {
      labels.push({ label: t.new_site_review_buildYear, value: draft.buildYearAccuracy })
    }
    if (draft.floorplanImages && draft.floorplanImages.length > 0) {
      labels.push({
        label: t.new_site_review_floorplan,
        value:
          draft.floorplanImages.length > 1
            ? t.new_site_floorplan_count_villa.replace('{n}', String(draft.floorplanImages.length))
            : t.new_site_floorplan_count_one,
      })
    } else {
      labels.push({ label: t.new_site_review_floorplan, value: t.new_site_review_no_floorplan })
    }
  }

  const inProgress = creating
  const confirmDisabled = inProgress || !draft || !isDraftReady(draft) || hasSubmitted
  const errMessage = submitError

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        backgroundColor: colors.bg,
        flexGrow: 1,
      }}
    >
      <ProgressIndicator step={6} total={6} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {t.new_site_review_title}
      </Text>

      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 0.5,
          borderColor: colors.border,
          borderRadius: 0,
          padding: spacing.lg,
          gap: spacing.md,
        }}
      >
        {labels.map((row, index) => (
          <View key={`${row.label}-${index}`} style={{ flexDirection: 'row', gap: spacing.md }}>
            <Text style={{ width: 120, color: colors.textMute, fontSize: 14 }}>{row.label}</Text>
            <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      {/* 命卦 chapter (ch2) — birth info is optional; with it the report is 6
          chapters, without it 5. Surfaced here so the choice is explicit. */}
      {birthInfo !== undefined ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 0.5,
            borderColor: colors.border,
            borderRadius: 0,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
            {t.new_site_review_birth_title}
          </Text>
          <Text style={{ color: colors.textMute, fontSize: 12.5, lineHeight: 18 }}>
            {birthInfo ? t.new_site_review_birth_have : t.new_site_review_birth_none}
          </Text>
          {birthInfo ? null : (
            <Pressable onPress={() => router.push('/(birth-info)' as Href)} hitSlop={8}>
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>
                {t.new_site_review_birth_add} →
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {inProgress ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.textMute }}>
              {t.new_site_review_processing.replace('{stage}', 'maps')}
            </Text>
          </View>
          <Text style={{ color: colors.textMute, fontSize: 12 }}>{t.new_site_review_analyze_eta}</Text>
        </View>
      ) : null}

      {errMessage ? (
        <Text style={{ color: colors.warning, fontSize: 13 }}>{errMessage}</Text>
      ) : null}

      <View style={{ flex: 1 }} />

      <View
        style={{
          gap: spacing.xs,
          borderLeftWidth: 0.5,
          borderLeftColor: colors.border,
          paddingLeft: spacing.md,
        }}
      >
        <Text style={{ color: colors.textMute, fontSize: 12, lineHeight: 18, fontStyle: 'italic' }}>
          {t.new_site_review_ai_disclaimer}
        </Text>
        <Text style={{ color: colors.textMute, fontSize: 12, lineHeight: 18 }}>
          {t.new_site_review_iap_note}
        </Text>
      </View>

      <Pressable
        onPress={confirm}
        disabled={confirmDisabled}
        style={{
          backgroundColor: inProgress ? colors.surfaceMute : colors.accent,
          paddingVertical: spacing.lg,
          borderRadius: 0,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 16 }}>
          {t.new_site_review_confirm}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
