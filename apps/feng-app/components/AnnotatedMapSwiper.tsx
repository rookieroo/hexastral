/**
 * AnnotatedMapSwiper — hero swiper for the (report)/[siteId] screen.
 *
 * Phase H · F4.5. Renders the annotated satellite tiles (close / mid / wide)
 * that `feng-analyze` persisted via `annotated_map_keys`. Each tile is fetched
 * on demand through `useReportMap`, which caches by (reportId, tile) so
 * navigating away and back does not re-download.
 *
 * Tiles are server-driven: `latestReport.annotatedTiles` is the subset that
 * actually exists in R2 (the F2 prefetch may skip mid/wide for flat-urban
 * sites). When that array is empty we render nothing — the report still has
 * value from the chapter cards alone.
 */

import { useTheme } from '@zhop/core-ui'
import { type FengAnnotatedTile, useReportMap } from '@zhop/scenario-feng'
import { useState } from 'react'
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { FENG_PALETTE, spacing } from '@/lib/theme'

interface Strings {
  report_map_close: string
  report_map_mid: string
  report_map_wide: string
  report_map_loading: string
  report_map_failed: string
}

interface Props {
  reportId: string
  tiles: FengAnnotatedTile[]
  strings: Strings
  /** Horizontal padding from the screen edge; matches the report's spacing.xl. */
  horizontalPadding?: number
}

export function AnnotatedMapSwiper({ reportId, tiles, strings, horizontalPadding }: Props) {
  const { width } = useWindowDimensions()
  const pad = horizontalPadding ?? spacing.xl
  const tileWidth = width - pad * 2
  const tileHeight = Math.round(tileWidth * 0.72)
  const [page, setPage] = useState(0)

  if (tiles.length === 0) return null

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const next = Math.round(x / tileWidth)
    if (next !== page) setPage(next)
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: pad }}
        snapToInterval={tileWidth}
        decelerationRate='fast'
      >
        {tiles.map((tile, idx) => (
          <View
            key={tile}
            style={{
              width: tileWidth,
              height: tileHeight,
              marginRight: idx === tiles.length - 1 ? 0 : 0,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: FENG_PALETTE.inkTeal,
            }}
          >
            <MapTile
              reportId={reportId}
              tile={tile}
              width={tileWidth}
              height={tileHeight}
              strings={strings}
            />
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.sm,
          alignItems: 'center',
        }}
      >
        {tiles.map((tile, idx) => (
          <PagerDot key={tile} label={labelFor(tile, strings)} active={idx === page} />
        ))}
      </View>

      <Text
        style={{
          textAlign: 'center',
          color: FENG_PALETTE.rice,
          opacity: 0.5,
          fontSize: 10,
          paddingHorizontal: pad,
        }}
      >
        {MAP_ATTRIBUTION}
      </Text>
    </View>
  )
}

/** Required imagery attribution (Mapbox ToS). Not localized — provider names. */
export const MAP_ATTRIBUTION = '© Mapbox © Maxar © OpenStreetMap'

function MapTile({
  reportId,
  tile,
  width,
  height,
  strings,
}: {
  reportId: string
  tile: FengAnnotatedTile
  width: number
  height: number
  strings: Strings
}) {
  const { dataUri, isLoading, error } = useReportMap(reportId, tile)
  const { colors } = useTheme()

  if (dataUri) {
    return <Image source={{ uri: dataUri }} style={{ width, height }} resizeMode='cover' />
  }
  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: FENG_PALETTE.rice, fontSize: 13, opacity: 0.8 }}>
        {error ? strings.report_map_failed : isLoading ? strings.report_map_loading : ''}
      </Text>
      {error && __DEV__ ? (
        <Text style={{ color: colors.secondary, fontSize: 10, marginTop: spacing.xs }}>
          {error.message}
        </Text>
      ) : null}
    </View>
  )
}

function PagerDot({ label, active }: { label: string; active: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: active ? FENG_PALETTE.copperGold : 'transparent',
        borderWidth: active ? 0 : 1,
        borderColor: FENG_PALETTE.copperGoldMute,
      }}
    >
      <Text
        style={{
          color: active ? FENG_PALETTE.inkTeal : FENG_PALETTE.copperGold,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

function labelFor(tile: FengAnnotatedTile, strings: Strings): string {
  switch (tile) {
    case 'close':
      return strings.report_map_close
    case 'mid':
      return strings.report_map_mid
    case 'wide':
      return strings.report_map_wide
  }
}
