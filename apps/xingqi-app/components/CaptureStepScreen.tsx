import { Button, useTheme } from '@zhop/core-ui'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
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
import { isCjkZh, pickZh } from '@/lib/locale-zh'

function stepCopy(locale: string, part: CapturePart) {
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const quality = s(
    '请尽量拍摄高清、完整、光线均匀的照片；模糊或裁切会导致特征不清、报告变浅。',
    '請盡量拍攝高清、完整、光線均勻的照片；模糊或裁切會導致特徵不清、報告變淺。',
    'Shoot a sharp, complete, evenly lit photo. Blurry or cropped shots yield weak features and a thin reading.'
  )
  if (part === 'palm_l') {
    return {
      title: s('左掌', '左掌', 'Left palm'),
      hint: s(
        `指尖到腕完整入镜，主纹清晰。${quality}`,
        `指尖到腕完整入鏡，主紋清晰。${quality}`,
        `Fingertips to wrist in frame; major lines visible. ${quality}`
      ),
      stepLabel: s('步骤 1 / 3', '步驟 1 / 3', 'Step 1 / 3'),
    }
  }
  if (part === 'palm_r') {
    return {
      title: s('右掌', '右掌', 'Right palm'),
      hint: s(
        `指尖到腕完整入镜，主纹清晰。${quality}`,
        `指尖到腕完整入鏡，主紋清晰。${quality}`,
        `Fingertips to wrist in frame; major lines visible. ${quality}`
      ),
      stepLabel: s('步骤 2 / 3', '步驟 2 / 3', 'Step 2 / 3'),
    }
  }
  return {
    title: s('面部自拍', '面部自拍', 'Face selfie'),
    hint: s(
      `正对镜头，五官清晰充满画面。${quality}`,
      `正對鏡頭，五官清晰充滿畫面。${quality}`,
      `Head-on, face clear and fills the frame. ${quality}`
    ),
    stepLabel: s('步骤 3 / 3', '步驟 3 / 3', 'Step 3 / 3'),
  }
}

type CaptureStepScreenProps = {
  part: CapturePart
  /** Next stack route, or null on the last step (continue to birth). */
  nextHref: '/capture/right' | '/capture/face' | null
}

