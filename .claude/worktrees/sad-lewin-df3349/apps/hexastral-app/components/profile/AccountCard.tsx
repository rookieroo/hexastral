/**
 * 账 — Account 卡片
 *
 * 恢复购买、管理订阅、登出
 */

import { Linking } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { ProfileCard, ProfileRow, SectionLabel } from './ProfileRow'

interface AccountCardProps {
  isSubscribed: boolean
  onRestore: () => void
  onSignOut: () => void
}

export function AccountCard({ isSubscribed, onRestore, onSignOut }: AccountCardProps) {
  const { t } = useI18n()
  return (
    <>
      <SectionLabel glyph='账' title='ACCOUNT' />
      <ProfileCard marginBottom={32}>
        <ProfileRow label={t('profile_restore')} onPress={onRestore} />
        {isSubscribed && (
          <ProfileRow
            label={t('profile_manage_subscription')}
            onPress={() => {
              Linking.openURL('https://apps.apple.com/account/subscriptions')
            }}
          />
        )}
        <ProfileRow label={t('profile_sign_out')} showChevron={false} onPress={onSignOut} isLast />
      </ProfileCard>
    </>
  )
}
