/**
 * 道 — Path / Settings 卡片
 *
 * 语言、关于、Dev Tools 入口
 */

import { useRouter } from 'expo-router'
import { LOCALE_NAMES, useI18n } from '@/lib/i18n'
import { ProfileCard, ProfileRow, SectionLabel } from './ProfileRow'

interface SettingsCardProps {
  /** Hidden dev menu trigger — also fires when 关于 is tapped */
  onDevTap: () => void
  /** Open dev tools modal directly (only used when __DEV__) */
  onOpenDevTools: () => void
}

export function SettingsCard({ onDevTap, onOpenDevTools }: SettingsCardProps) {
  const router = useRouter()
  const { locale, t } = useI18n()

  return (
    <>
      <SectionLabel glyph='道' title='PATH' />
      <ProfileCard>
        <ProfileRow
          label={t('profile_language_row')}
          detail={LOCALE_NAMES[locale]}
          onPress={() => router.push('/language')}
        />
        <ProfileRow
          label={t('profile_about')}
          onPress={() => {
            onDevTap()
            router.push('/about')
          }}
          isLast={!__DEV__}
        />
        {__DEV__ && <ProfileRow label='Dev Tools' onPress={onOpenDevTools} isLast />}
      </ProfileCard>
    </>
  )
}
