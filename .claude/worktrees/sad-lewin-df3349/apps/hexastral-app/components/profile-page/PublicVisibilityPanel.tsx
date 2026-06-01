/**
 * Public Visibility Panel — 公开 / 分享设置
 *
 * 总开关 `公开个人星盘` + 4 个细粒度子开关 (仅在总开关开启时显示)。
 *
 * Strategy: mirror server visibility when there are no pending outbound PATCHes;
 * sub-toggle changes debounce-merge into `PATCH /api/user/visibility` (panel stays
 * mounted on You tab, so unmount-only flush would never hit D1). Unmount still
 * flushes any in-flight debounce timer + pending keys.
 *
 * ── UI ↔ visibility ↔ 公开展示（与 hexastral-web 对齐矩阵）──────────────────
 * `chartPublic`（总开关）为 false 时：API `GET /api/user/by-username/:u` 返回 403，
 * Web `/u/:username` 应 404；子开关仅在总开关为 true 时经 `public_visibility_json` 生效。
 *
 * | 开关 key   | iOS / API 含义           | hexastral-web 消费情况                          |
 * |------------|-------------------------|-----------------------------------------------|
 * | bazi       | 八字四柱（API 不向 Web 暴露生日/城市） | Web：`/chart` natal + 四柱（`visibility.bazi`） |
 * | ziwei      | 紫微盘结构               | `/chart` 是否返回 `stellar`                    |
 * | basic      | 基本资料与解读次数       | Web：头像、昵称、@、since、`totalReadings` 行   |
 * | signature  | 命理签名                 | Web `/u` + OG（`visibility.signature`）       |
 * | plainIntro | HexAstral解读节选       | Web `/u` 文案块（`plainIntroExcerpt`，ch1）      |
 *
 * 底栏下载 CTA 在总开关开启时始终展示（无单独子开关）。
 */

import { Info, Share2 } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  Share as RNShare,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { ToggleRow } from '@/components/ui/ToggleRow'
import {
  type PublicVisibility,
  usePatchVisibility,
  useVisibilityQuery,
} from '@/lib/hooks/useVisibility'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

interface PublicVisibilityPanelProps {
  userId: string | null | undefined
  username: string | null | undefined
  chartPublic: boolean
  hasUsername: boolean
  isSavingPublic: boolean
  onToggleChartPublic: (next: boolean) => void
  onRequireUsername: () => void
}

type VK = keyof PublicVisibility

const DEFAULT_PUBLIC_VISIBILITY: PublicVisibility = {
  basic: true,
  signature: true,
  bazi: true,
  ziwei: true,
  plainIntro: false,
}

function normalizeVisibility(v: Partial<PublicVisibility> | undefined): PublicVisibility {
  return { ...DEFAULT_PUBLIC_VISIBILITY, ...v }
}

const SUB_KEYS: Array<{ key: VK; labelKey: string; helpKey: string }> = [
  { key: 'basic', labelKey: 'you_visibility_basic', helpKey: 'you_visibility_basic_help' },
  {
    key: 'signature',
    labelKey: 'you_visibility_signature',
    helpKey: 'you_visibility_signature_help',
  },
  {
    key: 'plainIntro',
    labelKey: 'you_visibility_plain_intro',
    helpKey: 'you_visibility_plain_intro_help',
  },
  { key: 'bazi', labelKey: 'you_visibility_bazi', helpKey: 'you_visibility_bazi_help' },
  { key: 'ziwei', labelKey: 'you_visibility_ziwei', helpKey: 'you_visibility_ziwei_help' },
]

const VISIBILITY_PATCH_DEBOUNCE_MS = 200

