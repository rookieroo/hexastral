/**
 * Bond Detail — Asymmetric unlock reading
 *
 * Route: /bond-detail?id=xxx
 *
 * A (owner, unlockedDimensions=4): sees all 4 dims + AI notes, can Gift to B.
 * B (mirror bond, unlockedDimensions=1): sees only hookDimension freely,
 *   3 dims locked behind pay-wall (5 coins or IAP if insufficient).
 */

import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Gift, Lock, Share2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BondRadarChart } from '@zhop/scenario-bonds'
import { InterpretationSections } from '@/components/bonds/InterpretationSections'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import type { BondDimension } from '@/lib/domain/bonds'
import {
  useBondDetailQuery,
  useGiftBondMutation,
  useUnlockBondMutation,
  useUpdateBondStageMutation,
} from '@/lib/hooks/useBondDetailQuery'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'
import type { ArchetypeCategory } from '@/lib/ui-mapping'
import { ARCHETYPE_CATEGORY_I18N_KEY, archetypeCategoryColor } from '@/lib/ui-mapping'

export default function BondDetailScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()
  const { userId } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const bondId = params.id ?? null

  const [unlockError, setUnlockError] = useState<string | null>(null)

  const ios = {
    ...useIosPalette(),
    lockedBg: isDark ? 'rgba(9,9,11,0.88)' : 'rgba(250,250,250,0.90)',
  }

  const { data: bond, isLoading } = useBondDetailQuery(userId, bondId)
  const unlockMutation = useUnlockBondMutation(userId, bondId)
  const giftMutation = useGiftBondMutation(userId, bondId)
  const stageMutation = useUpdateBondStageMutation(userId, bondId)

  type RelationshipStage = 'crush' | 'dating' | 'committed' | 'engaged' | 'married' | 'ex'
  const [localStage, setLocalStage] = useState<RelationshipStage>(
    (bond?.relationshipStage as RelationshipStage | undefined) ?? 'crush'
  )

  const isOwner = !!bond && !!userId && bond.ownerId === userId
  const canSeeAll = !bond || bond.unlockedDimensions === '4' || bond.unlockedDimensions === null

  const handleInvite = useCallback(async () => {
    if (!bond) return
    const url = `https://hexastral.com/invite/${bond.id}`
    await Share.share({ message: t('bond_invite_message', { url }), url })
  }, [bond, t])

  const handleGift = useCallback(async () => {
    if (!bond) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await giftMutation.mutateAsync()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to gift reading')
    }
  }, [bond, giftMutation])

  const handleUnlock = useCallback(async () => {
    if (!bond) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setUnlockError(null)
    try {
      await unlockMutation.mutateAsync()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('coin') || msg.includes('402')) {
        // Insufficient coins — show paywall
        router.push('/paywall')
      } else {
        setUnlockError(msg || 'Unlock failed')
      }
    }
  }, [bond, unlockMutation, router])

  if (isLoading || !bond) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '300', color: ios.secondary }}>
          {t('contacts_loading')}
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      {/* Back button */}
      <BackButton />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero — initials block ── */}
        <View
          style={{
            paddingVertical: 40,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#18181B' : '#F4F4F5',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderWidth: 0.5,
                borderColor: ios.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '200', color: ios.accent }}>
                {t('bonds_self').charAt(0)}
              </Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '100', color: ios.dim }}>·</Text>
            <View
              style={{
                width: 56,
                height: 56,
                borderWidth: 0.5,
                borderColor: ios.separator,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '200', color: ios.text }}>
                {bond.targetName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {bond.score != null ? (
            <View style={{ marginTop: 20, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 40, fontWeight: '100', color: ios.text, letterSpacing: -2 }}>
                {bond.score}
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '300',
                  color: ios.secondary,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                }}
              >
                {bond.grade ?? ''} · / 100
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Names ── */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: '500',
            color: ios.text,
            letterSpacing: 0.3,
            marginBottom: 4,
          }}
        >
          {bond.targetName}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.secondary,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          {bond.status === 'active' ? t('bonds_matched') : t('bonds_pending')} ·{' '}
          {bond.relationshipLabel}
        </Text>

        {/* ── Relationship Stage Selector ── */}
        {isOwner && (
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              {t('bond_stage_label')}
            </Text>
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
            >
              {(['crush', 'dating', 'committed', 'engaged', 'married', 'ex'] as const).map(
                (stage) => (
                  <Pressable
                    key={stage}
                    onPress={() => {
                      setLocalStage(stage)
                      stageMutation.mutate(stage)
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 20,
                      borderWidth: 0.5,
                      borderColor: localStage === stage ? ios.tint : ios.separator,
                      backgroundColor: localStage === stage ? `${ios.tint}18` : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: localStage === stage ? ios.tint : ios.secondary,
                        fontWeight: localStage === stage ? '600' : '400',
                      }}
                    >
                      {t(`bond_stage_${stage}` as const)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          </View>
        )}

        {/* ── Archetype card ── */}
        {bond.archetypeName ? (
          <View
            style={{
              borderWidth: 0.5,
              borderColor: ios.separator,
              padding: 20,
              marginBottom: 24,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '300',
                  color: ios.secondary,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                }}
              >
                {t('bond_detail_archetype_label')}
              </Text>
              {bond.archetypeCategory ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderWidth: 0.5,
                    borderColor: archetypeCategoryColor(
                      bond.archetypeCategory as ArchetypeCategory,
                      isDark
                    ),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: '500',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      color: archetypeCategoryColor(
                        bond.archetypeCategory as ArchetypeCategory,
                        isDark
                      ),
                    }}
                  >
                    {t(
                      ARCHETYPE_CATEGORY_I18N_KEY[
                        bond.archetypeCategory as ArchetypeCategory
                      ] as never
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '300',
                color: ios.text,
                letterSpacing: 0.5,
                lineHeight: 28,
              }}
            >
              {bond.archetypeName}
            </Text>
            {bond.archetypeTagline ? (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '300',
                  fontStyle: 'italic',
                  color: ios.secondary,
                  lineHeight: 18,
                }}
              >
                {bond.archetypeTagline}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Dimensions ── */}
        {bond.dimensions ? (
          <View
            style={{
              borderWidth: 0.5,
              borderColor: ios.separator,
              padding: 20,
              gap: 20,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              {t('bond_detail_dimensions')}
            </Text>

            {/* Radar chart — only when all 4 dimensions are unlocked */}
            {canSeeAll && bond.dimensions.every((d) => d.score != null) && (
              <BondRadarChart
                dimensions={bond.dimensions}
                labels={{
                  long_term: t('bond_dim_long_term'),
                  attraction: t('bond_dim_attraction'),
                  communication: t('bond_dim_communication'),
                  emotional: t('bond_dim_emotional'),
                }}
                palette={{ accent: ios.accent, secondary: ios.secondary, separator: ios.separator }}
              />
            )}

            {bond.dimensions.map((dim) => (
              <DimensionRow key={dim.key} dim={dim} ios={ios} t={t} />
            ))}

            {/* B restricted: prompt to unlock */}
            {!canSeeAll ? (
              <View
                style={{
                  paddingTop: 8,
                  borderTopWidth: 0.5,
                  borderTopColor: ios.separator,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Lock size={11} color={ios.secondary} strokeWidth={1.2} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '300',
                      color: ios.secondary,
                      letterSpacing: 0.5,
                    }}
                  >
                    {t('bond_locked_hint')}
                  </Text>
                </View>
                {unlockError ? (
                  <Text style={{ fontSize: 11, color: '#FCA5A5' }}>{unlockError}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : bond.status !== 'active' ? (
          // No reading yet — show placeholder
          <View
            style={{
              borderWidth: 0.5,
              borderColor: ios.separator,
              padding: 20,
              marginBottom: 24,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Lock size={16} color={ios.dim} strokeWidth={1} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 1,
                textAlign: 'center',
              }}
            >
              {t('bond_detail_unlock_hint')}
            </Text>
          </View>
        ) : null}

        {/* ── Long-form interpretation (overview / day-master / branches / highlights / advice) ── */}
        {bond.interpretation ? (
          <InterpretationSections
            interpretation={bond.interpretation}
            ios={ios}
            canSeeAll={canSeeAll}
          />
        ) : null}

        {/* ── B: Unlock CTA (primary action when restricted) ── */}
        {!canSeeAll && bond.status === 'active' ? (
          <Button
            variant='default'
            uppercase
            onPress={handleUnlock}
            loading={unlockMutation.isPending}
            style={{ marginBottom: 12 }}
          >
            {t('sku_detail_access')}
          </Button>
        ) : null}

        {/* ── A: Gift CTA (when owner & active & has mirror & not yet gifted) ── */}
        {isOwner && bond.status === 'active' && bond.mirrorBondId && !bond.sharedByOwner ? (
          <Pressable
            onPress={handleGift}
            disabled={giftMutation.isPending || giftMutation.isSuccess}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 16,
              marginBottom: 12,
              borderWidth: 0.5,
              borderColor: ios.separator,
              opacity: pressed || giftMutation.isPending ? 0.5 : 1,
            })}
          >
            <Gift size={14} color={ios.secondary} strokeWidth={1.2} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '300',
                color: ios.secondary,
                letterSpacing: 1,
              }}
            >
              {giftMutation.isPending
                ? '...'
                : giftMutation.isSuccess
                  ? t('bond_gift_done')
                  : t('bond_gift_cta')}
            </Text>
          </Pressable>
        ) : null}

        {/* A: already gifted indicator */}
        {isOwner && bond.sharedByOwner ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 12,
              marginBottom: 12,
            }}
          >
            <Gift size={12} color={ios.dim} strokeWidth={1} />
            <Text style={{ fontSize: 11, fontWeight: '300', color: ios.dim, letterSpacing: 1 }}>
              {t('bond_gift_done')}
            </Text>
          </View>
        ) : null}

        {/* ── Invite / Share link ── */}
        <Pressable
          onPress={handleInvite}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 16,
            borderWidth: 0.5,
            borderColor: ios.separator,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Share2 size={16} color={ios.secondary} strokeWidth={1.2} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '300',
              color: ios.secondary,
              letterSpacing: 1,
            }}
          >
            {t('bond_invite_share')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Dimension Row ─────────────────────────────────────────────

type Ios = {
  bg: string
  text: string
  secondary: string
  accent: string
  separator: string
  dim: string
  lockedBg: string
}

function DimensionRow({
  dim,
  ios,
  t,
}: {
  dim: BondDimension
  ios: Ios
  t: ReturnType<typeof useI18n>['t']
}) {
  const progress =
    dim.score != null && dim.maxScore != null && dim.maxScore > 0
      ? (dim.score / dim.maxScore) * 100
      : 30

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: dim.isLocked ? ios.dim : ios.secondary,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {t(`shop_dim_${dim.key}`)}
        </Text>
        {!dim.isLocked && dim.score != null && dim.maxScore != null ? (
          <Text style={{ fontSize: 11, fontWeight: '300', color: ios.secondary }}>
            {dim.score}/{dim.maxScore}
          </Text>
        ) : null}
      </View>

      {/* Progress bar container */}
      <View
        style={{
          height: 3,
          backgroundColor: ios.separator,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {dim.isLocked ? (
          // Locked — show scrambled bar as visual noise
          <>
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: 3,
                width: '65%',
                backgroundColor: ios.dim,
                opacity: 0.4,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: 3,
                width: '100%',
                backgroundColor: ios.lockedBg,
                opacity: 0.7,
              }}
            />
          </>
        ) : (
          <View
            style={{
              height: 3,
              backgroundColor: ios.accent,
              width: `${Math.min(progress, 100)}%`,
            }}
          />
        )}
      </View>

      {/* Locked overlay */}
      {dim.isLocked ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Lock size={9} color={ios.dim} strokeWidth={1} />
          <Text style={{ fontSize: 9, color: ios.dim, letterSpacing: 2 }}>
            {'─ ─ ─ ─ ─ ─ ─ ─ ─ ─'}
          </Text>
        </View>
      ) : dim.note ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.secondary,
            lineHeight: 16,
            marginTop: 2,
          }}
          numberOfLines={2}
        >
          {dim.note}
        </Text>
      ) : null}
    </View>
  )
}
