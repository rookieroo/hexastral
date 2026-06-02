/**
 * WatchSettings — the user-facing 表盘 appearance config (template + 月相 skin)
 * with a live preview. Persisted via lib/widget-config; the native widget/watch
 * read the same choice once those targets ship. Until then this previews them.
 * Pro templates (黄历/古风) are marked but selectable here for preview.
 */

import { useTheme } from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspiceDayPayload, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import {
  DEFAULT_MOON_SKIN_ID,
  DEFAULT_TEMPLATE,
  getMoonSkin,
  getWatchTemplate,
  MOON_SKIN_OPTIONS,
  type MoonSkinId,
  setMoonSkin,
  setWatchTemplate,
  TEMPLATE_OPTIONS,
  type WatchTemplate,
} from '@/lib/widget-config'
import { DailyCard } from './DailyCard'
import { StaticMoon } from './StaticMoon'
import { WidgetCard } from './WidgetCard'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function Label({ children }: { children: string }) {
  const { colors } = useTheme()
  return <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{children}</Text>
}

export function WatchSettings() {
  const { colors, spacing } = useTheme()
  // Watch/widget previews mirror native render contracts: 对你而言 is Pro-only.
  // Free users see the same face/widget without the personalization line.
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const [payload, setPayload] = useState<AuspiceDayPayload | null>(null)
  const [template, setTemplate] = useState<WatchTemplate>(DEFAULT_TEMPLATE)
  const [skinId, setSkinId] = useState<MoonSkinId>(DEFAULT_MOON_SKIN_ID)

  useEffect(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    getAuspiceBirthDate()
      .then((b) => fetchAuspiceDay(iso, b))
      .then(setPayload)
      .catch(() => {})
    getWatchTemplate()
      .then(setTemplate)
      .catch(() => {})
    getMoonSkin()
      .then(setSkinId)
      .catch(() => {})
  }, [])

  const pickTemplate = (id: WatchTemplate) => {
    setTemplate(id)
    void setWatchTemplate(id)
  }
  const pickSkin = (id: MoonSkinId) => {
    setSkinId(id)
    void setMoonSkin(id)
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Live preview — watch face + home-screen small widget. */}
      {payload ? (
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.lg,
            alignItems: 'center',
            alignSelf: 'center',
          }}
        >
          <View
            style={{
              width: 168,
              height: 200,
              borderRadius: 42,
              overflow: 'hidden',
              backgroundColor: '#000',
            }}
          >
            <DailyCard
              tier='compact'
              template={template}
              moonSkinId={skinId}
              date={payload.date}
              day={payload.day}
              personalization={isPro ? payload.personalization : null}
            />
          </View>
          <View style={{ gap: 4, alignItems: 'center' }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 22,
                overflow: 'hidden',
                backgroundColor: '#000',
              }}
            >
              <WidgetCard
                size='small'
                moonSkinId={skinId}
                date={payload.date}
                day={payload.day}
                personalization={isPro ? payload.personalization : null}
              />
            </View>
            <Text style={{ color: colors.dim, fontSize: 10, letterSpacing: 1 }}>桌面小组件</Text>
          </View>
        </View>
      ) : null}

      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
        「表盘样式」用于手表表盘；「月相」同时作用于手表与桌面组件。桌面组件分小 / 中 / 大三种版式。
      </Text>

      {/* Template */}
      <View style={{ gap: spacing.sm }}>
        <Label>表盘样式</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {TEMPLATE_OPTIONS.map((tpl) => {
            const sel = tpl.id === template
            return (
              <Pressable
                key={tpl.id}
                onPress={() => pickTemplate(tpl.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: sel }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: 14,
                  borderWidth: sel ? 1 : 0.5,
                  borderColor: sel ? colors.accent : colors.separator,
                  backgroundColor: sel ? colors.accentGhost : 'transparent',
                }}
              >
                <Text style={{ color: sel ? colors.accent : colors.text, fontSize: 13 }}>
                  {tpl.label}
                </Text>
                {tpl.pro ? (
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 9,
                      fontWeight: '700',
                      letterSpacing: 1,
                    }}
                  >
                    PRO
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Moon skin */}
      <View style={{ gap: spacing.sm }}>
        <Label>月相</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {MOON_SKIN_OPTIONS.map((opt) => {
            const sel = opt.id === skinId
            return (
              <Pressable
                key={opt.id}
                onPress={() => pickSkin(opt.id)}
                accessibilityRole='button'
                accessibilityState={{ selected: sel }}
                style={{
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  borderRadius: 12,
                  borderWidth: sel ? 1 : 0.5,
                  borderColor: sel ? colors.accent : colors.separator,
                  backgroundColor: '#000',
                }}
              >
                {/* Skia's native Canvas swallows touches, so the parent
                    Pressable never sees taps on the moon itself — only on
                    the text label. pointerEvents='none' on this wrapper
                    lets taps pass through to the Pressable. */}
                <View pointerEvents='none'>
                  <StaticMoon phase={0.3} size={34} skinId={opt.id} />
                </View>
                <Text style={{ color: sel ? colors.accent : colors.dim, fontSize: 11 }}>
                  {opt.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}
