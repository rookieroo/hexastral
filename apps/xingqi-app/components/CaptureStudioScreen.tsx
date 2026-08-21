import { Button, useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Camera, Image as ImageIcon } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, BackHandler, Linking, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OffsetPhotoStack } from '@/components/OffsetPhotoStack'
import { setHomeCaptureHandoff } from '@/lib/home-capture-handoff'
import { resolveLocale } from '@/lib/i18n'
import { captureStudioCopy, partLabels, periodCarryHint } from '@/lib/living-copy'
import { pickUi } from '@/lib/locale-zh'
import { persistPeriodPhoto } from '@/lib/period-photos'
import {
  type CapturePart,
  clearReadingDraftSlot,
  draftAllowsPartial,
  draftChangedParts,
  draftHasAnyPhoto,
  draftHasBirthInfo,
  draftPhotoReadyForReading,
  draftReadyForPaywall,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
  syncPartialMetaFromChanged,
  undiscardCarryPart,
} from '@/lib/reading-draft'
import { startReadingJob } from '@/lib/reading-job'
import { alertIfPhotosUnchanged } from '@/lib/reading-preflight'
import { POLAROID_FAN_W, POLAROID_FACE_FOCUS_MS, POLAROID_STACK_H } from '@/lib/stack-layout'

function parsePart(raw: unknown): CapturePart | undefined {
  if (raw === 'palm_l' || raw === 'palm_r' || raw === 'face') return raw
  return undefined
}

const PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']
const CAPTURE_ORDER: CapturePart[] = ['face', 'palm_l', 'palm_r']

