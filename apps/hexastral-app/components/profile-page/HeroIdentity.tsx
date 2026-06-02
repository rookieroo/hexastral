/**
 * Profile Hero — 命主名片
 *
 * 极简、留白主导。头像 + 大姓名 + 生辰 + 编辑链。
 * 不展示专业术语（日主 / 格局 / 五行 / 命主），那些都放到下方"命理签名"或专门的命盘详情。
 * 用一行 5 段彩色色阶（金木水火土）作为唯一的"命理装饰"——一眼可识别又不需要术语解释。
 */

import type { FateNatalChart } from '@zhop/hexastral-client'
import { Image } from 'expo-image'
import { Text, TouchableOpacity, View } from 'react-native'
import { DefaultAvatar } from '@/components/ui/DefaultAvatar'
import type { BirthInfo } from '@/lib/domain/birthInfo'
import { formatShichenLabel } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface HeroIdentityProps {
  /** 公开昵称 (display_name) — 大字标题 */
  displayName?: string | null
  /** 真实姓名 (users.name) — 占卜命理用，仅在与昵称不同时以小字补充展示 */
  realName?: string | null
  username?: string | null
  photoUri?: string | null
  avatarIndex: number
  birthInfo: BirthInfo | null
  /** Optional — used only to derive the colour bar order; no term strings shown */
  natalChart: FateNatalChart | null
  /** Reserved for future personalisation; not displayed as text. */
  stellarChart?: unknown
  onEditPress: () => void
}

export function HeroIdentity({
  displayName,
  realName,
  username,
  photoUri,
  avatarIndex,
  birthInfo,
  natalChart,
  onEditPress,
}: HeroIdentityProps) {
  const { colors, isDark } = useTheme()
  const { t, locale } = useI18n()

  const subtitleParts: string[] = []
  if (birthInfo?.solarDate) {
    let line = birthInfo.solarDate
    if (birthInfo.timeIndex != null) {
      line += ` · ${formatShichenLabel(birthInfo.timeIndex, locale)}`
    }
    subtitleParts.push(line)
  }
  if (birthInfo?.birthCity) {
    subtitleParts.push(birthInfo.birthCity)
  }
  // Show 姓名 inline ONLY when distinct from displayed nickname — avoids
  // duplicate label noise for users whose nickname == real name.
  const trimmedReal = realName?.trim()
  const trimmedDisplay = displayName?.trim()
  const showRealName = !!trimmedReal && trimmedReal !== trimmedDisplay
  if (showRealName) {
    subtitleParts.push(`${t('profile_real_name_label')}: ${trimmedReal}`)
  }

  // Highlight the user's day-master element — derived once from natalChart but
  // rendered as a colour swatch only, never as a Chinese-only term.
  const dayMasterElement = mapToElementKey(natalChart?.dayMasterWuXing)

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            cachePolicy='memory-disk'
            style={{ width: 64, height: 64, borderRadius: 32 }}
          />
        ) : (
          <DefaultAvatar index={avatarIndex} size={64} isDark={isDark} />
        )}
        <View style={{ marginLeft: 16, flex: 1 }}>
          {displayName ? (
            <Text
              style={{
                fontSize: 22,
                fontWeight: '300',
                color: colors.text,
                letterSpacing: 1,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          ) : null}
          {username ? (
            <Text
              style={{ fontSize: 12, fontWeight: '300', color: colors.textSecondary }}
              numberOfLines={1}
            >
              @{username}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={onEditPress}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: colors.textSecondary,
              letterSpacing: 0.5,
            }}
          >
            {t('you_profile_edit')} ›
          </Text>
        </TouchableOpacity>
      </View>

      {subtitleParts.length > 0 ? (
        <Text
          style={{
            marginTop: 14,
            fontSize: 12,
            fontWeight: '300',
            color: colors.textSecondary,
            letterSpacing: 0.4,
          }}
          numberOfLines={1}
        >
          {subtitleParts.join('  ·  ')}
        </Text>
      ) : null}

      {/* Subtle hairline divider — Ink Brutalism, no rainbow / progress-bar look. */}
      {dayMasterElement ? (
        <View
          style={{
            marginTop: 16,
            height: 0.5,
            backgroundColor: isDark ? '#27272A' : '#E4E4E7',
          }}
        />
      ) : null}
    </View>
  )
}

/** Map raw 五行 char to typed element key; safe for any locale. */
function mapToElementKey(
  raw?: string | null
): 'metal' | 'wood' | 'water' | 'fire' | 'earth' | null {
  switch (raw) {
    case '金':
      return 'metal'
    case '木':
      return 'wood'
    case '水':
      return 'water'
    case '火':
      return 'fire'
    case '土':
      return 'earth'
    default:
      return null
  }
}
