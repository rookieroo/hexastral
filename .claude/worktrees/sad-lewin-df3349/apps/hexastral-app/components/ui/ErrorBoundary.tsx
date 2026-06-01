/**
 * 错误处理组件
 *
 * - ErrorBoundary: React 错误边界（class component，RN 必须）
 * - ErrorRetry: 加载失败后的重试 UI
 */

import { AlertTriangle, RefreshCw } from 'lucide-react-native'
import { Component, type ReactNode } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { theme } from '@/lib/theme'

// ==================== Error Boundary ====================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error.message)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? <ErrorRetry onRetry={() => this.setState({ hasError: false })} />
      )
    }
    return this.props.children
  }
}

// ==================== Retry UI ====================

interface ErrorRetryProps {
  message?: string
  onRetry: () => void
}

export function ErrorRetry({ message, onRetry }: ErrorRetryProps) {
  const colorScheme = useColorScheme()
  const colors = colorScheme === 'dark' ? theme.dark : theme.light
  const { t } = useI18n()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <AlertTriangle size={48} color={colors.primary} style={{ marginBottom: 16 }} />
      <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8 }}>
        {message ?? t('load_failed')}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 24 }}>
        {t('check_network')}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 0,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <RefreshCw size={16} color='#FFFFFF' />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>{t('retry')}</Text>
      </Pressable>
    </View>
  )
}
