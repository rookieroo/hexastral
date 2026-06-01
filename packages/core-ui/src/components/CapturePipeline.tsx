/**
 * CapturePipeline — generic camera-to-VLM flow (Phase J · J.1.2).
 *
 * Replaces the original per-scenario `PalmfaceCaptureScreen` (scenario-palmface
 * was deleted in J.4.4 after this lift). Any satellite that needs "render
 * disclaimer + open camera + send to model" drops the same shell in without
 * re-implementing permission/error plumbing. Generic over the result type so
 * callers keep their own VLM response shape end-to-end.
 *
 * Behavior:
 *   1. Render quality disclaimer + 3-bullet guidance + Open Camera CTA.
 *   2. On tap → optional `paywallGate()`; if denied, fire `onPaywallDenied`.
 *   3. requestCameraPermissionsAsync → launchCameraAsync.
 *   4. `onCapture(uri)` → loading overlay → bubble result via `onSuccess`.
 *
 * Presentational: no expo-router dep, no Stack.Screen — caller owns header,
 * navigation, and the result destination. Palette defaults to useTheme().
 */

import * as ImagePicker from 'expo-image-picker'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'

export interface CapturePipelineStrings {
  title: string
  body: string
  openCamera: string
  /** Optional back-link label. Only rendered when `onBack` is provided. */
  back?: string
  statusIdle: string
  statusDenied: string
  statusCancelled: string
  statusWorking: string
  errorGeneric: string
  /** Section heading rendered above the quality bullets. */
  qualityTitle: string
  /** Three short bullets describing what makes a usable photo. */
  qualityFocus: string
  qualityLight: string
  qualityFraming: string
  /** One-line third-party-VLM disclaimer between body and quality list. */
  aiDisclaimer: string
}

export interface CapturePipelinePalette {
  background: string
  text: string
  textSecondary: string
  border: string
  accent: string
  card: string
}

export interface CapturePipelineProps<TResult> {
  strings: CapturePipelineStrings
  /**
   * Color overrides. Defaults to the active CoreUIProvider theme so most
   * callers pass nothing. Provide this only when the screen needs a palette
   * decoupled from the theme (e.g. a dark camera surface inside a light app).
   */
  palette?: CapturePipelinePalette
  /** Network call that turns a captured photo URI into the consumer's result type. */
  onCapture: (uri: string) => Promise<TResult>
  /** Fired with the result on a successful capture. */
  onSuccess: (result: TResult) => void
  /** Optional back affordance. When omitted, no back link is rendered. */
  onBack?: () => void
  /**
   * Optional gate that runs before launching the camera. Resolve `{granted:
   * false}` to short-circuit; the component fires `onPaywallDenied` so the
   * caller can surface the paywall modal.
   */
  paywallGate?: () => Promise<{ granted: boolean }>
  /** Fired when `paywallGate` resolves to `{granted: false}`. */
  onPaywallDenied?: () => void
  /** Rendered while `onCapture` is in flight. */
  loadingOverlay?: ReactNode
  /**
   * Override the ImagePicker options. Defaults to images-only @ quality 0.7
   * (matches the palmface preset that proved viable for VLM input).
   */
  imagePickerOptions?: ImagePicker.ImagePickerOptions
}

const DEFAULT_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
}

export function CapturePipeline<TResult>({
  strings,
  palette,
  onCapture,
  onSuccess,
  onBack,
  paywallGate,
  onPaywallDenied,
  loadingOverlay,
  imagePickerOptions,
}: CapturePipelineProps<TResult>) {
  const theme = useTheme()
  const resolved: CapturePipelinePalette = useMemo(
    () =>
      palette ?? {
        background: theme.colors.bg,
        text: theme.colors.text,
        textSecondary: theme.colors.secondary,
        border: theme.colors.separator,
        accent: theme.colors.accent,
        card: theme.colors.card,
      },
    [palette, theme]
  )

  const [status, setStatus] = useState(strings.statusIdle)
  const [loading, setLoading] = useState(false)

  const styles = useMemo(() => createStyles(resolved), [resolved])

  const pick = useCallback(async () => {
    if (paywallGate) {
      const gate = await paywallGate()
      if (!gate.granted) {
        onPaywallDenied?.()
        return
      }
    }

    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setStatus(strings.statusDenied)
      return
    }

    const result = await ImagePicker.launchCameraAsync(imagePickerOptions ?? DEFAULT_PICKER_OPTIONS)
    if (result.canceled) {
      setStatus(strings.statusCancelled)
      return
    }

    const uri = result.assets[0]?.uri
    if (!uri) {
      setStatus(strings.errorGeneric)
      return
    }

    setStatus(strings.statusWorking)
    try {
      setLoading(true)
      const captured = await onCapture(uri)
      onSuccess(captured)
    } catch (err) {
      console.warn('[CapturePipeline] onCapture failed', err)
      setStatus(strings.errorGeneric)
    } finally {
      setLoading(false)
    }
  }, [imagePickerOptions, onCapture, onPaywallDenied, onSuccess, paywallGate, strings])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.title}</Text>
      <Text style={styles.body}>{strings.body}</Text>
      <Text style={styles.disclaimer}>{strings.aiDisclaimer}</Text>
      <Text style={styles.qualityTitle}>{strings.qualityTitle}</Text>
      <View style={styles.qualityList}>
        <Text style={styles.qualityItem}>{`· ${strings.qualityFocus}`}</Text>
        <Text style={styles.qualityItem}>{`· ${strings.qualityLight}`}</Text>
        <Text style={styles.qualityItem}>{`· ${strings.qualityFraming}`}</Text>
      </View>
      <Pressable style={styles.btn} onPress={pick} accessibilityRole='button'>
        <Text style={styles.btnText}>{strings.openCamera}</Text>
      </Pressable>
      <Text style={styles.status}>{status}</Text>
      {onBack && strings.back ? (
        <Pressable onPress={onBack} accessibilityRole='button'>
          <Text style={styles.back}>{strings.back}</Text>
        </Pressable>
      ) : null}
      {loading ? loadingOverlay : null}
    </View>
  )
}

function createStyles(p: CapturePipelinePalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: p.background,
      gap: 12,
    },
    title: { fontSize: 20, fontWeight: '500', color: p.text },
    body: { fontSize: 15, lineHeight: 22, color: p.textSecondary },
    disclaimer: {
      fontSize: 12,
      lineHeight: 18,
      color: p.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    qualityTitle: {
      fontSize: 12,
      color: p.textSecondary,
      marginTop: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    qualityList: {
      gap: 6,
      marginTop: 4,
      borderLeftWidth: 0.5,
      borderLeftColor: p.border,
      paddingLeft: 12,
    },
    qualityItem: { fontSize: 13, lineHeight: 19, color: p.text },
    btn: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
      borderRadius: 0,
      alignSelf: 'flex-start',
    },
    btnText: { color: p.text, fontSize: 15 },
    status: { fontSize: 13, color: p.textSecondary, marginTop: 8 },
    back: { marginTop: 24, color: p.accent, fontSize: 15 },
  })
}