async function ensureCameraPermission(locale: string): Promise<'ok' | 'denied'> {
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const current = await ImagePicker.getCameraPermissionsAsync()
  if (current.granted) return 'ok'
  const req = await ImagePicker.requestCameraPermissionsAsync()
  if (req.granted) return 'ok'
  Alert.alert(
    s('需要权限', '需要權限', 'Permission needed'),
    s(
      '请在系统设置中允许相机，以便拍摄掌纹/面部。',
      '請在系統設定中允許相機，以便拍攝掌紋／面部。',
      'Allow Camera in Settings to capture palm or face.'
    ),
    [
      { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
      {
        text: s('打开设置', '打開設定', 'Open Settings'),
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
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const copy = stepCopy(locale, part)
  const params = useLocalSearchParams<{ mode?: string }>()
  const slotMode = params.mode === 'slot'
  /** On-disk path without query (draft / extract). */
  const [fileUri, setFileUri] = useState<string | undefined>()
  /** Cache-bust so RN Image reloads after overwrite at the same path. */
  const [previewBust, setPreviewBust] = useState(0)
  const [busy, setBusy] = useState(false)

  const previewUri = fileUri
    ? `${fileUri.split('?')[0] ?? fileUri}?t=${previewBust || Date.now()}`
    : undefined

  // Slot reopen / replace at same path — bust RN Image cache.
  useFocusEffect(
    useCallback(() => {
      void hydrateReadingDraft().then((d) => {
        const next =
          part === 'palm_l' ? d.palmLeftUri : part === 'palm_r' ? d.palmRightUri : d.faceUri
        setFileUri(next?.split('?')[0] ?? next)
        setPreviewBust(Date.now())
      })
    }, [part])
  )

  const applyUri = useCallback(
    async (sourceUri: string) => {
      const label = (hans: string, hant: string, en: string) =>
        isCjkZh(locale) ? pickZh(locale, hans, hant) : en
      setBusy(true)
      try {
        const durable = await persistPeriodPhoto(part, sourceUri)
        const clean = durable.split('?')[0] ?? durable
        setFileUri(clean)
        setPreviewBust(Date.now())
        if (part === 'palm_l') {
          patchReadingDraft({ palmLeftUri: clean, palmLeftFeatureId: undefined })
        } else if (part === 'palm_r') {
          patchReadingDraft({ palmRightUri: clean, palmRightFeatureId: undefined })
        } else {
          patchReadingDraft({ faceUri: clean, faceFeatureId: undefined })
        }
      } catch (err) {
        const code = err instanceof Error ? err.message : ''
        Alert.alert(
          label('保存失败', '儲存失敗', 'Save failed'),
          code === 'photo_encode_failed'
            ? label(
                '无法将照片转为可用格式。请重新拍摄。',
                '無法將照片轉為可用格式。請重新拍攝。',
                'Could not convert the photo. Please retake.'
              )
            : label(
                '无法写入本机照片。请重试或检查存储空间。',
                '無法寫入本機照片。請重試或檢查儲存空間。',
                'Could not save the photo on device. Try again.'
              )
        )
      } finally {
        setBusy(false)
      }
    },
    [part, locale]
  )

  /** Camera only — album HEIC often bypasses JPEG conversion and breaks VLM. */
  const shoot = async () => {
    if (busy) return
    const perm = await ensureCameraPermission(locale)
    if (perm !== 'ok') return

    const runCamera = async () => {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
        exif: false,
      })
      if (result.canceled || !result.assets[0]?.uri) return
      await applyUri(result.assets[0].uri)
    }

    if (fileUri) {
      Alert.alert(
        s('重新拍摄', '重新拍攝', 'Retake photo'),
        s(
          '重拍后本机旧图将删除。原图不会上传到服务器，云端从不保存原图。',
          '重拍後本機舊圖將刪除。原圖不會上傳到伺服器，雲端從不保存原圖。',
          'The previous on-device photo will be deleted. Source images are never kept on our servers.'
        ),
        [
          { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
          {
            text: s('重拍', '重拍', 'Retake'),
            style: 'destructive',
            onPress: () => void runCamera(),
          },
        ]
      )
      return
    }

    await runCamera()
  }

  const onPrimary = () => {
    if (!fileUri) return
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

  const emptyHint = s(
    '尚未拍摄 · 仅保存在本机',
    '尚未拍攝 · 僅保存在本機',
    'No photo yet · kept on this device only'
  )

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
        {slotMode ? s('本期槽位', '本期槽位', 'Period slot') : copy.stepLabel}
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
        {previewUri ? (
          <Image
            key={previewUri}
            source={{ uri: previewUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode='cover'
          />
        ) : (
          <Text style={{ color: colors.secondary, textAlign: 'center', lineHeight: 20 }}>
            {emptyHint}
          </Text>
        )}
      </View>

      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        {s(
          '原图仅存本机，用于特征分析时上传；服务器处理完不保留原图。',
          '原圖僅存本機，用於特徵分析時上傳；伺服器處理完不保留原圖。',
          'Photos stay on device; uploaded only for feature extraction, then discarded server-side.'
        )}
      </Text>

      <Pressable
        onPress={() => void shoot()}
        disabled={busy}
        style={{
          borderWidth: 0.5,
          borderColor: colors.separator,
          padding: 14,
          alignItems: 'center',
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ color: colors.text }}>
          {fileUri ? s('重新拍摄', '重新拍攝', 'Retake') : s('拍照', '拍照', 'Camera')}
        </Text>
      </Pressable>

      <Button variant='primary' onPress={onPrimary} disabled={!fileUri || busy}>
        {slotMode
          ? s('完成', '完成', 'Done')
          : nextHref
            ? s('下一步', '下一步', 'Next')
            : s('继续填写生辰', '繼續填寫生辰', 'Continue to birth info')}
      </Button>
    </View>
  )
}
