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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Dimensions, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { captureRef } from 'react-native-view-shot'
import {
  deriveCenterpieceMode,
  deriveTransitionEndpoints,
  InkCenterpiece,
} from '@/components/ink/InkCenterpiece'
import { PrimaryButton } from '@/components/PrimaryButton'
import { GeneratingStages } from '@/components/reading/GeneratingStages'
import { LivingLayerFab } from '@/components/reading/LivingLayerFab'
import { ReadingPrimer } from '@/components/reading/ReadingPrimer'
import { ReportBloom } from '@/components/reading/ReportBloom'
import { SelectionActionBar } from '@/components/SelectionActionBar'
import { SignInSheet } from '@/components/SignInSheet'
import { emitUnlockFunnel } from '@/lib/analytics'
import { openAuspiceCompose } from '@/lib/auspice-handoff'
import { useAuth } from '@/lib/auth'
import { type CachedBondBirth, getBondBirth } from '@/lib/bondBirthCache'
import { resolveBondDisplayName } from '@/lib/bondName'
import { loadHighlights, saveHighlights } from '@/lib/highlights'
import { type Locale, localeFromTag, relativeSentLabel, resolveLocale, useI18n } from '@/lib/i18n'
import { getKindredSinglePrice, purchaseKindredSingle } from '@/lib/iap'
import { hasSeenReadingPrimer, markReadingPrimerSeen } from '@/lib/primer-seen'

type ClipboardModule = typeof import('expo-clipboard')
type SharingModule = typeof import('expo-sharing')

let clipboardModule: ClipboardModule | null | undefined
let sharingModule: SharingModule | null | undefined

/** Lazy — stale dev clients may lack ExpoClipboard / expo-sharing native modules. */
function getClipboard(): ClipboardModule | null {
  if (clipboardModule !== undefined) return clipboardModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clipboardModule = require('expo-clipboard') as ClipboardModule
    return clipboardModule
  } catch {
    clipboardModule = null
    return null
  }
}

function getSharing(): SharingModule | null {
  if (sharingModule !== undefined) return sharingModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sharingModule = require('expo-sharing') as SharingModule
    return sharingModule
  } catch {
    sharingModule = null
    return null
  }
}

const VIEWER_LABEL: Record<Locale, string> = { en: 'you', zh: '你', 'zh-Hant': '你', ja: 'あなた' }
const OTHER_FALLBACK_LABEL: Record<Locale, string> = {
  en: 'the other person',
  zh: '对方',
  'zh-Hant': '對方',
  ja: 'お相手',
}

/**
 * Per-viewer framing: the synastry prose carries the neutral slots 甲方/乙方 even in
 * non-zh reports. Render them for THIS viewer in the REPORT's locale — the reader is
 * "you", the other by name (or a localized "the other person" when nameless, so an
 * invite-only bond never shows a bare ambiguous label). Also fixes the viewer's
 * English possessive ("you's" → "your"). The pair-reading is identical for both
 * sides; only the labels localise. (甲乙 stay internal tokens, never shown — avoids
 * the 天干 collision; a cleaner generation-side label scheme is a follow-up.)
 */
function personalizeSynastryChapters<
  T extends {
    title?: string
    evidence?: string
    dynamic?: string
    reef?: string
    remedy?: string
    goldenLine?: string
    counterpoint?: string
    body?: string
  },
>(
  chapters: readonly T[] | null | undefined,
  isPersonA: boolean,
  aName: string | null,
  bName: string | null,
  locale: Locale
): T[] | undefined {
  if (!chapters) return undefined
  const viewer = VIEWER_LABEL[locale]
  const other = OTHER_FALLBACK_LABEL[locale]
  const subA = isPersonA ? viewer : (aName ?? other) // 甲方 = person A
  const subB = isPersonA ? (bName ?? other) : viewer // 乙方 = person B
  const sub = (s: string | undefined): string | undefined => {
    if (s == null) return s
    let out = s.replace(/甲方/g, subA).replace(/乙方/g, subB)
    // The engine emits 甲方/乙方 + an English possessive 's; "you's" reads wrong.
    if (locale === 'en') out = out.replace(/\byou's\b/g, 'your').replace(/\bYou's\b/g, 'Your')
    return out
  }
  return chapters.map(
    (ch) =>
      ({
        ...ch,
        title: sub(ch.title),
        evidence: sub(ch.evidence),
        dynamic: sub(ch.dynamic),
        reef: sub(ch.reef),
        remedy: sub(ch.remedy),
        goldenLine: sub(ch.goldenLine),
        counterpoint: sub(ch.counterpoint),
        body: sub(ch.body),
      }) as T
  )
}

