/** Three-level dream preset tree (scene → who/what → why). Labels for 9 locales. */

import { EXTRA_THEMES_BY_LOCALE } from './dream-preset-extra-themes'

export type DreamPresetLeaf = { id: string; label: string }
export type DreamPresetBranch = { id: string; label: string; children: DreamPresetLeaf[] }
export type DreamPresetRoot = { id: string; label: string; children: DreamPresetBranch[] }

type LocaleKey = 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'es' | 'vi' | 'th'

const TREES: Record<LocaleKey, DreamPresetRoot[]> = {
  en: [
    {
      id: 'chase',
      label: 'Being chased',
      children: [
        {
          id: 'chase_stranger',
          label: 'A stranger chases me',
          children: [
            { id: 'chase_s_stress', label: 'Stress from work or deadlines' },
            { id: 'chase_s_fear', label: 'Fear of the unknown' },
            { id: 'chase_s_run', label: 'Wanting to escape a situation' },
          ],
        },
        {
          id: 'chase_known',
          label: 'Someone I know chases me',
          children: [
            { id: 'chase_k_conflict', label: 'Unresolved conflict' },
            { id: 'chase_k_expect', label: 'Their expectations weigh on me' },
            { id: 'chase_k_past', label: 'Something from the past returns' },
          ],
        },
        {
          id: 'chase_beast',
          label: 'A creature or animal chases me',
          children: [
            { id: 'chase_b_instinct', label: 'Raw instinct or survival fear' },
            { id: 'chase_b_shadow', label: 'A shadow part of myself' },
            { id: 'chase_b_change', label: 'Change I am avoiding' },
          ],
        },
      ],
    },
    {
      id: 'fall',
      label: 'Falling',
      children: [
        {
          id: 'fall_height',
          label: 'Falling from a height',
          children: [
            { id: 'fall_h_control', label: 'Losing control in life' },
            { id: 'fall_h_support', label: 'Support slipping away' },
            { id: 'fall_h_goal', label: 'Fear of failing a goal' },
          ],
        },
        {
          id: 'fall_sink',
          label: 'Sinking or pulled under',
          children: [
            { id: 'fall_s_emotion', label: 'Overwhelmed by emotion' },
            { id: 'fall_s_duty', label: 'Duties pulling me down' },
            { id: 'fall_s_rest', label: 'Need for rest or boundaries' },
          ],
        },
        {
          id: 'fall_slow',
          label: 'Slow endless fall',
          children: [
            { id: 'fall_sl_time', label: 'Anxiety about time passing' },
            { id: 'fall_sl_wait', label: 'Waiting for something uncertain' },
            { id: 'fall_sl_void', label: 'Feeling in a void or transition' },
          ],
        },
      ],
    },
    {
      id: 'fly',
      label: 'Flying or floating',
      children: [
        {
          id: 'fly_high',
          label: 'Flying high above',
          children: [
            { id: 'fly_h_free', label: 'Desire for freedom' },
            { id: 'fly_h_power', label: 'Feeling capable or ambitious' },
            { id: 'fly_h_detach', label: 'Detaching from daily worries' },
          ],
        },
        {
          id: 'fly_low',
          label: 'Low flight or gliding',
          children: [
            { id: 'fly_l_care', label: 'Staying close to what matters' },
            { id: 'fly_l_safe', label: 'Testing limits safely' },
            { id: 'fly_l_guide', label: 'Looking for direction' },
          ],
        },
        {
          id: 'fly_water',
          label: 'Floating on water',
          children: [
            { id: 'fly_w_calm', label: 'Need for calm' },
            { id: 'fly_w_flow', label: 'Going with the flow' },
            { id: 'fly_w_heal', label: 'Emotional healing' },
          ],
        },
      ],
    },
  ],
  zh: [
    {
      id: 'chase',
      label: '被追赶',
      children: [
        {
          id: 'chase_stranger',
          label: '陌生人追我',
          children: [
            { id: 'chase_s_stress', label: '工作或截止压力' },
            { id: 'chase_s_fear', label: '对未知的恐惧' },
            { id: 'chase_s_run', label: '想逃离某种处境' },
          ],
        },
        {
          id: 'chase_known',
          label: '熟人追我',
          children: [
            { id: 'chase_k_conflict', label: '未化解的矛盾' },
            { id: 'chase_k_expect', label: '对方的期待让我沉重' },
            { id: 'chase_k_past', label: '旧事卷土重来' },
          ],
        },
        {
          id: 'chase_beast',
          label: '动物或怪物追我',
          children: [
            { id: 'chase_b_instinct', label: '本能或生存恐惧' },
            { id: 'chase_b_shadow', label: '像自己的阴影面' },
            { id: 'chase_b_change', label: '在回避某种改变' },
          ],
        },
      ],
    },
    {
      id: 'fall',
      label: '坠落',
      children: [
        {
          id: 'fall_height',
          label: '从高处坠落',
          children: [
            { id: 'fall_h_control', label: '对生活失控' },
            { id: 'fall_h_support', label: '支撑在滑落' },
            { id: 'fall_h_goal', label: '害怕达不成目标' },
          ],
        },
        {
          id: 'fall_sink',
          label: '下沉或被拽入深处',
          children: [
            { id: 'fall_s_emotion', label: '情绪淹没' },
            { id: 'fall_s_duty', label: '责任把我往下拉' },
            { id: 'fall_s_rest', label: '需要休息或边界' },
          ],
        },
        {
          id: 'fall_slow',
          label: '缓慢无尽地下坠',
          children: [
            { id: 'fall_sl_time', label: '对时间流逝焦虑' },
            { id: 'fall_sl_wait', label: '等待不确定的事' },
            { id: 'fall_sl_void', label: '处在空窗或过渡期' },
          ],
        },
      ],
    },
    {
      id: 'fly',
      label: '飞行或漂浮',
      children: [
        {
          id: 'fly_high',
          label: '在高空飞',
          children: [
            { id: 'fly_h_free', label: '渴望自由' },
            { id: 'fly_h_power', label: '感到有能力或野心' },
            { id: 'fly_h_detach', label: '想脱离日常烦恼' },
          ],
        },
        {
          id: 'fly_low',
          label: '低空滑翔',
          children: [
            { id: 'fly_l_care', label: '贴近重要的人或事' },
            { id: 'fly_l_safe', label: '在试探边界但还算安全' },
            { id: 'fly_l_guide', label: '在寻找方向' },
          ],
        },
        {
          id: 'fly_water',
          label: '在水面漂浮',
          children: [
            { id: 'fly_w_calm', label: '需要平静' },
            { id: 'fly_w_flow', label: '顺其自然' },
            { id: 'fly_w_heal', label: '情绪疗愈' },
          ],
        },
      ],
    },
  ],
  'zh-Hant': [],
  ja: [],
  ko: [],
  de: [],
  es: [],
  vi: [],
  th: [],
}

