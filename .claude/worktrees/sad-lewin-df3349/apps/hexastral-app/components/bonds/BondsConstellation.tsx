/**
 * Bonds constellation — unified relationship graph visualization.
 *
 * Two modes controlled by `interactive` prop:
 *   interactive (default) — pressable nodes, "+" add button, used in friends tab
 *   non-interactive       — richer visuals: score badges, pulse aura, no press targets
 *                           Used in onboarding and home card preview
 *
 * Visual features (always):
 *   · Concentric orbit rings around self node (ink wash aesthetic)
 *   · RadialGradient glow on self node
 *   · Double aura ring with varied dash patterns
 *   · Score-weighted connection line opacity
 *   · Decorative star scatter with varied sizes/opacities
 *
 * For the full-screen interactive starfield with semantic zoom,
 * see BondsStarfield.tsx.
 */

import { Plus } from 'lucide-react-native'
import { useEffect, useMemo, useRef } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg'
import {
  BOND_SELF,
  buildDemoBonds,
  LABEL_KEY_MAP,
  layoutNodes,
  ZOOM_CONFIG,
} from '@/components/bonds/bonds-constellation-data'
import { DefaultAvatar } from '@/components/ui/DefaultAvatar'
import type { BondData } from '@/lib/domain/bonds'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

// ── Score → visual helpers ───────────────────────────────────────────────────

function scoreColor(score: number | null, isDark: boolean): string {
  if (score == null) return isDark ? 'rgba(161,161,170,0.4)' : 'rgba(113,113,122,0.35)'
  if (score >= 85) return isDark ? 'rgba(196,168,130,0.8)' : 'rgba(60,36,21,0.7)'
  if (score >= 70) return isDark ? 'rgba(161,161,170,0.6)' : 'rgba(113,113,122,0.55)'
  return isDark ? 'rgba(161,161,170,0.45)' : 'rgba(113,113,122,0.4)'
}

function lineOpacity(score: number | null): number {
  if (score == null) return 0.15
  if (score >= 85) return 0.5
  if (score >= 70) return 0.35
  return 0.22
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  width: number
  height: number
  bonds?: BondData[]
  /** Currently selected bond id */
  activeNode?: string | null
  /** If provided, nodes become pressable */
  onNodePress?: (id: string) => void
  /** Callback when "+" node is pressed */
  onAddPress?: () => void
  /** Callback when a demo node is pressed — passes relationship label + mode */
  onDemoNodePress?: (relationship: string, mode: string) => void
  /** Avatar design index for self-center node */
  avatarIndex?: number
  /** User photo URI override */
  userAvatarUri?: string | null
  /** Force demo mode (auto when bonds is empty) */
  isDemo?: boolean
  /** When false, disables all press targets and shows score badges + pulse aura */
  interactive?: boolean
  /**
   * Per-bond daily synastry scores keyed by bond id.
   * 'resonance' bonds get gold pulsing lines; 'tension' bonds get red lines.
   */
  synastryMap?: Record<
    string,
    { synergy: number; friction: number; status: 'resonance' | 'tension' | 'neutral' }
  >
}

// ── Component ────────────────────────────────────────────────────────────────

