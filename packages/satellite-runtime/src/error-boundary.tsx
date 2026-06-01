/**
 * React Error Boundary · catches render-tree exceptions.
 *
 * Why this exists (P1-17): a single uncaught render error in any subtree
 * blanks the entire app to a white screen — fatal UX. This boundary
 * contains the damage to the failing subtree and shows a minimal recovery
 * UI. Crash is also forwarded to Sentry via initCrashReporting (P0-7).
 *
 * Default mounts: wrap the RootLayout's tree at the outermost reasonable
 * level (above NavigationContainer / expo-router Stack) — see
 * fate-app/app/_layout.tsx for the canonical wiring.
 *
 * Per-subtree boundaries: you can also wrap individual high-risk surfaces
 * (LLM reading panels, third-party charts) with their own boundary to
 * recover one card without nuking the whole screen.
 *
 * Recovery UX is intentionally minimal — a small "Something went wrong /
 * Try again" card with one tap. Localized copy is the caller's
 * responsibility via `fallback` prop. Default uses English to avoid
 * importing i18n into satellite-runtime.
 *
 * No async work in the fallback — must render immediately, no fetch.
 */

import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { captureCrashError } from './crash'

interface FallbackProps {
  error: Error
  reset: () => void
}

interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * Custom fallback UI. If omitted, the default minimal card is rendered
   * with English copy.
   */
  fallback?: (props: FallbackProps) => ReactNode
  /**
   * Tag for the crash report so we can disambiguate "which boundary
   * caught it" (e.g. 'root' / 'reading-report' / 'chart-render').
   */
  boundaryName?: string
  /**
   * Called when an error is caught — useful for analytics fire-and-forget.
   * Should not throw; errors here are swallowed silently.
   */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Forward to Sentry. captureCrashError is a no-op when Sentry isn't
    // initialized, so this is safe in dev.
    captureCrashError(error, {
      boundary: this.props.boundaryName ?? 'unnamed',
      componentStack: info.componentStack ?? null,
    })
    try {
      this.props.onError?.(error, info)
    } catch {
      // Swallow — boundary callback errors are unrecoverable.
    }
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset })
    }

    return <DefaultFallback error={error} reset={this.reset} />
  }
}

function DefaultFallback({ reset }: FallbackProps): ReactNode {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        We've logged the issue. Tap below to retry — your data is safe.
      </Text>
      <Pressable style={styles.button} onPress={reset}>
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0C0B0A',
  },
  title: {
    color: '#E9E2D2',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  body: {
    color: '#8A8170',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  button: {
    height: 44,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#9B2226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#F4ECDC',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
})
