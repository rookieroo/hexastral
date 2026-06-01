/**
 * Additional common dream themes (water, teeth, exam, lost).
 * Types mirror dream-preset-catalog; kept separate to avoid circular imports.
 */
export type ExtraLeaf = { id: string; label: string }
export type ExtraBranch = { id: string; label: string; children: ExtraLeaf[] }
export type ExtraRoot = { id: string; label: string; children: ExtraBranch[] }

type Loc = 'en' | 'zh' | 'zh-Hant' | 'ja' | 'ko' | 'de' | 'es' | 'vi' | 'th'

const mk = (roots: ExtraRoot[]) => roots

function cloneExtra(roots: ExtraRoot[]): ExtraRoot[] {
  return roots.map((r) => ({
    ...r,
    children: r.children.map((b) => ({
      ...b,
      children: b.children.map((c) => ({ ...c })),
    })),
  }))
}

/** Four extra L1 themes × 3 L2 × 3 L3 — English source tree. */
const EXTRA_EN_ROOTS: ExtraRoot[] = mk([
  {
    id: 'water',
    label: 'Water / drowning',
    children: [
      {
        id: 'w_flood',
        label: 'Flooding or rising water',
        children: [
          { id: 'w_f_1', label: 'Emotions I cannot hold back' },
          { id: 'w_f_2', label: 'Life changes feel overwhelming' },
          { id: 'w_f_3', label: 'Need to release pressure' },
        ],
      },
      {
        id: 'w_drown',
        label: 'Drowning or cannot breathe',
        children: [
          { id: 'w_d_1', label: 'Burnout or exhaustion' },
          { id: 'w_d_2', label: 'Fear of losing control' },
          { id: 'w_d_3', label: 'Someone else’s demands suffocate me' },
        ],
      },
      {
        id: 'w_calm',
        label: 'Calm sea or bath',
        children: [
          { id: 'w_c_1', label: 'Longing for peace' },
          { id: 'w_c_2', label: 'Cleansing or renewal' },
          { id: 'w_c_3', label: 'Reconnecting with intuition' },
        ],
      },
    ],
  },
  {
    id: 'teeth',
    label: 'Teeth falling out',
    children: [
      {
        id: 't_all',
        label: 'Many teeth loosen or fall',
        children: [
          { id: 't_a_1', label: 'Fear of aging or losing vitality' },
          { id: 't_a_2', label: 'Worried about appearance or speech' },
          { id: 't_a_3', label: 'Powerlessness in a social situation' },
        ],
      },
      {
        id: 't_one',
        label: 'One tooth breaks or chips',
        children: [
          { id: 't_o_1', label: 'A specific worry I keep replaying' },
          { id: 't_o_2', label: 'Something “small” that feels critical' },
          { id: 't_o_3', label: 'Communication I regret or fear' },
        ],
      },
      {
        id: 't_spit',
        label: 'Spitting teeth into my hand',
        children: [
          { id: 't_s_1', label: 'Need to say something difficult' },
          { id: 't_s_2', label: 'Guilt or shame I carry' },
          { id: 't_s_3', label: 'Letting go of an old identity' },
        ],
      },
    ],
  },
  {
    id: 'exam',
    label: 'Exam or being late',
    children: [
      {
        id: 'e_test',
        label: 'Forgot to study / blank paper',
        children: [
          { id: 'e_t_1', label: 'Imposter syndrome at work' },
          { id: 'e_t_2', label: 'Fear of being judged' },
          { id: 'e_t_3', label: 'Deadlines I feel unprepared for' },
        ],
      },
      {
        id: 'e_late',
        label: 'Running late to school or work',
        children: [
          { id: 'e_l_1', label: 'Fear of disappointing others' },
          { id: 'e_l_2', label: 'Time slipping away' },
          { id: 'e_l_3', label: 'Competing priorities' },
        ],
      },
      {
        id: 'e_wrong',
        label: 'Wrong room or wrong test',
        children: [
          { id: 'e_w_1', label: 'I am in the wrong role or team' },
          { id: 'e_w_2', label: 'Values misaligned with environment' },
          { id: 'e_w_3', label: 'Searching for where I belong' },
        ],
      },
    ],
  },
  {
    id: 'lost',
    label: 'Lost or trapped',
    children: [
      {
        id: 'l_maze',
        label: 'Maze or endless corridors',
        children: [
          { id: 'l_m_1', label: 'Too many choices, no clear path' },
          { id: 'l_m_2', label: 'Analysis paralysis' },
          { id: 'l_m_3', label: 'Seeking clarity in a complex project' },
        ],
      },
      {
        id: 'l_door',
        label: 'Locked doors or wrong keys',
        children: [
          { id: 'l_d_1', label: 'Blocked opportunity' },
          { id: 'l_d_2', label: 'Secrets I cannot access' },
          { id: 'l_d_3', label: 'Self-imposed limits' },
        ],
      },
      {
        id: 'l_dark',
        label: 'Lost in the dark or fog',
        children: [
          { id: 'l_k_1', label: 'Uncertainty about the future' },
          { id: 'l_k_2', label: 'Depression or low energy' },
          { id: 'l_k_3', label: 'Waiting for a sign' },
        ],
      },
    ],
  },
])