TREES['zh-Hant'] = TREES.zh.map((root) => ({
  ...root,
  label: root.label,
  children: root.children.map((b) => ({
    ...b,
    children: b.children.map((c) => ({ ...c })),
  })),
}))
{
  const zhHant = TREES['zh-Hant']
  const r0 = zhHant[0]
  const r1 = zhHant[1]
  const r2 = zhHant[2]
  if (r0) {
    r0.label = '被追趕'
    const c1 = r0.children[1]
    const c2 = r0.children[2]
    if (c1) c1.label = '熟人追我'
    if (c2) c2.label = '動物或怪物追我'
  }
  const r1b1 = r1?.children[1]
  if (r1b1) r1b1.label = '責任把我往下拉'
  const r2b1 = r2?.children[1]
  if (r2b1) r2b1.label = '低空滑翔'
}

TREES.ja = [
  {
    id: 'chase',
    label: '追われる',
    children: [
      {
        id: 'chase_stranger',
        label: '見知らぬ人に追われる',
        children: [
          { id: 'chase_s_stress', label: '仕事や締切のストレス' },
          { id: 'chase_s_fear', label: '未知への恐れ' },
          { id: 'chase_s_run', label: '状況から逃げたい' },
        ],
      },
      {
        id: 'chase_known',
        label: '知り合いに追われる',
        children: [
          { id: 'chase_k_conflict', label: '未解決の対立' },
          { id: 'chase_k_expect', label: '相手の期待が重い' },
          { id: 'chase_k_past', label: '過去のことが蘇る' },
        ],
      },
      {
        id: 'chase_beast',
        label: '動物や怪物に追われる',
        children: [
          { id: 'chase_b_instinct', label: '本能や生存の恐れ' },
          { id: 'chase_b_shadow', label: '自分の影のような部分' },
          { id: 'chase_b_change', label: '変化を避けている' },
        ],
      },
    ],
  },
  {
    id: 'fall',
    label: '落下',
    children: [
      {
        id: 'fall_height',
        label: '高所から落ちる',
        children: [
          { id: 'fall_h_control', label: '人生のコントロール喪失' },
          { id: 'fall_h_support', label: '支えが失われる' },
          { id: 'fall_h_goal', label: '目標達成への恐れ' },
        ],
      },
      {
        id: 'fall_sink',
        label: '沈む・引きずり込まれる',
        children: [
          { id: 'fall_s_emotion', label: '感情に飲まれる' },
          { id: 'fall_s_duty', label: '義務に引きずられる' },
          { id: 'fall_s_rest', label: '休息や境界が必要' },
        ],
      },
      {
        id: 'fall_slow',
        label: 'ゆっくり落ち続ける',
        children: [
          { id: 'fall_sl_time', label: '時間への不安' },
          { id: 'fall_sl_wait', label: '不確かなものを待つ' },
          { id: 'fall_sl_void', label: '空白や移行期' },
        ],
      },
    ],
  },
  {
    id: 'fly',
    label: '飛ぶ・浮かぶ',
    children: [
      {
        id: 'fly_high',
        label: '高空飛行',
        children: [
          { id: 'fly_h_free', label: '自由への憧れ' },
          { id: 'fly_h_power', label: '能力や野心を感じる' },
          { id: 'fly_h_detach', label: '日常から離れたい' },
        ],
      },
      {
        id: 'fly_low',
        label: '低空滑空',
        children: [
          { id: 'fly_l_care', label: '大切なものに近い' },
          { id: 'fly_l_safe', label: '限界を安全に試す' },
          { id: 'fly_l_guide', label: '方向を探している' },
        ],
      },
      {
        id: 'fly_water',
        label: '水面に浮かぶ',
        children: [
          { id: 'fly_w_calm', label: '穏やかさが必要' },
          { id: 'fly_w_flow', label: '流れに身を任せる' },
          { id: 'fly_w_heal', label: '感情の癒し' },
        ],
      },
    ],
  },
]