function firstEmpty(uris: Partial<Record<CapturePart, string>>): CapturePart {
  return CAPTURE_ORDER.find((p) => !uris[p]) ?? 'face'
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
  undiscardCarryPart(part)
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

export type CaptureStudioScreenProps = {
  /** Render inside home (empty stack) instead of a dedicated route. */
  embedded?: boolean
  /** Bottom dock only — photos live in the home wheel draft row. */
  dockOnly?: boolean
  /** Parent is fading this layer out — drop dock/stack so timeline isn't double-drawn. */
  exiting?: boolean
  mode?: 'slot' | 'full'
  part?: CapturePart
  /** Controlled selection (period dock on home wheel). */
  activePart?: CapturePart
  onActivePartChange?: (part: CapturePart | undefined) => void
  onPhotosChanged?: () => void
  /** Slot mode: after save / Done. Embedded full: Close — may wipe period draft photos. */
  onExit?: () => void
  /** After job starts — dismiss capture without wiping photos needed for extract. */
  onHandoff?: () => void
  /** Bump when parent regains focus (e.g. after DEV Pro toggle in Settings). */
  entitlementRevision?: number
}

export function CaptureStudioScreen({
  embedded = false,
  dockOnly = false,
  exiting = false,
  mode: modeProp,
  part: partProp,
  activePart: activePartProp,
  onActivePartChange,
  onPhotosChanged,
  onExit,
  onHandoff,
  entitlementRevision = 0,
}: CaptureStudioScreenProps = {}) {
  const { colors, spacing, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const copy = captureStudioCopy(locale)
  const labels = partLabels(locale)
  const params = useLocalSearchParams<{ mode?: string; part?: string }>()
  const slotMode = modeProp === 'slot' || (modeProp == null && params.mode === 'slot')
  const initialPart = partProp ?? parsePart(params.part)
  const entitlements = useEntitlements()
  const [entitlementTick, setEntitlementTick] = useState(0)
  const isPro = useMemo(() => {
    void entitlementTick
    void entitlementRevision
    return (
      hasEntitlement(entitlements, 'faceoracle_pro') ||
      hasEntitlement(entitlements, 'universe_pro')
    )
  }, [entitlements, entitlementTick, entitlementRevision])

  useFocusEffect(
    useCallback(() => {
      setEntitlementTick((n) => n + 1)
    }, [])
  )

  const [activePartLocal, setActivePartLocal] = useState<CapturePart | undefined>(() => {
    // Embedded / dock: settle first, then auto-focus Face with lift animation.
    if ((embedded || dockOnly) && !initialPart && activePartProp === undefined) return undefined
    return initialPart ?? 'face'
  })
  const activePart = activePartProp !== undefined ? activePartProp : activePartLocal
  const setActivePart = useCallback(
    (part: CapturePart | undefined) => {
      if (onActivePartChange) onActivePartChange(part)
      else setActivePartLocal(part)
    },
    [onActivePartChange]
  )
  const autoFocusedRef = useRef(false)
  const settlingExitRef = useRef(false)
  const [uris, setUris] = useState<Partial<Record<CapturePart, string>>>({})
  const [bust, setBust] = useState(0)
  const [busy, setBusy] = useState(false)
  const [changedParts, setChangedParts] = useState<CapturePart[]>([])

  const refreshChanged = useCallback(() => {
    void draftChangedParts(getReadingDraft()).then((parts) => {
      setChangedParts(parts)
      syncPartialMetaFromChanged(parts)
    })
  }, [])

  const displayUris = useMemo(() => {
    const next: Partial<Record<CapturePart, string>> = {}
    for (const part of PARTS) {
      const raw = uris[part]
      if (raw) next[part] = `${raw}?t=${bust}`
    }
    return next
  }, [uris, bust])

  const hydrate = useCallback(() => {
    const apply = () => {
      const next = urisFromDraft()
      setUris(next)
      setBust(Date.now())
      refreshChanged()
      // Keep unset so delayed Face focus can animate lift (see effect below).
      if ((embedded || dockOnly) && !initialPart && activePartProp === undefined) {
        return
      }
      setActivePart(initialPart ?? firstEmpty(next))
    }
    if ((embedded || dockOnly) && draftHasAnyPhoto(getReadingDraft())) {
      apply()
      return
    }
    void hydrateReadingDraft().then(apply)
  }, [activePartProp, dockOnly, embedded, initialPart, refreshChanged, setActivePart])

  useEffect(() => {
    if (dockOnly || !embedded || initialPart) return
    if (autoFocusedRef.current || settlingExitRef.current) return
    if (activePart) {
      autoFocusedRef.current = true
      return
    }
    const t = setTimeout(() => {
      if (settlingExitRef.current) return
      setActivePart(firstEmpty(urisFromDraft()))
      autoFocusedRef.current = true
    }, POLAROID_FACE_FOCUS_MS)
    return () => clearTimeout(t)
  }, [activePart, dockOnly, embedded, initialPart, setActivePart])

  useFocusEffect(
    useCallback(() => {
      if (embedded || dockOnly) return
      hydrate()
    }, [dockOnly, embedded, hydrate])
  )

  useEffect(() => {
    if (!embedded && !dockOnly) return
    hydrate()
  }, [dockOnly, embedded, hydrate])

  /** Leave immediately — deselect settle fights the timeline underlay fade. */
  const settleThenExit = useCallback(() => {
    if (!onExit) return
    settlingExitRef.current = true
    if (activePart) setActivePart(undefined)
    onExit()
  }, [activePart, onExit, setActivePart])

  useEffect(() => {
    if ((!embedded && !dockOnly) || !onExit) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      settleThenExit()
      return true
    })
    return () => sub.remove()
  }, [dockOnly, embedded, onExit, settleThenExit])

  const continueFunnel = useCallback(async () => {
    try {
      await hydrateReadingDraft()
      let draft = getReadingDraft()
      const changed = await draftChangedParts(draft)
      syncPartialMetaFromChanged(changed)
      if (changed.length > 0 && changed.length < 3 && !draft.outputKind) {
        patchReadingDraft({ outputKind: 'period_brief' })
      }
      draft = getReadingDraft()
      if (!draftPhotoReadyForReading(draft)) {
        Alert.alert(
          s('还差面部', '還差面部', 'Face photo needed', '顔写真が必要です'),
          s(
            '请先拍摄或选择面部照片。',
            '請先拍攝或選擇面部照片。',
            'Capture or choose a face photo first.',
            '先に顔写真を撮影または選択してください。'
          )
        )
        setActivePart('face')
        return
      }
      if (!draftHasBirthInfo(draft)) {
        if (embedded) setHomeCaptureHandoff()
        router.push('/birth')
        return
      }
      if (!draftReadyForPaywall(draft)) return
      if (isPro) {
        if (
          await alertIfPhotosUnchanged({
            draft: getReadingDraft(),
            locale,
            onUpdatePhotos: () => undefined,
          })
        ) {
          return
        }
        const started = startReadingJob({
          locale,
          outputKind: getReadingDraft().outputKind ?? 'oneshot',
          isPro: true,
          draft: getReadingDraft(),
        })
        if (started) {
          // Keep period JPEGs on disk for extract — Close path wipes; handoff must not.
          ;(onHandoff ?? onExit)?.()
          if (!embedded) router.replace('/(app)' as never)
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
      // Free: leave capture with photos intact so timeline draft shows the unfinished set.
      ;(onHandoff ?? onExit)?.()
      router.push('/(commerce)/paywall' as never)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[xingqi.capture] continue_funnel_failed', msg)
      Alert.alert(
        s('无法继续', '無法繼續', 'Could not continue', '続行できません'),
        s(
          '请稍后重试。若持续失败，可先关闭再打开录入。',
          '請稍後重試。若持續失敗，可先關閉再打開錄入。',
          'Try again in a moment. If it keeps failing, close capture and reopen.',
          'しばらくしてから再試してください。続く場合は撮影を閉じて開き直してください。'
        )
      )
    }
  }, [embedded, isPro, locale, onExit, onHandoff, s, setActivePart])

  const applyUri = useCallback(
    async (sourceUri: string) => {
      const part = activePart ?? firstEmpty(urisFromDraft())
      if (!activePart) setActivePart(part)
      setBusy(true)
      try {
        const durable = await persistPeriodPhoto(part, sourceUri)
        const clean = durable.split('?')[0] ?? durable
        patchPart(part, clean)
        setUris((prev) => ({ ...prev, [part]: clean }))
        setBust(Date.now())
        const changed = await draftChangedParts(getReadingDraft())
        setChangedParts(changed)
        syncPartialMetaFromChanged(changed)
        onPhotosChanged?.()
        if (slotMode) return
        // Face unlocks the reading CTA; auto-advance only when birth is also ready.
        if (draftPhotoReadyForReading(getReadingDraft()) && draftHasBirthInfo(getReadingDraft())) {
          await continueFunnel()
          return
        }
        const after = { ...urisFromDraft(), [part]: clean }
        const nextEmpty = firstEmpty(after)
        if (after[nextEmpty]) {
          // All slots filled on a period refresh — stay on last part; CTA enabled.
          return
        }
        setActivePart(nextEmpty)
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
    [activePart, continueFunnel, locale, onPhotosChanged, setActivePart, slotMode, s]
  )

  const needsSlotPick = dockOnly && !slotMode && !activePart

  const confirmReplace = (onConfirm: () => void) => {
    const part = activePart ?? 'face'
    if (!uris[part]) {
      onConfirm()
      return
    }
    Alert.alert(
      s('替换照片', '替換照片', 'Replace photo', '写真を差し替え'),
      s(
        '替换后本机旧图将删除。解读时会短暂上传新图用于提取，处理后删除。',
        '替換後本機舊圖將刪除。解讀時會短暫上傳新圖用於提取，處理後刪除。',
        'The previous on-device photo will be deleted. New photos are briefly uploaded for extract, then deleted.',
        '端末の前の写真は削除されます。新しい写真は抽出のため短時間アップロードし、処理後に削除します。'
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
    if (needsSlotPick) return
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
    if (needsSlotPick) return
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

  const hasActive = activePart ? Boolean(uris[activePart]) : false
  const draftNow = getReadingDraft()
  const hasActiveCarry =
    activePart === 'palm_l'
      ? Boolean(draftNow.palmLeftFeatureId)
      : activePart === 'palm_r'
        ? Boolean(draftNow.palmRightFeatureId)
        : activePart === 'face'
          ? Boolean(draftNow.faceFeatureId)
          : false
  const canClearSlot = Boolean(activePart) && (hasActive || hasActiveCarry)
  const periodMode = draftAllowsPartial(draftNow)
  const canCarryPalms = Boolean(draftNow.palmLeftFeatureId && draftNow.palmRightFeatureId)
  // Face JPEG unlocks primary CTA (palms optional at this gate).
  const submitReady = draftPhotoReadyForReading(draftNow)

  const clearActiveSlot = () => {
    const part = activePart
    if (!part || busy) return
    Alert.alert(
      s('清除此张？', '清除此張？', 'Clear this slot?', 'この枠を消しますか？'),
      s(
        '将删除本机草稿图，并取消沿用上次特征。需要时可再拍。',
        '將刪除本機草稿圖，並取消沿用上次特徵。需要時可再拍。',
        'Deletes the on-device draft and stops reusing the last extract. You can capture again anytime.',
        '端末の下書きを消し、前回特徴の引き継ぎをやめます。また撮影できます。'
      ),
      [
        { text: s('取消', '取消', 'Cancel', 'キャンセル'), style: 'cancel' },
        {
          text: s('清除', '清除', 'Clear', '削除'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true)
              try {
                await clearReadingDraftSlot(part)
                setUris(urisFromDraft())
                setBust(Date.now())
                refreshChanged()
                onPhotosChanged?.()
              } finally {
                setBusy(false)
              }
            })()
          },
        },
      ]
    )
  }

  const onPrimary = () => {
    const part = activePart ?? firstEmpty(urisFromDraft())
    if (slotMode) {
      if (part && uris[part]) {
        if (onExit) onExit()
        else router.back()
      }
      return
    }
    if (submitReady) {
      void continueFunnel()
      return
    }
    // No face yet: jump to next empty slot (label is "下一张").
    if (!periodMode) {
      const next = firstEmpty(urisFromDraft())
      setActivePart(next)
    }
  }

  const partTitle = activePart
    ? activePart === 'palm_l'
      ? labels.palmL
      : activePart === 'palm_r'
        ? labels.palmR
        : labels.face
    : labels.face
  const primaryLabel = slotMode
    ? copy.done
    : submitReady
      ? draftHasBirthInfo(draftNow)
        ? isPro
          ? copy.continueReading
          : copy.continueUnlock
        : copy.continueBirth
      : periodMode
        ? copy.continueReading
        : copy.nextSlot
  const carryHint = periodCarryHint(locale)

  const dock = (
    <View
      style={{
        ...(dockOnly
          ? { paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.lg, gap: spacing.sm }
          : {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: spacing.xl,
              paddingBottom: insets.bottom + spacing.lg,
              gap: spacing.sm,
              backgroundColor: colors.bg,
            }),
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
        {partTitle}
      </Text>
      {!slotMode ? (
        <Text
          style={{
            color: colors.dim,
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
            marginBottom: spacing.xs,
          }}
        >
          {needsSlotPick
            ? copy.selectSlot
            : periodMode || canCarryPalms
              ? carryHint
              : hasActive
                ? copy.privacy
                : copy.empty}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Pressable
          onPress={() => void shoot()}
          disabled={busy || needsSlotPick}
          style={{
            flex: 1,
            borderWidth: 0.5,
            borderColor: isDark ? colors.accent : colors.separator,
            backgroundColor: colors.cardElevated,
            padding: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: busy || needsSlotPick ? 0.5 : 1,
          }}
        >
          <Camera size={18} color={colors.text} strokeWidth={1.6} />
          <Text style={{ color: colors.text }}>{hasActive ? copy.retake : copy.camera}</Text>
        </Pressable>
        <Pressable
          onPress={() => void pickFromLibrary()}
          disabled={busy || needsSlotPick}
          style={{
            flex: 1,
            borderWidth: 0.5,
            borderColor: isDark ? colors.accent : colors.separator,
            backgroundColor: colors.cardElevated,
            padding: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: busy || needsSlotPick ? 0.5 : 1,
          }}
        >
          <ImageIcon size={18} color={colors.text} strokeWidth={1.6} />
          <Text style={{ color: colors.text }}>
            {hasActive ? copy.replaceLibrary : copy.library}
          </Text>
        </Pressable>
      </View>
      <Button
        variant='primary'
        onPress={onPrimary}
        disabled={busy || (slotMode ? !hasActive : !submitReady)}
      >
        {primaryLabel}
      </Button>
      {(embedded || dockOnly) && onExit ? (
        <Pressable
          onPress={settleThenExit}
          disabled={busy}
          accessibilityRole='button'
          accessibilityLabel={copy.close}
          style={{ alignItems: 'center', paddingVertical: spacing.sm }}
        >
          <Text style={{ color: colors.secondary, fontSize: 15 }}>{copy.close}</Text>
        </Pressable>
      ) : null}
    </View>
  )

  if (dockOnly) {
    return dock
  }

  // Solid veil only — avoids empty polaroids + dock fighting the timeline during fade.
  if (exiting) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        pointerEvents='box-none'
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
        }}
      >
        <View style={{ width: POLAROID_FAN_W, height: POLAROID_STACK_H, overflow: 'visible' }}>
          <OffsetPhotoStack
            uris={displayUris}
            labels={labels}
            activePart={activePart}
            onPressPart={(part) => setActivePart(part)}
            onClearActive={canClearSlot && !busy ? clearActiveSlot : undefined}
            clearAccessibilityLabel={copy.clearSlot}
            spread={1}
            ritual={1}
            compact
            interactive
            instantPose
            photoCache='none'
          />
        </View>
      </View>

      {dock}
    </View>
  )
}
