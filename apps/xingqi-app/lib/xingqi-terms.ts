/**
 * Xingqi term layer — face/palm professional lexicon + BaZi contrast vocabulary.
 * Steers LLM prose and powers tap-to-gloss + Settings Terms.
 * Canonical stack: lib/xingqi-canon.ts (aliases resolve here).
 */

import {
  getTermByZh,
  type ResolvedTerm,
  type TermCategory,
  type Locale as TermLocale,
} from '@zhop/astro-i18n'
import { isZhHant } from '@/lib/locale-zh'
import { XINGQI_TERM_ALIASES } from '@/lib/xingqi-canon'

export const XINGQI_ASTRO_TERMS = [
  '相生',
  '相克',
  '比和',
  '金',
  '木',
  '水',
  '火',
  '土',
  '日主',
  '用神',
  '通关',
  '比肩',
  '劫财',
  '食神',
  '伤官',
  '偏财',
  '正财',
  '七杀',
  '正官',
  '偏印',
  '正印',
  '大运',
  '流年',
  '流月',
  '六冲',
  '三合',
  '六合',
] as const

export type XingqiLocalCategory = 'meta' | 'face' | 'palm'

export type XingqiLocalTerm = {
  id: string
  zh: string
  pinyin: string
  category: XingqiLocalCategory
  short: { zh: string; zhHant: string; en: string }
  long: { zh: string; zhHant: string; en: string }
}

/** Curated Hans→Hant for Xingqi form glosses (domain map, not a general converter). */
const HANT_CHARS: Record<string, string> = {
  与: '與',
  机: '機',
  对: '對',
  读: '讀',
  气: '氣',
  运: '運',
  历: '歷',
  际: '際',
  头: '頭',
  来: '來',
  观: '觀',
  据: '據',
  虑: '慮',
  张: '張',
  为: '為',
  时: '時',
  岁: '歲',
  态: '態',
  关: '關',
  连: '連',
  应: '應',
  开: '開',
  丰: '豐',
  满: '滿',
  质: '質',
  经: '經',
  统: '統',
  称: '稱',
  区: '區',
  边: '邊',
  协: '協',
  业: '業',
  灵: '靈',
  显: '顯',
  绕: '繞',
  纹: '紋',
  脑: '腦',
  达: '達',
  从: '從',
  属: '屬',
  紧: '緊',
  养: '養',
  迁: '遷',
  顿: '頓',
  汇: '匯',
  处: '處',
  钝: '鈍',
  并: '並',
  浅: '淺',
  长: '長',
  侧: '側',
  线: '線',
  竖: '豎',
  痕: '痕',
  迹: '跡',
  浓: '濃',
  系: '係',
  类: '類',
  稳: '穩',
  实: '實',
  热: '熱',
  动: '動',
  过: '過',
  横: '橫',
  纵: '縱',
  径: '徑',
  缘: '緣',
  点: '點',
  获: '獲',
  责: '責',
  沟: '溝',
  变: '變',
  节: '節',
  体: '體',
  习: '習',
  参: '參',
  断: '斷',
  语: '語',
  谓: '謂',
  标: '標',
  准: '準',
  辞: '辭',
  预: '預',
  结: '結',
  润: '潤',
  泽: '澤',
  肤: '膚',
  状: '狀',
  评: '評',
  价: '價',
  构: '構',
  资: '資',
  辈: '輩',
  亲: '親',
  传: '傳',
  鱼: '魚',
  调: '調',
  两: '兩',
  间: '間',
  额: '額',
  颧: '顴',
  颊: '頰',
  睑: '瞼',
  岳: '嶽',
  颏: '頦',
  颌: '頜',
  宫: '宮',
  卧: '臥',
  风: '風',
  阳: '陽',
  阴: '陰',
  术: '術',
  识: '識',
  认: '認',
  觉: '覺',
  见: '見',
  听: '聽',
  问: '問',
  门: '門',
  们: '們',
  个: '個',
  这: '這',
  还: '還',
  说: '說',
  会: '會',
  样: '樣',
  种: '種',
  无: '無',
  义: '義',
  书: '書',
  发: '發',
  总: '總',
  后: '後',
  禀: '稟',
  赋: '賦',
  写: '寫',
  双: '雙',
}

