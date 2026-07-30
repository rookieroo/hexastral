/**
 * Root error boundary — keeps a hard crash from blanking the whole app.
 * Class component required (RN has no hook equivalent for getDerivedStateFromError).
 */

import { AlertTriangle, RefreshCw } from 'lucide-react-native'
import { Component, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useStrings } from '@/lib/i18n-context'
import { useAppTheme } from '@/lib/theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AuspiceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[AuspiceErrorBoundary]', error.message)
  }

  render() {
    if (this.state.hasError) {
      return <CrashFallback onRetry={() => this.setState({ hasError: false })} />
    }
    return this.props.children
  }
}

function CrashFallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useAppTheme()
  const { t } = useStrings()
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AlertTriangle size={40} color={colors.text} />
      <Text style={[styles.title, { color: colors.text }]}>{t.loadFailed}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole='button'
        style={({ pressed }) => [
          styles.btn,
          { borderColor: colors.separator, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <RefreshCw size={16} color={colors.text} />
        <Text style={[styles.btnLabel, { color: colors.text }]}>{t.retry}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 0.5,
    borderRadius: 0,
  },
  btnLabel: { fontSize: 15, fontWeight: '600' },
})
