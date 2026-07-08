/**
 * (new-site)/floorplan — step 4 of 6 (optional).
 *
 * 户型图上传 + 北向对齐 (interior 堪舆). The user uploads 1 floor plan (apartment)
 * or N (villa/multi-floor), then dials the true-north bearing of the plan's top
 * edge. Each image is uploaded immediately (base64 → HMAC route → owned R2 key,
 * EXIF stripped server-side); the keys + north bearing are saved to the draft
 * and consumed at createSite. The analysis overlays a luopan on each plan and
 * runs ONE Gemini vision pass per image to localize rooms into the 九宫.
 *
 * Skippable: without a floor plan the report is exterior-only (no room-level 化解).
 */

import { maxFloorplanImagesFor } from '@zhop/astro-core'
import { Button, useHaptic } from '@zhop/core-ui'
import { useUploadFloorplan } from '@zhop/scenario-feng'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Plus, RotateCcw, X } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LuopanDial } from '@/components/LuopanDial'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { loadDraft, patchDraft } from '@/lib/siteDraft'
import { spacing, useFengTheme } from '@/lib/theme'

interface FloorplanItem {
  key: string
  /** Local file:// preview (only for images picked this session). */
  previewUri?: string
}

function contentTypeFor(
  asset: ImagePicker.ImagePickerAsset
): 'image/png' | 'image/jpeg' | 'image/webp' {
  const m = asset.mimeType ?? ''
  if (m.includes('png')) return 'image/png'
  if (m.includes('webp')) return 'image/webp'
  return 'image/jpeg'
}

function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function clamp01(n: number): number {
  return Math.min(0.95, Math.max(0.05, n))
}

function JiugongOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <View pointerEvents='none' style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {[1 / 3, 2 / 3].map((frac) => (
        <View
          key={`v-${frac}`}
          style={{
            position: 'absolute',
            left: `${frac * 100}%`,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: 'rgba(212,212,216,0.35)',
          }}
        />
      ))}
      {[1 / 3, 2 / 3].map((frac) => (
        <View
          key={`h-${frac}`}
          style={{
            position: 'absolute',
            top: `${frac * 100}%`,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'rgba(212,212,216,0.35)',
          }}
        />
      ))}
    </View>
  )
}