function toZhHant(hans: string): string {
  let out = ''
  for (const ch of hans) {
    out += HANT_CHARS[ch] ?? ch
  }
  // Hairline 发际 → 髮際 (not 發際)
  return out.replaceAll('發際', '髮際')
}

function glossLang(locale: TermLocale, short: XingqiLocalTerm['short']): 'zh' | 'zhHant' | 'en' {
  if (isZhHant(locale)) return 'zhHant'
  if (locale.startsWith('zh')) return 'zh'
  return 'en'
}

function t(
  id: string,
  zh: string,
  pinyin: string,
  category: XingqiLocalCategory,
  shortZh: string,
  shortEn: string,
  longZh: string,
  longEn: string
): XingqiLocalTerm {
  return {
    id,
    zh,
    pinyin,
    category,
    short: { zh: shortZh, zhHant: toZhHant(shortZh), en: shortEn },
    long: { zh: longZh, zhHant: toZhHant(longZh), en: longEn },
  }
}

/** Shared framing + face + palm — canonical only (aliases in xingqi-canon). */
export const XINGQI_FORM_TERMS: readonly XingqiLocalTerm[] = [
  // ── meta ──
  t(
    'xq_xingqi',
    '形气',
    'xíng qì',
    'meta',
    '外形与气机',
    'Form and qi',
    '形气：面掌外形与内在气机对照，本期阅读主轴，非命运判决。',
    'Form-qi: physiognomy against motion — study framing, not fate.'
  ),
  t(
    'xq_qiji',
    '气机',
    'qì jī',
    'meta',
    '气的动静',
    'Qi in motion',
    '气机：形气中「动」的一面——起伏与宜留意的窗口；健康轴亦借此谈节奏，不作诊治。',
    'Qi motion: rhythm and windows worth noting; on health, pacing — not treatment.'
  ),
  t(
    'xq_yiliuyi',
    '宜留意',
    'yí liú yì',
    'meta',
    '值得观察',
    'Worth noting',
    '宜留意：标准措辞，提示观察窗口而非预言或诊断。',
    'Worth noting: observation — not prediction or diagnosis.'
  ),
  t(
    'xq_qise',
    '气色',
    'qì sè',
    'meta',
    '润泽与神采',
    'Complexion',
    '气色：肤色、润泽与神采；可与古典中医脏腑气血之「象」对照，作警示而非诊治。',
    'Complexion and spirit — may echo classical TCM imagery; caution, not diagnosis.'
  ),
  t(
    'xq_zangfuxiang',
    '脏腑之象',
    'zàng fǔ zhī xiàng',
    'meta',
    '意象对照',
    'Organ imagery',
    '脏腑之象：中医作词典层——用脏腑气血之「象」解释形气色机，不是诊断五脏六腑。',
    'TCM as lexicon: organ/qi imagery for form-qi cues — not organ diagnosis.'
  ),
  t(
    'xq_qixue',
    '气血',
    'qì xuè',
    'meta',
    '气与血的充养',
    'Qi and blood',
    '气血：中医词典层——谈润泽、循环与神采的「象」，不作验血或诊治。',
    'Qi–blood imagery for tone and vitality — not lab medicine.'
  ),
  t(
    'xq_lian',
    '敛',
    'liǎn',
    'meta',
    '收束内守',
    'Gather inward',
    '敛：把外散之势往里收——睡眠、少言、减刺激等节奏，不是压抑个性。',
    'Gathering qi inward — pacing and rest, not suppressing character.'
  ),
  t(
    'xq_fuyang',
    '浮阳',
    'fú yáng',
    'meta',
    '阳气上浮',
    'Floating yang',
    '浮阳：阳气偏于上浮（易热、浅眠、目赤等「象」）；宜留意下沉与收敛的节奏，非诊断。',
    'Yang rising too high (heat, light sleep…) — cue to settle; not a diagnosis.'
  ),
  t(
    'xq_lianfuyang',
    '敛浮阳',
    'liǎn fú yáng',
    'meta',
    '收上浮之阳',
    'Settle floating yang',
    '敛浮阳：用作息与节律把上浮之热往下安——常见于火旺窗口的养生意象，非医疗处方。',
    'Settling floating yang via rhythm — cultural pacing, not a prescription.'
  ),
  t(
    'xq_ganyang',
    '肝阳',
    'gān yáng',
    'meta',
    '肝系上亢之象',
    'Liver-yang imagery',
    '肝阳：中医词典——目突、急躁、上热等「象」；与肝木开窍于目并读，不作肝病诊断。',
    'Liver-yang imagery (eyes, agitation) — lexicon, not hepatology.'
  ),
  t(
    'xq_tanyu',
    '痰瘀',
    'tán yū',
    'meta',
    '痰与瘀的意象',
    'Phlegm–stasis imagery',
    '痰瘀：形气色斑、痣点等「阻滞」意象，解释可见痕迹，不作病理化验。',
    'Phlegm–stasis as form metaphor for marks — not pathology labs.'
  ),
  t(
    'xq_xingqiyiju',
    '形气依据',
    'xíng qì yī jù',
    'meta',
    '所见之形',
    'Form evidence',
    '形气依据：报告字段——先写照片上可见的形，再谈气机与窗口。',
    'The Form field: what the photo shows before qi and windows.'
  ),
  t(
    'xq_guxiang',
    '骨相',
    'gǔ xiàng',
    'meta',
    '骨骼格局',
    'Bone structure',
    '骨相：骨骼起伏格局，不作美丑评价。',
    'Skeletal pattern — not a beauty judgment.'
  ),
  t(
    'xq_rouxiang',
    '肉相',
    'ròu xiàng',
    'meta',
    '肌肉丰瘠',
    'Flesh tone',
    '肉相：肌肉丰满或清瘦的形质对照。',
    'Flesh fullness or spareness as form quality.'
  ),

  // ── 面相（三停·五岳·十二宫·五官）──
  t(
    'xq_mianxiang',
    '面相',
    'miàn xiàng',
    'face',
    '面部格局',
    'Face reading',
    '面相：三停五岳、十二宫与五官线索的统称。',
    'Facial physiognomy: courts, peaks, and features.'
  ),
  t(
    'xq_santing',
    '三停',
    'sān tíng',
    'face',
    '面分上中下',
    'Three courts',
    '三停：发际至眉、眉至鼻底、鼻底至颏的三段比例（亦作三庭）。',
    'Upper / middle / lower face proportions.'
  ),
  t(
    'xq_wuyue',
    '五岳',
    'wǔ yuè',
    'face',
    '额鼻颧颊颏',
    'Five peaks',
    '五岳：额、鼻、两颧与颏，读面部高低起伏。',
    'Forehead, nose, cheekbones, chin as “peaks”.'
  ),
  t(
    'xq_wuguan',
    '五官',
    'wǔ guān',
    'face',
    '眉眼鼻口耳',
    'Five features',
    '五官：眉、眼、鼻、口、耳的形神对照。',
    'Brows, eyes, nose, mouth, ears.'
  ),
  t(
    'xq_shiergong',
    '十二宫',
    'shí èr gōng',
    'face',
    '面部分区',
    'Twelve palaces',
    '十二宫：命、财帛、兄弟等面部分区，作结构线索。',
    'Facial zones (life, wealth, siblings…) as structural cues.'
  ),
  t(
    'xq_minggong',
    '命宫',
    'mìng gōng',
    'face',
    '印堂一带',
    'Life palace',
    '命宫：印堂附近，常与整体神采对照。',
    'Around Yin Tang — overall spirit.'
  ),
  t(
    'xq_caibogong',
    '财帛宫',
    'cái bó gōng',
    'face',
    '鼻准一带',
    'Wealth palace',
    '财帛宫：鼻准与周围，常与资源感对照。',
    'Nose tip area — resources cue.'
  ),
  t(
    'xq_xiongdigong',
    '兄弟宫',
    'xiōng dì gōng',
    'face',
    '眉尾一带',
    'Siblings palace',
    '兄弟宫：眉尾外侧一带，常与同辈协作气机对照。',
    'Outer brow — peer / sibling cues.'
  ),
  t(
    'xq_tianzhaigong',
    '田宅宫',
    'tián zhái gōng',
    'face',
    '眼下一带',
    'Property palace',
    '田宅宫：下睑与卧蚕一带，常与安顿感对照。',
    'Under-eye — settling / foundation cues.'
  ),
  t(
    'xq_nannvgong',
    '男女宫',
    'nán nǚ gōng',
    'face',
    '眼下承泣',
    'Children palace',
    '男女宫：眼下承泣一带（亦称子女宫），亲缘气机线索。',
    'Under-eye — kinship cues (also 子女宫).'
  ),
  t(
    'xq_nupugong',
    '奴仆宫',
    'nú pú gōng',
    'face',
    '颧下颊区',
    'Servants palace',
    '奴仆宫：颧下颊区，传统上读协力与从属气机。',
    'Cheek below bone — support network cues.'
  ),
  t(
    'xq_fuqigong',
    '夫妻宫',
    'fū qī gōng',
    'face',
    '眼尾一带',
    'Spouse palace',
    '夫妻宫：眼尾鱼尾一带（亦称妻妾宫），关系气机线索。',
    'Outer eye — bond cues (also 妻妾宫).'
  ),
  t(
    'xq_jieegong',
    '疾厄宫',
    'jí è gōng',
    'face',
    '山根一带',
    'Health palace',
    '疾厄宫：山根一带，形气紧张与调养窗口线索。',
    'Nose root — tension / recovery cues.'
  ),
  t(
    'xq_qianyigong',
    '迁移宫',
    'qiān yí gōng',
    'face',
    '额角一带',
    'Travel palace',
    '迁移宫：额角两侧，常与动向、迁流气机对照。',
    'Temple / brow corner — mobility cues.'
  ),
  t(
    'xq_guanlugong',
    '官禄宫',
    'guān lù gōng',
    'face',
    '额中一带',
    'Career palace',
    '官禄宫：额中区域，常与事业气机对照。',
    'Mid-forehead — career qi cue.'
  ),
  t(
    'xq_fudegong',
    '福德宫',
    'fú dé gōng',
    'face',
    '天庭一带',
    'Fortune palace',
    '福德宫：天庭上部，常与心境安顿对照。',
    'Upper forehead — ease / spirit cue.'
  ),
  t(
    'xq_fumugong',
    '父母宫',
    'fù mǔ gōng',
    'face',
    '眉头额际',
    'Parents palace',
    '父母宫：眉头与额际交接，根基与来源气机。',
    'Inner brow / hairline — roots cue.'
  ),
  t(
    'xq_ekuan',
    '额宽',
    'é kuān',
    'face',
    '额头左右开度',
    'Forehead width',
    '额宽：发际下额头左右开度，常与思虑空间、官禄宫并读。',
    'Forehead width — thought space, often with the career palace.'
  ),
  t(
    'xq_tianting',
    '天庭',
    'tiān tíng',
    'face',
    '额头上部',
    'Upper forehead',
    '天庭：额头上部，常与早年气机、思虑空间相关。',
    'Upper forehead — early-life qi / thought space.'
  ),
  t(
    'xq_yintang',
    '印堂',
    'yìn táng',
    'face',
    '两眉之间',
    'Between brows',
    '印堂：两眉之间，神采与近期气机交汇处。',
    'Between the brows — spirit and near-term qi.'
  ),
  t(
    'xq_shangen',
    '山根',
    'shān gēn',
    'face',
    '鼻梁根部',
    'Nose root',
    '山根：鼻梁根，连接印堂与鼻梁的过渡。',
    'Nasion — transition from brow to bridge.'
  ),
  t(
    'xq_nianshou',
    '年寿',
    'nián shòu',
    'face',
    '鼻梁中段',
    'Nose bridge',
    '年寿：鼻梁中段，传统上与中年气机对照。',
    'Mid-bridge — midlife qi cue.'
  ),
  t(
    'xq_zhuntou',
    '准头',
    'zhǔn tóu',
    'face',
    '鼻头',
    'Nose tip',
    '准头：鼻头圆方尖钝，常与财帛宫并读。',
    'Nose tip — often read with the wealth palace.'
  ),
  t(
    'xq_renzhong',
    '人中',
    'rén zhōng',
    'face',
    '鼻下沟',
    'Philtrum',
    '人中：鼻下人中沟深浅长短，作承接线索。',
    'Philtrum depth and length.'
  ),
  t(
    'xq_dige',
    '地阁',
    'dì gé',
    'face',
    '下巴',
    'Chin',
    '地阁：下巴与下颌，常与收束、晚期气机对照。',
    'Chin and jaw — closure / later qi.'
  ),
  t(
    'xq_chengjiang',
    '承浆',
    'chéng jiāng',
    'face',
    '颏下凹',
    'Under-chin',
    '承浆：颏下浅凹，地阁的一部分。',
    'Slight hollow under the chin.'
  ),
  t(
    'xq_quan',
    '颧骨',
    'quán gǔ',
    'face',
    '面中高骨',
    'Cheekbones',
    '颧骨：面中两侧高骨突度，五岳之一。',
    'Cheekbone prominence.'
  ),
  t(
    'xq_faling',
    '法令纹',
    'fǎ lìng wén',
    'face',
    '鼻翼旁纹',
    'Nasolabial folds',
    '法令纹：鼻翼两侧纹路，只作形气线索。',
    'Nasolabial folds as form cues only.'
  ),
  t(
    'xq_chuanzi',
    '川字纹',
    'chuān zì wén',
    'face',
    '眉间竖纹',
    'Glabellar lines',
    '川字纹：印堂竖纹，常与思虑张力对照。',
    'Vertical glabellar lines — thought tension.'
  ),
  t(
    'xq_yuwei',
    '鱼尾纹',
    'yú wěi wén',
    'face',
    '眼角纹',
    'Crow’s feet',
    '鱼尾纹：眼角纹路，偏气色与岁月痕迹。',
    'Outer-eye lines — tone and time.'
  ),
  t(
    'xq_wocan',
    '卧蚕',
    'wò cán',
    'face',
    '下睑微隆',
    'Under-eye swell',
    '卧蚕：下睑微隆，传统上与情感气机并读。',
    'Slight under-eye swell.'
  ),
  t(
    'xq_meixing',
    '眉型',
    'méi xíng',
    'face',
    '眉毛形态',
    'Brow shape',
    '眉型：浓淡曲直与眼的配合。',
    'Brow density and curve with the eyes.'
  ),
  t(
    'xq_yanxing',
    '眼型',
    'yǎn xíng',
    'face',
    '眼睛神采',
    'Eye form',
    '眼型：眼形、眼神与开合感。',
    'Eye shape and spirit.'
  ),
  t(
    'xq_bixing',
    '鼻型',
    'bí xíng',
    'face',
    '鼻梁鼻头',
    'Nose form',
    '鼻型：山根、年寿、准头的整体。',
    'Root, bridge, and tip as one.'
  ),
  t(
    'xq_zuixing',
    '嘴型',
    'zuǐ xíng',
    'face',
    '唇口形态',
    'Mouth form',
    '嘴型：唇厚薄、口角与人中关系。',
    'Lips and mouth corners with the philtrum.'
  ),
  t(
    'xq_erchui',
    '耳垂',
    'ěr chuí',
    'face',
    '耳垂形态',
    'Earlobes',
    '耳垂：厚薄依附，五官之一的收束。',
    'Earlobe fullness and attachment.'
  ),

  // ── 手相（主纹 + 丘位）──
  t(
    'xq_zhangxiang',
    '掌相',
    'zhǎng xiàng',
    'palm',
    '手掌形纹',
    'Palmistry',
    '掌相：掌形、丘、主纹与气色的统称。',
    'Palm shape, mounts, lines, and tone.'
  ),
  t(
    'xq_zhangxing',
    '掌形',
    'zhǎng xíng',
    'palm',
    '掌的外形',
    'Palm shape',
    '掌形：地、火、风、水等掌型分类线索。',
    'Earth / fire / air / water palm types.'
  ),
  t(
    'xq_dixingzhang',
    '地型掌',
    'dì xíng zhǎng',
    'palm',
    '方厚稳掌',
    'Earth palm',
    '地型掌：方厚稳实，常与根基感对照。',
    'Square, solid palm — grounding.'
  ),
  t(
    'xq_huoxingzhang',
    '火型掌',
    'huǒ xíng zhǎng',
    'palm',
    '长掌热情',
    'Fire palm',
    '火型掌：掌长指长，气机偏动。',
    'Long palm and fingers — more kinetic qi.'
  ),
  t(
    'xq_fengxingzhang',
    '风型掌',
    'fēng xíng zhǎng',
    'palm',
    '方掌长指',
    'Air palm',
    '风型掌：掌方指长，常与思虑灵敏对照。',
    'Square palm, long fingers — agile thought.'
  ),
  t(
    'xq_shuixingzhang',
    '水型掌',
    'shuǐ xíng zhǎng',
    'palm',
    '柔长掌',
    'Water palm',
    '水型掌：掌柔指长，情感与感受性偏显。',
    'Soft long palm — feeling tone.'
  ),
  t(
    'xq_shengmingxian',
    '生命线',
    'shēng mìng xiàn',
    'palm',
    '绕拇主纹',
    'Life line',
    '生命线：环绕拇指丘的主纹，与体力节律对照。',
    'Arc around the thenar — vitality rhythm.'
  ),
  t(
    'xq_zhihuixian',
    '智慧线',
    'zhì huì xiàn',
    'palm',
    '头脑线',
    'Head line',
    '智慧线：横过掌心，常与思虑方式对照（亦称头脑线）。',
    'Across the palm — thinking style.'
  ),
  t(
    'xq_ganqingxian',
    '感情线',
    'gǎn qíng xiàn',
    'palm',
    '心脏线',
    'Heart line',
    '感情线：近指根横纹，情感表达与人际张力（亦称心脏线）。',
    'Near fingers — affect and relational tension.'
  ),
  t(
    'xq_shiyexian',
    '事业线',
    'shì yè xiàn',
    'palm',
    '命运线',
    'Fate line',
    '事业线：自腕向中指的纵纹，常与路径感对照（亦称命运线）。',
    'Vertical from wrist — path / vocation cue.'
  ),
  t(
    'xq_hunyinxian',
    '婚姻线',
    'hūn yīn xiàn',
    'palm',
    '小指侧短纹',
    'Marriage lines',
    '婚姻线：小指侧缘短横纹，关系节点线索。',
    'Short lines on the ulnar edge — bond cues.'
  ),
  t(
    'xq_jiankangxian',
    '健康线',
    'jiàn kāng xiàn',
    'palm',
    '肝线',
    'Health line',
    '健康线：自水星丘斜向生命线的细纹。',
    'Fine line from Mercury mount toward life line.'
  ),
  t(
    'xq_taiyangxian',
    '太阳线',
    'tài yáng xiàn',
    'palm',
    '成功线',
    'Sun line',
    '太阳线：太阳丘下纵纹，常与外显、收获感对照。',
    'Under Apollo mount — visibility / fruition.'
  ),
  t(
    'xq_qiwei',
    '丘位',
    'qiū wèi',
    'palm',
    '掌上肉丘',
    'Mounts',
    '丘位：掌上各肉丘（金星丘、木星丘等）的统称。',
    'Palm mounts as a family of cues.'
  ),
  t(
    'xq_jinxingqiu',
    '金星丘',
    'jīn xīng qiū',
    'palm',
    '拇指根丘',
    'Venus mount',
    '金星丘：拇指根丰丘，活力与情感根基。',
    'Thenar mount — vitality and warmth.'
  ),
  t(
    'xq_muxingqiu',
    '木星丘',
    'mù xīng qiū',
    'palm',
    '食指根丘',
    'Jupiter mount',
    '木星丘：食指根，志向与展开感。',
    'Under index — aspiration.'
  ),
  t(
    'xq_tuxingqiu',
    '土星丘',
    'tǔ xīng qiū',
    'palm',
    '中指根丘',
    'Saturn mount',
    '土星丘：中指根，责任与沉稳感。',
    'Under middle finger — weight and duty.'
  ),
  t(
    'xq_taiyangqiu',
    '太阳丘',
    'tài yáng qiū',
    'palm',
    '无名指根丘',
    'Apollo mount',
    '太阳丘：无名指根，外显与才情线索。',
    'Under ring finger — expression.'
  ),
  t(
    'xq_shuixingqiu',
    '水星丘',
    'shuǐ xīng qiū',
    'palm',
    '小指根丘',
    'Mercury mount',
    '水星丘：小指根，沟通与机变。',
    'Under little finger — communication.'
  ),
  t(
    'xq_yueqiu',
    '月丘',
    'yuè qiū',
    'palm',
    '掌外侧丘',
    'Luna mount',
    '月丘：掌外侧近腕，想象与感受性。',
    'Ulnar heel — imagination and feeling.'
  ),
  t(
    'xq_huoxingqiu',
    '火星丘',
    'huǒ xīng qiū',
    'palm',
    '虎口附近',
    'Mars mounts',
    '火星丘：虎口上下，行动与张力。',
    'Near the thumb gap — drive and tension.'
  ),
  t(
    'xq_zhijie',
    '指节',
    'zhǐ jié',
    'palm',
    '手指分节',
    'Phalanges',
    '指节：各指三节比例，作细节形质线索。',
    'Finger segment proportions.'
  ),
  t(
    'xq_xiantianzhang',
    '先天掌',
    'xiān tiān zhǎng',
    'palm',
    '本命底色手',
    'Innate palm',
    '先天掌：男看左掌、女看右掌，读本命禀赋与底色。',
    'Innate palm: men read the left hand, women the right — inborn disposition.'
  ),
  t(
    'xq_houtianzhang',
    '后天掌',
    'hòu tiān zhǎng',
    'palm',
    '后天作为手',
    'Acquired palm',
    '后天掌：男看右掌、女看左掌，读后天作为与近运改写。',
    'Acquired palm: men read the right hand, women the left — later effort and recent luck.'
  ),
  t(
    'xq_zuoyouduizhao',
    '左右对照',
    'zuǒ yòu duì zhào',
    'palm',
    '双手并读',
    'Both-hand contrast',
    '左右对照：先天掌与后天掌并读，看底色与作为是同向还是对拉。',
    'Both-hand contrast: read innate vs acquired together — aligned or pulling apart.'
  ),
]

