/**
 * @zhop/astro-i18n — curated 命理 term table (data)
 *
 * The single source of truth for the synastry prompt's inline glosses and the
 * Settings 命理 glossary page. zh + en authored meaning-first (the EFFECT, not
 * the literal characters); ja/ko fall back to en for now.
 *
 * Keys (`zh`) match the engine + labelize tokens so lookups line up.
 * See ./terms.ts for the accessors and the voice rules.
 */

import type { TermEntry } from './terms'
import { ZIWEI_TERMS } from './terms-ziwei-data'

export const TERMS: TermEntry[] = [
  ...ZIWEI_TERMS,
  // ─── 五行 Five Elements ───
  {
    id: 'wuxing_jin',
    zh: '金',
    pinyin: 'jīn',
    category: 'wuxing',
    meaning: {
      zh: {
        short: '果决、重原则、有规矩',
        long: '金的能量：决断、界限分明，追求秩序、公正与精纯。',
      },
      en: {
        short: 'decisive, principled, structured',
        long: 'The Metal element: resolve, clear boundaries, and a drive toward order, justice, and refinement.',
      },
    },
  },
  {
    id: 'wuxing_mu',
    zh: '木',
    pinyin: 'mù',
    category: 'wuxing',
    meaning: {
      zh: { short: '生长、仁厚、向上', long: '木的能量：成长与远见，温暖地扩展、建设与滋养。' },
      en: {
        short: 'growing, kind, aspiring',
        long: 'The Wood element: growth, vision, and a warm urge to expand, build, and nurture.',
      },
    },
  },
  {
    id: 'wuxing_shui',
    zh: '水',
    pinyin: 'shuǐ',
    category: 'wuxing',
    meaning: {
      zh: {
        short: '灵活、聪慧、善变通',
        long: '水的能量：智慧与弹性，情感深沉，总能绕过阻碍找到出路。',
      },
      en: {
        short: 'adaptive, wise, flowing',
        long: 'The Water element: intelligence, flexibility, and emotional depth that finds a way around obstacles.',
      },
    },
  },
  {
    id: 'wuxing_huo',
    zh: '火',
    pinyin: 'huǒ',
    category: 'wuxing',
    meaning: {
      zh: { short: '热情、外显、温暖', long: '火的能量：热忱与表现力，自然地吸引他人靠近。' },
      en: {
        short: 'passionate, expressive, warm',
        long: 'The Fire element: enthusiasm, visibility, and the warmth that naturally draws people close.',
      },
    },
  },
  {
    id: 'wuxing_tu',
    zh: '土',
    pinyin: 'tǔ',
    category: 'wuxing',
    meaning: {
      zh: { short: '稳重、可靠、踏实', long: '土的能量：可靠与耐心，是他人愿意倚靠的稳定力量。' },
      en: {
        short: 'steady, trustworthy, grounded',
        long: 'The Earth element: reliability, patience, and the steadiness others come to depend on.',
      },
    },
  },

  // ─── 天干 Heavenly Stems ───
  {
    id: 'tiangan_jia',
    zh: '甲',
    pinyin: 'jiǎ',
    category: 'tiangan',
    meaning: {
      zh: { short: '正直进取', long: '阳木，参天大树：正直、进取，朝目标笔直生长。' },
      en: {
        short: 'upright and ambitious',
        long: 'Yang Wood — a tall tree: principled, ambitious, grows straight toward its goals.',
      },
    },
  },
  {
    id: 'tiangan_yi',
    zh: '乙',
    pinyin: 'yǐ',
    category: 'tiangan',
    meaning: {
      zh: { short: '柔韧善借力', long: '阴木，藤蔓花草：灵活坚韧，善于借势而生。' },
      en: {
        short: 'flexible and resourceful',
        long: "Yin Wood — a climbing vine: adaptable, persistent, thrives by leveraging what's around it.",
      },
    },
  },
  {
    id: 'tiangan_bing',
    zh: '丙',
    pinyin: 'bǐng',
    category: 'tiangan',
    meaning: {
      zh: { short: '光明外放', long: '阳火，太阳烈日：磊落、慷慨，影响力外显。' },
      en: {
        short: 'radiant and open',
        long: 'Yang Fire — the blazing sun: bright, generous, openly influential.',
      },
    },
  },
  {
    id: 'tiangan_ding',
    zh: '丁',
    pinyin: 'dīng',
    category: 'tiangan',
    meaning: {
      zh: { short: '温暖细致', long: '阴火，灯烛之光：温暖亲密，照亮身边的人。' },
      en: {
        short: 'warm and attentive',
        long: 'Yin Fire — a candle flame: warm, intimate, lights up those nearby.',
      },
    },
  },
  {
    id: 'tiangan_wu',
    zh: '戊',
    pinyin: 'wù',
    category: 'tiangan',
    meaning: {
      zh: { short: '稳重承载', long: '阳土，高山厚地：稳重可靠，承载并支持他人。' },
      en: {
        short: 'solid and sheltering',
        long: 'Yang Earth — a mountain: stable, dependable, shelters and supports others.',
      },
    },
  },
  {
    id: 'tiangan_ji',
    zh: '己',
    pinyin: 'jǐ',
    category: 'tiangan',
    meaning: {
      zh: { short: '温润内敛', long: '阴土，田园沃壤：温和谦逊，默默助人成长。' },
      en: {
        short: 'nurturing and modest',
        long: 'Yin Earth — fertile soil: gentle, modest, quietly helps things grow.',
      },
    },
  },
  {
    id: 'tiangan_geng',
    zh: '庚',
    pinyin: 'gēng',
    category: 'tiangan',
    meaning: {
      zh: { short: '刚毅果决', long: '阳金，斧钺铁器：果断坦率，破立分明。' },
      en: {
        short: 'decisive and direct',
        long: 'Yang Metal — forged iron: decisive, candid, breaks and rebuilds with clarity.',
      },
    },
  },
  {
    id: 'tiangan_xin',
    zh: '辛',
    pinyin: 'xīn',
    category: 'tiangan',
    meaning: {
      zh: { short: '精致敏锐', long: '阴金，珠玉首饰：精致敏感，重质感与细节。' },
      en: {
        short: 'refined and sensitive',
        long: 'Yin Metal — a polished jewel: refined, sensitive, values quality and detail.',
      },
    },
  },
  {
    id: 'tiangan_ren',
    zh: '壬',
    pinyin: 'rén',
    category: 'tiangan',
    meaning: {
      zh: { short: '豪迈志远', long: '阳水，江河湖海：豪迈开阔，志向辽远。' },
      en: {
        short: 'bold and far-reaching',
        long: 'Yang Water — a great river: bold, expansive, carries far-reaching ambitions.',
      },
    },
  },
  {
    id: 'tiangan_gui',
    zh: '癸',
    pinyin: 'guǐ',
    category: 'tiangan',
    meaning: {
      zh: { short: '沉静深远', long: '阴水，雨露泉源：沉静善察，润物无声。' },
      en: {
        short: 'quiet and deep',
        long: 'Yin Water — gentle rain: quiet, perceptive, nourishes without fanfare.',
      },
    },
  },

  // ─── 地支 Earthly Branches ───
  {
    id: 'dizhi_zi',
    zh: '子',
    pinyin: 'zǐ',
    category: 'dizhi',
    meaning: {
      zh: { short: '鼠——机敏灵巧', long: '子（阳水）：机敏灵活，临事善变通。' },
      en: {
        short: 'Rat — clever, resourceful',
        long: 'The Rat branch (Yang Water): quick, adaptable, resourceful under pressure.',
      },
    },
  },
  {
    id: 'dizhi_chou',
    zh: '丑',
    pinyin: 'chǒu',
    category: 'dizhi',
    meaning: {
      zh: { short: '牛——稳重持久', long: '丑（阴土）：耐心可靠，厚积而长久。' },
      en: {
        short: 'Ox — steady, enduring',
        long: 'The Ox branch (Yin Earth): patient, dependable, builds slowly and lasts.',
      },
    },
  },
  {
    id: 'dizhi_yin',
    zh: '寅',
    pinyin: 'yín',
    category: 'dizhi',
    meaning: {
      zh: { short: '虎——勇猛开创', long: '寅（阳木）：勇敢有干劲，乐于带头。' },
      en: {
        short: 'Tiger — bold, pioneering',
        long: 'The Tiger branch (Yang Wood): courageous, energetic, eager to lead.',
      },
    },
  },
  {
    id: 'dizhi_mao',
    zh: '卯',
    pinyin: 'mǎo',
    category: 'dizhi',
    meaning: {
      zh: { short: '兔——温和圆融', long: '卯（阴木）：温柔得体，体察他人。' },
      en: {
        short: 'Rabbit — gentle, tactful',
        long: 'The Rabbit branch (Yin Wood): gentle, diplomatic, sensitive to others.',
      },
    },
  },
  {
    id: 'dizhi_chen',
    zh: '辰',
    pinyin: 'chén',
    category: 'dizhi',
    meaning: {
      zh: { short: '龙——格局远大', long: '辰（阳土）：志向远大、想象力强，能容纳多重力量。' },
      en: {
        short: 'Dragon — visionary, complex',
        long: 'The Dragon branch (Yang Earth): ambitious, imaginative, holds many forces at once.',
      },
    },
  },
  {
    id: 'dizhi_si',
    zh: '巳',
    pinyin: 'sì',
    category: 'dizhi',
    meaning: {
      zh: { short: '蛇——洞察深沉', long: '巳（阴火）：敏锐有谋略，深藏不露。' },
      en: {
        short: 'Snake — insightful, private',
        long: 'The Snake branch (Yin Fire): perceptive, strategic, keeps its own counsel.',
      },
    },
  },
  {
    id: 'dizhi_wu',
    zh: '午',
    pinyin: 'wǔ',
    category: 'dizhi',
    meaning: {
      zh: { short: '马——热烈自由', long: '午（阳火）：活跃外向，向往自由与行动。' },
      en: {
        short: 'Horse — energetic, free',
        long: 'The Horse branch (Yang Fire): lively, outgoing, craves freedom and movement.',
      },
    },
  },
  {
    id: 'dizhi_wei',
    zh: '未',
    pinyin: 'wèi',
    category: 'dizhi',
    meaning: {
      zh: { short: '羊——温善有情', long: '未（阴土）：温和有创意，重和谐与安逸。' },
      en: {
        short: 'Goat — kind, artistic',
        long: 'The Goat branch (Yin Earth): gentle, creative, values harmony and comfort.',
      },
    },
  },
  {
    id: 'dizhi_shen',
    zh: '申',
    pinyin: 'shēn',
    category: 'dizhi',
    meaning: {
      zh: { short: '猴——机巧多变', long: '申（阳金）：机智灵巧，善于解决问题。' },
      en: {
        short: 'Monkey — clever, versatile',
        long: 'The Monkey branch (Yang Metal): witty, agile, quick to solve problems.',
      },
    },
  },
  {
    id: 'dizhi_you',
    zh: '酉',
    pinyin: 'yǒu',
    category: 'dizhi',
    meaning: {
      zh: { short: '鸡——精确讲究', long: '酉（阴金）：细致、有表现力，注重细节。' },
      en: {
        short: 'Rooster — precise, refined',
        long: 'The Rooster branch (Yin Metal): meticulous, expressive, attentive to detail.',
      },
    },
  },
  {
    id: 'dizhi_xu',
    zh: '戌',
    pinyin: 'xū',
    category: 'dizhi',
    meaning: {
      zh: { short: '狗——忠诚守义', long: '戌（阳土）：忠实护人，是非分明。' },
      en: {
        short: 'Dog — loyal, principled',
        long: 'The Dog branch (Yang Earth): faithful, protective, strong sense of right.',
      },
    },
  },
  {
    id: 'dizhi_hai',
    zh: '亥',
    pinyin: 'hài',
    category: 'dizhi',
    meaning: {
      zh: { short: '猪——真诚厚道', long: '亥（阳水）：诚恳随和，待人慷慨。' },
      en: {
        short: 'Pig — sincere, generous',
        long: 'The Pig branch (Yang Water): honest, easygoing, generous to others.',
      },
    },
  },

  // ─── 十神 Ten Gods ───
  {
    id: 'shishen_bijian',
    zh: '比肩',
    pinyin: 'bǐ jiān',
    category: 'shishen',
    meaning: {
      zh: { short: '同辈、伙伴、平等', long: '比肩：兄弟、同侪、伙伴，与你并肩平等之人。' },
      en: {
        short: 'peers, equals, shared footing',
        long: 'Companion star: siblings, peers, partners — people who stand on equal footing with you.',
      },
    },
  },
  {
    id: 'shishen_jiecai',
    zh: '劫财',
    pinyin: 'jié cái',
    category: 'shishen',
    meaning: {
      zh: { short: '竞争、分享、对手', long: '劫财：既是助力也是对手，可能争夺同一资源。' },
      en: {
        short: 'rivalry, sharing, competition',
        long: 'Rob-Wealth star: competition and sharing — allies who can also compete for the same resources.',
      },
    },
  },
  {
    id: 'shishen_shishen',
    zh: '食神',
    pinyin: 'shí shén',
    category: 'shishen',
    meaning: {
      zh: { short: '才艺、安逸、温和表达', long: '食神：才华与享受，温和自在地输出表达。' },
      en: {
        short: 'talent, ease, gentle output',
        long: 'Output star: creativity, enjoyment, and an easygoing way of expressing talent.',
      },
    },
  },
  {
    id: 'shishen_shangguan',
    zh: '伤官',
    pinyin: 'shāng guān',
    category: 'shishen',
    meaning: {
      zh: { short: '才华、叛逆、破格', long: '伤官：才华耀眼，带叛逆，敢于打破常规。' },
      en: {
        short: 'brilliance, rebellion, breaking molds',
        long: 'Hurting-Officer star: dazzling talent and a rebellious streak that breaks conventions.',
      },
    },
  },
  {
    id: 'shishen_piancai',
    zh: '偏财',
    pinyin: 'piān cái',
    category: 'shishen',
    meaning: {
      zh: { short: '意外之财、机会', long: '偏财：灵活的财富、副业与机遇嗅觉。' },
      en: {
        short: 'windfalls, side income, opportunity',
        long: 'Indirect-Wealth star: flexible money, side ventures, and an eye for opportunity.',
      },
    },
  },
  {
    id: 'shishen_zhengcai',
    zh: '正财',
    pinyin: 'zhèng cái',
    category: 'shishen',
    meaning: {
      zh: { short: '稳定收入、踏实付出', long: '正财：稳定收入、勤勉与踏实的承诺。' },
      en: {
        short: 'steady income, commitment',
        long: 'Direct-Wealth star: stable earnings, diligence, and committed partnership.',
      },
    },
  },
  {
    id: 'shishen_qisha',
    zh: '七杀',
    pinyin: 'qī shā',
    category: 'shishen',
    meaning: {
      zh: { short: '压力、冲劲、权威', long: '七杀：挑战与野心，是冲破压力的力量。' },
      en: {
        short: 'pressure, drive, authority',
        long: 'Seven-Killings star: challenge, ambition, and the force to push through pressure.',
      },
    },
  },
  {
    id: 'shishen_zhengguan',
    zh: '正官',
    pinyin: 'zhèng guān',
    category: 'shishen',
    meaning: {
      zh: { short: '责任、地位、秩序', long: '正官：责任、名誉，尊重规则与秩序。' },
      en: {
        short: 'responsibility, status, order',
        long: 'Direct-Officer star: duty, reputation, and respect for structure and rules.',
      },
    },
  },
  {
    id: 'shishen_pianyin',
    zh: '偏印',
    pinyin: 'piān yìn',
    category: 'shishen',
    meaning: {
      zh: { short: '偏门、直觉、孤独', long: '偏印：另类学问与直觉，需要独处空间。' },
      en: {
        short: 'niche insight, solitude',
        long: 'Indirect-Resource star: unconventional learning, intuition, and a need for solitude.',
      },
    },
  },
  {
    id: 'shishen_zhengyin',
    zh: '正印',
    pinyin: 'zhèng yìn',
    category: 'shishen',
    meaning: {
      zh: { short: '扶助、学习、滋养', long: '正印：贵人、学业与稳定温厚的支持。' },
      en: {
        short: 'support, learning, nurture',
        long: 'Direct-Resource star: mentorship, study, and steady nurturing support.',
      },
    },
  },

  // ─── 神煞 Symbolic Stars ───
  {
    id: 'shensha_wangshen',
    zh: '亡神',
    pinyin: 'wáng shén',
    category: 'shensha',
    meaning: {
      zh: { short: '内敛、有城府、防备', long: '亡神：内收警觉的能量，深谋自保，有时显得防备。' },
      en: {
        short: 'inward, strategic, guarded',
        long: 'Hidden-Loss star: inward, watchful energy — strategic and self-protective, can read as guarded.',
      },
    },
  },
  {
    id: 'shensha_jiesha',
    zh: '劫煞',
    pinyin: 'jié shà',
    category: 'shensha',
    meaning: {
      zh: { short: '突变、外力、果断', long: '劫煞：突如其来的变动与外部压力，需要当机立断。' },
      en: {
        short: 'sudden change, outside force',
        long: 'Robbery star: abrupt turns and outside pressure — sharp energy that demands a quick response.',
      },
    },
  },
  {
    id: 'shensha_taohua',
    zh: '桃花',
    pinyin: 'táo huā',
    category: 'shensha',
    meaning: {
      zh: { short: '魅力、人缘、情缘', long: '桃花：魅力与吸引力，人缘好、易得情缘。' },
      en: {
        short: 'charm, magnetism, romance',
        long: 'Peach-Blossom star: charm and magnetism — popularity, romance, and easy social appeal.',
      },
    },
  },
  {
    id: 'shensha_yima',
    zh: '驿马',
    pinyin: 'yì mǎ',
    category: 'shensha',
    meaning: {
      zh: { short: '走动、迁移、变动', long: '驿马：奔走与迁移之力，主出行、不安于一地。' },
      en: {
        short: 'movement, travel, change',
        long: 'Traveling-Horse star: motion and relocation — travel, restlessness, and a drive to roam.',
      },
    },
  },
  {
    id: 'shensha_huagai',
    zh: '华盖',
    pinyin: 'huá gài',
    category: 'shensha',
    meaning: {
      zh: { short: '孤高、艺术、灵性', long: '华盖：艺术与灵性天赋，伴随孤高独处的倾向。' },
      en: {
        short: 'solitary brilliance, spirituality',
        long: 'Canopy star: artistic and spiritual gifts paired with a taste for solitude.',
      },
    },
  },
  {
    id: 'shensha_wenchang',
    zh: '文昌贵人',
    pinyin: 'wén chāng',
    category: 'shensha',
    meaning: {
      zh: { short: '文采、考试、表达', long: '文昌：利学业、文笔与考试，善于清晰表达。' },
      en: {
        short: 'scholarship, eloquence',
        long: 'Literary star: study, writing, and exams — a gift for learning and clear expression.',
      },
    },
  },
  {
    id: 'shensha_tianyi',
    zh: '天乙贵人',
    pinyin: 'tiān yǐ',
    category: 'shensha',
    meaning: {
      zh: { short: '贵人、逢凶化吉', long: '天乙：及时出现的贵人，能逢凶化吉。' },
      en: {
        short: 'benefactors, timely rescue',
        long: 'Heavenly-Noble star: timely benefactors — helpful people who turn danger into safety.',
      },
    },
  },
  {
    id: 'shensha_jiangxing',
    zh: '将星',
    pinyin: 'jiàng xīng',
    category: 'shensha',
    meaning: {
      zh: { short: '领导、统御', long: '将星：天生的统御与领导力，临事能掌局。' },
      en: {
        short: 'leadership, command',
        long: 'General star: natural command and leadership — the poise to take charge.',
      },
    },
  },

  // ─── 格局 Chart Structures ───
  {
    id: 'geju_zhengguan',
    zh: '正官格',
    pinyin: 'zhèng guān gé',
    category: 'geju',
    meaning: {
      zh: { short: '事业稳健、有地位', long: '正官格：以事业、责任与社会地位立身的稳健格局。' },
      en: {
        short: 'steady career, social standing',
        long: 'Direct-Officer structure: a life built on steady career, responsibility, and earned status.',
      },
    },
  },
  {
    id: 'geju_qisha',
    zh: '七杀格',
    pinyin: 'qī shā gé',
    category: 'geju',
    meaning: {
      zh: { short: '果决、竞争力强', long: '七杀格：擅长挑战与竞争，宜高压、决断的领域。' },
      en: {
        short: 'bold, competitive drive',
        long: 'Seven-Killings structure: thrives on challenge and competition — suits high-pressure, decisive fields.',
      },
    },
  },
  {
    id: 'geju_zhengcai',
    zh: '正财格',
    pinyin: 'zhèng cái gé',
    category: 'geju',
    meaning: {
      zh: { short: '理财稳健、踏实', long: '正财格：理财有度、脚踏实地，生活与婚姻稳定。' },
      en: {
        short: 'disciplined wealth, stability',
        long: 'Direct-Wealth structure: disciplined finances and a grounded, stable approach to life and marriage.',
      },
    },
  },
  {
    id: 'geju_piancai',
    zh: '偏财格',
    pinyin: 'piān cái gé',
    category: 'geju',
    meaning: {
      zh: { short: '商业头脑、人脉广', long: '偏财格：进取善交际，靠机遇与人脉聚财。' },
      en: {
        short: 'entrepreneurial, wide networks',
        long: 'Indirect-Wealth structure: enterprising and sociable, builds wealth through opportunity and connections.',
      },
    },
  },
  {
    id: 'geju_shishen',
    zh: '食神格',
    pinyin: 'shí shén gé',
    category: 'geju',
    meaning: {
      zh: { short: '才艺、安逸自在', long: '食神格：以才华与享受为主，温和而自得。' },
      en: {
        short: 'talent, comfort, ease',
        long: 'Output structure: lives by talent and enjoyment — gentle, expressive, content.',
      },
    },
  },
  {
    id: 'geju_shangguan',
    zh: '伤官格',
    pinyin: 'shāng guān gé',
    category: 'geju',
    meaning: {
      zh: { short: '才华鲜明、不拘一格', long: '伤官格：才华出众，宜创意或不循常规的道路。' },
      en: {
        short: 'gifted, unconventional',
        long: 'Hurting-Officer structure: distinctive talent that shines in creative or unconventional paths.',
      },
    },
  },
  {
    id: 'geju_zhengyin',
    zh: '正印格',
    pinyin: 'zhèng yìn gé',
    category: 'geju',
    meaning: {
      zh: { short: '学养深、有贵人', long: '正印格：学养深厚、贵人扶助，宜文教科研。' },
      en: {
        short: 'scholarly, well-supported',
        long: 'Direct-Resource structure: scholarly and mentor-supported — suited to learning and teaching.',
      },
    },
  },
  {
    id: 'geju_pianyin',
    zh: '偏印格',
    pinyin: 'piān yìn gé',
    category: 'geju',
    meaning: {
      zh: { short: '偏门专精、重直觉', long: '偏印格：擅长偏门、直觉或玄学类专精。' },
      en: {
        short: 'niche expertise, intuitive',
        long: 'Indirect-Resource structure: thrives in niche, intuitive, or mystical expertise.',
      },
    },
  },
  {
    id: 'geju_jianlu',
    zh: '建禄格',
    pinyin: 'jiàn lù gé',
    category: 'geju',
    meaning: {
      zh: { short: '自立、独立打拼', long: '建禄格：自立自强，靠独立打拼成事。' },
      en: {
        short: 'self-reliant, independent',
        long: 'Established-Salary structure: self-made and independent — succeeds by standing on its own.',
      },
    },
  },
  {
    id: 'geju_yangren',
    zh: '羊刃格',
    pinyin: 'yáng rèn gé',
    category: 'geju',
    meaning: {
      zh: { short: '气势凌厉、刚猛', long: '羊刃格：气势凌厉刚猛，宜竞争激烈的高压领域。' },
      en: {
        short: 'sharp, forceful energy',
        long: 'Ram-Blade structure: sharp, forceful drive — powerful in competitive, high-stakes arenas.',
      },
    },
  },
  {
    id: 'geju_yueren',
    zh: '月刃格',
    pinyin: 'yuè rèn gé',
    category: 'geju',
    meaning: {
      zh: {
        short: '月令羊刃，刚强好胜',
        long: '月刃格：羊刃当月令的格局，性情刚强、爆发力足、好胜，宜在竞争或开创的领域发力。',
      },
      en: {
        short: 'month-blade — strong, driven',
        long: 'Month-Blade structure: the Ram-Blade falling on the month branch — a forceful, competitive, high-energy temperament that thrives in rivalrous or pioneering arenas.',
      },
    },
  },
  {
    id: 'geju_congruo',
    zh: '从弱格',
    pinyin: 'cóng ruò gé',
    category: 'geju',
    meaning: {
      zh: { short: '顺势而为、不抗', long: '从弱格：极弱顺势，随主导之力而行反成大器。' },
      en: {
        short: 'yields to the flow',
        long: 'Follow-the-Weak structure: strongest when it yields and flows with the dominant force rather than resisting.',
      },
    },
  },
  {
    id: 'geju_congqiang',
    zh: '从强格',
    pinyin: 'cóng qiáng gé',
    category: 'geju',
    meaning: {
      zh: { short: '强势、自成一格', long: '从强格：极强自专，顺自身之势主导反而最佳。' },
      en: {
        short: 'dominant, self-directed',
        long: 'Follow-the-Strong structure: an overwhelming strength that leads best when it follows its own current.',
      },
    },
  },

  // ─── 合冲 Harmonies & Clashes ───
  {
    id: 'hechong_sanhe',
    zh: '三合',
    pinyin: 'sān hé',
    category: 'hechong',
    meaning: {
      zh: { short: '志同、彼此增益', long: '三合：两盘朝同一方向用力，目标一致、相互放大。' },
      en: {
        short: 'ambitions align and reinforce',
        long: 'Three-Harmony: two charts pull in the same direction — shared goals that amplify each other.',
      },
    },
  },
  {
    id: 'hechong_liuhe',
    zh: '六合',
    pinyin: 'liù hé',
    category: 'hechong',
    meaning: {
      zh: { short: '亲近、自然吸引', long: '六合：天然亲密的吸引，容易靠近、彼此投缘。' },
      en: {
        short: 'close, easy attraction',
        long: 'Six-Harmony: a natural, intimate pull — easy closeness and mutual fondness.',
      },
    },
  },
  {
    id: 'hechong_liuchong',
    zh: '六冲',
    pinyin: 'liù chōng',
    category: 'hechong',
    meaning: {
      zh: { short: '拉扯、张力对冲', long: '六冲：正面相冲，吸引却动荡，在摩擦中成长。' },
      en: {
        short: 'friction, push-pull tension',
        long: 'Six-Clash: direct opposition — magnetic but volatile, growth that comes through friction.',
      },
    },
  },
  {
    id: 'hechong_xiangxing',
    zh: '相刑',
    pinyin: 'xiāng xíng',
    category: 'hechong',
    meaning: {
      zh: { short: '磨人、反复消耗', long: '相刑：反复磨人的摩擦，考验耐性，使潜藏张力浮现。' },
      en: {
        short: 'grinding, recurring strain',
        long: 'Mutual-Punishment: a wearing, recurring friction that tests patience and surfaces hidden tension.',
      },
    },
  },
  {
    id: 'hechong_xianghai',
    zh: '相害',
    pinyin: 'xiāng hài',
    category: 'hechong',
    meaning: {
      zh: { short: '暗耗、误解积怨', long: '相害：暗中相害，细小嫌隙与误解悄悄消磨信任。' },
      en: {
        short: 'quiet undermining, resentment',
        long: 'Mutual-Harm: subtle harm — small slights and misread intentions that quietly erode trust.',
      },
    },
  },
  {
    id: 'hechong_xiangpo',
    zh: '相破',
    pinyin: 'xiāng pò',
    category: 'hechong',
    meaning: {
      zh: {
        short: '扰动、动摇既定',
        long: '相破：动摇既定格局的扰动，令人不安，有时也是破旧立新。',
      },
      en: {
        short: 'disruption, unsettling',
        long: 'Mutual-Break: a destabilizing pull that loosens what was settled — unsettling, sometimes clearing.',
      },
    },
  },

  // ─── 关系/方法 Core Concepts ───
  {
    id: 'relation_yongshen',
    zh: '用神',
    pinyin: 'yòng shén',
    category: 'relation',
    meaning: {
      zh: {
        short: '最需要的平衡之力',
        long: '用神：一张命盘最需要的那个五行，是让全局转顺的关键。',
      },
      en: {
        short: 'the balancing element you need',
        long: 'Useful God: the one element a chart most needs to come into balance — the key that makes everything else work better.',
      },
    },
  },
  {
    id: 'relation_tongguan',
    zh: '通关',
    pinyin: 'tōng guān',
    category: 'relation',
    meaning: {
      zh: { short: '化解相争的桥梁', long: '通关：在两股相争之力间斡旋的五行，把冲突导为流通。' },
      en: {
        short: 'the bridge between two forces',
        long: 'Bridging: an element that mediates between two clashing forces, turning conflict into flow.',
      },
    },
  },
  {
    id: 'relation_rizhu',
    zh: '日主',
    pinyin: 'rì zhǔ',
    category: 'relation',
    meaning: {
      zh: { short: '代表自己的核心', long: '日主：代表你本人的那个字，全盘围绕这个核心展开。' },
      en: {
        short: 'the self at the core of the chart',
        long: 'Day Master: the single character that represents you — the core self the whole chart revolves around.',
      },
    },
  },

  // ─── 周期 Time Cycles ───
  {
    id: 'cycle_dayun',
    zh: '大运',
    pinyin: 'dà yùn',
    category: 'cycle',
    meaning: {
      zh: {
        short: '十年一段的人生阶段',
        long: '大运：每十年一换的人生大阶段，奠定那段时期的整体气候。',
      },
      en: {
        short: 'a ten-year life chapter',
        long: 'Great Luck: a ten-year chapter that sets the overall climate of your life during that span.',
      },
    },
  },
  {
    id: 'cycle_liunian',
    zh: '流年',
    pinyin: 'liú nián',
    category: 'cycle',
    meaning: {
      zh: { short: '某一年的运势气场', long: '流年：具体某一年的能量，像覆盖在命盘上的当年天气。' },
      en: {
        short: 'the energy of a given year',
        long: 'Year Pillar: the energy of a specific year — the weather laid over your chart for those twelve months.',
      },
    },
  },
  {
    id: 'cycle_liuyue',
    zh: '流月',
    pinyin: 'liú yuè',
    category: 'cycle',
    meaning: {
      zh: {
        short: '某一月的运势起伏',
        long: '流月：一年之内更细的月度起伏，用于在大周期里把握时机。',
      },
      en: {
        short: 'the energy of a given month',
        long: 'Month Pillar: the finer monthly tide within a year — useful for timing within the bigger cycles.',
      },
    },
  },
]
