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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg'
import { FENG_PALETTE, spacing } from '@/lib/theme'

interface Strings {
  report_map_close: string
  report_map_mid: string
  report_map_wide: string
  report_map_loading: string
  report_map_failed: string
  report_overlay_bagua_toggle?: string
}

/** Building 坐/向/门 bearings in true-north degrees, for the client overlay. */
export interface MapOrient {
  facing: number
  sit: number
  door: number | null
}

export interface MapOverlayHints {
  formSha?: Array<{ palace: string; bearingDeg: number; label: string; severity?: string }>
  water?: Array<{ palace: string; bearingDeg: number; label: string }>
  sand?: Array<{ palace: string; label: string }>
  shuiKou?: { palace: string; label: string } | null
}

interface Props {
  reportId: string
  tiles: FengAnnotatedTile[]
  strings: Strings
  /** 坐/向/门 arrows drawn over each tile (north-up satellite). */
  orient?: MapOrient | null
  /** Client-only form/water/sand hints (never baked for Vision). */
  overlayHints?: MapOverlayHints | null
  /** Initial bagua-sector visibility; user can toggle when label is provided. */
  showBaguaSectors?: boolean
  /** Horizontal padding from the screen edge; matches the report's spacing.xl. */
  horizontalPadding?: number
}

export function AnnotatedMapSwiper({
  reportId,
  tiles,
  strings,
  orient,
  overlayHints,
  showBaguaSectors: showBaguaInitial = true,
  horizontalPadding,
}: Props) {
  const { width } = useWindowDimensions()
  const pad = horizontalPadding ?? spacing.xl
  const tileWidth = width - pad * 2
  const tileHeight = Math.round(tileWidth * 0.72)
  const [page, setPage] = useState(0)
  const [showBaguaSectors, setShowBaguaSectors] = useState(showBaguaInitial)

  if (tiles.length === 0) return null

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x
    const next = Math.round(x / tileWidth)
    if (next !== page) setPage(next)
  }

  const baguaLabel = strings.report_overlay_bagua_toggle

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      {baguaLabel ? (
        <View style={{ paddingHorizontal: pad, alignItems: 'flex-end' }}>
          <Pressable
            onPress={() => setShowBaguaSectors((v) => !v)}
            accessibilityRole='button'
            accessibilityState={{ selected: showBaguaSectors }}
            style={{
              borderWidth: 0.5,
              borderColor: FENG_PALETTE.copperGoldMute,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              opacity: showBaguaSectors ? 1 : 0.45,
            }}
          >
            <Text style={{ color: FENG_PALETTE.copperGold, fontSize: 11 }}>{baguaLabel}</Text>
          </Pressable>
        </View>
      ) : null}
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
              orient={orient ?? null}
              overlayHints={overlayHints ?? null}
              showBaguaSectors={showBaguaSectors}
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
  orient,
  overlayHints,
  showBaguaSectors,
}: {
  reportId: string
  tile: FengAnnotatedTile
  width: number
  height: number
  strings: Strings
  orient: MapOrient | null
  overlayHints: MapOverlayHints | null
  showBaguaSectors: boolean
}) {
  const { dataUri, isLoading, error } = useReportMap(reportId, tile)
  const { colors } = useTheme()

  if (dataUri) {
    return (
      <View style={{ width, height }}>
        <Image source={{ uri: dataUri }} style={{ width, height }} resizeMode='cover' />
        {orient ? (
          <OrientationOverlay
            width={width}
            height={height}
            orient={orient}
            overlayHints={overlayHints}
            showBaguaSectors={showBaguaSectors}
          />
        ) : null}
      </View>
    )
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

// ── orientation overlay ────────────────────────────────────
// Drawn client-side over the north-up satellite tile (the server no longer
// bakes arrows — see services/svc-feng/src/routes/annotate.ts). A compass
// bearing θ (0=N, clockwise) maps to screen angle θ−90° from the +x axis.
// Neutral, distinguished by brightness + the 向/坐/门 label (no brand red on the
// map). 向 (primary) brightest, 坐 mid, 门 dim — all legible over the dark halo.
const ORIENT_COLORS = { sit: '#D4D4D8', face: '#FAFAFA', door: '#A1A1AA' } as const

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** Smallest angle between two compass bearings, 0–180. */
function angDiff(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180)
}

function OrientArrow({
  cx,
  cy,
  deg,
  len,
  color,
  label,
}: {
  cx: number
  cy: number
  deg: number
  len: number
  color: string
  label: string
}) {
  const tip = polar(cx, cy, len, deg)
  const base = polar(cx, cy, len - 15, deg)
  const a = ((deg - 90) * Math.PI) / 180
  const px = -Math.sin(a) * 8
  const py = Math.cos(a) * 8
  const head = `${tip.x},${tip.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`
  const lbl = polar(cx, cy, len + 13, deg)
  return (
    <>
      {/* dark halo under the shaft for legibility on any imagery */}
      <Line x1={cx} y1={cy} x2={base.x} y2={base.y} stroke='rgba(0,0,0,0.4)' strokeWidth={5} />
      <Line
        x1={cx}
        y1={cy}
        x2={base.x}
        y2={base.y}
        stroke={color}
        strokeWidth={3}
        strokeLinecap='round'
      />
      <Polygon points={head} fill={color} stroke='rgba(0,0,0,0.4)' strokeWidth={0.75} />
      <SvgText
        x={lbl.x}
        y={lbl.y + 4}
        fill={color}
        stroke='rgba(0,0,0,0.55)'
        strokeWidth={0.8}
        fontSize={12}
        fontWeight='700'
        textAnchor='middle'
      >
        {label}
      </SvgText>
    </>
  )
}

const BAGUA_SECTORS = [
  { name: '坎', deg: 0 },
  { name: '艮', deg: 45 },
  { name: '震', deg: 90 },
  { name: '巽', deg: 135 },
  { name: '离', deg: 180 },
  { name: '坤', deg: 225 },
  { name: '兑', deg: 270 },
  { name: '乾', deg: 315 },
] as const

const MOUNTAIN_TICKS = Array.from({ length: 24 }, (_, i) => i * 15)

function OrientationOverlay({
  width,
  height,
  orient,
  overlayHints,
  showBaguaSectors,
}: {
  width: number
  height: number
  orient: MapOrient
  overlayHints: MapOverlayHints | null
  showBaguaSectors: boolean
}) {
  const cx = width / 2
  const cy = height / 2
  const base = Math.min(width, height)
  const ringR = base * 0.4
  const arrowLen = base * 0.3
  const north = polar(cx, cy, ringR, 0)
  const hintR = base * 0.34
  return (
    <Svg
      pointerEvents='none'
      style={StyleSheet.absoluteFill}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <Circle
        cx={cx}
        cy={cy}
        r={ringR}
        stroke='rgba(255,255,255,0.4)'
        strokeWidth={1}
        fill='none'
      />
      {MOUNTAIN_TICKS.map((deg) => {
        const outer = polar(cx, cy, ringR, deg)
        const inner = polar(cx, cy, ringR - 6, deg)
        return (
          <Line
            key={`mt-${deg}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke='rgba(255,255,255,0.28)'
            strokeWidth={1}
          />
        )
      })}
      {showBaguaSectors
        ? BAGUA_SECTORS.map((s) => {
            const p = polar(cx, cy, ringR * 0.72, s.deg)
            return (
              <SvgText
                key={s.name}
                x={p.x}
                y={p.y + 3}
                fill='rgba(255,255,255,0.45)'
                fontSize={9}
                textAnchor='middle'
              >
                {s.name}
              </SvgText>
            )
          })
        : null}
      <Line
        x1={north.x}
        y1={north.y - 4}
        x2={north.x}
        y2={north.y + 8}
        stroke='rgba(255,255,255,0.85)'
        strokeWidth={1.5}
      />
      <SvgText
        x={north.x}
        y={north.y - 8}
        fill='rgba(255,255,255,0.92)'
        stroke='rgba(0,0,0,0.5)'
        strokeWidth={0.7}
        fontSize={11}
        fontWeight='700'
        textAnchor='middle'
      >
        N
      </SvgText>

      <OrientArrow
        cx={cx}
        cy={cy}
        deg={orient.facing}
        len={arrowLen}
        color={ORIENT_COLORS.face}
        label='向'
      />
      <OrientArrow
        cx={cx}
        cy={cy}
        deg={orient.sit}
        len={arrowLen * 0.82}
        color={ORIENT_COLORS.sit}
        label='坐'
      />
      {orient.door != null && angDiff(orient.door, orient.facing) > 8 ? (
        <OrientArrow
          cx={cx}
          cy={cy}
          deg={orient.door}
          len={arrowLen * 0.7}
          color={ORIENT_COLORS.door}
          label='门'
        />
      ) : null}

      {(overlayHints?.formSha ?? []).slice(0, 6).map((h, i) => {
        const p = polar(cx, cy, hintR, h.bearingDeg)
        const fill =
          h.severity === 'risk' ? '#F87171' : h.severity === 'watch' ? '#FBBF24' : '#E5E7EB'
        return (
          <G key={`sha-${h.palace}-${i}`}>
            <Circle cx={p.x} cy={p.y} r={3.5} fill={fill} />
            <SvgText x={p.x} y={p.y - 6} fill={fill} fontSize={8} textAnchor='middle'>
              {h.label}
            </SvgText>
          </G>
        )
      })}
      {(overlayHints?.water ?? []).slice(0, 4).map((h, i) => {
        const p = polar(cx, cy, hintR * 0.88, h.bearingDeg)
        return (
          <G key={`w-${h.palace}-${i}`}>
            <Circle cx={p.x} cy={p.y} r={3} fill='#60A5FA' />
            <SvgText x={p.x} y={p.y - 6} fill='#93C5FD' fontSize={8} textAnchor='middle'>
              {h.label}
            </SvgText>
          </G>
        )
      })}
      {(overlayHints?.sand ?? []).slice(0, 4).map((h, i) => {
        const bearing =
          BAGUA_SECTORS.find((s) => s.name === h.palace || (h.palace === '離' && s.name === '离'))
            ?.deg ?? 0
        const p = polar(cx, cy, hintR * 0.78, bearing)
        return (
          <SvgText
            key={`sand-${h.palace}-${i}`}
            x={p.x}
            y={p.y}
            fill='rgba(252,211,77,0.9)'
            fontSize={8}
            textAnchor='middle'
          >
            {h.label}
          </SvgText>
        )
      })}
      {overlayHints?.shuiKou ? (
        <SvgText
          x={cx}
          y={height - 10}
          fill='rgba(147,197,253,0.95)'
          fontSize={10}
          fontWeight='600'
          textAnchor='middle'
        >
          {overlayHints.shuiKou.label}·{overlayHints.shuiKou.palace}
        </SvgText>
      ) : null}

      <Circle
        cx={cx}
        cy={cy}
        r={4}
        fill='rgba(255,255,255,0.95)'
        stroke='rgba(0,0,0,0.5)'
        strokeWidth={1}
      />
    </Svg>
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
