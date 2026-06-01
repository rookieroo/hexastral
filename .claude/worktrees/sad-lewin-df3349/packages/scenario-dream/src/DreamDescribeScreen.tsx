import { Stack, useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useDreamScenario } from './context'
import type { DreamDescribeStrings, DreamScenarioPalette } from './types'

const DEFAULT_MIN = 8

export type DreamDescribeAboveInputContext = {
  appendToDream: (fragment: string) => void
}

export type DreamDescribeScreenProps = {
  strings: DreamDescribeStrings
  palette: DreamScenarioPalette
  minLength?: number
  /** Optional overlay while preview runs (e.g. SatelliteLoadingOverlay) */
  loadingOverlay?: ReactNode
  onSuccess?: (payload: { readingId: string; interpretation: string }) => void
  /** When false, hides the back control (e.g. embedded in a tab root). Default true. */
  showBack?: boolean
  /** Primary uses accent fill and centered layout; default keeps existing flat card button. */
  submitVariant?: 'default' | 'primary'
  /** Rendered between title and dream text input; use appendToDream to insert preset phrases. */
  aboveInputSlot?: (ctx: DreamDescribeAboveInputContext) => ReactNode
  /**
   * Host can handle portfolio errors (quota, ban, session). Return true to skip generic error line.
   */
  onPreviewError?: (error: unknown) => boolean
}

export function DreamDescribeScreen({
  strings,
  palette,
  minLength = DEFAULT_MIN,
  loadingOverlay,
  onSuccess,
  showBack = true,
  submitVariant = 'default',
  aboveInputSlot,
  onPreviewError,
}: DreamDescribeScreenProps) {
  const router = useRouter()
  const { api, locale } = useDreamScenario()
  const [dreamText, setDreamText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appendToDream = useCallback((fragment: string) => {
    const next = fragment.trim()
    if (!next) return
    setDreamText((prev) => {
      const t = prev.trim()
      return t ? `${t}\n${next}` : next
    })
  }, [])

  const submit = useCallback(async () => {
    const trimmed = dreamText.trim()
    if (trimmed.length < minLength) return
    try {
      setError(null)
      setLoading(true)
      const preview = await api.runPreview(trimmed, locale)
      const interpretation =
        typeof preview.output.interpretation === 'string' ? preview.output.interpretation : ''
      if (onSuccess) {
        onSuccess({ readingId: preview.readingId, interpretation })
        return
      }
      router.push({
        pathname: '/result',
        params: {
          readingId: preview.readingId,
          interpretation: encodeURIComponent(interpretation),
        },
      } as never)
    } catch (err) {
      console.warn('[scenario-dream] preview failed', err)
      const handled = onPreviewError?.(err) === true
      if (!handled) setError(strings.errorGeneric)
    } finally {
      setLoading(false)
    }
  }, [api, dreamText, locale, minLength, onPreviewError, onSuccess, router, strings.errorGeneric])

  const styles = useMemo(() => {
    const ctaLabel =
      submitVariant === 'primary' ? (palette.ctaOnAccent ?? palette.text) : palette.text
    return StyleSheet.create({
      root: { flex: 1, backgroundColor: palette.background },
      scrollContent: { padding: 24, gap: 12, flexGrow: 1 },
      title: { fontSize: 20, fontWeight: '500', color: palette.text },
      input: {
        minHeight: 120,
        borderWidth: 0.5,
        borderColor: palette.border,
        padding: 12,
        color: palette.text,
        textAlignVertical: 'top',
        borderRadius: 0,
        backgroundColor: palette.card,
      },
      hint: { fontSize: 12, color: palette.textSecondary },
      btn: {
        marginTop: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 0.5,
        borderColor: palette.border,
        backgroundColor: palette.card,
        borderRadius: 0,
        alignSelf: 'flex-start',
      },
      btnRowCenter: { marginTop: 8, alignSelf: 'stretch', alignItems: 'center' },
      btnPrimary: {
        marginTop: 0,
        alignSelf: 'stretch',
        maxWidth: 360,
        width: '100%',
        borderColor: palette.accent,
        backgroundColor: palette.accent,
        alignItems: 'center',
        justifyContent: 'center',
      },
      btnDisabled: { opacity: 0.45 },
      btnText: { color: ctaLabel, fontSize: 15, textAlign: 'center' as const },
      error: { color: palette.textSecondary, fontSize: 13 },
      back: { marginTop: 16, color: palette.accent, fontSize: 15 },
    })
  }, [palette, submitVariant])

  const dismissKb = useCallback(() => {
    Keyboard.dismiss()
  }, [])

  const slot = aboveInputSlot?.({ appendToDream })

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: strings.title }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <Pressable onPress={dismissKb} accessible={false}>
          <Text style={styles.title}>{strings.title}</Text>
        </Pressable>
        {slot}
        <TextInput
          placeholder={strings.placeholder}
          placeholderTextColor={palette.textSecondary}
          style={styles.input}
          multiline
          value={dreamText}
          onChangeText={setDreamText}
        />
        {dreamText.trim().length > 0 && dreamText.trim().length < minLength ? (
          <Text style={styles.hint}>{strings.minHint}</Text>
        ) : null}
        {submitVariant === 'primary' ? (
          <View style={styles.btnRowCenter}>
            <Pressable
              style={[
                styles.btn,
                styles.btnPrimary,
                dreamText.trim().length < minLength ? styles.btnDisabled : null,
              ]}
              onPress={submit}
              accessibilityRole='button'
              disabled={dreamText.trim().length < minLength || loading}
            >
              <Text style={styles.btnText}>{strings.cta}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.btn, dreamText.trim().length < minLength ? styles.btnDisabled : null]}
            onPress={submit}
            accessibilityRole='button'
            disabled={dreamText.trim().length < minLength || loading}
          >
            <Text style={styles.btnText}>{strings.cta}</Text>
          </Pressable>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {showBack ? (
          <Pressable onPress={() => router.back()} accessibilityRole='button'>
            <Text style={styles.back}>{strings.back}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {loading ? loadingOverlay : null}
    </View>
  )
}