TREES.ko = [
  {
    id: 'chase',
    label: '쫓김',
    children: [
      {
        id: 'chase_stranger',
        label: '낯선 사람이 쫓아옴',
        children: [
          { id: 'chase_s_stress', label: '업무·마감 스트레스' },
          { id: 'chase_s_fear', label: '미지에 대한 두려움' },
          { id: 'chase_s_run', label: '상황에서 벗어나고 싶음' },
        ],
      },
      {
        id: 'chase_known',
        label: '아는 사람이 쫓아옴',
        children: [
          { id: 'chase_k_conflict', label: '풀리지 않은 갈등' },
          { id: 'chase_k_expect', label: '상대의 기대가 부담' },
          { id: 'chase_k_past', label: '과거가 되돌아옴' },
        ],
      },
      {
        id: 'chase_beast',
        label: '동물·괴물이 쫓아옴',
        children: [
          { id: 'chase_b_instinct', label: '본능·생존 공포' },
          { id: 'chase_b_shadow', label: '나의 그림자 같은 면' },
          { id: 'chase_b_change', label: '변화를 피하는 중' },
        ],
      },
    ],
  },
  {
    id: 'fall',
    label: '추락',
    children: [
      {
        id: 'fall_height',
        label: '높은 곳에서 떨어짐',
        children: [
          { id: 'fall_h_control', label: '삶의 통제 상실' },
          { id: 'fall_h_support', label: '지지가 미끄러짐' },
          { id: 'fall_h_goal', label: '목표 실패 두려움' },
        ],
      },
      {
        id: 'fall_sink',
        label: '가라앉거나 끌려감',
        children: [
          { id: 'fall_s_emotion', label: '감정에 압도됨' },
          { id: 'fall_s_duty', label: '의무에 끌려내려감' },
          { id: 'fall_s_rest', label: '휴식·경계 필요' },
        ],
      },
      {
        id: 'fall_slow',
        label: '느리게 끝없이 추락',
        children: [
          { id: 'fall_sl_time', label: '시간에 대한 불안' },
          { id: 'fall_sl_wait', label: '불확실한 것을 기다림' },
          { id: 'fall_sl_void', label: '공백·전환기' },
        ],
      },
    ],
  },
  {
    id: 'fly',
    label: '비행·뜀',
    children: [
      {
        id: 'fly_high',
        label: '높이 날음',
        children: [
          { id: 'fly_h_free', label: '자유에 대한 갈망' },
          { id: 'fly_h_power', label: '능력·야망을 느낌' },
          { id: 'fly_h_detach', label: '일상 걱정에서 벗어나고 싶음' },
        ],
      },
      {
        id: 'fly_low',
        label: '저공 활공',
        children: [
          { id: 'fly_l_care', label: '중요한 것에 가까이' },
          { id: 'fly_l_safe', label: '한계를 안전하게 시험' },
          { id: 'fly_l_guide', label: '방향을 찾는 중' },
        ],
      },
      {
        id: 'fly_water',
        label: '물 위에 뜸',
        children: [
          { id: 'fly_w_calm', label: '평온 필요' },
          { id: 'fly_w_flow', label: '흐름에 맡김' },
          { id: 'fly_w_heal', label: '감정 치유' },
        ],
      },
    ],
  },
]

