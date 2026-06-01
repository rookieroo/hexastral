/**
 * BondSharePoster — 9:16 分享海报 (IG Stories / TikTok / 朋友圈)
 *
 * ViewShot 包裹，可截图分享。包含:
 *   品牌栏 · 分数环 · 等级 · 关系标签 · A 缘 B · QR 码 · 扫码提示
 */

import { forwardRef } from 'react'
import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import ViewShot from 'react-native-view-shot'
import { useI18n } from '@/lib/i18n'

interface BondSharePosterProps {
  score: number
  grade: string
  personAName: string
  personBName: string
  relationshipLabel: string
  shareUrl: string
  archetypeName?: string | null
  archetypeTagline?: string | null
  archetypeCategory?: string | null
}

export const BondSharePoster = forwardRef<ViewShot, BondSharePosterProps>(function BondSharePoster(
  {
    score,
    grade,
    personAName,
    personBName,
    relationshipLabel,
    shareUrl,
    archetypeName,
    archetypeTagline,
    archetypeCategory,
  },
  ref
) {
  const { t } = useI18n()

  // Ink wash palette (dark mode only for posters)
  const bg = '#09090B'
  const text = '#FAFAFA'
  const secondary = '#A1A1AA'
  const accent = '#C4A882'
  const dim = '#52525B'

  return (
    <ViewShot
      ref={ref}
      options={{ format: 'png', quality: 1 }}
      style={{
        width: 360,
        height: 640,
        backgroundColor: bg,
        padding: 32,
        justifyContent: 'space-between',
      }}
    >
      {/* Brand bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: `${accent}30`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, color: accent }}>✦</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '500', color: dim, letterSpacing: 2 }}>
          HexAstral
        </Text>
      </View>

      {/* Main content */}
      <View style={{ alignItems: 'center', gap: 16 }}>
        {/* Score ring */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 2,
            borderColor: accent,
            backgroundColor: `${accent}10`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 40,
              fontWeight: '200',
              color: text,
              letterSpacing: -2,
            }}
          >
            {score}
          </Text>
          <Text style={{ fontSize: 11, color: secondary, marginTop: -2 }}>/ 100</Text>
        </View>

        {/* Grade */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            backgroundColor: `${accent}15`,
            borderWidth: 0.5,
            borderColor: `${accent}30`,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '300', color: accent, letterSpacing: 2 }}>
            {grade}
          </Text>
        </View>

        {/* Relationship label */}
        <Text style={{ fontSize: 12, color: secondary, letterSpacing: 1 }}>
          {relationshipLabel}
        </Text>

        {/* Archetype — shown when available */}
        {archetypeName ? (
          <View style={{ alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '200',
                color: accent,
                letterSpacing: 0.5,
                textAlign: 'center',
              }}
            >
              {archetypeName}
            </Text>
            {archetypeTagline ? (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '300',
                  color: secondary,
                  fontStyle: 'italic',
                  textAlign: 'center',
                  maxWidth: 240,
                }}
                numberOfLines={2}
              >
                {archetypeTagline}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* A · 缘 · B */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <Text
            style={{ fontSize: 18, fontWeight: '300', color: text, maxWidth: 100 }}
            numberOfLines={1}
          >
            {personAName}
          </Text>
          <Text style={{ fontSize: 16, color: accent, letterSpacing: 2 }}>缘</Text>
          <Text
            style={{ fontSize: 18, fontWeight: '300', color: text, maxWidth: 100 }}
            numberOfLines={1}
          >
            {personBName}
          </Text>
        </View>
      </View>

      {/* QR code + scan hint */}
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View
          style={{
            padding: 8,
            backgroundColor: '#FFFFFF',
            borderRadius: 4,
          }}
        >
          <QRCode value={shareUrl} size={100} backgroundColor='#FFFFFF' color='#09090B' />
        </View>
        <Text style={{ fontSize: 10, color: dim, letterSpacing: 1 }}>
          {t('bond_share_scan_hint')}
        </Text>
        <Text style={{ fontSize: 10, color: dim, letterSpacing: 0.5 }}>hexastral.com</Text>
      </View>
    </ViewShot>
  )
})
