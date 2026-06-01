/**
 * ☯ 卜卦 Tab — 摇卦占卜
 *
 * 流程：
 * 1. 输入问题
 * 2. 摇卦模式 → 摇 6 次 iPhone = 生成 6 爻
 * 3. AI 解卦结果
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DivinationReading } from '@zhop/hexastral-client'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Info, Sparkles, X } from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LateNightToast, useLateNightToast } from '@/components/commerce/LateNightToast'
import { StarRating } from '@/components/detail/StarRating'
import { TRIGRAMS, TrigramDivider } from '@/components/divination/TrigramDivider'
import { YaoHexagramDisplay } from '@/components/divination/YaoHexagramDisplay'
import { GuardBlockModal } from '@/components/modal/GuardBlockModal'
import { ReadingDisclaimer } from '@/components/reading/ReadingDisclaimer'
import { ReadingResultFooter } from '@/components/reading/ReadingResultFooter'
import { BackButton } from '@/components/ui/BackButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { castMeihua } from '@/lib/domain/meihua'
import { useI18n } from '@/lib/i18n'
import { fortuneColors, useTheme } from '@/lib/theme'
import { randomUUID } from '@/lib/uuid'
import { useAuthGate } from '@/lib/ux/useAuthGate'
import { useQuota } from '@/lib/ux/useQuota'
import type { YaoResult } from '@/lib/ux/useShakeDivination'
import { useShakeDivination } from '@/lib/ux/useShakeDivination'

type Phase = 'input' | 'shaking' | 'loading' | 'result'

export default function YiChingScreen() {
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ question?: string; from?: string }>()
  const { t, locale } = useI18n()

  const [phase, setPhase] = useState<Phase>('input')
  const [divinationMethod, setDivinationMethod] = useState<'liuyao' | 'meihua'>('liuyao')
  const [question, setQuestion] = useState(params.question ?? '')
  const [observedNumber, setObservedNumber] = useState('')
  const [result, setResult] = useState<DivinationReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultRating, setResultRating] = useState<number | null>(null)
  const pendingStartRef = useRef<'liuyao' | 'meihua' | null>(null)

  async function checkBeforeReading(method: 'liuyao' | 'meihua'): Promise<boolean> {
    try {
      const seen = await AsyncStorage.getItem('hexastral_before_reading_v1')
      if (!seen) {
        pendingStartRef.current = method
        await AsyncStorage.setItem('hexastral_before_reading_v1', '1')
        router.push(`/before-reading?type=${method === 'meihua' ? 'meihua' : 'yiching'}`)
        return false
      }
    } catch {
      // ignore
    }
    return true
  }

  // 配额检查
  const { checking, guard, checkYiChingQuota, dismissGuard, handleApiError } = useQuota()
  const lateNight = useLateNightToast()
  const { gate: authGate, authGateElement } = useAuthGate()

  // 当前落地的铜钱结果（null=旋转中，非null=展示结果）
  const [_latestLandedResult, setLatestLandedResult] = useState<YaoResult | null>(null)
  const landingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { completedYao, yaoResults, startShaking, reset } = useShakeDivination({
    onYaoComplete: (_yaoIndex, result) => {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current)
      setLatestLandedResult(result)
      // Brief cooldown before next cast
      landingTimerRef.current = setTimeout(() => {
        setLatestLandedResult(null)
      }, 500)
    },
    onComplete: async (generatedEntropy) => {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current)
      setLatestLandedResult(null)
      setPhase('loading')
      try {
        if (!user) {
          setError(t('error_login_hint'))
          setPhase('input')
          return
        }
        const resp = await apiClient.api.yiching.divination.$post({
          json: {
            question,
            entropy: generatedEntropy,
            userId: user.id,
            method: 'liuyao',
            requestId: randomUUID(),
          },
        })
        if (!resp.ok) throw new Error(await resp.text())
        const json = await resp.json()
        const reading = (json.data ?? json) as unknown as DivinationReading
        setResult(reading)
        setPhase('result')
      } catch (err: unknown) {
        if (!handleApiError(err)) {
          const message = err instanceof Error ? err.message : t('error_try_again')
          setError(message)
        }
        setPhase('input')
      }
    },
  })

  // 内部：真正开始六爻
  const doStartLiuyao = useCallback(async () => {
    if (!question.trim() || !user) return
    lateNight.showIfNeeded()
    const canProceed = await checkYiChingQuota(user.id)
    if (!canProceed) return
    setPhase('shaking')
    startShaking()
  }, [question, user, checkYiChingQuota, startShaking, lateNight])

  const handleStartDivination = useCallback(async () => {
    if (!question.trim()) return
    if (!user || user.id.startsWith('guest_')) {
      authGate(doStartLiuyao)
      return
    }
    setError(null)
    const proceed = await checkBeforeReading('liuyao')
    if (!proceed) return
    doStartLiuyao()
  }, [question, user, authGate, doStartLiuyao, checkBeforeReading])

  const doStartMeihua = useCallback(async () => {
    if (!question.trim() || !user) return
    lateNight.showIfNeeded()
    const canProceed = await checkYiChingQuota(user.id)
    if (!canProceed) return
    setPhase('loading')
    try {
      const parsed = observedNumber.trim() ? Number.parseInt(observedNumber.trim(), 10) : undefined
      const { entropy } = castMeihua({
        observedNumber: Number.isNaN(parsed ?? Number.NaN) ? undefined : parsed,
      })
      const resp = await apiClient.api.yiching.divination.$post({
        json: {
          question,
          entropy,
          userId: user.id,
          method: 'meihua',
          requestId: randomUUID(),
        },
      })
      if (!resp.ok) throw new Error(await resp.text())
      const json = await resp.json()
      const reading = (json.data ?? json) as unknown as DivinationReading
      setResult(reading)
      setPhase('result')
    } catch (err: unknown) {
      if (!handleApiError(err)) {
        const message = err instanceof Error ? err.message : t('error_try_again')
        setError(message)
      }
      setPhase('input')
    }
  }, [question, observedNumber, user, checkYiChingQuota, handleApiError, t, lateNight])

  const handleStartMeihua = useCallback(async () => {
    if (!question.trim()) return
    if (!user || user.id.startsWith('guest_')) {
      authGate(doStartMeihua)
      return
    }
    setError(null)
    const proceed = await checkBeforeReading('meihua')
    if (!proceed) return
    doStartMeihua()
  }, [question, user, authGate, doStartMeihua, checkBeforeReading])

  // When returning from before-reading formSheet, auto-trigger cast.
  // useFocusEffect fires every time the screen regains focus (e.g. modal dismissed),
  // which is the only reliable way to detect the sheet's dismissal in Expo Router.
  useFocusEffect(
    useCallback(() => {
      if (phase !== 'input') return
      const checkPendingStart = async () => {
        const confirmed = await AsyncStorage.getItem('hexastral_before_reading_confirmed')
        if (confirmed) {
          await AsyncStorage.removeItem('hexastral_before_reading_confirmed')
          const method = confirmed === 'meihua' ? 'meihua' : 'liuyao'
          pendingStartRef.current = method
        }
        if (pendingStartRef.current && question.trim()) {
          const method = pendingStartRef.current
          pendingStartRef.current = null
          if (method === 'meihua') {
            doStartMeihua()
          } else {
            doStartLiuyao()
          }
        }
      }
      checkPendingStart()
    }, [phase, question, doStartLiuyao, doStartMeihua])
  )

  // 离开摇卦时清理铜钱落地计时器
  useEffect(() => {
    if (phase !== 'shaking') {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current)
      setLatestLandedResult(null)
    }
  }, [phase])

  // 六爻动画：每新完成一爻，弹簧显现
  // (已由 YaoHexagramDisplay 内部处理，此 effect 已移除)

  const handleAbortShaking = useCallback(() => {
    Alert.alert(t('yiching_abort_title'), t('yiching_abort_msg'), [
      { text: t('yiching_abort_continue'), style: 'cancel' },
      {
        text: t('yiching_abort_confirm'),
        style: 'destructive',
        onPress: () => {
          if (landingTimerRef.current) clearTimeout(landingTimerRef.current)
          setLatestLandedResult(null)
          reset()
          setPhase('input')
          setError(null)
        },
      },
    ])
  }, [reset, t])

  const handleNewDivination = useCallback(() => {
    if (landingTimerRef.current) clearTimeout(landingTimerRef.current)
    setLatestLandedResult(null)
    setPhase('input')
    setQuestion('')
    setObservedNumber('')
    setResult(null)
    setError(null)
    setResultRating(null)
    reset()
  }, [reset])

  const handleRateResult = useCallback(
    async (value: number) => {
      if (!result) return
      setResultRating(value)
      try {
        await apiClient.api.yiching.divination[':id'].rating.$patch({
          param: { id: result.id },
          json: { rating: value },
        })
      } catch {
        // 静默处理
      }
    },
    [result]
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 }}
          keyboardShouldPersistTaps='handled'
        >
          {params.from === 'fate' ? (
            <View style={{ marginTop: -8, marginBottom: 4 }}>
              <BackButton
                onPress={() => router.replace('/(tabs)' as never)}
                style={{ paddingHorizontal: 0, paddingVertical: 8 }}
              />
            </View>
          ) : null}
          {/* 顶部标题栏 — 仅在输入/结果阶段显示 */}
          {(phase === 'input' || phase === 'result') && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: colors.accent,
                  letterSpacing: 6,
                  textTransform: 'uppercase',
                }}
              >
                {t('yiching_page_title')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push(
                    `/before-reading?type=${divinationMethod === 'meihua' ? 'meihua' : 'yiching'}`
                  )
                }
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 6,
                  paddingLeft: 12,
                }}
              >
                <Info size={13} color={colors.textSecondary} strokeWidth={1.5} />
                <Text style={{ fontSize: 12, fontWeight: '300', color: colors.textSecondary }}>
                  {t('yiching_before_reading_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 阶段一：输入问题 — 单一表单布局 */}
          {phase === 'input' && (
            <View style={{ flex: 1, marginTop: 20 }}>
              {/* ── 方法选择 ── */}
              <SegmentedControl
                segments={[
                  { key: 'liuyao', label: t('liuyao_method') },
                  { key: 'meihua', label: t('meihua_method') },
                ]}
                selected={divinationMethod}
                onChange={(m) => setDivinationMethod(m as 'liuyao' | 'meihua')}
                style={{ marginBottom: 24 }}
              />

              {/* ── 方法说明 ── */}
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginBottom: 20,
                  lineHeight: 20,
                  fontWeight: '300',
                }}
              >
                {divinationMethod === 'meihua' ? t('meihua_instruction') : t('yiching_instruction')}
              </Text>

              {/* ── 问题输入 ── */}
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder={t('yiching_placeholder')}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 0,
                  padding: 20,
                  fontSize: 15,
                  fontWeight: '400',
                  color: colors.text,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  borderWidth: 0.5,
                  borderColor: colors.border,
                }}
              />
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '300',
                  color: `${colors.textSecondary}70`,
                  marginTop: 5,
                  letterSpacing: 0.5,
                }}
              >
                {t('yiching_voice_hint')}
              </Text>

              {/* ── 梅花：观察数（可选） ── */}
              {divinationMethod === 'meihua' && (
                <View style={{ marginTop: 16 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '300',
                      color: colors.textSecondary,
                      marginBottom: 8,
                      letterSpacing: 0.5,
                    }}
                  >
                    {t('meihua_number_label')}
                  </Text>
                  <TextInput
                    value={observedNumber}
                    onChangeText={(v) => setObservedNumber(v.replace(/[^0-9]/g, ''))}
                    placeholder={t('meihua_number_placeholder')}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType='number-pad'
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 0,
                      padding: 16,
                      fontSize: 16,
                      fontWeight: '400',
                      color: colors.text,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '300',
                      color: `${colors.textSecondary}80`,
                      marginTop: 5,
                      lineHeight: 16,
                    }}
                  >
                    {t('meihua_number_hint')}
                  </Text>
                </View>
              )}

              {error && (
                <Text
                  style={{
                    color: '#EF4444',
                    textAlign: 'center',
                    marginTop: 12,
                    fontSize: 13,
                    fontWeight: '300',
                  }}
                >
                  {error}
                </Text>
              )}

              {/* ── CAST button — filled tint matches 自由起卦 hero ── */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={divinationMethod === 'meihua' ? handleStartMeihua : handleStartDivination}
                disabled={!question.trim()}
                style={{
                  marginTop: 28,
                  backgroundColor: isDark ? '#FAFAFA' : '#18181B',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  opacity: !question.trim() ? 0.4 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    letterSpacing: 1.5,
                    color: isDark ? '#18181B' : '#FAFAFA',
                    textTransform: 'uppercase',
                  }}
                >
                  {divinationMethod === 'meihua' ? t('meihua_start') : t('yiching_start')}
                </Text>
              </TouchableOpacity>

              {/* Shake hint (六爻 only) */}
              {divinationMethod === 'liuyao' && (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '300',
                    color: `${colors.textSecondary}80`,
                    textAlign: 'center',
                    marginTop: 12,
                    letterSpacing: 1,
                  }}
                >
                  {t('yiching_shake_hint')}
                </Text>
              )}

              {/* Cost note */}
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 10,
                  lineHeight: 16,
                }}
              >
                {t('synastry_cost_note')}
              </Text>
            </View>
          )}

          {/* ── 阶段二：卜 — 六爻成卦 ── */}
          {phase === 'shaking' && (
            <View style={{ flex: 1 }}>
              {/* 退出 — 仅首爻前可取消 */}
              {completedYao === 0 ? (
                <Pressable
                  onPress={() => {
                    if (landingTimerRef.current) clearTimeout(landingTimerRef.current)
                    setLatestLandedResult(null)
                    reset()
                    setPhase('input')
                  }}
                  style={{ alignSelf: 'flex-start', padding: 4 }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={16} color={colors.textSecondary} strokeWidth={1} />
                </Pressable>
              ) : (
                <View style={{ height: 24 }} />
              )}

              {/* 卦象 — 中心焦点 */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ gap: 16 }}>
                  {([5, 4, 3, 2, 1, 0] as const).map((yaoIdx) => {
                    const r = yaoResults[yaoIdx] ?? null
                    const isLatest = yaoIdx === completedYao - 1
                    const isYang = r && (r.total === 7 || r.total === 9)
                    const isChanging = r && (r.total === 6 || r.total === 9)
                    const W = 160
                    const H = 7
                    const lineColor = !r
                      ? `${colors.textSecondary}25`
                      : isChanging
                        ? colors.accent
                        : isLatest
                          ? colors.text
                          : `${colors.text}40`
                    const labelColor = !r
                      ? `${colors.textSecondary}35`
                      : isLatest
                        ? colors.accent
                        : `${colors.textSecondary}50`
                    return (
                      <View
                        key={yaoIdx}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            color: labelColor,
                            width: 40,
                            textAlign: 'right',
                            fontWeight: '300',
                            letterSpacing: 0.3,
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {t(
                            (
                              [
                                'yiching_yao_name_1',
                                'yiching_yao_name_2',
                                'yiching_yao_name_3',
                                'yiching_yao_name_4',
                                'yiching_yao_name_5',
                                'yiching_yao_name_6',
                              ] as const
                            )[yaoIdx]
                          )}
                        </Text>
                        {!r || isYang ? (
                          <View
                            style={{
                              width: W,
                              height: H,
                              backgroundColor: lineColor,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {r?.total === 9 && (
                              <Text
                                style={{
                                  fontSize: 9,
                                  color: colors.background,
                                  fontWeight: '700',
                                  lineHeight: H + 4,
                                }}
                              >
                                ×
                              </Text>
                            )}
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', width: W, alignItems: 'center' }}>
                            <View style={{ flex: 1, height: H, backgroundColor: lineColor }} />
                            <View
                              style={{ width: 22, alignItems: 'center', justifyContent: 'center' }}
                            >
                              {r.total === 6 && (
                                <Text style={{ fontSize: 9, color: lineColor, fontWeight: '600' }}>
                                  ○
                                </Text>
                              )}
                            </View>
                            <View style={{ flex: 1, height: H, backgroundColor: lineColor }} />
                          </View>
                        )}
                        <View style={{ width: 18 }}>
                          {isChanging && (
                            <Text style={{ fontSize: 9, color: colors.accent, fontWeight: '600' }}>
                              {r?.total}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>

              {/* 底部：进度提示 */}
              <View style={{ gap: 12, paddingBottom: 4 }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: `${colors.textSecondary}60`,
                    fontWeight: '300',
                    letterSpacing: 2,
                  }}
                >
                  {completedYao === 0
                    ? t('yiching_shake_initial')
                    : completedYao < 6
                      ? t('yiching_shake_progress', { n: completedYao })
                      : t('yiching_shake_complete')}
                </Text>

                {completedYao > 0 && (
                  <Pressable
                    onPress={handleAbortShaking}
                    style={{ alignItems: 'center', paddingVertical: 4 }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: `${colors.textSecondary}50`,
                        fontWeight: '300',
                        letterSpacing: 2,
                      }}
                    >
                      {t('yiching_abort_title')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* 阶段三：加载中 — 墨色脉动 */}
          {phase === 'loading' && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderWidth: 0.5,
                  borderColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={24} color={colors.accent} strokeWidth={1} />
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Text
                  style={{ fontSize: 15, color: colors.text, fontWeight: '300', letterSpacing: 2 }}
                >
                  {divinationMethod === 'meihua' ? t('meihua_computing') : t('yiching_computing')}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    fontWeight: '300',
                    letterSpacing: 1,
                  }}
                >
                  {t('yiching_ai_loading')}
                </Text>
              </View>
            </View>
          )}

          {/* 阶段四：结果 — 六爻纳甲 Ink Brutalism */}
          {phase === 'result' && result && (
            <View style={{ flex: 1 }}>
              {/* ── 卦象总览 — inkWash hero ── */}
              <View
                style={{
                  backgroundColor: colors.inkWash,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  paddingVertical: 32,
                  paddingHorizontal: 24,
                  marginBottom: 20,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 72, lineHeight: 80 }}>{result.hexagram.symbol}</Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '500',
                    color: colors.text,
                    marginTop: 8,
                    letterSpacing: 3,
                  }}
                >
                  {result.hexagram.name}
                  {t('yiching_gua_suffix')}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    fontWeight: '300',
                    letterSpacing: 2,
                    marginTop: 6,
                  }}
                >
                  {result.hexagram.pinyin} · {t('yiching_ordinal', { n: result.hexagram.number })}
                </Text>

                {yaoResults.length > 0 && (
                  <View style={{ marginTop: 20, width: '100%' }}>
                    <YaoHexagramDisplay yaoResults={yaoResults} latestYaoIndex={-1} compact />
                  </View>
                )}
              </View>

              {/* ── 吉凶标签 ── */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    backgroundColor: fortuneColors[result.fortune].bg,
                    paddingHorizontal: 32,
                    paddingVertical: 12,
                    borderWidth: 0.5,
                    borderColor: fortuneColors[result.fortune].text,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: fortuneColors[result.fortune].text,
                      letterSpacing: 3,
                    }}
                  >
                    {result.fortune === 'great-fortune'
                      ? t('fortune_great')
                      : result.fortune === 'fortune'
                        ? t('fortune_good')
                        : result.fortune === 'neutral'
                          ? t('fortune_neutral')
                          : result.fortune === 'caution'
                            ? t('fortune_caution')
                            : t('fortune_misfortune')}
                  </Text>
                </View>
              </View>

              {/* ── 一句话总结 — 墨色左边线 ── */}
              <View
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: colors.accent,
                  paddingLeft: 16,
                  paddingVertical: 12,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '500',
                    color: colors.text,
                    lineHeight: 28,
                  }}
                >
                  {result.summary}
                </Text>
              </View>

              <TrigramDivider
                trigram={TRIGRAMS.kan}
                marginHorizontal={0}
                style={{ marginBottom: 20 }}
              />

              {/* ── 卦辞 + 象辞 ── */}
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  padding: 20,
                  marginTop: 20,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.accent,
                    marginBottom: 10,
                    fontWeight: '500',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('yiching_guaci')}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.text,
                    fontWeight: '300',
                    lineHeight: 24,
                  }}
                >
                  {result.hexagram.judgment}
                </Text>
                <View style={{ height: 0.5, backgroundColor: colors.border, marginVertical: 16 }} />
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.accent,
                    marginBottom: 10,
                    fontWeight: '500',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('yiching_xiangci')}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.text,
                    fontWeight: '300',
                    lineHeight: 24,
                  }}
                >
                  {result.hexagram.image}
                </Text>
              </View>

              {/* ── AI 解读 ── */}
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.accent,
                    marginBottom: 12,
                    fontWeight: '500',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('detail_ai_reading')}
                </Text>
                <Text
                  style={{ fontSize: 15, color: colors.text, lineHeight: 26, fontWeight: '300' }}
                >
                  {result.interpretation}
                </Text>
              </View>

              {/* ── 建议 ── */}
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  padding: 20,
                  marginBottom: 32,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.accent,
                    marginBottom: 12,
                    fontWeight: '500',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('detail_advice')}
                </Text>
                <Text
                  style={{ fontSize: 15, color: colors.text, lineHeight: 26, fontWeight: '300' }}
                >
                  {result.advice}
                </Text>
              </View>

              <TrigramDivider
                trigram={TRIGRAMS.li}
                marginHorizontal={0}
                style={{ marginBottom: 20 }}
              />

              {/* ── Was this helpful ── */}
              <View
                style={{
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  padding: 20,
                  marginBottom: 20,
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <StarRating rating={resultRating} onRate={handleRateResult} />
              </View>

              {/* §六B-3 结果免责语 */}
              <ReadingResultFooter />

              {/* 免责声明 */}
              <ReadingDisclaimer type='yiching' />

              {/* ── 再来一卦 ── */}
              <Pressable
                onPress={handleNewDivination}
                style={({ pressed }) => ({
                  marginTop: 24,
                  paddingVertical: 14,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  alignItems: 'center',
                  opacity: pressed ? 0.6 : 1,
                  marginBottom: 32,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '300',
                    color: colors.textSecondary,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('yiching_again')}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Guard 拦截弹窗 */}
      <GuardBlockModal visible={!!guard} guardKey={guard?.guardKey} onDismiss={dismissGuard} />
      {authGateElement}
      {/* 深夜提醒 Toast */}
      <LateNightToast visible={lateNight.visible} onDismiss={lateNight.dismiss} />
      {/* 解读前轻提示 — 已迁移至 /before-reading 原生 formSheet */}
    </SafeAreaView>
  )
}
