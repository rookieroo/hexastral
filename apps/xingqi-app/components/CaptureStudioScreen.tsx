import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Linking, Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OffsetPhotoStack } from '@/components/OffsetPhotoStack'
import { resolveLocale } from '@/lib/i18n'
import { captureStudioCopy, partLabels } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import { consumeCaptureMagicHandoff } from '@/lib/capture-magic-handoff'
import { persistPeriodPhoto } from '@/lib/period-photos'
import {
  type CapturePart,
  draftHasBirthInfo,
  draftHasThreePhotos,
  draftReadyForPaywall,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
} from '@/lib/reading-draft'
import { showReadingStartedHandoff, startReadingJob } from '@/lib/reading-job'
import { alertIfPhotosUnchanged } from '@/lib/reading-preflight'
import { POLAROID_FAN_W, POLAROID_STACK_H } from '@/lib/stack-layout'

const PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']
const MAGIC_HOLD_MS = 90

function parsePart(raw: unknown): CapturePart | undefined {
  if (raw === 'palm_l' || raw === 'palm_r' || raw === 'face') return raw
  return undefined
}

function firstEmpty(uris: Partial<Record<CapturePart, string>>): CapturePart {
  return PARTS.find((p) => !uris[p]) ?? 'face'
}

function urisFromDraft(): Partial<Record<CapturePart, string>> {
  const d = getReadingDraft()
  const out: Partial<Record<CapturePart, string>> = {}
  if (d.palmLeftUri) out.palm_l = d.palmLeftUri.split('?')[0]
  if (d.palmRightUri) out.palm_r = d.palmRightUri.split('?')[0]
  if (d.faceUri) out.face = d.faceUri.split('?')[0]
  return out
}

