/**
 * Bond detail / synastry report.
 *
 * Loads /api/bonds/:id via useSynastryReport, then renders:
 *   - Header: 2 names + relationship + compatibility score
 *   - If report has chapters: ChapterPager (horizontal swipe across 6 chapters)
 *   - Else: fall back to single-page summary card with goldenLine if present
 *
 * Status 202 → "generating" UI; on 4xx/5xx → error state + retry.
 *
 * Share flow: tapping the chapter's share button registers a shareId via
 * POST /api/bonds/:id/share, renders ShareableChapterCard off-screen, captures
 * it as a 1080×1920 PNG via react-native-view-shot, then opens the system
 * share sheet via expo-sharing.
 *
 * Phase F migration: loading / generating / error states use core-ui patterns.
 * Editorial typography (kindredType) and gold-underline CTAs (kindredPresets) stay
 * Kindred-specific.
 */

import { ErrorState, useHaptic } from '@zhop/core-ui'
import { AutoMoonPhaseLoader } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPaper,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { SKIN_CINNABAR } from '@zhop/hexastral-tokens/moon'
import {
  type BondStatus,
  ChapterPager,
  ChapterUnlockWall,
  CompatibilityScore,
  ShareableChapterCard,
  useShareBond,
  useSynastryReport,
} from '@zhop/scenario-kindred'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Alert, Dimensions, Pressable, ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { captureRef } from 'react-native-view-shot'
import {
  deriveCenterpieceMode,
  deriveTransitionEndpoints,
  InkCenterpiece,
} from '@/components/ink/InkCenterpiece'
import { PrimaryButton } from '@/components/PrimaryButton'
import { ReadingPrimer } from '@/components/reading/ReadingPrimer'
import { ReportBloom } from '@/components/reading/ReportBloom'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { SignInSheet } from '@/components/SignInSheet'
import { emitUnlockFunnel } from '@/lib/analytics'
import { openAuspiceCompose } from '@/lib/auspice-handoff'
import { useAuth } from '@/lib/auth'
import { type CachedBondBirth, getBondBirth } from '@/lib/bondBirthCache'
import { relativeSentLabel, resolveLocale, useI18n } from '@/lib/i18n'
import { getKindredSinglePrice, purchaseKindredSingle } from '@/lib/iap'
import { hasSeenReadingPrimer, markReadingPrimerSeen } from '@/lib/primer-seen'