export const XINGQI_VOCAB_PROMPT = [
  'Vocabulary (prefer these tokens when relevant so the client can gloss them):',
  '形气, 气机, 宜留意, 气色, 气血, 骨相, 肉相, 脏腑之象, 敛, 浮阳, 敛浮阳, 肝阳, 痰瘀, 形气依据,',
  '面相, 三停, 五岳, 五官, 十二宫, 额宽,',
  '命宫, 财帛宫, 兄弟宫, 田宅宫, 男女宫, 奴仆宫, 夫妻宫, 疾厄宫, 迁移宫, 官禄宫, 福德宫, 父母宫,',
  '天庭, 印堂, 山根, 年寿, 准头, 人中, 地阁, 承浆, 颧骨,',
  '法令纹, 川字纹, 鱼尾纹, 卧蚕, 眉型, 眼型, 鼻型, 嘴型, 耳垂,',
  '掌相, 掌形, 丘位, 地型掌, 火型掌, 风型掌, 水型掌, 先天掌, 后天掌, 左右对照,',
  '生命线, 智慧线, 感情线, 事业线, 婚姻线, 健康线, 太阳线,',
  '金星丘, 木星丘, 土星丘, 太阳丘, 水星丘, 月丘, 火星丘, 指节,',
  '日主, 用神, 通关, 相生, 相克, 比和, 金, 木, 水, 火, 土,',
  '大运, 流年, 流月, 正印, 偏印, 正官, 七杀, 食神, 伤官, 正财, 偏财, 比肩, 劫财.',
  'Prefer 三停 over 三庭; 智慧线 / 感情线 / 事业线 over 头脑线 / 心脏线 / 命运线.',
  'Do not invent obscure jargon outside this list plus plain language.',
].join(' ')

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const LOCAL_BY_ZH = new Map(XINGQI_FORM_TERMS.map((x) => [x.zh, x]))