async function ensureCameraPermission(locale: string): Promise<'ok' | 'denied'> {
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const current = await ImagePicker.getCameraPermissionsAsync()
  if (current.granted) return 'ok'
  const req = await ImagePicker.requestCameraPermissionsAsync()
  if (req.granted) return 'ok'
  Alert.alert(
    s('需要权限', '需要權限', 'Permission needed', '権限が必要です'),
    s(
      '请在系统设置中允许相机，以便拍摄掌纹/面部。',
      '請在系統設定中允許相機，以便拍攝掌紋／面部。',
      'Allow Camera in Settings to capture palm or face.',
      '設定でカメラを許可して、掌または顔を撮影してください。'
    ),
    [
      { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
      {
        text: s('打开设置', '打開設定', 'Open Settings', '設定を開く'),
        onPress: () => void Linking.openSettings(),
      },
    ]
  )
  return 'denied'
}

async function ensureLibraryPermission(locale: string): Promise<'ok' | 'denied'> {
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const current = await ImagePicker.getMediaLibraryPermissionsAsync()
  if (current.granted || current.accessPrivileges === 'limited') return 'ok'
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (req.granted || req.accessPrivileges === 'limited') return 'ok'
  Alert.alert(
    s('需要权限', '需要權限', 'Permission needed', '権限が必要です'),
    s(
      '请在系统设置中允许访问照片，以便从相册选择掌纹/面部。',
      '請在系統設定中允許存取照片，以便從相簿選擇掌紋／面部。',
      'Allow Photos in Settings to choose a palm or face image.',
      '設定で写真へのアクセスを許可して、掌または顔の画像を選んでください。'
    ),
    [
      { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
      {
        text: s('打开设置', '打開設定', 'Open Settings', '設定を開く'),
        onPress: () => void Linking.openSettings(),
      },
    ]
  )
  return 'denied'
}

function patchPart(part: CapturePart, uri: string): void {
  if (part === 'palm_l') {
    patchReadingDraft({ palmLeftUri: uri, palmLeftFeatureId: undefined })
    return
  }
  if (part === 'palm_r') {
    patchReadingDraft({ palmRightUri: uri, palmRightFeatureId: undefined })
    return
  }
  patchReadingDraft({ faceUri: uri, faceFeatureId: undefined })
}

export function CaptureStudioScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const copy = captureStudioCopy(locale)
  const labels = partLabels(locale)
  const handoff = useMemo(() => consumeCaptureMagicHandoff(), [])
  const params = useLocalSearchParams<{
    mode?: string
    part?: string
    spread?: string
    ritual?: string
    magic?: string
  }>()
  const slotMode = params.mode === 'slot'
  const magicMode = params.magic === '1' && !slotMode
  const entitlements = useEntitlements()
  const isPro =
    hasEntitlement(entitlements, 'faceoracle_pro') || hasEntitlement(entitlements, 'universe_pro')

  const [activePart, setActivePart] = useState<CapturePart>(parsePart(params.part) ?? 'palm_l')
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})
  const [bust, setBust] = useState(0)
  const [busy, setBusy] = useState(false)
  const [targetLocalTop, setTargetLocalTop] = useState<number | null>(null)
  const [magicTravelY, setMagicTravelY] = useState<number | null>(null)
  const [magicDone, setMagicDone] = useState(!magicMode)
  const magicProgress = useSharedValue(magicMode ? 0 : 1)
  const magicTravelSv = useSharedValue(0)
  const magicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stackAnchorRef = useRef<View>(null)
  const rootRef = useRef<View>(null)
  const [overlayTop, setOverlayTop] = useState<number | null>(null)
  const showTargetStack = !magicMode || magicDone
  const showChrome = !magicMode || magicDone

  const displayUris = useMemo(() => {
    const next: Partial<Record<CapturePart, string>> = {}
    for (const part of PARTS) {
      const raw = uris[part]
      if (raw) next[part] = `${raw}?t=${bust}`
    }
    return next
  }, [uris, bust])

  useFocusEffect(
    useCallback(() => {
      void hydrateReadingDraft().then(() => {
        const next = urisFromDraft()
        setUris(next)
        setBust(Date.now())
        const fromParam = parsePart(params.part)
        setActivePart(fromParam ?? firstEmpty(next))
      })
    }, [params.part])
  )

  const poseSpread = (() => {
    const raw = params.spread
    if (handoff) return handoff.spread
    if (!raw) return 1
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1
  })()

  const poseRitual = (() => {
    const raw = params.ritual
    if (handoff) return handoff.ritual
    if (!raw) return magicMode ? 1 : 0
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : magicMode ? 1 : 0
  })()

  useEffect(() => {
    if (!magicMode || magicDone || overlayTop != null) return
    rootRef.current?.measureInWindow((_x, rootY, _w, rootH) => {
      const startY = handoff?.startCenterY ?? rootY + rootH / 2
      setOverlayTop(startY - POLAROID_STACK_H / 2 - rootY)
    })
  }, [handoff?.startCenterY, magicDone, magicMode, overlayTop])

  useEffect(() => {
    if (!magicMode || magicDone || overlayTop == null || targetLocalTop == null) return
    if (magicTravelY != null) return
    const travel = targetLocalTop - overlayTop
    setMagicTravelY(travel)
    magicTravelSv.value = travel
  }, [magicDone, magicMode, magicTravelSv, magicTravelY, overlayTop, targetLocalTop])

  useEffect(() => {
    if (!magicMode || magicDone || magicTravelY == null) return
    magicProgress.value = 0
    magicTimerRef.current = setTimeout(() => {
      magicProgress.value = withTiming(
        1,
        { duration: 520, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setMagicDone)(true)
          }
        }
      )
    }, MAGIC_HOLD_MS)
    return () => {
      if (magicTimerRef.current) {
        clearTimeout(magicTimerRef.current)
        magicTimerRef.current = null
      }
    }
  }, [magicDone, magicMode, magicProgress, magicTravelY])

  const magicOverlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: magicTravelSv.value * magicProgress.value }],
  }))

  const continueFunnel = useCallback(async () => {
    if (!draftHasThreePhotos(getReadingDraft())) return
    const draft = getReadingDraft()
    if (!draftReadyForPaywall(draft)) {
      router.push('/birth')
      return
    }
    if (isPro) {
      if (
        await alertIfPhotosUnchanged({
          draft,
          locale,
          onUpdatePhotos: () => undefined,
        })
      ) {
        return
      }
      const started = startReadingJob({
        locale,
        outputKind: 'period_brief',
        isPro: true,
        draft,
        onQueued: () => {
          void showReadingStartedHandoff({ locale })
        },
      })
      if (started) {
        router.replace('/(app)' as never)
        return
      }
      Alert.alert(
        s('解读进行中', '解讀進行中', 'Reading in progress', '解読中'),
        s(
          '请等待当前解读完成。',
          '請等待目前解讀完成。',
          'Wait for the current reading to finish.',
          '現在の解読が終わるまでお待ちください。'
        )
      )
      return
    }
    router.push('/(commerce)/paywall' as never)
  }, [isPro, locale, s])

  const applyUri = useCallback(
    async (sourceUri: string) => {
      setBusy(true)
      try {
        const durable = await persistPeriodPhoto(activePart, sourceUri)
        const clean = durable.split('?')[0] ?? durable
        patchPart(activePart, clean)
        setUris((prev) => ({ ...prev, [activePart]: clean }))
        setBust(Date.now())
        if (slotMode) return
        const after = { ...urisFromDraft(), [activePart]: clean }
        if (draftHasThreePhotos(getReadingDraft())) {
          await continueFunnel()
          return
        }
        setActivePart(firstEmpty(after))
      } catch (err) {
        const code = err instanceof Error ? err.message : ''
        Alert.alert(
          s('保存失败', '儲存失敗', 'Save failed', '保存に失敗'),
          code === 'photo_encode_failed'
            ? s(
                '无法将照片转为 JPEG。请换一张或改用相机拍摄。',
                '無法將照片轉為 JPEG。請換一張或改用相機拍攝。',
                'Could not convert to JPEG. Pick another photo or use the camera.',
                'JPEG に変換できませんでした。別の写真を選ぶか、カメラで撮影してください。'
              )
            : s(
                '无法写入本机照片。请重试或检查存储空间。',
                '無法寫入本機照片。請重試或檢查儲存空間。',
                'Could not save the photo on device. Try again.',
                '端末に保存できませんでした。もう一度お試しください。'
              )
        )
      } finally {
        setBusy(false)
      }
    },
    [activePart, continueFunnel, locale, slotMode, s]
  )

  const confirmReplace = (onConfirm: () => void) => {
    if (!uris[activePart]) {
      onConfirm()
      return
    }
    Alert.alert(
      s('替换照片', '替換照片', 'Replace photo', '写真を差し替え'),
      s(
        '替换后本机旧图将删除。原图不会上传到服务器。',
        '替換後本機舊圖將刪除。原圖不會上傳到伺服器。',
        'The previous on-device photo will be deleted. Source images are never kept on our servers.',
        '端末の前の写真は削除されます。原画像はサーバーに保存されません。'
      ),
      [
        { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
        {
          text: s('替换', '替換', 'Replace', '差し替え'),
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    )
  }

  const shoot = async () => {
    if (busy) return
    const perm = await ensureCameraPermission(locale)
    if (perm !== 'ok') return
    confirmReplace(() => {
      void (async () => {
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.85,
          allowsEditing: true,
          exif: false,
        })
        if (result.canceled || !result.assets[0]?.uri) return
        await applyUri(result.assets[0].uri)
      })()
    })
  }

  const pickFromLibrary = async () => {
    if (busy) return
    const perm = await ensureLibraryPermission(locale)
    if (perm !== 'ok') return
    confirmReplace(() => {
      void (async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          allowsEditing: true,
          exif: false,
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        })
        if (result.canceled || !result.assets[0]?.uri) return
        await applyUri(result.assets[0].uri)
      })()
    })
  }

  const onPrimary = () => {
    if (slotMode) {
      if (uris[activePart]) router.back()
      return
    }
    if (draftHasThreePhotos(getReadingDraft())) {
      void continueFunnel()
    }
  }

  const partTitle =
    activePart === 'palm_l' ? labels.palmL : activePart === 'palm_r' ? labels.palmR : labels.face
  const hasActive = Boolean(uris[activePart])
  const allReady = PARTS.every((p) => uris[p])

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
      }}
    >
      <View style={{ zIndex: 2, marginBottom: spacing.sm, display: showChrome ? 'flex' : 'none' }}>
        <Text style={{ color: colors.secondary, fontSize: 13 }}>
          {slotMode
            ? s('本期槽位', '本期槽位', 'Period slot', '今回のスロット')
            : s('三张入镜', '三張入鏡', 'Three photos', '三枚の写真')}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: '600',
            marginTop: spacing.xs,
          }}
        >
          {partTitle}
        </Text>
        <Text
          style={{
            color: colors.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginTop: spacing.xs,
          }}
        >
          {copy.quality}
        </Text>
      </View>

      <View
        ref={stackAnchorRef}
        collapsable={false}
        onLayout={() => {
          if (targetLocalTop != null) return
          rootRef.current?.measureInWindow((_x, rootY) => {
            stackAnchorRef.current?.measureInWindow((_x, targetY) => {
              setTargetLocalTop(targetY - rootY)
            })
          })
        }}
        style={{
          marginTop: spacing.lg,
          width: POLAROID_FAN_W,
          height: POLAROID_STACK_H,
          alignSelf: 'center',
          zIndex: 1,
        }}
        pointerEvents={showTargetStack ? 'auto' : 'none'}
      >
        {showTargetStack ? (
          <OffsetPhotoStack
            uris={displayUris}
            labels={labels}
            activePart={activePart}
            onPressPart={(part) => setActivePart(part)}
            spread={poseSpread}
            ritual={poseRitual}
            compact
            interactive
            instantPose={handoff != null}
          />
        ) : null}
      </View>

      <Text
        style={{
          color: colors.dim,
          fontSize: 12,
          lineHeight: 18,
          textAlign: 'center',
          display: showChrome ? 'flex' : 'none',
        }}
      >
        {hasActive ? copy.privacy : copy.empty}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          display: showChrome ? 'flex' : 'none',
        }}
      >
        <Pressable
          onPress={() => void shoot()}
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
          <Text style={{ color: colors.text }}>{hasActive ? copy.retake : copy.camera}</Text>
        </Pressable>
        <Pressable
          onPress={() => void pickFromLibrary()}
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
            {hasActive ? copy.replaceLibrary : copy.library}
          </Text>
        </Pressable>
      </View>

      <View style={{ display: showChrome ? 'flex' : 'none' }}>
        <Button
          variant='primary'
          onPress={onPrimary}
          disabled={busy || (slotMode ? !hasActive : !allReady)}
        >
          {slotMode
            ? copy.done
            : allReady
              ? draftHasBirthInfo(getReadingDraft())
                ? copy.continueUnlock
                : copy.continueBirth
              : copy.nextSlot}
        </Button>
      </View>

      {magicMode && !magicDone && overlayTop != null ? (
        <Animated.View
          pointerEvents='none'
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: overlayTop,
              alignItems: 'center',
              zIndex: 3,
            },
            magicOverlayStyle,
          ]}
        >
          <View style={{ width: POLAROID_FAN_W, height: POLAROID_STACK_H }}>
            <OffsetPhotoStack
              uris={displayUris}
              labels={labels}
              spread={poseSpread}
              ritual={poseRitual}
              compact
              instantPose
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  )
}
