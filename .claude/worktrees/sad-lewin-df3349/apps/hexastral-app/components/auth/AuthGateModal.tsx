/**
 * AuthGateModal — prompts sign-in before a privileged action
 *
 * Shown when a guest user triggers an action that requires authentication:
 * Divination, Chart Analysis, Chat with HexAstral, Re-analyze, etc.
 *
 * After successful sign-in the stored pending action is run automatically.
 */

import { X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AuthButtons } from '@/components/auth/AuthButtons'
import { BaseModal } from '@/components/modal/BaseModal'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

interface AuthGateModalProps {
  visible: boolean
  onDismiss: () => void
  /** Run after successful sign-in */
  onAuthSuccess: () => void
}

export function AuthGateModal({ visible, onDismiss, onAuthSuccess }: AuthGateModalProps) {
  const { signInWithApple, signInWithGoogle, signInAsGuest } = useAuth()
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const [loadingType, setLoadingType] = useState<'apple' | 'google' | 'guest' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ios = {
    bg: isDark ? '#09090B' : '#FAFAFA',
    card: isDark ? '#18181B' : '#FFFFFF',
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
    border: isDark ? '#27272A' : '#E4E4E7',
  }

  async function withLoading(type: 'apple' | 'google' | 'guest', fn: () => Promise<boolean>) {
    setError(null)
    setLoadingType(type)
    try {
      const success = await fn()
      if (success) {
        onAuthSuccess()
        onDismiss()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_try_again'))
    } finally {
      setLoadingType(null)
    }
  }

  const handleApple = () =>
    withLoading('apple', async () => {
      const ok = await signInWithApple()
      return ok
    })

  const handleGoogle = () =>
    withLoading('google', async () => {
      const ok = await signInWithGoogle()
      return ok
    })

  const handleGuest = () =>
    withLoading('guest', async () => {
      const ok = await signInAsGuest()
      return ok
    })

  return (
    <BaseModal visible={visible} onDismiss={onDismiss} position='bottom' animationType='slide'>
      <View
        style={{
          backgroundColor: ios.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 40,
        }}
      >
        {/* Drag indicator */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: ios.border,
            alignSelf: 'center',
            marginBottom: 16,
          }}
        />

        {/* Close */}
        <Pressable
          onPress={onDismiss}
          style={{ position: 'absolute', top: 20, right: 20 }}
          hitSlop={10}
        >
          <X size={20} color={ios.secondary} strokeWidth={1.5} />
        </Pressable>

        {/* Error banner */}
        {error ? (
          <Text
            style={{
              color: '#EF4444',
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {error}
          </Text>
        ) : null}

        <AuthButtons
          onApple={handleApple}
          onGoogle={handleGoogle}
          onGuest={handleGuest}
          loadingType={loadingType}
          showGuest
        />
      </View>
    </BaseModal>
  )
}
