import { Button, useTheme } from '@zhop/core-ui'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  draftHasThreePhotos,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
  type CapturePart,
} from '@/lib/reading-draft'
import { resolveLocale } from '@/lib/i18n'

function stepCopy(locale: string, part: CapturePart) {
  const zh = locale.startsWith('zh')
  if (part === 'palm_l') {
    return {
      title: zh ? '左掌' : 'Left palm',
      hint: zh ? '指尖到腕大致入镜，光线均匀' : 'Fingertips to wrist in frame, even light',
      stepLabel: zh ? '步骤 1 / 3' : 'Step 1 / 3',
    }
  }
  if (part === 'palm_r') {
    return {
      title: zh ? '右掌' : 'Right palm',
      hint: zh ? '指尖到腕大致入镜，光线均匀' : 'Fingertips to wrist in frame, even light',
      stepLabel: zh ? '步骤 2 / 3' : 'Step 2 / 3',
    }
  }
  return {
    title: zh ? '面部自拍' : 'Face selfie',
    hint: zh ? '正对镜头，面部清晰充满画面' : 'Head-on, face clear and fills the frame',
    stepLabel: zh ? '步骤 3 / 3' : 'Step 3 / 3',
  }
}

type CaptureStepScreenProps = {
  part: CapturePart
  /** Next stack route, or null on the last step (continue to birth). */
  nextHref: '/capture/right' | '/capture/face' | null
}

export function CaptureStepScreen({ part, nextHref }: CaptureStepScreenProps) {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const copy = stepCopy(locale, part)
  const [uri, setUri] = useState<string | undefined>()

  useEffect(() => {
    void hydrateReadingDraft().then((d) => {
      if (part === 'palm_l') setUri(d.palmLeftUri)
      else if (part === 'palm_r') setUri(d.palmRightUri)
      else setUri(d.faceUri)
    })
  }, [part])

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true })
    if (result.canceled || !result.assets[0]?.uri) return
    const next = result.assets[0].uri
    setUri(next)
    if (part === 'palm_l') patchReadingDraft({ palmLeftUri: next, palmLeftFeatureId: undefined })
    if (part === 'palm_r') patchReadingDraft({ palmRightUri: next, palmRightFeatureId: undefined })
    if (part === 'face') patchReadingDraft({ faceUri: next, faceFeatureId: undefined })
  }

  const onNext = () => {
    if (!uri) return
    if (nextHref) {
      router.push(nextHref)
      return
    }
    if (!draftHasThreePhotos(getReadingDraft())) return
    router.push('/birth')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.secondary, fontSize: 13 }}>{copy.stepLabel}</Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>{copy.title}</Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>{copy.hint}</Text>

      <View
        style={{
          flex: 1,
          borderWidth: 0.5,
          borderColor: colors.separator,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode='cover' />
        ) : (
          <Text style={{ color: colors.secondary }}>{zh ? '尚未选择' : 'No photo yet'}</Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={() => void pick(true)}
          style={{
            flex: 1,
            borderWidth: 0.5,
            borderColor: colors.separator,
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text }}>{zh ? '拍照' : 'Camera'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void pick(false)}
          style={{
            flex: 1,
            borderWidth: 0.5,
            borderColor: colors.separator,
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text }}>{zh ? '相册' : 'Library'}</Text>
        </Pressable>
      </View>

      <Button variant='primary' onPress={onNext} disabled={!uri}>
        {nextHref
          ? zh
            ? '下一步'
            : 'Next'
          : zh
            ? '继续填写生辰'
            : 'Continue to birth info'}
      </Button>
    </View>
  )
}
