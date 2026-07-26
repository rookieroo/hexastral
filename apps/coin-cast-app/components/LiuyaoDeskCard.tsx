import { StyleSheet, Text, View } from 'react-native'

import { useSatelliteI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

export interface LiuyaoDeskLineView {
  index: number
  ganZhi: string
  liuQin: string
  liuShen: string
  wangXiu: string
  isChanging: boolean
  isShiYao: boolean
  isYingYao: boolean
  isEmpty: boolean
}

export interface LiuyaoDeskView {
  benName: string
  benPalace: string
  bianName?: string
  bianPalace?: string
  huName?: string
  shiLine: number
  yingLine: number
  lines: LiuyaoDeskLineView[]
}

function isDesk(value: unknown): value is LiuyaoDeskView {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.benName === 'string' &&
    typeof v.benPalace === 'string' &&
    typeof v.shiLine === 'number' &&
    typeof v.yingLine === 'number' &&
    Array.isArray(v.lines)
  )
}

export function parseLiuyaoDesk(payload: Record<string, unknown>): LiuyaoDeskView | null {
  if (isDesk(payload.desk)) return payload.desk
  const classical = payload.classical
  if (classical && typeof classical === 'object' && isDesk((classical as { desk?: unknown }).desk)) {
    return (classical as { desk: LiuyaoDeskView }).desk
  }
  return null
}

type Props = {
  desk: LiuyaoDeskView
  /** Optional hexagram numbers/symbols for 本/变 header */
  benSymbol?: string
  bianSymbol?: string
}

export function LiuyaoDeskCard({ desk, benSymbol, bianSymbol }: Props) {
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()

  const markFor = (line: LiuyaoDeskLineView): string => {
    const marks: string[] = []
    if (line.isShiYao) marks.push(t('deskMarkShi'))
    if (line.isYingYao) marks.push(t('deskMarkYing'))
    if (line.isChanging) marks.push(t('deskMarkDong'))
    if (line.isEmpty) marks.push(t('deskMarkKong'))
    return marks.join(' ')
  }

  return (
    <View style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}>
      <View style={styles.guaRow}>
        <View style={styles.guaBlock}>
          <Text style={[styles.guaLabel, { color: colors.accent }]}>{t('deskBenLabel')}</Text>
          <Text style={[styles.guaName, { color: colors.text }]}>
            {benSymbol ? `${benSymbol} ` : ''}
            {desk.benName}
          </Text>
          <Text style={[styles.guaMeta, { color: colors.dim }]}>
            {t('deskPalace', { palace: desk.benPalace })}
          </Text>
        </View>
        <View style={styles.guaBlock}>
          <Text style={[styles.guaLabel, { color: colors.accent }]}>{t('deskBianLabel')}</Text>
          {desk.bianName ? (
            <>
              <Text style={[styles.guaName, { color: colors.text }]}>
                {bianSymbol ? `${bianSymbol} ` : ''}
                {desk.bianName}
              </Text>
              {desk.bianPalace ? (
                <Text style={[styles.guaMeta, { color: colors.dim }]}>
                  {t('deskPalace', { palace: desk.bianPalace })}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[styles.guaMeta, { color: colors.secondary }]}>{t('deskNoBian')}</Text>
          )}
        </View>
      </View>

      {desk.huName ? (
        <Text style={[styles.huLine, { color: colors.secondary }]}>
          {t('deskHuLabel')} · {desk.huName}
        </Text>
      ) : null}

      <Text style={[styles.shiYing, { color: colors.text }]}>
        {t('deskShiYing', { shi: desk.shiLine, ying: desk.yingLine })}
      </Text>

      <Text style={[styles.tableTitle, { color: colors.accent }]}>{t('deskTableTitle')}</Text>
      <View style={[styles.tableHead, { borderBottomColor: colors.separator }]}>
        <Text style={[styles.colYao, styles.headCell, { color: colors.dim }]}>{t('deskColYao')}</Text>
        <Text style={[styles.colGz, styles.headCell, { color: colors.dim }]}>
          {t('deskColGanZhi')}
        </Text>
        <Text style={[styles.colLq, styles.headCell, { color: colors.dim }]}>
          {t('deskColLiuQin')}
        </Text>
        <Text style={[styles.colMk, styles.headCell, { color: colors.dim }]}>
          {t('deskColMark')}
        </Text>
      </View>
      {desk.lines.map((line) => (
        <View
          key={line.index}
          style={[
            styles.tableRow,
            {
              borderBottomColor: colors.separator,
              backgroundColor: line.isChanging ? `${colors.accent}14` : 'transparent',
            },
          ]}
        >
          <Text style={[styles.colYao, { color: colors.text }]}>{line.index}</Text>
          <Text style={[styles.colGz, { color: colors.secondary }]}>{line.ganZhi}</Text>
          <Text style={[styles.colLq, { color: colors.secondary }]}>{line.liuQin}</Text>
          <Text style={[styles.colMk, { color: colors.accent }]}>{markFor(line)}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 14,
    gap: 10,
  },
  guaRow: { flexDirection: 'row', gap: 12 },
  guaBlock: { flex: 1, gap: 2 },
  guaLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
  guaName: { fontSize: 17, fontWeight: '600' },
  guaMeta: { fontSize: 12, lineHeight: 16 },
  huLine: { fontSize: 13, lineHeight: 18 },
  shiYing: { fontSize: 14, fontWeight: '500' },
  tableTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginTop: 4 },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
  },
  headCell: { fontSize: 11, fontWeight: '600' },
  colYao: { width: 28, fontSize: 13 },
  colGz: { flex: 1.1, fontSize: 13 },
  colLq: { flex: 1, fontSize: 13 },
  colMk: { flex: 1.1, fontSize: 12, textAlign: 'right' },
})