const EXTRA_ZH_ROOTS: ExtraRoot[] = mk([
  {
    id: 'water',
    label: '水 / 溺水',
    children: [
      {
        id: 'w_flood',
        label: '洪水或水位上涨',
        children: [
          { id: 'w_f_1', label: '情绪快兜不住' },
          { id: 'w_f_2', label: '生活变化让人喘不过气' },
          { id: 'w_f_3', label: '需要释放压力' },
        ],
      },
      {
        id: 'w_drown',
        label: '溺水或喘不过气',
        children: [
          { id: 'w_d_1', label: '精疲力竭或倦怠' },
          { id: 'w_d_2', label: '害怕失控' },
          { id: 'w_d_3', label: '他人的要求让我窒息' },
        ],
      },
      {
        id: 'w_calm',
        label: '平静的海或泡澡',
        children: [
          { id: 'w_c_1', label: '渴望平静' },
          { id: 'w_c_2', label: '清洗或重新开始' },
          { id: 'w_c_3', label: '与直觉重新连接' },
        ],
      },
    ],
  },
  {
    id: 'teeth',
    label: '掉牙',
    children: [
      {
        id: 't_all',
        label: '很多牙松动或脱落',
        children: [
          { id: 't_a_1', label: '害怕变老或失去活力' },
          { id: 't_a_2', label: '担心外表或表达' },
          { id: 't_a_3', label: '在社交场合无力' },
        ],
      },
      {
        id: 't_one',
        label: '一颗牙断或崩',
        children: [
          { id: 't_o_1', label: '反复纠结一件具体的事' },
          { id: 't_o_2', label: '小事却像很关键' },
          { id: 't_o_3', label: '后悔或害怕某次沟通' },
        ],
      },
      {
        id: 't_spit',
        label: '把牙吐在手里',
        children: [
          { id: 't_s_1', label: '有难说的话要说' },
          { id: 't_s_2', label: '背负内疚或羞耻' },
          { id: 't_s_3', label: '放下旧身份' },
        ],
      },
    ],
  },
  {
    id: 'exam',
    label: '考试或迟到',
    children: [
      {
        id: 'e_test',
        label: '忘了复习 / 卷子一片空白',
        children: [
          { id: 'e_t_1', label: '职场冒名顶替感' },
          { id: 'e_t_2', label: '害怕被评价' },
          { id: 'e_t_3', label: '截止日期让人没准备好' },
        ],
      },
      {
        id: 'e_late',
        label: '赶去学校或上班迟到',
        children: [
          { id: 'e_l_1', label: '怕让别人失望' },
          { id: 'e_l_2', label: '时间溜走' },
          { id: 'e_l_3', label: '多头任务拉扯' },
        ],
      },
      {
        id: 'e_wrong',
        label: '走错教室或考错科目',
        children: [
          { id: 'e_w_1', label: '岗位或团队不合适' },
          { id: 'e_w_2', label: '价值观与环境不合' },
          { id: 'e_w_3', label: '寻找归属感' },
        ],
      },
    ],
  },
  {
    id: 'lost',
    label: '迷路或被困',
    children: [
      {
        id: 'l_maze',
        label: '迷宫或无尽走廊',
        children: [
          { id: 'l_m_1', label: '选择太多没有清晰路径' },
          { id: 'l_m_2', label: '想太多动不了' },
          { id: 'l_m_3', label: '复杂项目里求清晰' },
        ],
      },
      {
        id: 'l_door',
        label: '门锁着或钥匙不对',
        children: [
          { id: 'l_d_1', label: '机会被挡住' },
          { id: 'l_d_2', label: '触碰不到的秘密' },
          { id: 'l_d_3', label: '自己设的限制' },
        ],
      },
      {
        id: 'l_dark',
        label: '在黑暗或雾里迷路',
        children: [
          { id: 'l_k_1', label: '对未来不确定' },
          { id: 'l_k_2', label: '情绪低落或疲惫' },
          { id: 'l_k_3', label: '等待某种征兆' },
        ],
      },
    ],
  },
])

