/**
 * (new-site)/review — step 4 of 4.
 *
 * Confirm summary → POST /api/feng/sites → enqueue analyze → poll job.
 * On stage='done' navigates into (report)/[siteId]. On 'failed' shows the
 * server message inline + lets the user retry.
 */

import { useAnalyzeJob, useCreateSite } from '@zhop/scenario-feng'
import { type Href, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { clearDraft, isDraftReady, loadDraft, type SiteDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

export default function ReviewScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const insets = useSafeAreaInsets()
  const createSite = useCreateSite()

  const [draft, setDraft] = useState<SiteDraft | null>(null)
  const [siteId, setSiteId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const analyze = useAnalyzeJob(siteId)

  useEffect(() => {
    void (async () => setDraft(await loadDraft()))()
  }, [])

  // When the analyze job lands on 'done', route into the report. Cleaning
  // the draft only happens after successful creation; if the analyze fails
  // the site row remains, so the user can retry from (tabs).
  useEffect(() => {
    if (analyze.stage === 'done' && siteId) {
      void clearDraft()
      router.replace({
        pathname: '/(report)/[siteId]',
        params: { siteId, autoAnalyze: '0' },
      } as Href)
    }
  }, [analyze.stage, siteId, router])

  const confirm = async () => {
    if (hasSubmitted || creating || analyze.isRunning) return
    if (!draft || !isDraftReady(draft)) {
      setSubmitError('Draft is incomplete — go back and finish each step.')
      return
    }
    setHasSubmitted(true)
    setSubmitError(null)
    setCreating(true)
    try {
      const site = await createSite({
        name: draft.name ?? 'My site',
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
      })
      setSiteId(site.id)
      await analyze.start(site.id)
      setCreating(false)
    } catch (err) {
      setHasSubmitted(false)
      setSubmitError(err instanceof Error ? err.message : String(err))
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
  }

  const inProgress = creating || analyze.isRunning
  const confirmDisabled = inProgress || !draft || !isDraftReady(draft) || hasSubmitted
  const errMessage = submitError ?? analyze.error?.message ?? null

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
      <ProgressIndicator step={4} total={4} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {t.new_site_review_title}
      </Text>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
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

      {inProgress ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.textMute }}>
            {t.new_site_review_processing.replace('{stage}', analyze.stage ?? 'maps')}
          </Text>
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
          borderRadius: 12,
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
