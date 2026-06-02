import { Text, View } from 'react-native'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { CTAButton, SkipLink } from './OnboardingChrome'
import { onboardingStyles as ob } from './styles'

export function NotifyStep({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  const { t } = useI18n()
  const { colors, isDark } = useTheme()
  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      <View style={[ob.stepHeader, { paddingBottom: 20 }]}>
        <Text style={[ob.notifyHeading, { color: colors.text }]}>{t('ob_notify_q')}</Text>
        <Text
          style={[
            ob.stepHint,
            {
              color: colors.textSecondary,
              marginTop: 10,
              letterSpacing: 0,
              fontSize: 13,
              fontWeight: '300',
            },
          ]}
        >
          {t('ob_notify_hint')}
        </Text>
      </View>

      {/* Notification card previews — iOS lockscreen style */}
      <View style={ob.notifyMockWrap}>
        <View
          style={[
            ob.notifyMockCard,
            {
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderWidth: isDark ? 0 : 0.5,
              borderColor: isDark ? undefined : colors.border,
            },
          ]}
        >
          <View style={ob.notifyMockRow}>
            <View
              style={[
                ob.notifyMockIcon,
                { backgroundColor: isDark ? '#27272A' : '#E4E4E7', borderRadius: 8 },
              ]}
            >
              <HexastralPlanetLogo size={26} phase={BRAND_PHASE} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                }}
              >
                <Text style={[ob.notifyMockAppName, { color: isDark ? '#E4E4E7' : '#333333' }]}>
                  {t('app_name')}
                </Text>
                <Text style={[ob.notifyMockTime, { color: isDark ? '#71717A' : '#AAAAAA' }]}>
                  {t('ob_notify_now')}
                </Text>
              </View>
              <Text style={[ob.notifyMockTitle, { color: isDark ? '#FAFAFA' : '#111111' }]}>
                {t('ob_notify_daily_title')}
              </Text>
              <Text style={[ob.notifyMockBody, { color: isDark ? '#A1A1AA' : '#555555' }]}>
                {t('ob_notify_daily_body')}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            ob.notifyMockCard,
            {
              marginTop: 8,
              opacity: 0.65,
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              borderWidth: isDark ? 0 : 0.5,
              borderColor: isDark ? undefined : colors.border,
            },
          ]}
        >
          <View style={ob.notifyMockRow}>
            <View
              style={[
                ob.notifyMockIcon,
                { backgroundColor: isDark ? '#27272A' : '#E4E4E7', borderRadius: 8 },
              ]}
            >
              <HexastralPlanetLogo size={26} phase={BRAND_PHASE} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                }}
              >
                <Text style={[ob.notifyMockAppName, { color: isDark ? '#E4E4E7' : '#333333' }]}>
                  {t('app_name')}
                </Text>
                <Text style={[ob.notifyMockTime, { color: isDark ? '#71717A' : '#AAAAAA' }]}>
                  {t('ob_notify_yesterday')}
                </Text>
              </View>
              <Text style={[ob.notifyMockBody, { color: isDark ? '#A1A1AA' : '#555555' }]}>
                {t('ob_notify_friend_body')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={ob.stepFooter}>
        <CTAButton label={t('ob_notify_cta')} onPress={onAllow} dark={isDark} />
        <SkipLink onPress={onSkip} label={t('ob_notify_skip')} dark={isDark} />
      </View>
    </View>
  )
}