TREES.de = [
  {
    id: 'chase',
    label: 'Verfolgung',
    children: [
      {
        id: 'chase_stranger',
        label: 'Ein Fremder verfolgt mich',
        children: [
          { id: 'chase_s_stress', label: 'Stress durch Arbeit oder Fristen' },
          { id: 'chase_s_fear', label: 'Angst vor dem Unbekannten' },
          { id: 'chase_s_run', label: 'Einer Situation entfliehen wollen' },
        ],
      },
      {
        id: 'chase_known',
        label: 'Jemand Bekanntes verfolgt mich',
        children: [
          { id: 'chase_k_conflict', label: 'Ungelöster Konflikt' },
          { id: 'chase_k_expect', label: 'Erwartungen anderer lasten auf mir' },
          { id: 'chase_k_past', label: 'Etwas aus der Vergangenheit kehrt zurück' },
        ],
      },
      {
        id: 'chase_beast',
        label: 'Ein Wesen oder Tier verfolgt mich',
        children: [
          { id: 'chase_b_instinct', label: 'Instinkt oder Überlebensangst' },
          { id: 'chase_b_shadow', label: 'Ein Schattenteil von mir' },
          { id: 'chase_b_change', label: 'Veränderung, die ich vermeide' },
        ],
      },
    ],
  },
  {
    id: 'fall',
    label: 'Fallen',
    children: [
      {
        id: 'fall_height',
        label: 'Sturz aus der Höhe',
        children: [
          { id: 'fall_h_control', label: 'Kontrollverlust im Leben' },
          { id: 'fall_h_support', label: 'Halt entgleitet' },
          { id: 'fall_h_goal', label: 'Angst vor dem Scheitern eines Ziels' },
        ],
      },
      {
        id: 'fall_sink',
        label: 'Sinken oder hinabgezogen werden',
        children: [
          { id: 'fall_s_emotion', label: 'Von Gefühlen überwältigt' },
          { id: 'fall_s_duty', label: 'Pflichten ziehen mich hinab' },
          { id: 'fall_s_rest', label: 'Bedarf an Ruhe oder Grenzen' },
        ],
      },
      {
        id: 'fall_slow',
        label: 'Langsamer endloser Fall',
        children: [
          { id: 'fall_sl_time', label: 'Angst vor vergehender Zeit' },
          { id: 'fall_sl_wait', label: 'Warten auf Unbekanntes' },
          { id: 'fall_sl_void', label: 'Gefühl der Leere oder des Übergangs' },
        ],
      },
    ],
  },
  {
    id: 'fly',
    label: 'Fliegen oder Schweben',
    children: [
      {
        id: 'fly_high',
        label: 'Hoch oben fliegen',
        children: [
          { id: 'fly_h_free', label: 'Sehnsucht nach Freiheit' },
          { id: 'fly_h_power', label: 'Fähigkeit oder Ehrgeiz spüren' },
          { id: 'fly_h_detach', label: 'Loslösung vom Alltag' },
        ],
      },
      {
        id: 'fly_low',
        label: 'Tiefflug oder Gleiten',
        children: [
          { id: 'fly_l_care', label: 'Nahe bei dem, was zählt' },
          { id: 'fly_l_safe', label: 'Grenzen sicher ausloten' },
          { id: 'fly_l_guide', label: 'Orientierung suchen' },
        ],
      },
      {
        id: 'fly_water',
        label: 'Auf dem Wasser treiben',
        children: [
          { id: 'fly_w_calm', label: 'Ruhebedürfnis' },
          { id: 'fly_w_flow', label: 'Mit dem Strom gehen' },
          { id: 'fly_w_heal', label: 'Emotionale Heilung' },
        ],
      },
    ],
  },
]

