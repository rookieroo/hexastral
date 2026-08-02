/**
 * /festival/[id] — per-entry culture detail (节气 / 节日 / topic).
 *
 * Editorial almanac layout (not a stack of identical AI cards): open masthead,
 * numbered sections with hairline rhythm, poetry as pull-quote + note.
 * Culture body is free; Pro lives on 对你而言 personalization instead.
 */

import { useTheme } from '@zhop/core-ui'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CultureWikiLink } from '@/components/culture/CultureWikiLink'
import { MoonLoader } from '@/components/MoonLoader'
import {
  type AuspiceFestival,
  type AuspiceSolarTermEntry,
  fetchAuspiceYearOverview,
} from '@/lib/api'
import {
  cultureSummary,
  getCultureEntryWikipediaUrl,
  localizeCultureEntry,
  localizeSolarTermName,
} from '@/lib/culture'
import { getFestivalContent, JIEQI_PINYIN } from '@/lib/festival-content'
import { useStrings } from '@/lib/i18n-context'

/** Reverse of JIEQI_PINYIN — built once at module load (24 entries). */
const PINYIN_TO_JIEQI: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(JIEQI_PINYIN).map(([k, v]) => [v, k])
)

/** Format an ISO instant (UTC) as local "M/D HH:MM" — same helper shape as TodayHeroCard. */
function formatLocalInstant(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${hh}:${mm}`
}

function isPoetryTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase()
  return normalized === '诗' || normalized === '詩' || normalized === 'poetry'
}

/**
 * Split authored poetry bodies into a classical quote + modern note when the
 * copy uses 「…」 or "…" around the verse. Falls back to the full body as note.
 */
function splitPoetryBody(body: string): { quote: string | null; note: string } {
  const cjk = body.match(/「([^」]+)」/)
  if (cjk?.[1]) {
    const quote = cjk[1].trim()
    const note = body.replace(cjk[0], '').replace(/^[\s—–−\-：:]+/, '').trim()
    return { quote, note: note || body }
  }
  const en = body.match(/[“"]([^”"]+)[”"]/)
  if (en?.[1] && en[1].length >= 12) {
    const quote = en[1].trim()
    const note = body.replace(en[0], '').replace(/^[\s—–−\-：:]+/, '').trim()
    return { quote, note: note || body }
  }
  return { quote: null, note: body }
}

function sectionIndexLabel(index: number): string {
  return String(index + 1).padStart(2, '0')
}

export default function FestivalDetailScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const params = useLocalSearchParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [festival, setFestival] = useState<AuspiceFestival | null>(null)
  const [solarTerm, setSolarTerm] = useState<AuspiceSolarTermEntry | null>(null)
  const [loading, setLoading] = useState(true)

  const jieqiName = useMemo(() => {
    if (!id?.startsWith('jieqi-')) return null
    const pinyin = id.slice('jieqi-'.length)
    return PINYIN_TO_JIEQI[pinyin] ?? null
  }, [id])

  useEffect(() => {
    if (id && getFestivalContent(id)?.kind === 'topic') {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchAuspiceYearOverview(new Date().getFullYear())
      .then((overview) => {
        const festivalMatch = id ? overview.festivals.find((f) => f.id === id) : null
        const termMatch = jieqiName ? overview.solarTerms.find((s) => s.name === jieqiName) : null
        setFestival(festivalMatch ?? null)
        setSolarTerm(termMatch ?? null)
      })
      .catch(() => {
        setFestival(null)
        setSolarTerm(null)
      })
      .finally(() => setLoading(false))
  }, [id, jieqiName])

  const content = useMemo(() => (id ? getFestivalContent(id) : null), [id])
  const sections = content?.sections[locale]
  const displayName =
    (id ? localizeCultureEntry(id, locale, festival?.name) : null) ??
    (jieqiName ? localizeSolarTermName(jieqiName, locale) : null) ??
    id ??
    ''
  const tagline = content?.tagline?.[locale]
  const summary = useMemo(() => (id ? cultureSummary(id, locale) : null), [id, locale])
  const wikiUrl = useMemo(() => (id ? getCultureEntryWikipediaUrl(id, locale) : null), [id, locale])

  const heroDate = festival?.solarDate ?? solarTerm?.date ?? null
  const heroSubtitle = festival?.lunarLabel
    ? festival.lunarLabel
    : solarTerm?.instant
      ? formatLocalInstant(solarTerm.instant)
      : null

  const kindLabel =
    content?.kind === 'jieqi'
      ? t.solarTerm
      : content?.kind === 'festival'
        ? t.cultureKindFestival
        : content?.kind === 'topic'
          ? t.cultureKindTopic
          : null

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Edge-swipe back; masthead is the page identity. */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing['2xl'],
        }}
      >
        {/* Masthead — open page, not another rounded card. */}
        <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
          {kindLabel ? (
            <Text
              style={{
                color: colors.secondary,
                fontSize: 11,
                letterSpacing: 3,
                fontWeight: '500',
              }}
            >
              {kindLabel.toUpperCase()}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 40,
                fontWeight: '200',
                letterSpacing: locale.startsWith('zh') || locale === 'ja' ? 4 : 0.5,
                flexShrink: 1,
                lineHeight: 48,
              }}
            >
              {displayName}
            </Text>
            {wikiUrl ? (
              <View style={{ marginBottom: 10 }}>
                <CultureWikiLink url={wikiUrl} />
              </View>
            ) : null}
          </View>

          {tagline ? (
            <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>{tagline}</Text>
          ) : null}

          {heroDate ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: spacing.sm,
                marginTop: spacing.xs,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{heroDate}</Text>
              {heroSubtitle ? (
                <Text style={{ color: colors.dim, fontSize: 13 }}>{heroSubtitle}</Text>
              ) : null}
            </View>
          ) : loading ? (
            <MoonLoader />
          ) : null}

          {summary ? (
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                lineHeight: 26,
                marginTop: spacing.xs,
              }}
            >
              {summary}
            </Text>
          ) : null}
        </View>

        {sections && sections.length > 0
          ? sections.map((section, i) => {
              const poetry = isPoetryTitle(section.title)
              return (
                <CultureSection
                  key={`${id}-${i}`}
                  indexLabel={sectionIndexLabel(i)}
                  title={section.title}
                  body={section.body}
                  poetry={poetry}
                  colors={colors}
                  spacing={spacing}
                />
              )
            })
          : null}
      </ScrollView>
    </SafeAreaView>
  )
}

interface SectionColors {
  text: string
  secondary: string
  dim: string
}

function CultureSection({
  indexLabel,
  title,
  body,
  poetry,
  colors,
  spacing,
}: {
  indexLabel: string
  title: string
  body: string
  poetry: boolean
  colors: SectionColors
  spacing: { sm: number; md: number; lg: number; xl: number }
}) {
  const { quote, note } = poetry ? splitPoetryBody(body) : { quote: null, note: body }

  return (
    <View
      style={{
        marginTop: spacing.xl,
        gap: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.md }}>
        <Text
          style={{
            color: colors.dim,
            fontSize: 12,
            fontVariant: ['tabular-nums'],
            letterSpacing: 1,
          }}
        >
          {indexLabel}
        </Text>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{title}</Text>
      </View>

      {poetry && quote ? (
        <>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              lineHeight: 30,
              fontWeight: '300',
              marginHorizontal: spacing.sm,
            }}
          >
            {quote}
          </Text>
          {note && note !== quote ? (
            <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 22 }}>{note}</Text>
          ) : null}
        </>
      ) : (
        <BodyParagraphs text={note} colors={colors} />
      )}
    </View>
  )
}

/** Soft paragraph breaks so long 文言 blocks scan like an almanac, not a wall. */
function BodyParagraphs({
  text,
  colors,
}: {
  text: string
  colors: Pick<SectionColors, 'text'>
}) {
  const chunks = splitBodyChunks(text)
  return (
    <View style={{ gap: 12 }}>
      {chunks.map((chunk, i) => (
        <Text key={`${i}-${chunk.length}`} style={{ color: colors.text, fontSize: 15, lineHeight: 25 }}>
          {chunk}
        </Text>
      ))}
    </View>
  )
}

function splitBodyChunks(text: string): string[] {
  const byBlank = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (byBlank.length > 1) return byBlank

  // CJK / mixed: break after 。！？ when the run is long enough.
  if (text.length < 90) return [text]
  const parts: string[] = []
  let buf = ''
  for (const ch of text) {
    buf += ch
    if ((ch === '。' || ch === '！' || ch === '？' || ch === '.') && buf.length >= 42) {
      parts.push(buf.trim())
      buf = ''
    }
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts.length > 0 ? parts : [text]
}