export default function BondDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { detail, isLoading, isGenerating, error, refetch, chapters, unlockBond } =
    useSynastryReport(id ?? null)
  const [chapterIndex, setChapterIndex] = useState<number>(0)
  // 划词 — the paragraph the user long-pressed (drives the SelectionActionBar),
  // and the set of highlighted paragraphs (session-local for now; persistence is
  // a follow-up). See components/SelectionActionBar.tsx.
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])
  const { createShareUrl } = useShareBond()
  const { t } = useI18n()

  // First-report-entry primer (shown once; lib/primer-seen.ts gates it). Armed
  // only once a chapter report actually exists — no point teaching the report
  // over a loading/error/generating screen.
  const hasChapters = !!chapters && chapters.length > 0
  const [showPrimer, setShowPrimer] = useState(false)
  useEffect(() => {
    if (!hasChapters) return
    let cancelled = false
    void hasSeenReadingPrimer().then((seen) => {
      if (!cancelled && !seen) setShowPrimer(true)
    })
    return () => {
      cancelled = true
    }
  }, [hasChapters])
  const dismissPrimer = () => {
    setShowPrimer(false)
    void markReadingPrimerSeen()
  }

  // One-time-unlock price (store-localized; falls back to the server's $6.99).
  const [unlockPrice, setUnlockPrice] = useState<string>('$6.99')
  const [unlocking, setUnlocking] = useState(false)
  // Anonymous buyers may purchase the one-time report with no sign-in gate; after
  // success we nudge sign-in so the purchase becomes Apple-recoverable.
  const { userEmail } = useAuth()
  const [showSaveSheet, setShowSaveSheet] = useState(false)
  useEffect(() => {
    void getKindredSinglePrice('compatibility').then((p) => {
      if (p) setUnlockPrice(p)
    })
  }, [])

  // Funnel: the wall is shown when this bond still has locked chapters.
  const lockedCount = detail?.interpretation?.lockedChapters?.length ?? 0
  useEffect(() => {
    if (id && lockedCount > 0) {
      emitUnlockFunnel({ step: 'wall_view', bond_id: id, locked: lockedCount })
    }
  }, [id, lockedCount])

  // Buy → apply to this bond. RevenueCat records the purchase via webhook, so we
  // retry the server apply a few times to absorb webhook lag.
  const handlePurchaseUnlock = async () => {
    if (unlocking) return
    setUnlocking(true)
    emitUnlockFunnel({ step: 'buy_tap', bond_id: id })
    try {
      const result = await purchaseKindredSingle('compatibility')
      if (result === 'cancelled') return
      if (result !== 'success') {
        Alert.alert(t('unlock.failed'))
        return
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const outcome = await unlockBond()
        if (outcome === 'unlocked') {
          emitUnlockFunnel({ step: 'unlock_success', bond_id: id, via: 'single_purchase' })
          // Non-blocking: report is already unlocked. If still anonymous, nudge
          // sign-in so the purchase rides an Apple-recoverable account (apple-link
          // binds Apple to the SAME userId in place → entitlement stays put, no
          // alias/migration needed).
          if (!userEmail) setShowSaveSheet(true)
          return
        }
        if (outcome === 'error') {
          Alert.alert(t('unlock.failed'))
          return
        }
        // needs_purchase → webhook not landed yet; wait and retry.
        await new Promise((r) => setTimeout(r, 1500))
      }
      Alert.alert(t('unlock.pending'))
    } finally {
      setUnlocking(false)
    }
  }

  // Auspice port — only when THIS device entered TA's birth (fill bond). The
  // server never returns a partner's raw birth (privacy D2), so we read the
  // local cache written at creation time.
  const [auspiceBirth, setAuspiceBirth] = useState<CachedBondBirth | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    void getBondBirth(id).then((b) => {
      if (!cancelled) setAuspiceBirth(b)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const sendToAuspice = () => {
    if (!auspiceBirth) return
    void openAuspiceCompose({
      name: auspiceBirth.name,
      solarDate: auspiceBirth.solarDate,
      timeIndex: auspiceBirth.timeIndex,
      gender: auspiceBirth.gender,
      city: auspiceBirth.city ?? null,
      relationshipLabel: auspiceBirth.relationshipLabel,
    })
  }

  // Off-screen render target for ShareableChapterCard.
  // When shareTarget is set, the hidden View renders the card for that chapter
  // and the effect below captures it via view-shot, then opens share sheet.
  const [shareTarget, setShareTarget] = useState<{
    index: number
    brandUrl: string
    installUrl?: string
  } | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const captureRefView = useRef<View>(null)
  const haptic = useHaptic()

  // When shareTarget changes, capture-and-share on the next layout pass.
  useEffect(() => {
    if (!shareTarget) return
    let cancelled = false
    const handle = setTimeout(async () => {
      if (cancelled || !captureRefView.current) return
      try {
        const uri = await captureRef(captureRefView.current, {
          format: 'png',
          quality: 1,
          width: 1080,
          height: 1920,
        })
        if (!cancelled) {
          await haptic('light')
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              dialogTitle: 'Kindred',
              mimeType: 'image/png',
              UTI: 'public.png',
            })
          }
        }
      } catch (err) {
        if (__DEV__) console.warn('[Kindred share]', err)
      } finally {
        if (!cancelled) {
          setShareTarget(null)
          setIsCapturing(false)
        }
      }
    }, 80)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [shareTarget, haptic])

  const handleShareChapter = async (idx: number) => {
    if (!id || isCapturing) return
    setIsCapturing(true)
    let brandUrl = 'kindred.hexastral.com'
    let installUrl: string | undefined
    try {
      const res = await createShareUrl(id)
      // Full URL (with scheme) → scannable QR; stripped form → footer text.
      installUrl = res.url
      brandUrl = res.url.replace(/^https?:\/\//, '')
    } catch (err) {
      if (__DEV__) console.warn('[Kindred share/url]', err)
      // Fall through with default brandUrl — still shareable as a generic card.
    }
    setShareTarget({ index: idx, brandUrl, installUrl })
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AutoMoonPhaseLoader size={72} skin={SKIN_CINNABAR} />
        </View>
      </SafeAreaView>
    )
  }

  if (isGenerating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: kindredSpacing.lg,
          }}
        >
          <AutoMoonPhaseLoader size={96} skin={SKIN_CINNABAR} />
          <Text style={[kindredType.body, { color: kindredDark.textSecondary }]}>
            {t('bond.matching')}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        <ErrorState
          variant='fullscreen'
          title={error?.message ?? 'Bond not found'}
          customAction={
            <PrimaryButton label='Retry →' onPress={() => void refetch()} block={false} />
          }
        />
      </SafeAreaView>
    )
  }

  // Names for the share card — fall back to "你" / targetName for solo bonds
  const selfName = detail.interpretation?.personAName as string | undefined
  const otherName = detail.targetName

  // Title = a specific name; fall back to the relationship so it's never blank,
  // and only tag the relationship when it isn't already the title (avoids
  // "媳妇 · 媳妇"). Matches the threads list. (2026-06: "只显示关系很难分清".)
  const rawName = (detail.targetName || detail.targetUser?.name || '').trim()
  const displayName = rawName || detail.relationshipLabel
  const relTag = rawName && detail.relationshipLabel !== rawName ? detail.relationshipLabel : null

  // Re-send this bond's invite (share THIS bond's resonate link when it exists,
  // else fall back to the generic invite flow). Surfaced both on the unlock wall
  // and for pending/declined/expired threads (2026-06: "点进去应该给重新发起邀请的入口").
  const reInvite = () => {
    emitUnlockFunnel({ step: 'invite_tap', bond_id: detail.id })
    const url = detail.invitation?.resonateUrl
    if (url) {
      const message = [
        t('unlock.inviteShareLead').replace('{name}', displayName),
        detail.interpretation?.ahaHook ?? '',
        url,
      ]
        .filter(Boolean)
        .join('\n')
      void Share.share({ message })
    } else {
      router.push('/(onboarding)/invite')
    }
  }

  // Pro chat over this synastry. The server's 'pair' context query keys on the
  // pairReadings id (hehunReadingId), NOT the bond id — only offer chat once a
  // reading exists.
  const pairReadingId = detail.hehunReadingId
  const openChat =
    pairReadingId != null
      ? () =>
          router.push({
            pathname: '/(bonds)/chat',
            params: { id: pairReadingId, title: detail.targetName },
          })
      : null

  // Basic-info line under the header — when the thread was started + whether
  // their info is in (2026-06: "进去之后展示这个 Thread 的基本信息"). resolveLocale()
  // is a plain call (not a hook) so it's safe below the loading/error returns.
  const locale = resolveLocale()
  // Day-master 五行 for both people — server computes these from the stored
  // births (coarse element only, privacy-safe) and drops them on the
  // interpretation. They drive the ink centerpiece's 生/克/比和 mode.
  const aElement = detail.interpretation?.personAElement
  const bElement = detail.interpretation?.personBElement
  const startedLabel = relativeSentLabel(locale, detail.createdAt)
  const status = detailStatus(detail.status, t)
  const metaRow = (justify: 'flex-start' | 'center') => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: justify,
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: kindredSpacing.screenH,
        marginBottom: kindredSpacing.sm,
      }}
    >
      <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>{startedLabel}</Text>
      {status.label ? (
        <>
          <Text style={{ color: kindredDark.textMuted, fontSize: 12 }}>·</Text>
          <Text style={[kindredType.caption, { color: status.color }]}>{status.label}</Text>
        </>
      ) : null}
    </View>
  )

  // Chapter-based report (v2): horizontal pager. No entry animation — straight
  // to the report under a basic-info header (2026-06: "点进去不用做动画").
  if (chapters && chapters.length > 0) {
    // Unlock wall — trailing pager page shown only when chapters remain locked.
    const lockedChapters = detail.interpretation?.lockedChapters ?? []
    const unlockWall =
      lockedChapters.length > 0 ? (
        <ChapterUnlockWall
          ahaHook={detail.interpretation?.ahaHook}
          lockedChapters={lockedChapters}
          labels={{
            heading: t('unlock.heading').replace('{n}', String(lockedChapters.length)),
            inviteCta: t('unlock.invite'),
            inviteHint: t('unlock.inviteHint'),
            purchaseCta: (unlocking ? t('unlock.processing') : t('unlock.purchase')).replace(
              '{price}',
              unlockPrice
            ),
            subscribeCta: t('unlock.subscribe'),
          }}
          onInvite={reInvite}
          onPurchase={() => void handlePurchaseUnlock()}
          onSubscribe={() => {
            emitUnlockFunnel({ step: 'subscribe_tap', bond_id: detail.id })
            router.push({ pathname: '/(commerce)/paywall', params: { reason: 'chapters' } })
          }}
        />
      ) : null

    return (
      <View style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        {/* 水墨晕开 entrance — the paper report blooms in over the dark surround.
            Wraps ONLY the pager; the off-screen capture target + chrome below
            stay outside the mask. The inner SafeAreaView is paper (kindredPaper),
            so the report reads edge-to-edge with no dark safe-area bands. */}
        <ReportBloom>
          <SafeAreaView style={{ flex: 1, backgroundColor: kindredPaper.bg }}>
            {/* Clean report — NO top chrome at all (2026-06 feedback: "报告页应该
                干干净净的显示报告即可，甚至不需要返回按钮，顶部的两个入口也去掉"). Exit
                via the iOS edge-swipe-back gesture. Every action (copy / chat /
                highlight / make-if) lives in the 划词 SelectionActionBar that slides
                up when a paragraph is long-pressed (rendered below). */}
            <ChapterPager
              report={{
                id: detail.id,
                bondId: detail.id,
                generatedAt: detail.createdAt,
                chapters,
                headline: detail.archetypeTagline ?? '',
              }}
              currentIndex={chapterIndex}
              onIndexChange={setChapterIndex}
              onShareChapter={(idx) => void handleShareChapter(idx)}
              trailing={unlockWall}
              aElement={aElement}
              bElement={bElement}
              locale={locale}
              onPickQuote={setPickedQuote}
              highlightedQuotes={highlights}
              renderCenterpiece={
                aElement && bElement
                  ? (ch, i) => (
                      <InkCenterpiece
                        kind={ch.kind}
                        mode={deriveCenterpieceMode(ch.kind, aElement, bElement, ch.severity)}
                        {...deriveTransitionEndpoints(aElement, bElement)}
                        active={i === chapterIndex}
                        width={Dimensions.get('window').width - 44}
                      />
                    )
                  : undefined
              }
            />
          </SafeAreaView>
        </ReportBloom>

        {/* Off-screen capture target — positioned far outside viewport but mounted. */}
        {shareTarget ? (
          <View
            ref={captureRefView}
            collapsable={false}
            style={{ position: 'absolute', top: -20000, left: 0 }}
          >
            <ShareableChapterCard
              chapter={chapters[shareTarget.index] ?? chapters[0]!}
              selfName={selfName ?? '你'}
              otherName={otherName}
              width={1080}
              height={1920}
              locale={locale}
              aElement={aElement}
              bElement={bElement}
              chapterNumber={shareTarget.index + 1}
              brandUrl={shareTarget.brandUrl}
              installUrl={shareTarget.installUrl}
            />
          </View>
        ) : null}

        {/* Post-purchase nudge: anonymous buyer → sign in to keep the report
            across devices (links Apple to the same userId; non-blocking). */}
        <SignInSheet visible={showSaveSheet} onClose={() => setShowSaveSheet(false)} />

        {/* 划词 action bar — slides up when a paragraph is long-pressed. Houses
            the actions that used to clutter the header. (copy is omitted until
            expo-clipboard is added; highlight is session-local for now.) */}
        <SelectionActionBar
          quote={pickedQuote}
          highlighted={pickedQuote ? highlights.includes(pickedQuote) : false}
          labels={{
            copy: t('reading.copy'),
            chat: t('chat.cta'),
            highlight: t('reading.highlight'),
            makeif: t('makeif.cta'),
          }}
          onCopy={() => {
            if (pickedQuote) void Clipboard.setStringAsync(pickedQuote)
            setPickedQuote(null)
          }}
          onChat={
            pairReadingId != null
              ? () => {
                  const q = pickedQuote
                  setPickedQuote(null)
                  router.push({
                    pathname: '/(bonds)/chat',
                    params: { id: pairReadingId, title: detail.targetName, quote: q ?? '' },
                  })
                }
              : undefined
          }
          onHighlight={() => {
            const q = pickedQuote
            if (!q) return
            setHighlights((prev) => (prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]))
            setPickedQuote(null)
          }}
          onMakeif={() => {
            const q = pickedQuote
            setPickedQuote(null)
            router.push({
              pathname: '/(bonds)/makeif',
              params: { id: detail.id, title: detail.targetName, quote: q ?? '' },
            })
          }}
          onClose={() => setPickedQuote(null)}
        />

        {/* One-time "how to read this" overlay (甲/乙, the ink 意象, 划词). */}
        {showPrimer ? (
          <ReadingPrimer
            locale={locale}
            onStart={dismissPrimer}
            onOpenGlossary={() => {
              dismissPrimer()
              router.push('/(settings)/glossary')
            }}
          />
        ) : null}
      </View>
    )
  }

  // V1 fallback — single-page summary. No entry animation; basic info up top.
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.lg,
          paddingBottom: kindredSpacing.xxl,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft color={kindredDark.text} size={24} strokeWidth={1.2} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(onboarding)/mode')}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t('bondList.add')}
          >
            <Text style={{ color: kindredDark.accent, fontSize: 22, lineHeight: 22 }}>+</Text>
          </Pressable>
        </View>

        <View
          style={{ alignItems: 'center', marginTop: kindredSpacing.lg, gap: kindredSpacing.sm }}
        >
          {relTag ? (
            <Text style={[kindredType.seal, { color: kindredDark.textMuted }]}>{relTag}</Text>
          ) : null}
          <Text style={[kindredType.title, { color: kindredDark.text }]}>{displayName}</Text>
        </View>

        <View style={{ marginTop: kindredSpacing.md }}>{metaRow('center')}</View>

        {/* Re-invite entry — a pending/declined/expired thread has no report yet;
            give the user a clear way to (re)send the invitation right here. */}
        {detail.status === 'pending_invite' ||
        detail.status === 'declined' ||
        detail.status === 'expired' ? (
          <View
            style={{ marginTop: kindredSpacing.xl, alignItems: 'center', gap: kindredSpacing.sm }}
          >
            <PrimaryButton label={t('waiting.resend')} onPress={reInvite} block={false} />
            <Text
              style={[kindredType.caption, { color: kindredDark.textMuted, textAlign: 'center' }]}
            >
              {t('waiting.hint')}
            </Text>
          </View>
        ) : null}

        {detail.score != null && (
          <View style={{ alignItems: 'center', marginTop: kindredSpacing.xl }}>
            <CompatibilityScore score={detail.score} label={detail.grade ?? undefined} />
          </View>
        )}

        {detail.archetypeName && (
          <View style={{ marginTop: kindredSpacing.xl, gap: kindredSpacing.sm }}>
            <Text style={[kindredType.caption, { color: kindredDark.accent, letterSpacing: 4 }]}>
              {detail.archetypeCategory?.toUpperCase()}
            </Text>
            <Text style={[kindredType.heading, { color: kindredDark.text }]}>
              {detail.archetypeName}
            </Text>
            {detail.archetypeTagline && (
              <Text style={[kindredType.body, { color: kindredDark.textSecondary }]}>
                {detail.archetypeTagline}
              </Text>
            )}
          </View>
        )}

        {detail.interpretation?.overview && (
          <View style={{ marginTop: kindredSpacing.xl }}>
            <Text style={[kindredType.body, { color: kindredDark.text }]}>
              {detail.interpretation.overview}
            </Text>
          </View>
        )}

        {openChat ? (
          <View style={{ marginTop: kindredSpacing.xl }}>
            <PrimaryButton label={t('chat.cta')} onPress={openChat} />
          </View>
        ) : null}

        {auspiceBirth ? (
          <Pressable
            onPress={sendToAuspice}
            hitSlop={6}
            accessibilityRole='button'
            style={{ marginTop: kindredSpacing.lg, alignSelf: 'flex-start' }}
          >
            <Text style={kindredPresets.ctaText}>{t('bond.toAuspice')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

/** Status → "is their info in?" label + tint for the detail's basic-info line. */
function detailStatus(
  status: BondStatus,
  t: (key: string) => string
): { label: string; color: string } {
  switch (status) {
    case 'active':
      return { label: t('bond.statusActive'), color: kindredDark.accent }
    case 'pending_invite':
      return { label: t('bond.statusPending'), color: kindredDark.textSecondary }
    case 'declined':
      return { label: t('bond.statusDeclined'), color: kindredDark.textMuted }
    case 'expired':
      return { label: t('bond.statusExpired'), color: kindredDark.textMuted }
    default:
      return { label: '', color: kindredDark.textMuted }
  }
}
