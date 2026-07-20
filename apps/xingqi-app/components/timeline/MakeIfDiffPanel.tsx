/**
 * MakeIfDiffPanel — reality vs what-if rows; tap → POST makeif/node narrative.
 */

import { verdictColors } from '@zhop/hexastral-tokens/palette'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { fetchMakeIfNodeNarrative } from '@/lib/cycle-api'
import type { TimelinePayload } from '@/lib/cycle-types'
import type { Locale } from '@/lib/i18n'
import { makeIfDiffCopy } from '@/lib/living-copy'
import type { MakeIfBranch } from '@/lib/makeIfBranches'

type Fit = '吉' | '平' | '凶'

export function MakeIfDiffPanel({
  branch,
  payload,
  birth,
  locale,
  colors,
  spacing,
  readingId,
}: {
  branch: MakeIfBranch
  payload: TimelinePayload
  birth: { date: string; hour: number; gender: 'M' | 'F' }
  locale: Locale
  readingId?: string
  colors: {
    text: string
    secondary: string
    dim: string
    accent: string
    separator: string
  }
  spacing: { sm: number; md: number }
}) {
  const t = makeIfDiffCopy(locale)
  const [expanded, setExpanded] = useState<
    Record<string, 'loading' | 'done' | 'error' | 'collapsed'>
  >({})
  const [narratives, setNarratives] = useState<Record<string, string>>({})

  useEffect(() => {
    setExpanded({})
    setNarratives({})
  }, [branch.id])

  const rows = useMemo(() => {
    const birthYear = Number(birth.date.split('-')[0])
    if (!Number.isFinite(birthYear)) return []
    const allLn = payload.dayun.flatMap((d) => d.liunian)
    const realFitAt = (age: number): Fit | null => {
      const year = birthYear + age
      const ln = allLn.find((r) => r.year === year)
      if (ln) return ln.fit
      const dy = payload.dayun.find((d) => age >= d.startAge && age <= d.endAge)
      return dy?.fit ?? null
    }
    const realPillarAt = (age: number): string => {
      const dy = payload.dayun.find((d) => age >= d.startAge && age <= d.endAge)
      return dy ? `${dy.pillar.stem}${dy.pillar.branch}` : '—'
    }
    type Cmp = 'help' | 'even' | 'harm' | null
    const RANK = { 凶: 0, 平: 1, 吉: 2 } as const
    const cmpOf = (real: Fit | null, alt: Fit | null): Cmp => {
      if (real == null || alt == null) return null
      if (alt === real) return 'even'
      return RANK[alt] > RANK[real] ? 'help' : 'harm'
    }
    type Row = {
      key: string
      label: string
      realPillar: string
      realFit: Fit | null
      altFit: Fit | null
      cmp: Cmp
    }
    const out: Row[] = []
    out.push({
      key: `fork-${branch.divergeAtAge}`,
      label: t.forkRow.replace('{age}', String(branch.divergeAtAge)),
      realPillar: realPillarAt(branch.divergeAtAge),
      realFit: realFitAt(branch.divergeAtAge),
      altFit: branch.dots[0]?.fit ?? null,
      cmp: cmpOf(realFitAt(branch.divergeAtAge), branch.dots[0]?.fit ?? null),
    })
    const lo = branch.divergeAtAge
    const hi = branch.mergeAtAge ?? Number.POSITIVE_INFINITY
    for (const d of branch.dots.filter((x) => x.age > lo && x.age < hi)) {
      const rFit = realFitAt(d.age)
      out.push({
        key: `dot-${d.age}`,
        label: String(d.age),
        realPillar: realPillarAt(d.age),
        realFit: rFit,
        altFit: d.fit,
        cmp: cmpOf(rFit, d.fit),
      })
    }
    if (branch.mergeAtAge != null) {
      const rFit = realFitAt(branch.mergeAtAge)
      out.push({
        key: `merge-${branch.mergeAtAge}`,
        label: t.mergeRow.replace('{age}', String(branch.mergeAtAge)),
        realPillar: realPillarAt(branch.mergeAtAge),
        realFit: rFit,
        altFit: rFit,
        cmp: 'even',
      })
    }
    return out
  }, [birth.date, branch, payload, t.forkRow, t.mergeRow])

  const rowMeta = (rowKey: string) => {
    const r = rows.find((x) => x.key === rowKey)
    if (!r) return null
    let age: number
    if (rowKey.startsWith('fork-')) age = branch.divergeAtAge
    else if (rowKey.startsWith('merge-')) age = branch.mergeAtAge ?? branch.divergeAtAge
    else age = Number(rowKey.slice('dot-'.length))
    if (!Number.isFinite(age)) return null
    return {
      focusAge: age,
      realPillar: r.realPillar !== '—' ? r.realPillar : undefined,
      realFit: r.realFit ?? undefined,
      altFit: r.altFit ?? undefined,
    }
  }

  const expandRow = (rowKey: string) => {
    if (expanded[rowKey] === 'loading') return
    if (narratives[rowKey]) {
      setExpanded((s) =>
        s[rowKey] === 'done' ? { ...s, [rowKey]: 'collapsed' } : { ...s, [rowKey]: 'done' }
      )
      return
    }
    const meta = rowMeta(rowKey)
    if (!meta) return
    setExpanded((s) => ({ ...s, [rowKey]: 'loading' }))
    void fetchMakeIfNodeNarrative({
      birthDate: birth.date,
      birthHour: birth.hour,
      gender: birth.gender,
      locale,
      branch: {
        id: branch.id,
        label: branch.label,
        divergeAtAge: branch.divergeAtAge,
        mergeAtAge: branch.mergeAtAge,
        isPast: branch.isPast,
      },
      focusAge: meta.focusAge,
      focusRealPillar: meta.realPillar,
      focusRealFit: meta.realFit,
      focusAltFit: meta.altFit,
      readingId,
    })
      .then((res) => {
        if (res.narrative) {
          setNarratives((m) => ({ ...m, [rowKey]: res.narrative }))
          setExpanded((s) => ({ ...s, [rowKey]: 'done' }))
        } else {
          setExpanded((s) => ({ ...s, [rowKey]: 'error' }))
        }
      })
      .catch(() => setExpanded((s) => ({ ...s, [rowKey]: 'error' })))
  }

  if (rows.length === 0) return null

  const showPillar = locale.startsWith('zh')
  const fitLabel = (fit: Fit | null) => {
    if (!fit) return '—'
    if (locale.startsWith('zh') || locale === 'ja') return fit
    return fit === '吉' ? 'Good' : fit === '凶' ? 'Hard' : 'Even'
  }

  return (
    <View
      style={{
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        paddingTop: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 1.2 }}>{t.header}</Text>
      <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>{t.tapHint}</Text>
      {rows.map((r) => {
        const changed = r.cmp === 'help' || r.cmp === 'harm'
        const cmpColor =
          r.cmp === 'help' ? verdictColors.吉 : r.cmp === 'harm' ? verdictColors.凶 : colors.dim
        const state = expanded[r.key]
        const narrative = narratives[r.key]
        const isOpen = state === 'done' && Boolean(narrative)
        return (
          <View key={r.key} style={{ gap: 6 }}>
            <Pressable
              onPress={() => expandRow(r.key)}
              style={{
                borderWidth: 0.5,
                borderColor: changed ? `${cmpColor}55` : colors.separator,
                paddingHorizontal: 12,
                paddingVertical: 9,
                backgroundColor: changed ? `${cmpColor}10` : 'transparent',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                  {r.label}
                </Text>
                <Text
                  style={{
                    color: changed ? cmpColor : colors.dim,
                    fontSize: 11,
                    fontWeight: changed ? '700' : '400',
                  }}
                >
                  {state === 'loading'
                    ? '…'
                    : r.cmp === 'help'
                      ? t.help
                      : r.cmp === 'harm'
                        ? t.harm
                        : r.cmp === 'even'
                          ? t.even
                          : ''}
                  {changed ? (isOpen ? ' ▾' : ' ▸') : ''}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <Text style={{ color: colors.dim, fontSize: 11 }}>
                  {t.realCol}
                  {showPillar ? ` ${r.realPillar}` : ''} · {fitLabel(r.realFit)}
                </Text>
                <Text style={{ color: colors.secondary, fontSize: 11 }}>
                  {t.altCol} · {fitLabel(r.altFit)}
                </Text>
              </View>
            </Pressable>
            {state === 'loading' ? (
              <Text style={{ color: colors.dim, fontSize: 12 }}>{t.loading}</Text>
            ) : null}
            {state === 'error' ? (
              <Pressable onPress={() => expandRow(r.key)}>
                <Text style={{ color: colors.accent, fontSize: 12 }}>{t.failed}</Text>
              </Pressable>
            ) : null}
            {isOpen && narrative ? (
              <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
                {narrative}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
