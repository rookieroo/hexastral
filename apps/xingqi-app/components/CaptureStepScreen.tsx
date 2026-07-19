import { Button, useTheme } from '@zhop/core-ui'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Image, Linking, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  draftHasThreePhotos,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
  type CapturePart,
} from '@/lib/reading-draft'
import { persistPeriodPhoto } from '@/lib/period-photos'
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

async function ensurePermission(
  fromCamera: boolean,
  zh: boolean
): Promise<'ok' | 'denied'> {
  const current = fromCamera
    ? await ImagePicker.getCameraPermissionsAsync()
    : await ImagePicker.getMediaLibraryPermissionsAsync()
  if (current.granted) return 'ok'
  const req = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (req.granted) return 'ok'
  Alert.alert(
    zh ? '需要权限' : 'Permission needed',
    zh
      ? fromCamera
        ? '请在系统设置中允许相机，以便拍摄掌纹/面部。'
        : '请在系统设置中允许相册访问，以便选择照片。'
      : fromCamera
        ? 'Allow Camera in Settings to capture palm or face.'
        : 'Allow Photos in Settings to choose an image.',
    [
      { text: zh ? '取消' : 'Cancel', style: 'cancel' },
      {
        text: zh ? '打开设置' : 'Open Settings',
        onPress: () => void Linking.openSettings(),
      },
    ]
  )
  return 'denied'
}

export function CaptureStepScreen({ part, nextHref }: CaptureStepScreenProps) {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const zh = locale.startsWith('zh')
  const copy = stepCopy(locale, part)
  const params = useLocalSearchParams<{ mode?: string }>()
  const slotMode = params.mode === 'slot'
  const [uri, setUri] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void hydrateReadingDraft().then((d) => {
      if (part === 'palm_l') setUri(d.palmLeftUri)
      else if (part === 'palm_r') setUri(d.palmRightUri)
      else setUri(d.faceUri)
    })
  }, [part])

  const applyUri = useCallback(
    async (sourceUri: string) => {
      setBusy(true)
      try {
        const durable = await persistPeriodPhoto(part, sourceUri)
        setUri(durable)
        if (part === 'palm_l') {
          patchReadingDraft({ palmLeftUri: durable, palmLeftFeatureId: undefined })
        } else if (part === 'palm_r') {
          patchReadingDraft({ palmRightUri: durable, palmRightFeatureId: undefined })
        } else {
          patchReadingDraft({ faceUri: durable, faceFeatureId: undefined })
        }
      } catch {
        Alert.alert(
          zh ? '保存失败' : 'Save failed',
          zh
            ? '无法写入本机照片。请重试或检查存储空间。'
            : 'Could not save the photo on device. Try again.'
        )
      } finally {
        setBusy(false)
      }
    },
    [part, zh]
  )

  const pick = async (fromCamera: boolean) => {
    if (busy) return
    const perm = await ensurePermission(fromCamera, zh)
    if (perm !== 'ok') return

    const runPick = async () => {
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            quality: 0.85,
            allowsEditing: true,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.85,
            allowsEditing: true,
            exif: false,
          })
      if (result.canceled || !result.assets[0]?.uri) return
      await applyUri(result.assets[0].uri)
    }

    if (uri) {
      Alert.alert(
        zh ? '替换照片' : 'Replace photo',
        zh
          ? '替换后本机旧图将删除。原图不会上传到服务器，云端从不保存原图。'
          : 'The previous on-device photo will be deleted. Source images are never kept on our servers.',
        [
          { text: zh ? '取消' : 'Cancel', style: 'cancel' },
          {
            text: zh ? '替换' : 'Replace',
            style: 'destructive',
            onPress: () => void runPick(),
          },
        ]
      )
      return
    }

    await runPick()
  }

  const onPrimary = () => {
    if (!uri) return
    if (slotMode) {
      router.back()
      return
    }
    if (nextHref) {
      router.push(nextHref)
      return
    }
    if (!draftHasThreePhotos(getReadingDraft())) return
    router.push('/birth')
  }

  const emptyHint = zh
    ? '尚未选择 · 拍照后仅保存在本机'
    : 'No photo yet · kept on this device only'

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
      <Text style={{ color: colors.secondary, fontSize: 13 }}>
        {slotMode ? (zh ? '本期槽位' : 'Period slot') : copy.stepLabel}
      </Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>{copy.title}</Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>{copy.hint}</Text>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 280,
          backgroundColor: colors.bg,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode='cover' />
        ) : (
          <Text style={{ color: colors.secondary, textAlign: 'center', lineHeight: 20 }}>
            {emptyHint}
          </Text>
        )}
      </View>

      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        {zh
          ? '原图仅存本机，用于特征分析时上传；服务器处理完不保留原图。'
          : 'Photos stay on device; uploaded only for feature extraction, then discarded server-side.'}
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={() => void pick(true)}
          disabled={busy}
          style={{
            flex: 1,
            borderWidth: 0.5,
            borderColor: colors.separator,
            padding: 14,
            alignItems: 'center',
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.text }}>{zh ? '拍照' : 'Camera'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void pick(false)}
          disabled={busy}
          style={{
            flex: 1,
            borderWidth: 0.5,
            borderColor: colors.separator,
            padding: 14,
            alignItems: 'center',
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.text }}>
            {uri ? (zh ? '替换' : 'Replace') : zh ? '相册' : 'Library'}
          </Text>
        </Pressable>
      </View>

      <Button variant='primary' onPress={onPrimary} disabled={!uri || busy}>
        {slotMode
          ? zh
            ? '完成'
            : 'Done'
          : nextHref
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
