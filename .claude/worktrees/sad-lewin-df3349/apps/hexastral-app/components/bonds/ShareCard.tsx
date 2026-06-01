/**
 * 分享卡片组件
 *
 * 视觉上仍是水墨风预览卡，但分享路径优先走原生 Share Sheet + Web OG 联动：
 *   - 推荐传入 `onShare`：父组件负责创建 shared snapshot 并调用 React Native `Share.share({ url })`
 *     iMessage / WhatsApp / Twitter 等会自动展开 hexastral-web 渲染的 OG 大图。
 *   - 若未提供 `onShare`，回退到本地 ViewShot 截图（兼容旧调用，不推荐：iOS 17+ 易截断/失败）。
 */

import * as Sharing from 'expo-sharing'
import { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import ViewShot from 'react-native-view-shot'
import { HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { useI18n } from '@/lib/i18n'
import { hapticMedium } from '@/lib/ux/haptics'

interface ShareCardProps {
  /** 卡片标题 e.g. "乾卦 · 大吉" */
  title: string
  /** 副标题 e.g. "2025年1月15日" */
  subtitle?: string
  /** 卡片主体内容 */
  children: React.ReactNode
  /** 品牌标记 */
  brand?: string
  /** 主色调 */
  accentColor?: string
  /** 背景色 */
  backgroundColor?: string
  /** 文字色 */
  textColor?: string
  /** 次要文字色 */
  secondaryColor?: string
  /**
   * Optional: parent-controlled share handler.
   * Recommended path — opens native Share Sheet with a URL pointing at
   * hexastral-web's OG-enabled report page.
   */
  onShare?: () => void | Promise<void>
}

export function ShareCard({
  title,
  subtitle,
  children,
  brand = 'HEXASTRAL',
  accentColor = '#C9A96E',
  backgroundColor = '#0A0A0A',
  textColor = '#F5F5F5',
  secondaryColor = '#888888',
  onShare,
}: ShareCardProps) {
  const viewShotRef = useRef<ViewShot>(null)
  const { t } = useI18n()

  async function handleShare() {
    hapticMedium()
    // Preferred path: parent owns share semantics (Web OG link via native Share Sheet).
    if (onShare) {
      try {
        await onShare()
      } catch {
        // 父组件应当负责自身错误反馈
      }
      return
    }
    // Legacy fallback: local ViewShot screenshot. Kept for backwards compatibility
    // with callsites that haven't migrated to Web OG yet.
    try {
      const uri = await viewShotRef.current?.capture?.()
      if (!uri) return
      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('share_dialog'),
        })
      }
    } catch {
      // 静默处理
    }
  }

  return (
    <View>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1 }}
        style={{
          backgroundColor,
          borderRadius: 0,
          padding: 24,
          overflow: 'hidden',
        }}
      >
        {/* 品牌头部 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <HexastralPlanetLogo size={22} />
          <Text
            style={{ fontSize: 14, fontWeight: '500', color: secondaryColor, letterSpacing: 2 }}
          >
            {brand}
          </Text>
        </View>

        {/* 标题 */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: '700',
            color: textColor,
            marginBottom: subtitle ? 6 : 16,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 13, color: secondaryColor, marginBottom: 16 }}>{subtitle}</Text>
        )}

        {/* 自定义内容 */}
        <View style={{ marginBottom: 20 }}>{children}</View>

        {/* 底部水印 — logo + brand + URL */}
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: `${secondaryColor}40`,
            paddingTop: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HexastralPlanetLogo size={18} />
            <Text style={{ fontSize: 11, fontWeight: '500', color: secondaryColor }}>
              HexAstral
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: secondaryColor, letterSpacing: 0.5 }}>
            hexastral.com
          </Text>
        </View>
      </ViewShot>

      {/* 分享按钮 */}
      <Pressable
        onPress={handleShare}
        style={({ pressed }) => ({
          marginTop: 16,
          borderRadius: 0,
          backgroundColor: `${accentColor}20`,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: accentColor, letterSpacing: 1 }}>
            {t('share_result')}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

/**
 * 分享卡片中的 Key-Value 行
 */
export function ShareCardRow({
  label,
  value,
  valueColor = '#F5F5F5',
  labelColor = '#888888',
}: {
  label: string
  value: string
  valueColor?: string
  labelColor?: string
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 14, color: labelColor }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: valueColor }}>{value}</Text>
    </View>
  )
}
