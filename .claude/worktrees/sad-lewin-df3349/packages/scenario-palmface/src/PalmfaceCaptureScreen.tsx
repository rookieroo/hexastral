import * as ImagePicker from 'expo-image-picker'
import { Stack, useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { usePalmfaceScenario } from './context'
import type { PalmfaceCaptureStrings, PalmfaceMode, PalmfaceScenarioPalette } from './types'

export type PalmfaceCaptureScreenProps = {
  strings: PalmfaceCaptureStrings
  palette: PalmfaceScenarioPalette
  locale: string
  mode?: PalmfaceMode
  loadingOverlay?: ReactNode
  onSuccess?: (payload: { readingId: string; output: Record<string, unknown> }) => void
}

export function PalmfaceCaptureScreen({
  strings,
  palette,
  locale,
  mode = 'face',
  loadingOverlay,
  onSuccess,
}: PalmfaceCaptureScreenProps) {
  const router = useRouter()
  const api = usePalmfaceScenario()
  const [status, setStatus] = useState(strings.statusIdle)
  const [loading, setLoading] = useState(false)

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          padding: 24,
          backgroundColor: palette.background,
          gap: 12,
        },
        title: { fontSize: 20, fontWeight: '500', color: palette.text },
        body: { fontSize: 15, lineHeight: 22, color: palette.textSecondary },
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
        btnText: { color: palette.text, fontSize: 15 },
        status: { fontSize: 13, color: palette.textSecondary, marginTop: 8 },
        back: { marginTop: 24, color: palette.accent, fontSize: 15 },
      }),
    [palette],
  )

  const pick = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setStatus(strings.statusDenied)
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    })
    if (result.canceled) {
      setStatus(strings.statusCancelled)
      return
    }
    const uri = result.assets[0]?.uri
    setStatus(strings.statusWorking)
    try {
      setLoading(true)
      const preview = await api.runPreview({ imageUri: uri, locale, mode })
      if (onSuccess) {
        onSuccess({ readingId: preview.readingId, output: preview.output as Record<string, unknown> })
        return
      }
      router.push({
        pathname: '/result',
        params: {
          readingId: preview.readingId,
          payload: encodeURIComponent(JSON.stringify(preview.output)),
        },
      } as never)
    } catch (err) {
      console.warn('[scenario-palmface] preview failed', err)
      setStatus(strings.errorGeneric)
    } finally {
      setLoading(false)
    }
  }, [api, locale, mode, onSuccess, router, strings])

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: strings.title }} />
      <Text style={styles.title}>{strings.title}</Text>
      <Text style={styles.body}>{strings.body}</Text>
      <Pressable style={styles.btn} onPress={pick} accessibilityRole='button'>
        <Text style={styles.btnText}>{strings.openCamera}</Text>
      </Pressable>
      <Text style={styles.status}>{status}</Text>
      <Pressable onPress={() => router.back()} accessibilityRole='button'>
        <Text style={styles.back}>{strings.back}</Text>
      </Pressable>
      {loading ? loadingOverlay : null}
    </View>
  )
}
