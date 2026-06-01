import type { PalaceSummary } from '@zhop/hexastral-client'
import { Text, View } from 'react-native'
import type { ZiweiScenarioColors, ZiweiScenarioI18nKey, ZiweiScenarioTranslate } from './types'

const PALACE_DESC_KEY: Record<string, ZiweiScenarioI18nKey> = {
  命宫: 'stellar_palace_ming_desc',
  兄弟: 'stellar_palace_xiongdi_desc',
  夫妻: 'stellar_palace_fuqi_desc',
  子女: 'stellar_palace_zinv_desc',
  财帛: 'stellar_palace_caibo_desc',
  疾厄: 'stellar_palace_jie_desc',
  迁移: 'stellar_palace_qianyi_desc',
  交友: 'stellar_palace_jiaoyou_desc',
  官禄: 'stellar_palace_guanlu_desc',
  田宅: 'stellar_palace_tianzhai_desc',
  福德: 'stellar_palace_fude_desc',
  父母: 'stellar_palace_fumu_desc',
}

interface Props {
  palace: PalaceSummary
  colors: ZiweiScenarioColors
  t: ZiweiScenarioTranslate
}

export function ZiweiPalaceCard({ palace, colors, t }: Props) {
  const descKey = PALACE_DESC_KEY[palace.name]

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderWidth: 0.5,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: descKey ? 4 : 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{palace.name}</Text>
        <Text style={{ fontSize: 13, fontWeight: '300', color: colors.textSecondary, marginLeft: 8 }}>
          {palace.heavenlyStem}
          {palace.earthlyBranch}
        </Text>
        {palace.isBodyPalace ? (
          <View
            style={{
              backgroundColor: `${colors.accent}1F`,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginLeft: 8,
            }}
          >
            <Text style={{ fontSize: 10, color: colors.accent, fontWeight: '500' }}>
              {t('stellar_shengong')}
            </Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 'auto' }}>
          {t('stellar_daxian', { start: palace.decadal.range[0], end: palace.decadal.range[1] })}
        </Text>
      </View>

      {descKey ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: colors.textSecondary,
            lineHeight: 16,
            marginBottom: 10,
          }}
        >
          {t(descKey)}
        </Text>
      ) : null}
      {palace.majorStars.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {palace.majorStars.map((star, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{star.name}</Text>
              {star.brightness ? (
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 4 }}>
                  {star.brightness}
                </Text>
              ) : null}
              {star.mutagen ? (
                <View
                  style={{
                    backgroundColor: `${colors.accent}1F`,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    marginLeft: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, color: colors.accent, fontWeight: '600' }}>
                    {star.mutagen}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: 13, fontWeight: '300', color: colors.textSecondary }}>
          {t('stellar_empty_palace')}
        </Text>
      )}
    </View>
  )
}
