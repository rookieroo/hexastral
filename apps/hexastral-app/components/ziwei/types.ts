export type ZiweiScenarioI18nKey =
  | 'stellar_shengong'
  | 'stellar_daxian'
  | 'stellar_empty_palace'
  | 'stellar_soul_star'
  | 'stellar_body_star'
  | 'stellar_palace_ming_desc'
  | 'stellar_palace_xiongdi_desc'
  | 'stellar_palace_fuqi_desc'
  | 'stellar_palace_zinv_desc'
  | 'stellar_palace_caibo_desc'
  | 'stellar_palace_jie_desc'
  | 'stellar_palace_qianyi_desc'
  | 'stellar_palace_jiaoyou_desc'
  | 'stellar_palace_guanlu_desc'
  | 'stellar_palace_tianzhai_desc'
  | 'stellar_palace_fude_desc'
  | 'stellar_palace_fumu_desc'

export type ZiweiScenarioTranslate = (
  key: ZiweiScenarioI18nKey,
  params?: Record<string, string | number>
) => string

export type ZiweiScenarioColors = {
  background: string
  text: string
  textSecondary: string
  border: string
  accent: string
  primary: string
  card: string
  surfaceSecondary: string
}
