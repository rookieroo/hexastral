/**
 * 命 — Destiny 卡片
 *
 * 用户身份 + 出生信息 + 累计使用次数
 */

import type { User } from '@zhop/hexastral-client'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { ProfileCard, SectionLabel } from './ProfileRow'

interface DestinyCardProps {
  /** 当前用户基础信息 */
  user: { name?: string | null; email?: string | null; totalDivinations?: number | null } | null
  /** 服务端取回的扩展用户资料 */
  stellarUser: User | null
  /** 隐藏开发者菜单触发: 连击头像 */
  onIdentityPress: () => void
}

export function DestinyCard({ user, stellarUser, onIdentityPress }: DestinyCardProps) {
  const router = useRouter()
  const ios = useIosPalette()
  const { t } = useI18n()

  return (
    <>
      <SectionLabel glyph='命' title='DESTINY' />
      <ProfileCard>
        {/* Identity */}
        <Pressable onPress={onIdentityPress} style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderWidth: 0.5,
                borderColor: ios.separator,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '300', color: ios.text }}>
                {(user?.name ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '400', color: ios.text }} numberOfLines={1}>
                {user?.name ?? t('profile_anonymous')}
              </Text>
              <Text style={{ fontSize: 12, color: ios.secondary, marginTop: 2 }} numberOfLines={1}>
                {user?.email ?? t('profile_no_email')}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Birth info */}
        <View style={{ height: 0.5, backgroundColor: ios.separator }} />
        <Pressable
          onPress={() => router.push('/birth-info')}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
          })}
        >
          {stellarUser?.birthSolarDate ? (
            <Text style={{ fontSize: 13, fontWeight: '300', color: ios.secondary, flex: 1 }}>
              {stellarUser.birthSolarDate}
              {stellarUser.birthGender ? ` · ${stellarUser.birthGender}` : ''}
              {stellarUser.birthCity ? ` · ${stellarUser.birthCity}` : ''}
            </Text>
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '300', color: ios.accent, flex: 1 }}>
              {t('profile_birth_info')}
            </Text>
          )}
          <ChevronRight size={14} color={ios.dim} />
        </Pressable>

        {/* Usage stats */}
        <View style={{ height: 0.5, backgroundColor: ios.separator }} />
        <View style={{ flexDirection: 'row', paddingVertical: 14 }}>
          <StatCol value={stellarUser?.totalReadings ?? 0} label={t('stellar_times_label')} />
          <View style={{ width: 0.5, backgroundColor: ios.separator }} />
          <StatCol value={user?.totalDivinations ?? 0} label={t('yiching_times_label')} />
        </View>
      </ProfileCard>
    </>
  )
}

function StatCol({ value, label }: { value: number; label: string }) {
  const ios = useIosPalette()
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '300', color: ios.text }}>{value}</Text>
      <Text
        style={{
          fontSize: 10,
          color: ios.secondary,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  )
}