export default function FloorplanScreen() {
  const router = useRouter()
  const { colors } = useFengTheme()
  const t = useStrings(resolveLocale())
  const haptic = useHaptic()
  const insets = useSafeAreaInsets()
  const upload = useUploadFloorplan()

  const [items, setItems] = useState<FloorplanItem[]>([])
  const [maxImages, setMaxImages] = useState(1)
  const [orientDeg, setOrientDeg] = useState(0)
  const [centerNorm, setCenterNorm] = useState({ x: 0.5, y: 0.5 })
  const [showGrid, setShowGrid] = useState(true)
  const [previewSize, setPreviewSize] = useState({ w: 260, h: 260 })
  const dragStart = useRef(centerNorm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const d = await loadDraft()
      setMaxImages(maxFloorplanImagesFor(d.residenceType ?? 'apartment'))
      if (Array.isArray(d.floorplanImages) && d.floorplanImages.length > 0) {
        setItems(d.floorplanImages.map((im) => ({ key: im.key })))
      }
      if (typeof d.floorplanOrientDeg === 'number') setOrientDeg(normDeg(d.floorplanOrientDeg))
      if (d.floorplanCenterNorm) setCenterNorm(d.floorplanCenterNorm)
    })()
  }, [])

  const cover = items[0]
  const hasPreview = Boolean(cover?.previewUri)

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => hasPreview,
        onMoveShouldSetPanResponder: () => hasPreview,
        onPanResponderGrant: () => {
          dragStart.current = centerNorm
        },
        onPanResponderMove: (_, gesture) => {
          const { w, h } = previewSize
          setCenterNorm({
            x: clamp01(dragStart.current.x + gesture.dx / w),
            y: clamp01(dragStart.current.y + gesture.dy / h),
          })
        },
      }),
    [hasPreview, centerNorm, previewSize]
  )

  const pick = async () => {
    if (busy || items.length >= maxImages) return
    setError(null)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError(t.new_site_floorplan_permission)
      return
    }
    const remaining = maxImages - items.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      base64: true,
      quality: 0.8,
    })
    if (result.canceled) return

    setBusy(true)
    try {
      const uploaded: FloorplanItem[] = []
      for (const asset of result.assets) {
        if (!asset.base64) continue
        const key = await upload(asset.base64, contentTypeFor(asset))
        uploaded.push({ key, previewUri: asset.uri })
      }
      if (uploaded.length > 0) void haptic('success')
      setItems((prev) => [...prev, ...uploaded].slice(0, maxImages))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const removeAt = (index: number) => {
    void haptic('selection')
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const nudge = (delta: number) => {
    void haptic('selection')
    setOrientDeg((d) => normDeg(d + delta))
  }

  const persistAndGo = async (withFloorplan: boolean) => {
    await patchDraft({
      floorplanImages: withFloorplan ? items.map((im) => ({ key: im.key })) : [],
      floorplanOrientDeg: withFloorplan ? orientDeg : undefined,
      floorplanCenterNorm: withFloorplan && hasPreview ? centerNorm : undefined,
    })
    router.push('/(new-site)/review')
  }

  const hasImages = items.length > 0

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        gap: spacing.lg,
        backgroundColor: colors.bg,
        flexGrow: 1,
      }}
    >
      <StatusBar style='light' />
      <ProgressIndicator step={3} total={4} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>
        {t.new_site_floorplan_title}
      </Text>
      <Text style={{ color: colors.textMute, fontSize: 13, lineHeight: 20 }}>
        {t.new_site_floorplan_desc}
      </Text>

      {/* North-align preview: cover plan with a luopan overlay rotated to north. */}
      {cover?.previewUri ? (
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            {...pan.panHandlers}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout
              setPreviewSize({ w: width, h: height })
            }}
            style={{
              width: 260,
              height: 260,
              borderRadius: 0,
              overflow: 'hidden',
              backgroundColor: colors.surface,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <Image
              source={{ uri: cover.previewUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode='contain'
            />
            <View
              pointerEvents='none'
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.55,
                transform: [{ rotate: `${-orientDeg}deg` }],
              }}
            >
              <LuopanDial size={230} tone='dark' detail='standard' />
            </View>
            <View
              pointerEvents='none'
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ rotate: `${-orientDeg}deg` }],
              }}
            >
              <JiugongOverlay visible={showGrid} />
            </View>
            <View
              pointerEvents='none'
              style={{
                position: 'absolute',
                left: centerNorm.x * previewSize.w - 10,
                top: centerNorm.y * previewSize.h - 10,
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: colors.accent,
                backgroundColor: 'rgba(9,9,11,0.55)',
              }}
            />
          </View>

          <Pressable onPress={() => setShowGrid((v) => !v)} hitSlop={8}>
            <Text style={{ color: colors.textMute, fontSize: 12 }}>
              {showGrid ? t.new_site_floorplan_grid_hide : t.new_site_floorplan_grid_show}
            </Text>
          </Pressable>

          {/* North bearing control */}
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ color: colors.textMute, fontSize: 12, letterSpacing: 1 }}>
              {t.new_site_floorplan_north_label}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <NudgeBtn label='−15°' onPress={() => nudge(-15)} colors={colors} />
              <NudgeBtn label='−1°' onPress={() => nudge(-1)} colors={colors} />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                  width: 64,
                  textAlign: 'center',
                }}
              >
                {Math.round(orientDeg)}°
              </Text>
              <NudgeBtn label='+1°' onPress={() => nudge(1)} colors={colors} />
              <NudgeBtn label='+15°' onPress={() => nudge(15)} colors={colors} />
              <Pressable
                onPress={() => nudge(-orientDeg)}
                hitSlop={8}
                accessibilityLabel={t.new_site_floorplan_north_reset}
                style={{ padding: spacing.sm }}
              >
                <RotateCcw size={16} color={colors.textMute} strokeWidth={1.6} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Thumbnail strip + add button */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {items.map((im, index) => (
          <View
            key={im.key}
            style={{
              width: 72,
              height: 72,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: colors.surface,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            {im.previewUri ? (
              <Image
                source={{ uri: im.previewUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode='cover'
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textMute, fontSize: 11 }}>{index + 1}</Text>
              </View>
            )}
            <Pressable
              onPress={() => removeAt(index)}
              hitSlop={6}
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: 999,
                padding: 2,
              }}
            >
              <X size={12} color='#fff' strokeWidth={2} />
            </Pressable>
          </View>
        ))}
        {items.length < maxImages ? (
          <Pressable
            onPress={pick}
            disabled={busy}
            accessibilityRole='button'
            accessibilityLabel={t.new_site_floorplan_add}
            style={{
              width: 72,
              height: 72,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Plus size={22} color={colors.textMute} strokeWidth={1.6} />
            )}
          </Pressable>
        ) : null}
      </View>

      {hasImages ? (
        <Text style={{ color: colors.textMute, fontSize: 12 }}>
          {items.length > 1
            ? t.new_site_floorplan_count_villa.replace('{n}', String(items.length))
            : t.new_site_floorplan_count_one}
        </Text>
      ) : null}

      {items.length >= maxImages && maxImages > 1 ? (
        <Text style={{ color: colors.textMute, fontSize: 12 }}>
          {t.new_site_floorplan_max.replace('{n}', String(maxImages))}
        </Text>
      ) : null}

      {error ? <Text style={{ color: colors.warning, fontSize: 13 }}>{error}</Text> : null}

      <View style={{ flex: 1, minHeight: spacing.lg }} />

      {hasImages ? (
        <Button variant='primary' size='lg' fullWidth onPress={() => void persistAndGo(true)}>
          {t.new_site_floorplan_continue}
        </Button>
      ) : (
        <Button variant='primary' size='lg' fullWidth onPress={pick} loading={busy}>
          {t.new_site_floorplan_add}
        </Button>
      )}
      <Pressable
        onPress={() => void persistAndGo(false)}
        accessibilityRole='button'
        style={{ paddingVertical: spacing.md, alignItems: 'center' }}
      >
        <Text style={{ color: colors.textMute, fontSize: 14, fontWeight: '600' }}>
          {t.new_site_floorplan_skip}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

function NudgeBtn({
  label,
  onPress,
  colors,
}: {
  label: string
  onPress: () => void
  colors: { border: string; text: string }
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}