const zhHantRoots = cloneExtra(EXTRA_ZH_ROOTS)
{
  const h0 = zhHantRoots[0]
  if (h0) h0.label = '水／溺水'
  const h1 = zhHantRoots[1]
  if (h1) h1.label = '掉牙'
  const h2 = zhHantRoots[2]
  const h2b1 = h2?.children[1]
  if (h2b1) h2b1.label = '趕去學校或上班遲到'
}

const jaRoots = cloneExtra(EXTRA_EN_ROOTS)
{
  const j0 = jaRoots[0]
  if (j0) {
    j0.label = '水・溺れる'
    const j0c0 = j0.children[0]
    if (j0c0) j0c0.label = '洪水や水位上昇'
  }
  const j1 = jaRoots[1]
  if (j1) j1.label = '歯が抜ける'
  const j2 = jaRoots[2]
  if (j2) j2.label = '試験・遅刻'
  const j3 = jaRoots[3]
  if (j3) j3.label = '迷子・閉じ込め'
}

const koRoots = cloneExtra(EXTRA_EN_ROOTS)
{
  const k0 = koRoots[0]
  if (k0) k0.label = '물 / 익사'
  const k1 = koRoots[1]
  if (k1) k1.label = '이빨 빠짐'
  const k2 = koRoots[2]
  if (k2) k2.label = '시험 / 지각'
  const k3 = koRoots[3]
  if (k3) k3.label = '길 잃음 / 갇힘'
}

const deRoots = cloneExtra(EXTRA_EN_ROOTS)
if (deRoots[0]) deRoots[0].label = 'Wasser / Ertrinken'
if (deRoots[1]) deRoots[1].label = 'Zähne fallen aus'
if (deRoots[2]) deRoots[2].label = 'Prüfung / Zu spät'
if (deRoots[3]) deRoots[3].label = 'Verirrt / gefangen'

const esRoots = cloneExtra(EXTRA_EN_ROOTS)
if (esRoots[0]) esRoots[0].label = 'Agua / ahogamiento'
if (esRoots[1]) esRoots[1].label = 'Se caen los dientes'
if (esRoots[2]) esRoots[2].label = 'Examen / llegar tarde'
if (esRoots[3]) esRoots[3].label = 'Perdido / atrapado'

const viRoots = cloneExtra(EXTRA_EN_ROOTS)
if (viRoots[0]) viRoots[0].label = 'Nước / đuối nước'
if (viRoots[1]) viRoots[1].label = 'Rụng răng'
if (viRoots[2]) viRoots[2].label = 'Thi cử / trễ'
if (viRoots[3]) viRoots[3].label = 'Lạc đường / mắc kẹt'

const thRoots = cloneExtra(EXTRA_EN_ROOTS)
if (thRoots[0]) thRoots[0].label = 'น้ำ / จมน้ำ'
if (thRoots[1]) thRoots[1].label = 'ฟันหลุด'
if (thRoots[2]) thRoots[2].label = 'สอบ / สาย'
if (thRoots[3]) thRoots[3].label = 'หลงทาง / ติดขัง'

/** Labels per locale; non-en/zh locales keep English L2/L3 with localized L1 titles. */
export const EXTRA_THEMES_BY_LOCALE: Record<Loc, ExtraRoot[]> = {
  en: EXTRA_EN_ROOTS,
  zh: EXTRA_ZH_ROOTS,
  'zh-Hant': zhHantRoots,
  ja: jaRoots,
  ko: koRoots,
  de: deRoots,
  es: esRoots,
  vi: viRoots,
  th: thRoots,
}