TREES.es = [
  {
    id: 'chase',
    label: 'Persecución',
    children: [
      {
        id: 'chase_stranger',
        label: 'Un desconocido me persigue',
        children: [
          { id: 'chase_s_stress', label: 'Estrés laboral o de plazos' },
          { id: 'chase_s_fear', label: 'Miedo a lo desconocido' },
          { id: 'chase_s_run', label: 'Querer escapar de una situación' },
        ],
      },
      {
        id: 'chase_known',
        label: 'Alguien conocido me persigue',
        children: [
          { id: 'chase_k_conflict', label: 'Conflicto sin resolver' },
          { id: 'chase_k_expect', label: 'Expectativas ajenas me pesan' },
          { id: 'chase_k_past', label: 'Algo del pasado vuelve' },
        ],
      },
      {
        id: 'chase_beast',
        label: 'Una criatura o animal me persigue',
        children: [
          { id: 'chase_b_instinct', label: 'Instinto o miedo a sobrevivir' },
          { id: 'chase_b_shadow', label: 'Una parte sombría mía' },
          { id: 'chase_b_change', label: 'Cambio que evito' },
        ],
      },
    ],
  },
  {
    id: 'fall',
    label: 'Caída',
    children: [
      {
        id: 'fall_height',
        label: 'Caer desde altura',
        children: [
          { id: 'fall_h_control', label: 'Perder el control en la vida' },
          { id: 'fall_h_support', label: 'El apoyo se resbala' },
          { id: 'fall_h_goal', label: 'Miedo a fallar un objetivo' },
        ],
      },
      {
        id: 'fall_sink',
        label: 'Hundirme o me arrastran',
        children: [
          { id: 'fall_s_emotion', label: 'Abrumado por emociones' },
          { id: 'fall_s_duty', label: 'Deberes me hunden' },
          { id: 'fall_s_rest', label: 'Necesito descanso o límites' },
        ],
      },
      {
        id: 'fall_slow',
        label: 'Caída lenta interminable',
        children: [
          { id: 'fall_sl_time', label: 'Ansiedad por el tiempo' },
          { id: 'fall_sl_wait', label: 'Esperar algo incierto' },
          { id: 'fall_sl_void', label: 'Sensación de vacío o transición' },
        ],
      },
    ],
  },
  {
    id: 'fly',
    label: 'Volar o flotar',
    children: [
      {
        id: 'fly_high',
        label: 'Volar muy alto',
        children: [
          { id: 'fly_h_free', label: 'Deseo de libertad' },
          { id: 'fly_h_power', label: 'Sentirme capaz o ambicioso' },
          { id: 'fly_h_detach', label: 'Despegarme de preocupaciones' },
        ],
      },
      {
        id: 'fly_low',
        label: 'Vuelo bajo o planeo',
        children: [
          { id: 'fly_l_care', label: 'Cerca de lo importante' },
          { id: 'fly_l_safe', label: 'Probar límites con seguridad' },
          { id: 'fly_l_guide', label: 'Buscar dirección' },
        ],
      },
      {
        id: 'fly_water',
        label: 'Flotar en el agua',
        children: [
          { id: 'fly_w_calm', label: 'Necesito calma' },
          { id: 'fly_w_flow', label: 'Dejarme llevar' },
          { id: 'fly_w_heal', label: 'Sanar emocionalmente' },
        ],
      },
    ],
  },
]