function canonicalizeTermZh(zh: string): string {
  return XINGQI_TERM_ALIASES[zh] ?? zh
}

const PROSE_TOKENS = Array.from(
  new Set([
    ...XINGQI_FORM_TERMS.map((x) => x.zh),
    ...Object.keys(XINGQI_TERM_ALIASES),
    ...XINGQI_ASTRO_TERMS,
  ])
).sort((a, b) => b.length - a.length)

const PROSE_RE = new RegExp(`(${PROSE_TOKENS.map(escapeRegExp).join('|')})`, 'g')

export type XingqiTermSegment = { text: string; termZh: string | null }

export function segmentXingqiTerms(text: string): XingqiTermSegment[] {
  if (!text) return [{ text, termZh: null }]
  const out: XingqiTermSegment[] = []
  let last = 0
  PROSE_RE.lastIndex = 0
  let m = PROSE_RE.exec(text)
  while (m !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), termZh: null })
    const matched = m[0]
    out.push({ text: matched, termZh: canonicalizeTermZh(matched) })
    last = m.index + matched.length
    m = PROSE_RE.exec(text)
  }
  if (last < text.length) out.push({ text: text.slice(last), termZh: null })
  return out.length > 0 ? out : [{ text, termZh: null }]
}

export function resolveXingqiTerm(zh: string, locale: TermLocale): ResolvedTerm | null {
  const canonical = canonicalizeTermZh(zh)
  const local = LOCAL_BY_ZH.get(canonical)
  if (local) {
    const lang = glossLang(locale, local.short)
    return {
      id: local.id,
      zh: local.zh,
      pinyin: local.pinyin,
      category: 'relation' as TermCategory,
      short: local.short[lang],
      long: local.long[lang],
    }
  }
  if (!(XINGQI_ASTRO_TERMS as readonly string[]).includes(canonical)) return null
  return getTermByZh(canonical, locale)
}

