import { getTokens } from '@zhop/hexastral-tokens/palette'
import type { PortfolioReadingItem, PortfolioTarget } from '@zhop/portfolio-client'
import { fetchReadings } from '@zhop/portfolio-client'
import type { ReactElement, ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'

export interface SatelliteHistoryListProps {
  target: PortfolioTarget
  emptyText?: string
  /**
   * Per-target row renderer — overrides the default `readingType + createdAt`
   * row. Use when the satellite's reading payload has a more meaningful
   * one-line representation (per ADR-0006 Tier-1 spec, each satellite owns
   * its own row format).
   *
   * Examples — Numerology renders `"Life-Path 7 · 2026-03-12"` from
   * `JSON.parse(item.resultJson).lifePath`; Coin Cast shows the hexagram
   * name; Dream Oracle a 40-char excerpt of the dream.
   *
   * Phase G Week 3: contract documented. Per-target implementations are V1.1
   * polish — the default row is acceptable for V1 launch.
   */
  renderItem?: (item: PortfolioReadingItem) => ReactElement
  /** When either is set, loading/error use ScrollView for chrome (avoids nesting FlatList inside ScrollView). */
  listHeader?: ReactNode
  listFooter?: ReactNode
}

export function SatelliteHistoryList(props: SatelliteHistoryListProps) {
  const colors = getTokens(useColorScheme() === 'dark')
  const listChrome = props.listHeader !== undefined || props.listFooter !== undefined
  const [items, setItems] = useState<PortfolioReadingItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFirst = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchReadings(props.target)
      setItems(res.readings)
      setCursor(res.cursor)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load history'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [props.target])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetchReadings(props.target, cursor)
      setItems((prev) => [...prev, ...res.readings])
      setCursor(res.cursor)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, props.target])

  useEffect(() => {
    void loadFirst()
  }, [loadFirst])

  if (loading) {
    if (listChrome) {
      return (
        <ScrollView
          contentContainerStyle={[styles.chromeContent, styles.chromeContentGrow]}
          keyboardShouldPersistTaps='handled'
        >
          {props.listHeader}
          <View style={[styles.center, styles.chromeBodyMinHeight]}>
            <ActivityIndicator color={colors.secondary} />
          </View>
          {props.listFooter}
        </ScrollView>
      )
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    )
  }

  if (error) {
    const authError = error.toLowerCase().includes('authenticated')
    const errorBody = (
      <View style={[styles.center, listChrome ? styles.chromeBodyMinHeight : undefined]}>
        <Text style={[styles.error, { color: colors.secondary }]}>
          {authError ? 'Sign in with Apple to keep your readings in sync across devices.' : error}
        </Text>
        {!authError ? (
          <Pressable
            style={[styles.retry, { borderColor: colors.separator }]}
            onPress={() => void loadFirst()}
          >
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    )
    if (listChrome) {
      return (
        <ScrollView
          contentContainerStyle={[styles.chromeContent, styles.chromeContentGrow]}
          keyboardShouldPersistTaps='handled'
        >
          {props.listHeader}
          {errorBody}
          {props.listFooter}
        </ScrollView>
      )
    }
    return errorBody
  }

  const footerSpinner = loadingMore ? <ActivityIndicator color={colors.secondary} /> : null
  const showListFooter = loadingMore || props.listFooter !== undefined

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={items.length === 0 ? styles.center : styles.list}
      onEndReachedThreshold={0.2}
      onEndReached={() => void loadMore()}
      refreshing={loading}
      onRefresh={() => void loadFirst()}
      ListHeaderComponent={
        props.listHeader !== undefined ? (
          <View collapsable={false}>{props.listHeader}</View>
        ) : undefined
      }
      ListFooterComponent={
        showListFooter ? (
          <View collapsable={false}>
            {footerSpinner}
            {props.listFooter}
          </View>
        ) : undefined
      }
      renderItem={({ item }) =>
        props.renderItem ? (
          props.renderItem(item)
        ) : (
          <View
            style={[styles.row, { borderColor: colors.separator, backgroundColor: colors.card }]}
          >
            <Text style={[styles.primary, { color: colors.text }]}>{item.readingType}</Text>
            <Text style={[styles.secondary, { color: colors.secondary }]}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        )
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.secondary }]}>
          {props.emptyText ?? 'No readings yet.'}
        </Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  chromeContent: {
    padding: 16,
    gap: 12,
  },
  chromeContentGrow: {
    flexGrow: 1,
  },
  chromeBodyMinHeight: {
    minHeight: 220,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  row: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 12,
    gap: 6,
  },
  primary: {
    fontWeight: '600',
    letterSpacing: 0.5,
    fontSize: 14,
  },
  secondary: {
    fontSize: 12,
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
  },
  error: {
    textAlign: 'center',
    marginBottom: 10,
  },
  retry: {
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {},
})