TREES.vi = [
  {
    id: 'chase',
    label: 'Bị đuổi',
    children: [
      {
        id: 'chase_stranger',
        label: 'Người lạ đuổi theo',
        children: [
          { id: 'chase_s_stress', label: 'Căng thẳng công việc hoặc deadline' },
          { id: 'chase_s_fear', label: 'Sợ điều chưa biết' },
          { id: 'chase_s_run', label: 'Muốn thoát khỏi tình huống' },
        ],
      },
      {
        id: 'chase_known',
        label: 'Người quen đuổi theo',
        children: [
          { id: 'chase_k_conflict', label: 'Mâu thuẫn chưa gỡ' },
          { id: 'chase_k_expect', label: 'Kỳ vọng của họ làm nặng nề' },
          { id: 'chase_k_past', label: 'Chuyện cũ quay lại' },
        ],
      },
      {
        id: 'chase_beast',
        label: 'Thú hoặc quái vật đuổi theo',
        children: [
          { id: 'chase_b_instinct', label: 'Bản năng hoặc sợ sinh tồn' },
          { id: 'chase_b_shadow', label: 'Phần bóng tối trong mình' },
          { id: 'chase_b_change', label: 'Đang tránh một thay đổi' },
        ],
      },
    ],
  },
  {
    id: 'fall',
    label: 'Rơi',
    children: [
      {
        id: 'fall_height',
        label: 'Rơi từ trên cao',
        children: [
          { id: 'fall_h_control', label: 'Mất kiểm soát cuộc sống' },
          { id: 'fall_h_support', label: 'Chỗ dựa trượt đi' },
          { id: 'fall_h_goal', label: 'Sợ không đạt mục tiêu' },
        ],
      },
      {
        id: 'fall_sink',
        label: 'Chìm hoặc bị kéo xuống',
        children: [
          { id: 'fall_s_emotion', label: 'Ngập trong cảm xúc' },
          { id: 'fall_s_duty', label: 'Bổn phận kéo tôi xuống' },
          { id: 'fall_s_rest', label: 'Cần nghỉ hoặc ranh giới' },
        ],
      },
      {
        id: 'fall_slow',
        label: 'Rơi chậm không dứt',
        children: [
          { id: 'fall_sl_time', label: 'Lo thời gian trôi' },
          { id: 'fall_sl_wait', label: 'Chờ điều chưa chắc chắn' },
          { id: 'fall_sl_void', label: 'Cảm giác trống hoặc giai đoạn chuyển' },
        ],
      },
    ],
  },
  {
    id: 'fly',
    label: 'Bay hoặc nổi',
    children: [
      {
        id: 'fly_high',
        label: 'Bay cao',
        children: [
          { id: 'fly_h_free', label: 'Khao khát tự do' },
          { id: 'fly_h_power', label: 'Cảm thấy có năng lực hoặc tham vọng' },
          { id: 'fly_h_detach', label: 'Muốn thoát lo thường nhật' },
        ],
      },
      {
        id: 'fly_low',
        label: 'Bay thấp hoặc lướt',
        children: [
          { id: 'fly_l_care', label: 'Gần điều quan trọng' },
          { id: 'fly_l_safe', label: 'Thử giới hạn một cách an toàn' },
          { id: 'fly_l_guide', label: 'Đang tìm hướng' },
        ],
      },
      {
        id: 'fly_water',
        label: 'Nổi trên mặt nước',
        children: [
          { id: 'fly_w_calm', label: 'Cần yên tĩnh' },
          { id: 'fly_w_flow', label: 'Theo dòng chảy' },
          { id: 'fly_w_heal', label: 'Chữa lành cảm xúc' },
        ],
      },
    ],
  },
]