export function PublicVisibilityPanel({
  userId,
  username,
  chartPublic,
  hasUsername,
  isSavingPublic,
  onToggleChartPublic,
  onRequireUsername,
}: PublicVisibilityPanelProps) {
  const ios = useIosPalette()
  const { t } = useI18n()
  const visibilityQuery = useVisibilityQuery(userId)
  const patchVisibility = usePatchVisibility(userId)

  const [localVisibility, setLocalVisibility] = useState<PublicVisibility>(() =>
    normalizeVisibility(undefined),
  )

  /** Keys merged into the next PATCH (cleared on success; cleared on error so server mirror can resume). */
  const pendingRef = useRef<Partial<PublicVisibility>>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local flags aligned with GET /visibility unless a debounced PATCH is in flight.
  useEffect(() => {
    if (!visibilityQuery.data) return
    if (Object.keys(pendingRef.current).length > 0) return
    setLocalVisibility(normalizeVisibility(visibilityQuery.data.visibility))
  }, [visibilityQuery.data])
  const mutateRef = useRef(patchVisibility.mutate)
  mutateRef.current = patchVisibility.mutate

  const scheduleVisibilityPatch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      const patch = { ...pendingRef.current }
      if (Object.keys(patch).length === 0) return
      mutateRef.current(patch, {
        onSuccess: () => {
          pendingRef.current = {}
        },
        onError: (err: unknown) => {
          pendingRef.current = {}
          const detail = err instanceof Error && err.message.trim() ? err.message.trim() : ''
          Alert.alert(
            t('profile_save_failed_title'),
            detail ? `${t('profile_save_failed_body')}\n\n${detail}` : t('profile_save_failed_body')
          )
        },
      })
    }, VISIBILITY_PATCH_DEBOUNCE_MS)
  }, [t])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const pending = pendingRef.current
      if (Object.keys(pending).length === 0) return
      mutateRef.current(pending, {
        onSuccess: () => {
          pendingRef.current = {}
        },
        onError: () => {
          pendingRef.current = {}
        },
      })
    }
  }, [])

  // Stable per-key callbacks for sub-toggles — never change reference
  const subHandlers = useMemo(() => {
    const map = {} as Record<VK, (v: boolean) => void>
    for (const { key } of SUB_KEYS) {
      map[key] = (v: boolean) => {
        setLocalVisibility((prev) => ({ ...prev, [key]: v }))
        pendingRef.current[key] = v
        scheduleVisibilityPatch()
      }
    }
    return map
  }, [scheduleVisibilityPatch])

  const handleSharePublicUrl = useCallback(() => {
    if (!username) return
    const url = `https://hexastral.com/u/${username}`
    RNShare.share({ url, message: url })
  }, [username])

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: ios.sectionLabel,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 8,
        }}
      >
        {t('you_visibility_section_title')}
      </Text>
      {/* Card matches notifications.tsx: no outer border, overflow hidden, row separators only */}
      <View
        style={{
          alignSelf: 'stretch',
          marginHorizontal: 16,
          backgroundColor: ios.card,
          overflow: 'hidden',
        }}
      >
        {/* Master toggle row */}
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: chartPublic ? 0.5 : 0,
            borderBottomColor: ios.separator,
          }}
        >
          <ToggleRow
            label={t('settings_chart_public')}
            description={t('settings_chart_public_desc')}
            variant='default'
            value={chartPublic}
            disabled={isSavingPublic}
            onValueChange={(v) => {
              if (v && !hasUsername) {
                Alert.alert(
                  t('settings_chart_public'),
                  t('settings_username_required_for_public'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('you_profile_edit'), onPress: onRequireUsername },
                  ]
                )
                return
              }
              onToggleChartPublic(v)
            }}
          />
          {chartPublic && username ? (
            <TouchableOpacity
              onPress={handleSharePublicUrl}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 10,
                gap: 6,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: '300',
                  color: ios.accent,
                  letterSpacing: 0.3,
                }}
                numberOfLines={1}
              >
                hexastral.com/u/{username}
              </Text>
              <Share2 size={13} color={ios.secondary} strokeWidth={1.5} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sub-toggles — indented to show hierarchy under master toggle */}
        {chartPublic
          ? SUB_KEYS.map(({ key, labelKey, helpKey }, i) => (
              <View
                key={key}
                style={{
                  position: 'relative',
                  paddingVertical: 14,
                  paddingLeft: 32,
                  paddingRight: 16,
                  borderBottomWidth: i === SUB_KEYS.length - 1 ? 0 : 0.5,
                  borderBottomColor: ios.separator,
                }}
              >
                {!hasUsername ? (
                  <Pressable
                    accessibilityRole='button'
                    accessibilityLabel={t(labelKey as never)}
                    onPress={() =>
                      Alert.alert(
                        t('settings_chart_public'),
                        t('settings_username_required_for_public'),
                        [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('you_profile_edit'), onPress: onRequireUsername },
                        ]
                      )
                    }
                    style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
                  />
                ) : null}
                <ToggleRow
                  variant='compact'
                  label={t(labelKey as never)}
                  value={localVisibility[key]}
                  disabled={!hasUsername}
                  onValueChange={subHandlers[key]}
                  endAccessory={
                    <Pressable
                      accessibilityRole='button'
                      accessibilityLabel={t('you_visibility_help_a11y')}
                      hitSlop={10}
                      onPress={() => Alert.alert(t(labelKey as never), t(helpKey as never))}
                    >
                      <Info size={17} color={ios.secondary} strokeWidth={1.6} />
                    </Pressable>
                  }
                />
              </View>
            ))
          : null}
      </View>
    </View>
  )
}
