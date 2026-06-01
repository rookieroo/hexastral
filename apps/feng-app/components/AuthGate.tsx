import type { ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/lib/auth'
import { FENG_PALETTE } from '@/lib/theme'
import { SignInScreen } from './SignInScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: FENG_PALETTE.inkTeal,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={FENG_PALETTE.copperGold} />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <SignInScreen />
  }

  return <>{children}</>
}