TREES.th = [
  {
    id: 'chase',
    label: 'ถูกไล่',
    children: [
      {
        id: 'chase_stranger',
        label: 'คนแปลกหน้าไล่ตาม',
        children: [
          { id: 'chase_s_stress', label: 'เครียดงานหรือเดดไลน์' },
          { id: 'chase_s_fear', label: 'กลัวสิ่งที่ไม่รู้' },
          { id: 'chase_s_run', label: 'อยากหนีจากสถานการณ์' },
        ],
      },
      {
        id: 'chase_known',
        label: 'คนรู้จักไล่ตาม',
        children: [
          { id: 'chase_k_conflict', label: 'ความขัดแย้งที่ยังไม่คลี่' },
          { id: 'chase_k_expect', label: 'ความคาดหวังของเขาหนักอก' },
          { id: 'chase_k_past', label: 'เรื่องเก่ากลับมา' },
        ],
      },
      {
        id: 'chase_beast',
        label: 'สัตว์หรือสิ่งประหลาดไล่ตาม',
        children: [
          { id: 'chase_b_instinct', label: 'สัญชาตญาณหรือความกลัวการอยู่รอด' },
          { id: 'chase_b_shadow', label: 'ด้านมืดในตัวฉัน' },
          { id: 'chase_b_change', label: 'หลบการเปลี่ยนแปลง' },
        ],
      },
    ],
  },
  {
    id: 'fall',
    label: 'ร่วง',
    children: [
      {
        id: 'fall_height',
        label: 'ร่วงจากที่สูง',
        children: [
          { id: 'fall_h_control', label: 'เสียการควบคุมชีวิต' },
          { id: 'fall_h_support', label: 'ที่พึ่งหลุดลื่น' },
          { id: 'fall_h_goal', label: 'กลัวทำเป้าไม่สำเร็จ' },
        ],
      },
      {
        id: 'fall_sink',
        label: 'จมหรือถูกดึงลง',
        children: [
          { id: 'fall_s_emotion', label: 'อารมณ์ท่วม' },
          { id: 'fall_s_duty', label: 'หน้าที่ดึงลง' },
          { id: 'fall_s_rest', label: 'ต้องการพักหรือขอบเขต' },
        ],
      },
      {
        id: 'fall_slow',
        label: 'ร่วงช้าไม่มีที่สิ้นสุด',
        children: [
          { id: 'fall_sl_time', label: 'วิตกกังวลเรื่องเวลา' },
          { id: 'fall_sl_wait', label: 'รอสิ่งที่ไม่แน่นอน' },
          { id: 'fall_sl_void', label: 'ช่วงว่างหรือเปลี่ยนผ่าน' },
        ],
      },
    ],
  },
  {
    id: 'fly',
    label: 'บินหรือลอย',
    children: [
      {
        id: 'fly_high',
        label: 'บินสูง',
        children: [
          { id: 'fly_h_free', label: 'อยากอิสระ' },
          { id: 'fly_h_power', label: 'รู้สึกมีพลังหรือทะเยอทะยาน' },
          { id: 'fly_h_detach', label: 'อยากหลุดจากกังวลประจำวัน' },
        ],
      },
      {
        id: 'fly_low',
        label: 'บินต่ำหรือร่อน',
        children: [
          { id: 'fly_l_care', label: 'ใกล้สิ่งที่สำคัญ' },
          { id: 'fly_l_safe', label: 'ลองขีดจำกัดอย่างปลอดภัย' },
          { id: 'fly_l_guide', label: 'กำลังหาทิศ' },
        ],
      },
      {
        id: 'fly_water',
        label: 'ลอยบนน้ำ',
        children: [
          { id: 'fly_w_calm', label: 'ต้องการความสงบ' },
          { id: 'fly_w_flow', label: 'ไปตามกระแส' },
          { id: 'fly_w_heal', label: 'เยียวยาอารมณ์' },
        ],
      },
    ],
  },
]

function resolveLocaleKey(locale: string): LocaleKey {
  if (locale === 'zh-Hant' || locale.startsWith('zh-Hant')) return 'zh-Hant'
  const base = locale.split('-')[0] ?? 'en'
  if (base === 'zh') return 'zh'
  if (base === 'ja') return 'ja'
  if (base === 'ko') return 'ko'
  if (base === 'de') return 'de'
  if (base === 'es') return 'es'
  if (base === 'vi') return 'vi'
  if (base === 'th') return 'th'
  return 'en'
}

export function getDreamPresetTree(locale: string): DreamPresetRoot[] {
  const key = resolveLocaleKey(locale)
  const base = TREES[key] ?? TREES.en
  const extra = EXTRA_THEMES_BY_LOCALE[key] ?? EXTRA_THEMES_BY_LOCALE.en
  return [...base, ...extra] as DreamPresetRoot[]
}

/** Compose a line from three preset labels for the dream text field. */
export function formatPresetSnippet(locale: string, l1: string, l2: string, l3: string): string {
  const key = resolveLocaleKey(locale)
  if (key === 'zh' || key === 'zh-Hant') {
    return `【${l1}】【${l2}】【${l3}】`
  }
  if (key === 'ja') {
    return `夢：${l1}。${l2}。理由：${l3}。`
  }
  if (key === 'ko') {
    return `꿈: ${l1}. ${l2}. 이유: ${l3}.`
  }
  if (key === 'de') {
    return `Traum: ${l1}. ${l2}. Grund: ${l3}.`
  }
  if (key === 'es') {
    return `Sueño: ${l1}. ${l2}. Motivo: ${l3}.`
  }
  if (key === 'vi') {
    return `Giấc mơ: ${l1}. ${l2}. Lý do: ${l3}.`
  }
  if (key === 'th') {
    return `ฝัน: ${l1} ${l2} เพราะ ${l3}`
  }
  return `Dream: ${l1}. ${l2}. ${l3}.`
}