export type XingqiGlossaryGroup = {
  id: string
  labelZh: string
  labelEn: string
  terms: ResolvedTerm[]
}

function toResolved(locale: TermLocale, list: readonly XingqiLocalTerm[]): ResolvedTerm[] {
  return list.map((x) => {
    const lang = glossLang(locale, x.short)
    return {
      id: x.id,
      zh: x.zh,
      pinyin: x.pinyin,
      category: 'relation' as TermCategory,
      short: x.short[lang],
      long: x.long[lang],
    }
  })
}

function glossaryLabel(locale: TermLocale, hans: string, hant: string): string {
  return isZhHant(locale) ? hant : hans
}

export function getXingqiGlossaryGroups(locale: TermLocale): XingqiGlossaryGroup[] {
  const pick = (zs: string[]) =>
    zs.map((z) => getTermByZh(z, locale)).filter((x): x is ResolvedTerm => x != null)

  const meta = XINGQI_FORM_TERMS.filter((x) => x.category === 'meta')
  const face = XINGQI_FORM_TERMS.filter((x) => x.category === 'face')
  const palm = XINGQI_FORM_TERMS.filter((x) => x.category === 'palm')

  return [
    {
      id: 'meta',
      labelZh: glossaryLabel(locale, '形气总说', '形氣總說'),
      labelEn: 'Form framing',
      terms: toResolved(locale, meta),
    },
    {
      id: 'face',
      labelZh: glossaryLabel(locale, '面相 · 十二宫', '面相 · 十二宮'),
      labelEn: 'Face · palaces',
      terms: toResolved(locale, face),
    },
    {
      id: 'palm',
      labelZh: glossaryLabel(locale, '手相 · 丘位', '手相 · 丘位'),
      labelEn: 'Palm · mounts',
      terms: toResolved(locale, palm),
    },
    {
      id: 'wuxing',
      labelZh: glossaryLabel(locale, '五行 · 气机', '五行 · 氣機'),
      labelEn: 'Wuxing',
      terms: pick(['金', '木', '水', '火', '土', '相生', '相克', '比和']),
    },
    {
      id: 'natal',
      labelZh: glossaryLabel(locale, '命盘对照', '命盤對照'),
      labelEn: 'Natal contrast',
      terms: pick([
        '日主',
        '用神',
        '通关',
        '比肩',
        '劫财',
        '食神',
        '伤官',
        '偏财',
        '正财',
        '七杀',
        '正官',
        '偏印',
        '正印',
        '六冲',
        '三合',
        '六合',
      ]),
    },
    {
      id: 'cycle',
      labelZh: glossaryLabel(locale, '时间窗口', '時間窗口'),
      labelEn: 'Time windows',
      terms: pick(['大运', '流年', '流月']),
    },
  ]
}
