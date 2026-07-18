import { Button, useTheme } from '@zhop/core-ui'
import * as ImagePicker from 'expo-image-picker'
import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import {
  draftHasThreePhotos,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
  type CapturePart,
} from '@/lib/reading-draft'
import { useSatelliteI18n } from '@/lib/i18n'

const STEPS: CapturePart[] = ['palm_l', 'palm_r', 'face']

function stepCopy(locale: string, part: CapturePart) {
  const zh = locale.startsWith('zh')
  if (part === 'palm_l') {
    return {
      title: zh ? '左掌' : 'Left palm',
      hint: zh ? '指尖到腕大致入镜，光线均匀' : 'Fingertips to wrist in frame, even light',
    }
  }
  if (part === 'palm_r') {
    return {
      title: zh ? '右掌' : 'Right palm',
      hint: zh ? '指尖到腕大致入镜，光线均匀' : 'Fingertips to wrist in frame, even light',
    }
  }
  return {
    title: zh ? '面部自拍' : 'Face selfie',
    hint: zh ? '正对镜头，面部清晰充满画面' : 'Head-on, face clear and fills the frame',
  }
}

export default function ThreePhotoCaptureScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const zh = locale.startsWith('zh')
  const [step, setStep] = useState(0)
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})

  useEffect(() => {
    void hydrateReadingDraft().then((d) => {
      setUris({
        palm_l: d.palmLeftUri,
        palm_r: d.palmRightUri,
        face: d.faceUri,
      })
    })
  }, [])

  const part = STEPS[step] ?? 'palm_l'
  const copy = stepCopy(locale, part)
  const currentUri = uris[part]

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true })
    if (result.canceled || !result.assets[0]?.uri) return
    const uri = result.assets[0].uri
    setUris((prev) => ({ ...prev, [part]: uri }))
    if (part === 'palm_l') patchReadingDraft({ palmLeftUri: uri, palmLeftFeatureId: undefined })
    if (part === 'palm_r') patchReadingDraft({ palmRightUri: uri, palmRightFeatureId: undefined })
    if (part === 'face') patchReadingDraft({ faceUri: uri, faceFeatureId: undefined })
  }

  const onNext = () => {
    if (!currentUri) return
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    const draft = getReadingDraft()
    if (!draftHasThreePhotos(draft)) return
    router.push('/birth')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.xl, gap: spacing.md }}>
      <Stack.Screen
        options={{ title: zh ? '录入三张照片' : 'Three photos', headerShown: true }}
      />
      <Text style={{ color: colors.secondary, fontSize: 13 }}>
        {zh ? `步骤 ${step + 1} / 3` : `Step ${step + 1} / 3`}
      </Text>
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
        {currentUri ? (
          <Image source={{ uri: currentUri }} style={{ width: '100%', height: '100%' }} resizeMode='cover' />
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

      <Button variant='primary' onPress={onNext} disabled={!currentUri}>
        {step < STEPS.length - 1
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
