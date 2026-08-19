import { Button, useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { router, Stack } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { XingqiLoader } from '@/components/XingqiLoader'
import { fetchBiometricConsent, recordBiometricConsent, revokeBiometricConsent } from '@/lib/api'
import { setCachedBiometricConsent } from '@/lib/biometric-consent-cache'
import { estimateConsentReadMs } from '@/lib/consent-read'
import { resolveLocale } from '@/lib/i18n'
import { pickUi } from '@/lib/locale-zh'
import { clearReadingDraft } from '@/lib/reading-draft'

export default function BiometricConsentScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const s = (hans: string, hant: string, en: string, ja?: string) =>
    pickUi(locale, hans, hant, en, ja)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readToEnd, setReadToEnd] = useState(false)
  const [layoutH, setLayoutH] = useState(0)
  const [contentH, setContentH] = useState(0)

  const paragraphs = useMemo(
    () => [
      s(
        '我们将在设备上选择左掌、右掌与面部高清照片，提取结构化特征，并结合你的生辰计算八字大运流年，生成密封的五章形气简报。原图仅在特征分析时上传，服务器处理完成后不会保存原图。',
        '我們將在裝置上選擇左掌、右掌與面部高清照片，提取結構化特徵，並結合你的生辰計算八字大運流年，生成密封的五章形氣簡報。原圖僅在特徵分析時上傳，伺服器處理完成後不會保存原圖。',
        'You will capture sharp left palm, right palm, and face photos. We extract structured features, compute BaZi DaYun/LiuNian from your birth data, and produce a sealed five-chapter form brief. Source images are uploaded only for extraction and are not kept after processing.',
        '左手・右手・顔の鮮明な写真を撮り、構造化した特徴を抽出し、生年月日から八字の大運・流年を計算して、密封の五章形気ブリーフを作ります。原画像は抽出のためだけにアップロードし、処理後は保存しません。'
      ),
      s(
        '这是文化研习简报（位点依据 · 三轴窗口 · 气机对照），不是聊天式看图说话，也不构成命运断语、医疗诊断或专业建议。请勿把它当作处方或疾病判断。',
        '這是文化研習簡報（位點依據 · 三軸窗口 · 氣機對照），不是聊天式看圖說話，也不構成命運斷語、醫療診斷或專業建議。請勿把它當作處方或疾病判斷。',
        'A cultural-study brief (locus citations · three-axis windows · qi contrast) — not chatty photo-reading, fate claims, medical diagnosis, or professional advice. Do not treat it as a prescription.',
        '文化学習用のブリーフ（部位の根拠 · 三軸の窓 · 気の対照）です。雑談的な写真読みでも、運命の断定でも、医療診断でも、専門的助言でもありません。処方や病名判断として使わないでください。'
      ),
      s(
        '你可随时在印匣中撤回同意。撤回后，本机照片草稿与同意记录会被清除，需重新阅读并明确点选同意，才能继续拍照。',
        '你可隨時在印匣中撤回同意。撤回後，本機照片草稿與同意記錄會被清除，需重新閱讀並明確點選同意，才能繼續拍照。',
        'You can withdraw consent anytime in Case. That clears on-device photo drafts and the consent record. You must read this again and tap agree before capturing photos.',
        '文箱からいつでも同意を撤回できます。撤回すると端末の写真下書きと同意記録が消え、再び読んで同意をタップするまで撮影できません。'
      ),
      s(
        '左掌取纹路与丘位，右掌取对照，面部取形气。三张都要清晰、光线均匀、不要被手指挡住关键位点。',
        '左掌取紋路與丘位，右掌取對照，面部取形氣。三張都要清晰、光線均勻、不要被手指擋住關鍵位點。',
        'Left palm for lines and mounts, right palm for contrast, face for form-qi. Keep all three sharp, evenly lit, and free of fingers over the loci.',
        '左手は紋と丘、右手は対照、顔は形気。三枚とも鮮明で、光が均等で、位点を指で隠さないこと。'
      ),
      s(
        '解读按期生成。本期简报密封后，位点仍可从本机照片对照打开。聊天只作为简报的追问，不另开一套看图说话。',
        '解讀按期生成。本期簡報密封後，位點仍可從本機照片對照打開。聊天只作為簡報的追問，不另開一套看圖說話。',
        'Each period seals a brief. After that, loci still open against on-device photos. Chat only follows the brief — it is not a second photo-reading.',
        '解読は期ごとに密封される。位点は端末の写真から対照できる。チャットはブリーフの追問であり、別の写真読みではない。'
      ),
    ],
    [locale]
  )

  const needsScroll = layoutH > 0 && contentH > layoutH + 12

  const markIfFullyVisible = (offsetY: number, visibleH: number, totalH: number) => {
    if (totalH <= 0 || visibleH <= 0) return
    if (totalH <= visibleH + 12) {
      setReadToEnd(true)
      return
    }
    if (offsetY + visibleH >= totalH - 20) setReadToEnd(true)
  }

  useEffect(() => {
    markIfFullyVisible(0, layoutH, contentH)
  }, [layoutH, contentH])

  useEffect(() => {
    if (checking) return
    const ms = estimateConsentReadMs(paragraphs.join('').replace(/\s/g, '').length)
    const t = setTimeout(() => setReadToEnd(true), ms)
    return () => clearTimeout(t)
  }, [checking, paragraphs])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const userId = await getPortfolioUserId()
      if (!userId) {
        if (!cancelled) {
          router.replace({ pathname: '/sign-in', params: { next: 'consent' } } as never)
        }
        return
      }
      try {
        const ok = await fetchBiometricConsent()
        if (cancelled) return
        if (ok) {
          router.replace('/capture')
          return
        }
      } catch {
        // show disclosure
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onAgree = async () => {
    if (busy || !readToEnd) return
    setBusy(true)
    setError(null)
    try {
      await recordBiometricConsent()
      router.replace('/capture')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'signin_required') {
        router.replace({ pathname: '/sign-in', params: { next: 'consent' } } as never)
        return
      }
      setError(
        s(
          '同意记录失败，请重试',
          '同意記錄失敗，請重試',
          'Could not record consent. Try again.',
          '同意を記録できませんでした。もう一度お試しください。'
        )
      )
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <XingqiLoader label={s('加载中', '載入中', 'Loading', '読み込み中')} />
      </View>
    )
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent
    markIfFullyVisible(contentOffset.y, layoutMeasurement.height, contentSize.height)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Stack.Screen
        options={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <ScrollView
        style={{ flex: 1 }}
        onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentH(h)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
          {s('开始前请先阅读', '開始前請先閱讀', 'Read this first', '始める前に読む')}
        </Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={{ color: colors.secondary, fontSize: 15, lineHeight: 24 }}>
            {p}
          </Text>
        ))}
        {needsScroll && !readToEnd ? (
          <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 20 }}>
            {s(
              '请滑至文末，或稍候阅读时间结束即可同意。',
              '請滑至文末，或稍候閱讀時間結束即可同意。',
              'Scroll to the end, or wait a few seconds for agree to unlock.',
              '末尾までスクロールするか、少し待つと同意できます。'
            )}
          </Text>
        ) : null}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          gap: spacing.sm,
          borderTopWidth: 0.5,
          borderTopColor: colors.separator,
        }}
      >
        {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
        <Button variant='primary' onPress={() => void onAgree()} disabled={busy || !readToEnd}>
          {busy
            ? s('处理中…', '處理中…', 'Working…', '処理中…')
            : readToEnd
              ? s('我已阅读并同意', '我已閱讀並同意', 'I have read and agree', '読んで同意します')
              : s('请先阅读', '請先閱讀', 'Please read first', '先に読んでください')}
        </Button>
        <Button variant='ghost' onPress={() => router.back()}>
          {s('取消', '取消', 'Cancel', 'キャンセル')}
        </Button>
        {__DEV__ ? (
          <Button
            variant='ghost'
            onPress={() => {
              void (async () => {
                await setCachedBiometricConsent(false)
                await clearReadingDraft({ wipePhotos: true })
                try {
                  await revokeBiometricConsent()
                } catch {
                  // local reset is enough for dev loop
                }
              })()
            }}
          >
            DEV: Clear consent
          </Button>
        ) : null}
      </View>
    </View>
  )
}
