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
import { isCjkZh, pickZh } from '@/lib/locale-zh'

function stepCopy(locale: string, part: CapturePart) {
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const quality = s(
    '请尽量选择高清、完整、光线均匀的照片；模糊或裁切会导致特征不清、报告变浅。',
    '請盡量選擇高清、完整、光線均勻的照片；模糊或裁切會導致特徵不清、報告變淺。',
    'Use a sharp, complete, evenly lit photo. Blurry or cropped shots yield weak features and a thin reading.'
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

async function ensurePermission(
  fromCamera: boolean,
  locale: string
): Promise<'ok' | 'denied'> {
  const s = (hans: string, hant: string, en: string) =>
    isCjkZh(locale) ? pickZh(locale, hans, hant) : en
  const current = fromCamera
    ? await ImagePicker.getCameraPermissionsAsync()
    : await ImagePicker.getMediaLibraryPermissionsAsync()
  if (current.granted) return 'ok'
  const req = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (req.granted) return 'ok'
  Alert.alert(
    s('需要权限', '需要權限', 'Permission needed'),
    fromCamera
      ? s(
          '请在系统设置中允许相机，以便拍摄掌纹/面部。',
          '請在系統設定中允許相機，以便拍攝掌紋／面部。',
          'Allow Camera in Settings to capture palm or face.'
        )
      : s(
          '请在系统设置中允许相册访问，以便选择照片。',
          '請在系統設定中允許相簿存取，以便選擇照片。',
          'Allow Photos in Settings to choose an image.'
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
      const label = (hans: string, hant: string, en: string) =>
        isCjkZh(locale) ? pickZh(locale, hans, hant) : en
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
          label('保存失败', '儲存失敗', 'Save failed'),
          label(
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

  const pick = async (fromCamera: boolean) => {
    if (busy) return
    const perm = await ensurePermission(fromCamera, locale)
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
        s('替换照片', '替換照片', 'Replace photo'),
        s(
          '替换后本机旧图将删除。原图不会上传到服务器，云端从不保存原图。',
          '替換後本機舊圖將刪除。原圖不會上傳到伺服器，雲端從不保存原圖。',
          'The previous on-device photo will be deleted. Source images are never kept on our servers.'
        ),
        [
          { text: s('取消', '取消', 'Cancel'), style: 'cancel' },
          {
            text: s('替换', '替換', 'Replace'),
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

  const emptyHint = s(
    '尚未选择 · 拍照后仅保存在本机',
    '尚未選擇 · 拍照後僅保存在本機',
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
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode='cover' />
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
          <Text style={{ color: colors.text }}>{s('拍照', '拍照', 'Camera')}</Text>
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
            {uri ? s('替换', '替換', 'Replace') : s('相册', '相簿', 'Library')}
          </Text>
        </Pressable>
      </View>

      <Button variant='primary' onPress={onPrimary} disabled={!uri || busy}>
        {slotMode
          ? s('完成', '完成', 'Done')
          : nextHref
            ? s('下一步', '下一步', 'Next')
            : s('继续填写生辰', '繼續填寫生辰', 'Continue to birth info')}
      </Button>
    </View>
  )
}