export function BondsConstellation({
  width,
  height,
  bonds = [],
  activeNode = null,
  onNodePress,
  onAddPress,
  onDemoNodePress,
  avatarIndex = 0,
  userAvatarUri = null,
  isDemo,
  interactive = true,
  synastryMap,
}: Props) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const showDemo = isDemo ?? bonds.length === 0
  const demoBonds = useMemo(() => buildDemoBonds(t), [t])
  const displayBonds = showDemo ? demoBonds : bonds

  const showAdd = interactive && !!onAddPress
  const { bondNodes, addNode } = useMemo(
    () => layoutNodes(displayBonds, width, height, showAdd, 2),
    [displayBonds, width, height, showAdd]
  )

  const cfg = ZOOM_CONFIG[2]

  // ── Pulse animation (non-interactive mode only) ──
  const pulseAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (interactive) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [interactive, pulseAnim])

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  // ── Resonance pulse (active when any bond is in resonance) ──
  const hasResonance =
    !showDemo && Object.values(synastryMap ?? {}).some((s) => s.status === 'resonance')
  const resonancePulseAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (!hasResonance) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(resonancePulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(resonancePulseAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [hasResonance, resonancePulseAnim])

  const resonancePulseOpacity = resonancePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.9],
  })

  // ── Theme colors ────────────────────────────────────────────────────────
  const orbitColor = isDark ? 'rgba(161,161,170,0.06)' : 'rgba(113,113,122,0.05)'
  const orbitColorMid = isDark ? 'rgba(161,161,170,0.08)' : 'rgba(113,113,122,0.07)'
  const dotColor = isDark ? 'rgba(161,161,170,0.05)' : 'rgba(113,113,122,0.04)'
  const dotColorBright = isDark ? 'rgba(161,161,170,0.12)' : 'rgba(113,113,122,0.10)'
  const nodeStroke = isDark ? 'rgba(161,161,170,0.5)' : 'rgba(113,113,122,0.4)'
  const selfStrokeColor = isDark ? 'rgba(196,168,130,0.5)' : 'rgba(60,36,21,0.3)'
  const selfFillColor = isDark ? 'rgba(196,168,130,0.2)' : 'rgba(60,36,21,0.1)'
  const selfAuraOuter = isDark ? 'rgba(196,168,130,0.08)' : 'rgba(60,36,21,0.04)'
  const demoDim = showDemo ? 0.65 : 1
  const pendingDash = '4,4'

  const selfX = BOND_SELF.x * width
  const selfY = BOND_SELF.y * height

  // Orbit ring radii
  const minDim = Math.min(width, height)
  const orbitRadii = [minDim * 0.15, minDim * 0.28, minDim * 0.42]

  const labelText = (label: string) => {
    const key = LABEL_KEY_MAP[label]
    return key ? t(key) : label
  }

  return (
    <View style={{ width, height, position: 'relative', opacity: demoDim }}>
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <RadialGradient id='selfGlow' cx='50%' cy='50%' r='50%'>
            <Stop
              offset='0%'
              stopColor={isDark ? '#C4A882' : '#3C2415'}
              stopOpacity={isDark ? '0.15' : '0.08'}
            />
            <Stop offset='100%' stopColor={isDark ? '#C4A882' : '#3C2415'} stopOpacity='0' />
          </RadialGradient>
        </Defs>

        {/* Background scatter — varied star dust */}
        {Array.from({ length: 40 }, (_, i) => {
          const cx = (((i * 37 + 13) % 100) / 100) * width
          const cy = (((i * 59 + 7) % 100) / 100) * height
          const isBright = i % 8 === 0
          return (
            <Circle
              key={`star-${i}`}
              cx={cx}
              cy={cy}
              r={isBright ? 1.8 : i % 3 === 0 ? 1.0 : 0.6}
              fill={isBright ? dotColorBright : dotColor}
            />
          )
        })}

        {/* Concentric orbit rings (ink wash circles) */}
        {orbitRadii.map((r, i) => (
          <Circle
            key={`orbit-${i}`}
            cx={selfX}
            cy={selfY}
            r={r}
            fill='none'
            stroke={i === 1 ? orbitColorMid : orbitColor}
            strokeWidth={0.5}
            strokeDasharray={i === 0 ? undefined : '2,8'}
          />
        ))}

        {/* Connection lines — color varies by score and daily synastry status */}
        {bondNodes.map(({ bond, x, y }) => {
          const synastry = !showDemo ? synastryMap?.[bond.id] : undefined
          const op = lineOpacity(bond.score)
          const isPending = bond.status === 'pending_invite'

          let stroke: string
          let strokeWidth: number
          if (activeNode === bond.id) {
            stroke = colors.accent
            strokeWidth = 1.5
          } else if (synastry?.status === 'resonance') {
            // Gold resonance line — animated via the overlay SVG below
            stroke = isDark ? 'rgba(196,168,130,0.45)' : 'rgba(120,90,40,0.4)'
            strokeWidth = 1.4
          } else if (synastry?.status === 'tension') {
            stroke = 'rgba(239,68,68,0.45)'
            strokeWidth = 1.0
          } else {
            stroke = isDark ? `rgba(161,161,170,${op})` : `rgba(113,113,122,${op})`
            strokeWidth = bond.score != null && bond.score >= 85 ? 1.2 : 0.8
          }

          return (
            <SvgLine
              key={`line-${bond.id}`}
              x1={selfX}
              y1={selfY}
              x2={x}
              y2={y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={isPending ? pendingDash : '3,8'}
            />
          )
        })}

        {/* Add node line */}
        {addNode ? (
          <SvgLine
            x1={selfX}
            y1={selfY}
            x2={addNode.x}
            y2={addNode.y}
            stroke={isDark ? 'rgba(161,161,170,0.15)' : 'rgba(113,113,122,0.12)'}
            strokeWidth={0.5}
            strokeDasharray='3,8'
          />
        ) : null}

        {/* Self glow circle */}
        <Circle cx={selfX} cy={selfY} r={cfg.auraR + 16} fill='url(#selfGlow)' />

        {/* Self outer aura */}
        <Circle
          cx={selfX}
          cy={selfY}
          r={cfg.auraR + 6}
          fill='none'
          stroke={selfAuraOuter}
          strokeWidth={0.5}
          strokeDasharray='1,6'
        />

        {/* Self inner aura */}
        <Circle
          cx={selfX}
          cy={selfY}
          r={cfg.auraR}
          fill='none'
          stroke={selfStrokeColor}
          strokeWidth={0.8}
          strokeDasharray='2,4'
        />

        {/* Self core */}
        <Circle
          cx={selfX}
          cy={selfY}
          r={cfg.selfR}
          fill={selfFillColor}
          stroke={selfStrokeColor}
          strokeWidth={0.5}
        />

        {/* Bond nodes — SVG circles + labels */}
        {bondNodes.map(({ bond, x, y, r }) => {
          const isActive = activeNode === bond.id
          const isPending = bond.status === 'pending_invite'
          const label = labelText(bond.relationshipLabel)
          const labelDup = label === bond.targetName
          const nodeR = interactive ? r : r + 2
          const sColor = scoreColor(bond.score, isDark)

          return (
            <NodeSvg
              key={`svg-${bond.id}`}
              x={x}
              y={y}
              r={nodeR}
              isActive={isActive}
              isPending={isPending}
              name={bond.targetName}
              label={labelDup ? '' : label}
              score={bond.score}
              grade={bond.grade}
              archetypeName={bond.archetypeName}
              showScore={!interactive}
              isDark={isDark}
              accentColor={colors.accent}
              bgColor={colors.background}
              nodeStroke={nodeStroke}
              scoreColor={sColor}
              pendingDash={pendingDash}
            />
          )
        })}

        {/* Add node circle */}
        {addNode ? (
          <Circle
            cx={addNode.x}
            cy={addNode.y}
            r={addNode.r}
            fill='none'
            stroke={nodeStroke}
            strokeWidth={1}
            strokeDasharray='4,4'
          />
        ) : null}
      </Svg>

      {/* Interactive: pressable bond node overlays + initials */}
      {interactive &&
        bondNodes.map(({ bond, x, y, r }) => {
          const initial = bond.targetName.charAt(0)
          const handlePress = showDemo
            ? onDemoNodePress
              ? () => onDemoNodePress(bond.relationshipLabel, bond.mode)
              : (onAddPress ?? undefined)
            : onNodePress
              ? () => onNodePress(bond.id)
              : undefined

          if (handlePress) {
            return (
              <Pressable
                key={`press-${bond.id}`}
                onPress={handlePress}
                style={{
                  position: 'absolute',
                  left: x - r,
                  top: y - r,
                  width: r * 2,
                  height: r * 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <InitialBadge
                  initial={initial}
                  r={r}
                  isActive={activeNode === bond.id}
                  isDark={isDark}
                  accentColor={colors.accent}
                  secondaryColor={colors.textSecondary}
                />
              </Pressable>
            )
          }
          return (
            <View
              key={`icon-${bond.id}`}
              style={{
                position: 'absolute',
                left: x - r * 0.4,
                top: y - r * 0.4,
                width: r * 0.8,
                height: r * 0.8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={r * 0.8} height={r * 0.8}>
                <SvgText
                  x={r * 0.4}
                  y={r * 0.55}
                  textAnchor='middle'
                  fontSize={r * 0.45}
                  fontWeight='300'
                  fill={colors.textSecondary}
                >
                  {initial}
                </SvgText>
              </Svg>
            </View>
          )
        })}

      {/* Non-interactive: initial letters overlay (no press targets) */}
      {!interactive &&
        bondNodes.map(({ bond, x, y, r }) => {
          const nodeR = r + 2
          const initial = bond.targetName.charAt(0)
          const sColor = scoreColor(bond.score, isDark)
          return (
            <View
              key={`init-${bond.id}`}
              style={{
                position: 'absolute',
                left: x - nodeR,
                top: y - nodeR,
                width: nodeR * 2,
                height: nodeR * 2,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={nodeR * 0.9} height={nodeR * 0.9}>
                <SvgText
                  x={nodeR * 0.45}
                  y={nodeR * 0.62}
                  textAnchor='middle'
                  fontSize={nodeR * 0.5}
                  fontWeight='300'
                  fill={sColor}
                >
                  {initial}
                </SvgText>
              </Svg>
            </View>
          )
        })}

      {/* "+" add node press target (interactive only) */}
      {interactive && addNode && onAddPress ? (
        <Pressable
          onPress={onAddPress}
          style={{
            position: 'absolute',
            left: addNode.x - addNode.r,
            top: addNode.y - addNode.r,
            width: addNode.r * 2,
            height: addNode.r * 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={14} color={colors.textSecondary} strokeWidth={1.2} />
        </Pressable>
      ) : null}

      {/* Self avatar */}
      <View
        style={{
          position: 'absolute',
          left: selfX - cfg.selfR,
          top: selfY - cfg.selfR,
          width: cfg.selfR * 2,
          height: cfg.selfR * 2,
          borderRadius: cfg.selfR,
          overflow: 'hidden',
        }}
      >
        {userAvatarUri ? (
          <Image
            source={{ uri: userAvatarUri }}
            style={{ width: cfg.selfR * 2, height: cfg.selfR * 2 }}
          />
        ) : (
          <DefaultAvatar index={avatarIndex} size={cfg.selfR * 2} isDark={isDark} />
        )}
      </View>

      {/* Animated aura pulse ring (non-interactive only) */}
      {!interactive && (
        <Animated.View
          style={{
            position: 'absolute',
            left: selfX - (cfg.auraR + 6),
            top: selfY - (cfg.auraR + 6),
            width: (cfg.auraR + 6) * 2,
            height: (cfg.auraR + 6) * 2,
            borderRadius: cfg.auraR + 6,
            borderWidth: 0.5,
            borderColor: isDark ? 'rgba(196,168,130,0.25)' : 'rgba(60,36,21,0.12)',
            opacity: pulseOpacity,
          }}
        />
      )}

      {/* Animated resonance glow overlay — pulsing gold lines for resonance bonds */}
      {hasResonance && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            opacity: resonancePulseOpacity,
          }}
          pointerEvents='none'
        >
          <Svg width={width} height={height}>
            {bondNodes.map(({ bond, x, y }) => {
              const synastry = synastryMap?.[bond.id]
              if (synastry?.status !== 'resonance') return null
              return (
                <SvgLine
                  key={`resonance-glow-${bond.id}`}
                  x1={selfX}
                  y1={selfY}
                  x2={x}
                  y2={y}
                  stroke={isDark ? 'rgba(196,168,130,0.55)' : 'rgba(120,90,40,0.5)'}
                  strokeWidth={2.0}
                  strokeDasharray='3,8'
                />
              )
            })}
          </Svg>
        </Animated.View>
      )}
    </View>
  )
}

// Re-export BOND_SELF so existing imports keep working
export { BOND_SELF } from '@/components/bonds/bonds-constellation-data'

// ── SVG sub-components ───────────────────────────────────────────────────────

/** Node: circle + name + label + optional score badge */
function NodeSvg({
  x,
  y,
  r,
  isActive,
  isPending,
  name,
  label,
  score,
  grade,
  archetypeName,
  showScore,
  isDark,
  accentColor,
  bgColor,
  nodeStroke,
  scoreColor: sColor,
  pendingDash,
}: {
  x: number
  y: number
  r: number
  isActive: boolean
  isPending: boolean
  name: string
  label: string
  score: number | null
  grade: string | null
  archetypeName?: string | null
  showScore: boolean
  isDark: boolean
  accentColor: string
  bgColor: string
  nodeStroke: string
  scoreColor: string
  pendingDash: string
}) {
  const baseY = y + r + 14
  const hasScore = score != null
  const isHighScore = hasScore && score >= 85

  const nodeFill = isActive
    ? isDark
      ? 'rgba(196,168,130,0.12)'
      : 'rgba(60,36,21,0.06)'
    : hasScore
      ? isHighScore
        ? isDark
          ? 'rgba(196,168,130,0.08)'
          : 'rgba(60,36,21,0.04)'
        : isDark
          ? 'rgba(161,161,170,0.04)'
          : 'rgba(113,113,122,0.03)'
      : bgColor

  return (
    <>
      {/* Outer glow ring for high-score nodes */}
      {isHighScore && (
        <Circle
          cx={x}
          cy={y}
          r={r + 5}
          fill='none'
          stroke={isDark ? 'rgba(196,168,130,0.1)' : 'rgba(60,36,21,0.05)'}
          strokeWidth={0.5}
        />
      )}

      {/* Node circle */}
      <Circle
        cx={x}
        cy={y}
        r={r}
        fill={nodeFill}
        stroke={
          isActive ? accentColor : isPending ? nodeStroke : isHighScore ? accentColor : nodeStroke
        }
        strokeWidth={isActive ? 1.5 : isHighScore ? 1 : 0.8}
        strokeDasharray={isPending ? pendingDash : isActive ? undefined : '3,5'}
        strokeOpacity={isPending ? 0.5 : 1}
      />

      {/* Name */}
      <SvgText
        x={x}
        y={baseY}
        textAnchor='middle'
        fontSize={12}
        fontWeight='400'
        fill={isDark ? '#D4D4D8' : '#3F3F46'}
      >
        {name}
      </SvgText>

      {/* Relationship label */}
      {label ? (
        <SvgText
          x={x}
          y={baseY + 14}
          textAnchor='middle'
          fontSize={9}
          fontWeight='300'
          fill={isDark ? 'rgba(161,161,170,0.6)' : 'rgba(113,113,122,0.5)'}
        >
          {label}
        </SvgText>
      ) : null}

      {/* Score / Archetype badge */}
      {showScore && (hasScore || archetypeName) ? (
        <SvgText
          x={x}
          y={baseY + (label ? 26 : 14)}
          textAnchor='middle'
          fontSize={9}
          fontWeight='500'
          fill={sColor}
          letterSpacing={0.5}
        >
          {archetypeName || `${score} · ${grade}`}
        </SvgText>
      ) : null}

      {/* Pending placeholder */}
      {showScore && isPending && !hasScore && !archetypeName ? (
        <SvgText
          x={x}
          y={baseY + (label ? 26 : 14)}
          textAnchor='middle'
          fontSize={8}
          fontWeight='300'
          fill={isDark ? 'rgba(161,161,170,0.4)' : 'rgba(113,113,122,0.35)'}
          letterSpacing={1}
        >
          ···
        </SvgText>
      ) : null}
    </>
  )
}

function InitialBadge({
  initial,
  r,
  isActive,
  isDark,
  accentColor,
  secondaryColor,
}: {
  initial: string
  r: number
  isActive: boolean
  isDark: boolean
  accentColor: string
  secondaryColor: string
}) {
  return (
    <View
      style={{
        width: r * 1.1,
        height: r * 1.1,
        borderRadius: r * 0.55,
        backgroundColor: isActive
          ? isDark
            ? 'rgba(196,168,130,0.15)'
            : 'rgba(60,36,21,0.08)'
          : isDark
            ? 'rgba(161,161,170,0.06)'
            : 'rgba(113,113,122,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={r * 0.8} height={r * 0.8}>
        <SvgText
          x={r * 0.4}
          y={r * 0.55}
          textAnchor='middle'
          fontSize={r * 0.45}
          fontWeight='300'
          fill={isActive ? accentColor : secondaryColor}
        >
          {initial}
        </SvgText>
      </Svg>
    </View>
  )
}