export interface BondReportProps {
  /** Bond id — when omitted, read from the route params (route usage). */
  id?: string
  /** Bloom origin — the tapped point. Omit for the route (reads ox/oy params). */
  origin?: { x: number; y: number } | null
  /** When provided, the report renders as an in-place OVERLAY on the home (not a
   *  pushed route): the bloom plays over the live night (transparent surround)
   *  and an ✕ closes it (no edge-swipe-back to lean on). Matches the solo reading
   *  overlay so 合盘 + personal reports share one transition. */
  onClose?: () => void
}

export default function BondDetailScreen({
  id: idProp,
  origin: originProp,
  onClose: onCloseProp,
}: BondReportProps = {}) {
  // ox/oy — the page coords of the thread row the user tapped, so the 水墨晕开
  // entrance spreads from there (props when an overlay; route params for a route).
  const routeParams = useLocalSearchParams<{ id: string; ox?: string; oy?: string }>()
  const id = idProp ?? routeParams.id
  const isOverlay = onCloseProp != null
  const bloomOrigin = useMemo(() => {
    if (originProp !== undefined) return originProp
    const { ox, oy } = routeParams
    return ox != null && oy != null ? { x: Number(ox), y: Number(oy) } : null
  }, [originProp, routeParams.ox, routeParams.oy])
  const router = useRouter()
  const handleClose = onCloseProp ?? (() => router.back())
  const insets = useSafeAreaInsets()
  // Overlay close plays the REVERSE 水墨 bloom first (the ink collapses back to
  // the tap), then unmounts — mirroring the solo reading overlay. `closing` drives
  // ReportBloom; its onCollapsed runs the real close. (Routes pop instantly.)
  const [closing, setClosing] = useState(false)
  const requestClose = useCallback(() => setClosing(true), [])
  // Overlay has no OS edge-swipe-back — a left-edge swipe-right dismisses it
  // (matches iOS). A thin left-edge strip owns the gesture so it never fights the
  // horizontal ChapterPager in the content. (Routes keep the real OS gesture.)
  const edgeSwipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([12, 9999])
        .failOffsetY([-28, 28])
        .onEnd((e) => {
          if (e.translationX > 60) runOnJS(requestClose)()
        }),
    [requestClose]
  )
  const { detail, isLoading, isGenerating, error, refetch, chapters, unlockBond } =
    useSynastryReport(id ?? null)
  // Frozen LLM output: render the report's content + report-chrome (essence chip,
  // chapter section labels, primer, share card) in the locale it was GENERATED in
  // (interpretation.language), NOT the device locale — switching the app language
  // must not re-wrap or half-translate an archived report (it can't be regenerated).
  // App chrome (relative time, the FAB) stays device-locale; legacy reports without
  // a stamp fall back to the device.
  const reportLocale =
    localeFromTag(detail?.interpretation?.language as string | undefined) ?? resolveLocale()
  const [chapterIndex, setChapterIndex] = useState<number>(0)
  // 划词 — the sentence the user long-pressed (drives the SelectionActionBar),
  // and the set of highlighted sentences. Highlights persist per-bond via
  // AsyncStorage (lib/highlights.ts): loaded on mount, saved on every toggle.
  const [pickedQuote, setPickedQuote] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<string[]>([])
  useEffect(() => {
    if (!id) return
    let cancelled = false
    void loadHighlights(id).then((saved) => {
      if (!cancelled) setHighlights(saved)
    })
    return () => {
      cancelled = true
    }
  }, [id])
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
  const { userEmail, userId } = useAuth()
  const [showSaveSheet, setShowSaveSheet] = useState(false)

  // Per-viewer framing (#7) — the prose calls the two people 甲方/乙方; render
  // them as 你 + the other's name for whoever is reading. THIS viewer is person A
  // when they own the bond (the inviter), else person B. Names: personAName = A,
  // targetName = B (both always present, regardless of viewer).
  const isPersonA = userId == null || detail?.ownerId === userId
  const aName = (detail?.interpretation?.personAName as string | undefined)?.trim() || null
  const bName = detail?.targetName?.trim() || null
  const viewedChapters = useMemo(
    () => personalizeSynastryChapters(chapters, isPersonA, aName, bName, reportLocale),
    [chapters, isPersonA, aName, bName, reportLocale]
  )
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
          const Sharing = getSharing()
          if (Sharing && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(uri, {
              dialogTitle: 'Yuel',
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

  // Overlay close (✕) for the DARK pre-report states (generating / error). As an
  // overlay there's no edge-swipe-back, so every branch needs a way out.
  const overlayCloseRow = isOverlay ? (
    <View
      style={{
        alignItems: 'flex-end',
        paddingHorizontal: kindredSpacing.md,
        paddingTop: kindredSpacing.sm,
      }}
    >
      <Pressable
        onPress={handleClose}
        hitSlop={12}
        accessibilityRole='button'
        accessibilityLabel={t('common.close')}
        style={{ padding: 6 }}
      >
        <X color={kindredDark.textMuted} size={22} strokeWidth={1.5} />
      </Pressable>
    </View>
  ) : null

  if (isLoading) {
    // Brief hold — NO loader. Fetching an already-generated report is quick, and
    // the entrance IS the 水墨晕开 bloom (ReportBloom). As an overlay this is
    // transparent so the live home shows until the report blooms in from the tap;
    // as a route it's dark (continuous with the dark home). No 大白页 flash either
    // way. The long LLM wait (202 → isGenerating) keeps its own loader below.
    return <View style={{ flex: 1, backgroundColor: isOverlay ? 'transparent' : kindredDark.bg }} />
  }

  if (isGenerating) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        {overlayCloseRow}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: kindredSpacing.lg,
          }}
        >
          <AutoMoonPhaseLoader size={96} skin={SKIN_CINNABAR} />
          <GeneratingStages
            color={kindredDark.textSecondary}
            stages={[
              t('bond.stage.align'),
              t('bond.stage.bazi'),
              t('bond.stage.synastry'),
              t('bond.stage.report'),
            ]}
          />
        </View>
      </SafeAreaView>
    )
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
        {overlayCloseRow}
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

  // Names for the share card — per-viewer (mirror the prose substitution): the
  // reader is 你 / their own name, the other by name.
  const selfName = isPersonA ? aName : bName
  const otherName = isPersonA ? bName : aName

  // Title = a specific name; fall back to the relationship so it's never blank
  // (and strip the legacy literal "Unknown"). Matches the threads list.
  const { displayName, relTag } = resolveBondDisplayName(detail)

  // Re-send this bond's invite (share THIS bond's resonate link when it exists,
  // else fall back to the generic invite flow). Surfaced both on the unlock wall
  // and for pending/declined/expired threads (2026-06: "点进去应该给重新发起邀请的入口").
  const reInvite = () => {
    emitUnlockFunnel({ step: 'invite_tap', bond_id: detail.id })
    const url = detail.invitation?.resonateUrl
    if (url) {
      const lead = [
        t('unlock.inviteShareLead').replace('{name}', displayName),
        detail.interpretation?.ahaHook ?? '',
      ]
        .filter(Boolean)
        .join('\n')
      // iOS: the link goes in Share's `url` item (not buried in text) so AirDrop
      // opens the webpage / deep-links into the app, not Pages; SMS & Mail still
      // get the text + a tappable link. Android Share has no `url` → keep inline.
      void Share.share(
        Platform.OS === 'ios' ? { message: lead, url } : { message: `${lead}\n${url}` }
      )
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
  if (viewedChapters && viewedChapters.length > 0) {
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
      <View style={{ flex: 1, backgroundColor: isOverlay ? 'transparent' : kindredDark.bg }}>
        {/* 水墨晕开 entrance — the cream 宣纸 report unrolls in from the tapped row.
            As an OVERLAY the surround is transparent, so it blooms over the LIVE
            home (the night sky shows outside the shape) exactly like the solo
            reading — no route jump. As a route the surround is dark (matching the
            home). Wraps ONLY the pager; the off-screen capture target + chrome
            below stay outside the mask. The inner SafeAreaView is paper so the
            report document reads edge-to-edge. */}
        <ReportBloom
          origin={bloomOrigin}
          surroundColor={isOverlay ? 'transparent' : undefined}
          closing={closing}
          onClosed={handleClose}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: kindredPaper.bg }}>
            {/* Overlay exits: a left-edge swipe-right (strip below) + an ✕. Routes
                keep their clean no-chrome look + the OS edge-swipe. */}
            {isOverlay ? (
              <GestureDetector gesture={edgeSwipe}>
                <View
                  style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 28, zIndex: 9 }}
                />
              </GestureDetector>
            ) : null}
            {isOverlay ? (
              <Pressable
                onPress={requestClose}
                hitSlop={12}
                accessibilityRole='button'
                accessibilityLabel={t('common.close')}
                style={{
                  position: 'absolute',
                  // Absolute children ignore the SafeAreaView's inset PADDING, so
                  // offset by the notch ourselves (was overlapping the 刘海).
                  top: insets.top + kindredSpacing.sm,
                  right: kindredSpacing.md,
                  zIndex: 10,
                  padding: 6,
                }}
              >
                <X color={kindredPaper.muted} size={22} strokeWidth={1.5} />
              </Pressable>
            ) : null}
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
                chapters: viewedChapters,
                headline: detail.archetypeTagline ?? '',
              }}
              currentIndex={chapterIndex}
              onIndexChange={setChapterIndex}
              onShareChapter={(idx) => void handleShareChapter(idx)}
              trailing={unlockWall}
              aElement={aElement}
              bElement={bElement}
              locale={reportLocale}
              onPickQuote={setPickedQuote}
              highlightedQuotes={highlights}
              renderCenterpiece={
                aElement && bElement
                  ? (ch, i) => (
                      <InkCenterpiece
                        kind={ch.kind}
                        severity={ch.severity}
                        mode={deriveCenterpieceMode(ch.kind, aElement, bElement, ch.severity)}
                        {...deriveTransitionEndpoints(aElement, bElement)}
                        active={i === chapterIndex}
                        width={Dimensions.get('window').width - 44}
                        aEl={aElement}
                        bEl={bElement}
                      />
                    )
                  : undefined
              }
            />
          </SafeAreaView>
        </ReportBloom>

        {/* Living layer (the subscription surfaces) — Timeline + What-if + Chat as
            icon-only discs that pop from a floating bottom-right FAB. Hidden while a
            sentence is picked (the selection bar owns the bottom) or while the
            overlay is collapsing. Active bonds only. Chat disc only appears once the
            bond has a pair reading (same gate as the 划词 chat action). */}
        {detail.status === 'active' && !pickedQuote && !closing ? (
          <LivingLayerFab
            labels={{
              timeline: t('timeline.title'),
              whatif: t('makeif.title'),
              chat: t('chat.cta'),
            }}
            onTimeline={() =>
              router.push({
                pathname: '/(timeline)',
                params: { bondId: detail.id, bondName: displayName },
              })
            }
            onWhatIf={() =>
              router.push({
                pathname: '/(bonds)/makeif',
                params: { id: detail.id, title: displayName },
              })
            }
            onChat={
              pairReadingId != null
                ? () =>
                    router.push({
                      pathname: '/(bonds)/chat',
                      params: { id: pairReadingId, title: displayName },
                    })
                : undefined
            }
            insetBottom={insets.bottom}
          />
        ) : null}

        {/* Off-screen capture target — positioned far outside viewport but mounted. */}
        {shareTarget ? (
          <View
            ref={captureRefView}
            collapsable={false}
            style={{ position: 'absolute', top: -20000, left: 0 }}
          >
            <ShareableChapterCard
              chapter={viewedChapters[shareTarget.index] ?? viewedChapters[0]!}
              selfName={selfName ?? VIEWER_LABEL[reportLocale]}
              otherName={otherName ?? OTHER_FALLBACK_LABEL[reportLocale]}
              width={1080}
              height={1920}
              locale={reportLocale}
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

        {/* 划词 action bar — slides up when a sentence is long-pressed. Houses
            the actions that used to clutter the header: copy (expo-clipboard),
            chat, highlight (persisted per-bond), make-if. */}
        <SelectionActionBar
          quote={pickedQuote}
          highlighted={pickedQuote ? highlights.includes(pickedQuote) : false}
          labels={{
            copy: t('reading.copy'),
            chat: t('chat.cta'),
            highlight: t('reading.highlight'),
          }}
          onCopy={() => {
            const Clipboard = getClipboard()
            if (pickedQuote && Clipboard) void Clipboard.setStringAsync(pickedQuote)
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
            const next = highlights.includes(q)
              ? highlights.filter((x) => x !== q)
              : [...highlights, q]
            setHighlights(next)
            if (id) void saveHighlights(id, next)
            setPickedQuote(null)
          }}
          onClose={() => setPickedQuote(null)}
        />

        {/* One-time "how to read this" overlay (甲/乙, the ink 意象, 划词). */}
        {showPrimer ? (
          <ReadingPrimer
            locale={reportLocale}
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
          <Pressable onPress={handleClose} hitSlop={12}>
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
