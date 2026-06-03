/**
 * 简体中文翻译 — 默认语言
 */

export const zh = {
  // Common
  app_name: 'HexAstral',
  loading: '加载中...',
  retry: '重试',
  back: '返回',
  cancel: '取消',
  confirm: '确定',
  delete: '删除',
  save: '保存',
  share: '分享结果',
  check_network: '请检查网络连接后重试',
  load_failed: '加载失败，请重试',
  record_not_found: '记录不存在',
  common_retry_later: '请稍后重试',
  common_done: '完成',

  // Tabs — 山医命相卜：命 (Destiny) · 卜 (Oracle)
  tab_yiching: '卜',
  tab_stellar: '命',
  tab_natal: '格',
  tab_history: '命册',
  tab_profile: '我的',

  // Onboarding
  onboarding_yiching_title: '卜卦',
  onboarding_yiching_desc:
    '摇动手机或静心观数获取排局\n保持心诚，一事请勿两占\n援引古典智慧为镜，仅供参考',
  onboarding_stellar_title: '命盘',
  onboarding_stellar_desc:
    '需知确切出生时间与出生城市\n系统将自动计算并修正真太阳时\n星盘推演性格，四柱洞见运势',
  onboarding_skip: '跳过',
  onboarding_start: '入局',

  // YiChing
  yiching_title: '周易占卜',
  yiching_question_placeholder: '在心中默念你的问题...',
  yiching_shaking: '正在摇卦...',
  yiching_thinking: 'HexAstral 推演中...',
  yiching_times_label: '占卜次数',

  // Stellar
  stellar_title: '星宫命理',
  stellar_generate: '排盘',
  stellar_birth_year: '出生年',
  stellar_gender: '性别',
  stellar_gender_male: '男',
  stellar_gender_female: '女',
  stellar_time: '时辰',
  stellar_times_label: '排盘次数',

  // History
  history_title: '历史记录',
  history_empty: '还没有记录',
  history_empty_hint: '去占卜一下吧',
  history_delete_title: '删除这条记录？',
  history_delete_oracle: '将从命册中移除该条占卜记录，且无法恢复。',
  history_delete_daily: '将从命册中移除该条每日运势记录，且无法恢复。',
  history_delete_pair:
    '将从命册中移除该条合盘记录。若已与「缘分」中的 Cosmic Bond 关联，请先删除对应 Bond。',
  history_delete_pair_conflict:
    '该合盘仍关联 Cosmic Bond。请先在「Kindred」标签删除对应 Bond 后再试。',
  history_divination: '占卜',
  history_reading: '排盘',
  history_analysis: '分析',
  history_oracle: '占卜',
  history_fate: '命运',
  history_daily_signal_title: '每日运势',
  history_method_liuyao: '六爻',
  history_date_today: '今天',
  history_date_yesterday: '昨天',
  history_view_list: '列表',
  history_view_calendar: '日历',
  history_calendar_select_day: '点选日历中有标记的日期查看记录',
  history_fate_sub_daily: '每日运势',
  history_fate_sub_readings: '缘分解读',
  history_kind_daily: '每日',
  history_kind_book: '命书',
  history_kind_pair: '合盘',
  history_kind_oracle: '易经',
  history_reading_batch_title: '深度解读 · {count} 章',
  history_reading_batch_expand: '展开章节',
  history_reading_batch_collapse: '收起',
  history_pair_untitled: '合盘记录',
  history_pair_detail_title: '合盘详情',
  history_personal_fate_title: '个人深度解读',
  history_personal_fate_chapters: '{count} 章',
  pair_section_overview: '总览',
  pair_section_day_master: '日主互动',
  pair_section_year_branch: '年支缘分',
  pair_section_month_branch: '月支生活',
  pair_section_day_branch: '日支亲密',
  pair_section_highlights: '亮点',
  pair_section_warnings: '需经营之处',
  pair_section_advice: '开运建议',
  pair_section_summary: '一句话总结',
  pair_section_locked_hint: '解锁后可见 {count} 段深入解读',

  // Profile
  profile_title: '我的',
  profile_anonymous: '无名氏',
  profile_no_email: '未绑定邮箱',
  profile_subscription: '会员状态',
  profile_free: '免费',
  profile_upgrade: '通神明之德 · 达万物之情',
  profile_upgrade_desc: '无限占卜 · 无限排盘 · 深度解读 · 无广告',
  profile_restore: '恢复购买',
  profile_sign_out: '退出登录',
  profile_sign_out_confirm: '确定要退出吗？',
  profile_sign_in_apple: '通过 Apple 登录',
  profile_sign_in_google: '通过 Google 登录',
  profile_sign_in_guest: '以访客身份体验',
  profile_sign_in_hint: '登录以保存你的记录',
  profile_birth_info: '出生信息',
  profile_delete_account: '删除账号',
  profile_delete_confirm: '此操作不可撤销，将永久删除你的所有占卜记录、排盘历史。确定要继续吗？',
  profile_delete_permanent: '永久删除',
  profile_deleted: '账号已删除',
  profile_deleted_msg: '你的所有数据已被永久移除。',
  profile_delete_failed: '删除失败',
  profile_manage_subscription: '管理订阅',
  profile_all_unlocked: '已解锁全部功能',

  // Paywall
  paywall_title: '解锁 HexAstral',
  paywall_subtitle: '选择你的方式',
  paywall_annual_cta: '订阅年费会员',
  paywall_annual_badge: '推荐',
  paywall_annual_per: '年 · Pro 深度解读',
  paywall_pack5_title: '5次占卜包',
  paywall_pack5_desc: '一次性购买 · 无需订阅',
  paywall_pack5_cta: '购买 5次占卜',
  paywall_chat5_title: '5 次追问',
  paywall_chat5_desc: '无需订阅 · 一次性购买 · $0.99',
  paywall_current_plan: '当前方案',
  paywall_free: '免费',
  paywall_upgrade: '升级 Pro',
  paywall_later: '暂不需要',
  paywall_legal_disclaimer: '订阅将自动续订直到您取消。可在 Apple ID 设置中管理。',
  paywall_or: '或者',
  paywall_restore: '恢复购买',
  paywall_pro_section: '订阅 Pro 畅享无限',

  // Onboarding subtitles
  onboarding_next: '下一步',
  onboarding_yiching_subtitle: '六爻 · 梅花',
  onboarding_meihua_title: '梅花易数',
  onboarding_meihua_subtitle: '观数起卦',
  onboarding_meihua_desc: '静心感知一个数字\n上下卦体用生克，洞见吉凶',
  onboarding_stellar_subtitle: '星宫 · 命格',
  onboarding_manifesto_title: '知天命',
  onboarding_manifesto_subtitle: 'HexAstral宣言  ·  The HexAstral Manifesto',
  onboarding_manifesto_desc:
    '“命”是你降生时的地形，“运”是你将遇的天气。\n\n我们不是递给你一份剧本，\n而是递给你一台雷达。\n\n知天命，而后胜天。',
  onboarding_manifesto_cta: '开始我的探索',
  onboarding_manifesto_cosmos: '宇宙',
  onboarding_manifesto_cosmos_body:
    '运转的星辰，行星的轨迹，时间的轮回——\n无形的能量场，弥漫于天地之间。',
  onboarding_manifesto_you: '你',
  onboarding_manifesto_you_body:
    '你降生的那一刻，宇宙为你刻下了一个独特的频率。你的能量场与宇宙的能量场，通过千丝万缕的联系，彼此呼应，生生不息。',
  onboarding_manifesto_connect: 'HexAstral，照亮你的命运与星辰之间那无形的丝线。',

  // Detail
  detail_question: '问题',
  detail_changing_lines: '变爻',
  detail_asked: '所问',
  detail_yiching_title: '占卜详情',
  detail_stellar_title: '排盘详情',
  detail_ai_reading: 'HexAstral 解读',
  detail_advice: '行动建议',

  // Hexagrams
  hexagrams_title: '六十四卦',
  hexagrams_search: '搜索卦名、拼音或关键词',
  hexagrams_not_found: '卦象不存在',
  hexagrams_empty: '未找到相关卦象',

  // Share
  share_result: '分享结果',
  share_dialog: '分享分析结果',

  // Terms
  terms_agree: '登录即同意服务条款与隐私政策',
  terms_tos: '服务条款',
  terms_privacy: '隐私政策',

  // Paywall extra
  error_page: '页面发生错误',
  detail_rate: '这次分析对你有帮助吗？',
  detail_health: '健康运势',
  detail_relationships: '感情婚姻',
  detail_career: '事业学业',
  detail_recommendations: '布局建议',

  // Error
  error_analysis: '分析失败',
  error_try_again: '请稍后重试',
  error_login_hint: '请先登录',
  error_enter_birth_year: '请输入出生年份',
  error_enter_birth_date: '请填写出生日期',
  alert_notice: '提示',

  // Alerts
  alert_upgrade_success: '升级成功',
  alert_upgrade_success_msg: '你已成为 HexAstral Pro 会员！',
  alert_restore_success: '恢复成功',
  alert_restore_success_msg: '你的会员已恢复！',
  alert_no_subscription: '未找到有效订阅',

  i_agree: '我已了解，继续',
  push_pre_title: '开启宇宙提醒',
  push_pre_body: '每逢大运交接、重要神煞当令，我们会在第一时间通知你。不错过宇宙对你写下的剧本。',
  push_pre_allow: '开启提醒',
  push_pre_skip: '稍后再说',
  offline_title: '无网络连接',
  offline_body: '请检查网络连接后重试',

  // ──────── YiChing Tab ──────────────────────────────────────────
  yiching_page_title: '卜卦',
  yiching_decision_book: '决策之书',
  yiching_encyclopedia: '六十四卦百科',
  yiching_instruction: '闭目凝神，心中默念你的问题',
  yiching_placeholder: '写下你心中的困惑...',
  yiching_voice_hint: '可使用键盘语音输入',
  yiching_start: '开始摇卦',
  yiching_shake_hint: '双手持机，诚心起卦',
  yiching_yao_progress: '{n}/6 爻',
  yiching_shake_msg_1: '天地感应中...',
  yiching_shake_msg_2: '六爻渐成，静候天机...',
  yiching_shake_done: '卦象已成',
  yiching_divining: '起卦中',
  yiching_abort_title: '中止起卦',
  yiching_abort_msg: '起卦仪式一旦开始不宜中断，确认放弃此次占卜？',
  yiching_abort_confirm: '放弃占卜',
  yiching_abort_continue: '继续起卦',
  yiching_computing: '天机运算中...',
  yiching_ai_loading: 'HexAstral 推演卦象中...',
  yiching_gua_suffix: '卦',
  yiching_ordinal: '第{n}卦',
  yiching_guaci: '卦辞',
  yiching_xiangci: '象辞',
  yiching_rating: '这次占卜对你有帮助吗？',
  yiching_again: '再来一卦',
  yiching_changing_lines: '变爻',
  yiching_yao_ordinal: '第{n}爻',
  meihua_method: '梅花易数',
  liuyao_method: '六爻摇卦',
  meihua_instruction: '静心凝神，观察此刻所见之数',
  meihua_number_label: '所见之数（可不填）',
  meihua_number_placeholder: '如：3、8、21...',
  meihua_number_hint: '起念时目见之数，不填则用当前时辰推算',
  meihua_start: '起卦',
  meihua_computing: '梅花推演中...',
  meihua_body_hex: '体卦',
  meihua_use_hex: '用卦',
  // ──────── Stellar Tab ────────────────────────────────────────────
  stellar_page_title: '命盘',
  stellar_subtitle: '输入出生信息，Hexastral 为你推演命盘',
  stellar_birth_date_label: '公历出生日期',
  stellar_date_unit_year: '年',
  stellar_date_unit_month: '月',
  stellar_date_unit_day: '日',
  stellar_year_ph: '年份',
  stellar_month_ph: '月',
  stellar_day_ph: '日',
  stellar_time_label: '出生时辰',
  stellar_time_group_night: '夜',
  stellar_time_group_day: '昼',
  stellar_time_group_eve: '暮',
  stellar_time_group_midnight: '夜半',
  stellar_city_label: '出生城市（必填）',
  stellar_name_label: '姓名（可选）',
  stellar_name_ph: '您的姓名',
  stellar_true_solar_label: '使用真太阳时',
  stellar_exact_time_ph: 'HH:MM（如 14:35）',
  stellar_city_ph: '例：北京 · 上海 · 广州',
  stellar_city_required_hint: '必填 · 自动修正真太阳时 · 自动识别南北半球',
  stellar_calendar_solar: '公历（阳历）',
  stellar_calendar_lunar: '农历（阴历）',
  stellar_lunar_year: '农历年',
  stellar_lunar_month_label: '农历月',
  stellar_lunar_day_label: '农历日',
  stellar_lunar_leap: '闰月',
  stellar_lunar_converted: '对应公历：{date}',
  stellar_start: '开始排盘',
  stellar_computing: '排布星盘...',
  stellar_ai_loading: 'HexAstral 推演命盘中...',
  stellar_twelve_palaces: '十二宫',
  stellar_ai_reading: 'HexAstral 命理解读',
  stellar_shengong: '身宫',
  stellar_daxian: '大限 {start}-{end}',
  stellar_empty_palace: '空宫（无主星）',
  stellar_rating: '这次排盘对你有帮助吗？',
  stellar_again: '再排一盘',
  stellar_interp_overall: '总体命格',
  stellar_interp_career: '事业运',
  stellar_interp_romance: '感情运',
  stellar_interp_wealth: '财运',
  stellar_interp_health: '健康',
  stellar_interp_current: '近期运势',

  // ──────── Reading Disclaimer ────────────────────────────────────
  disclaimer_title: '免责声明',
  disclaimer_body:
    '本{type}分析基于传统文化典籍推演，仅供参考娱乐，不代表科学预测。请勿将其作为人生重大决策的依据。命运掌握在自己手中，保持理性，积极面对生活。',
  disclaimer_compact: '⚠️ 仅供参考娱乐，不代表科学预测，请勿作为决策依据',
  disclaimer_type_stellar: '星宫命盘',
  disclaimer_type_natal: '命格命理',
  disclaimer_type_yiching: '周易卦象',
  disclaimer_type_general: '命理解读',

  // ──────── Profile ───────────────────────────────────────────────
  profile_language_section: '语言 / Language',
  profile_per_month: '/月',

  // ──────── Shared meta labels ────────────────────────────────────
  meta_facing: '朝向',
  meta_birth_year: '出生年',
  meta_gender: '性别',
  meta_build_year: '建造年',
  meta_note: '备注',
  meta_date: '日期',

  // ──────── Hexagram detail ───────────────────────────────────────
  hexagram_upper: '上卦',
  hexagram_lower: '下卦',
  hexagram_guaci_detail: '卦辞详解',
  hexagram_yaoci: '六爻爻辞',

  // ──────── Index / Login Screen ──────────────────────────────────
  index_brand_cn: '玄易',
  index_tagline: '周易占卜 · 星宫命理 · 合婚配对',
  index_tagline_sub: '东方智慧，赛博解读',

  // ──────── Luopan ─────────────────────────────────────────────────
  luopan_unavailable: '磁力计不可用',
  luopan_manual_hint: '请手动选择方位',
  luopan_calibrate_hint: '精度偏低，请将手机画∞字校准磁力计',
  luopan_true_north: '真北 (已校正磁偏角)',
  luopan_magnetic_north: '磁北 (未校正磁偏角)',

  // ──────── Karma Disclaimer ───────────────────────────────────────
  karma_title: '使用须知',
  karma_welcome: '欢迎使用HexAstral',
  karma_section1_title: '仅供参考，非科学预测',
  karma_section1_body:
    '本 App 提供的所有命理分析（包括星宫命理、命格命理、周易卜卦、面相手相等）均基于中华传统文化典籍的算法推演，不代表科学预测，不保证准确性，仅供文化参考与个人娱乐。',
  karma_section2_title: '不得作为决策依据',
  karma_section2_body:
    '请勿将本 App 的分析结果作为人生重大决策（包括但不限于婚姻、投资、就医、诉讼等）的依据。命运掌握在自己手中，任何预测都不能替代专业建议和个人努力。',
  karma_section3_title: '心理健康提示',
  karma_section3_body:
    '如果您正在经历心理困扰或有自我伤害的想法，请向专业支持机构寻求帮助。命理分析不是心理治疗工具，不能替代专业医疗服务。全球危机热线导航：findahelpline.com',
  karma_section4_title: '正确使用方式',
  karma_section4_body:
    '我们建议您以开放、好奇的心态探索传统命理文化，将其视为了解自我、反思人生的参考工具，而非命运的判决书。保持理性，掌控自己的人生。',
  karma_legal:
    '继续使用即表示您已阅读并理解以上免责声明，同意自行承担使用本 App 的风险，并承诺不会因分析结果向开发者主张任何法律责任。',
  karma_accept: '我已阅读并同意以上条款',

  // ──────── Stellar Detail ───────────────────────────────────────────
  detail_created_at: '创建于 {date}',
  stellar_soul_star: '命宫主星',

  // ──────── History ─────────────────────────────────────────────────

  // ──────── Divination Guard Messages ───────────────────────────────
  guard_duplicate: '此事已有卦在身，静待时机，一事不再卜。24小时后可再问。',
  guard_duplicate_semantic: '此问与近期所问相近，劝君静心思量，莫急于求卦。',
  guard_chart_stellar: '命盘已排，非大限流年不宜频繁审视。24小时后可重新排盘。',
  guard_chart: '此命盘今日已排算，天机不可重复解读。24小时后可重新生成。',
  guard_chart_hehun: '此合婚命盘今日已算，静待一日再行合参。',
  guard_daily_limit: '今日天机已泄，请于明日子时之后再行起卦。',
  guard_too_short: '请以诚心写下你的问题（至少5个字），让天地感应。',
  guard_insincere: '卜筮需诚心，戏言则卦无意。请写下你真正的困惑。',
  guard_late_night: '子时阴阳交替，此刻起卦需更静心诚意。如非紧要，建议待寅时（3:00）后再问。',
  guard_other_destiny: '他人命运自有天定，此问超出范围。因果各有天定，不可妄测。',
  guard_sensitive:
    '此问超出了我们能够解读的范围。如果您正在经历困难时刻，请寻求专业支持：findahelpline.com',

  // ──────── Sincerity Consent Modal (§六B-1) ────────────────────────
  sincerity_title: '诚心则灵',
  sincerity_subtitle: '天机不可轻泄。您即将使用 AI 辅助的传统术数解读服务。',
  sincerity_rule1: '卜必诚心——心诚则灵，戏玩则空',
  sincerity_rule2: '一事一卜——同一件事不要反复起卦',
  sincerity_rule3: '所有解读仅为参考，命运掌握在自己手中',
  sincerity_rule4: '使用本服务即表示您理解并接受以上约定',
  sincerity_accept: '我已理解，诚心求问',

  // ──────── Pre-Reading Reminder (§六B-2) ───────────────────────────
  pre_reading_title: '解读前提醒',
  pre_reading_body:
    '本结果由 AI 结合古籍知识生成，仅供参考。信则有，不信则无。命自我造，福自己求。',

  // ──────── Reading Result Footer (§六B-3) ──────────────────────────
  result_footer:
    '此解读由 AI 生成，仅供参考娱乐。所有决定由您自行做出。「善恶到头终有报，举头三尺有神明。」',

  // ──────── Guard Feedback UI ───────────────────────────────────────
  guard_blocked_title: '暂时无法求问',
  insufficient_credits_title: '追问次数不足',
  insufficient_credits_body: '追问次数已用完，购买追问次数后可继续对话。',
  buy_credits: '购买追问次数',

  // ──────── 吉凶标签 ───────────────────────────────────────────────
  fortune_great: '大吉',
  fortune_good: '吉',
  fortune_neutral: '中平',
  fortune_caution: '小凶',
  fortune_misfortune: '凶',

  // ──────── 解读前提醒 ─────────────────────────────────────────────
  yiching_before_reading_btn: '关于此解读',
  before_reading_modal_title: '解读前提醒',
  before_reading_modal_body:
    '本解读由 AI 结合古籍知识生成，仅供参考与引导，并非预言。信则有，不信则无。命自我造，福自己求。',
  before_reading_modal_confirm: '我已了解，继续',

  // ──────── 六爻摇卦指引 ─────────────────────────────────────────
  yiching_shake_guide: '双手握持手机 · 感受圆圈律动时用力摇晃 · 每次有力摇晃起一爻',

  // ──────── 各类占卜解读前引导 ──────────────────────────────────────
  before_reading_modal_body_yiching: `步骤
① 在问题栏输入你的具体问题
② 进入摇卦模式，感受屏幕圆圈律动
③ 用力摇动手机，每次有力摇动完成一爻
④ 重复 6 次，AI 自动解读六爻卦象

占卦须知
• 心诚则灵——以敬慎之心提问，戏玩或考验则卦不显
• 一事一占——同一件事一卦已足，不满意也不得重复起卦
• 24 小时不重复——同一问题当日已占，无论结果如何一律不再问
• 问题须具体——模糊的问题只得模糊的答案
• 情绪平稳再占——极度悲愤、醉酒或惊惧时暂缓
• 不占三类：① 违法乱纪之事 ② 谋害他人之事 ③ 已有确定答案之事
• 不宜问：赌博彩票结果、刑事违法行为、他人隐私、具体死亡时间
• 若患心理疾病，本工具不能替代专业心理治疗，请先寻求专业帮助
• 所有解读仅为参考，命运掌握在自己手中`,
  before_reading_modal_body_stellar: `使用步骤
① 选择出生阳历年 · 月 · 日
② 从时辰列表中选择出生时辰（每 2 小时为一辰）
③ 选择性别；可选填出生城市（用于经度修正）
④ 点击「排盘」，AI 生成命盘与十二宫解读

命盘须知
• 时辰是决定命盘格局的核心数据，直接影响十二宫分布
• 若出生时间不确定，可分别查看前后两个时辰的命盘对比
• 出生城市为可选项，填写后更精准（经度影响部分格局）
• 命盘展示人生倾向与概率，大运流年会动态调整，非固定死局

禁忌
• 不问具体死亡时间——任何体系的负责任实践者都不给出此类预测• 为他人起盘前，请获得对方知情同意
• 不以命格论断人品——命盘质量不等于个人品德
• 命盘解读不构成医疗或心理诊断；健康问题请就医
• 合盘需双方提供准确生辰数据，数据不全会影响解读精度

命盘仅供参考，人生由自己书写`,
  before_reading_modal_body_natal: `命格须知
• 命格以出生年、月、日、时四柱天干地支排列，合称四柱
• 日主（日柱天干）是分析核心，其余七字为围绕日主的环境信息
• 命格重在格局与五行平衡，非简单吉凶判断
• 大运十年一转、流年年年更替，命运是动态的
• 同命格不同命——后天地域、家庭、教育、选择皆有影响
• 命格解读不构成医疗诊断或心理咨询
• 所有解读仅供参考，命运掌握在自己手中`,
  before_reading_modal_body_synastry: `使用步骤
① 选择出生阳历日期，或点击「农历」切换农历输入
② 从时辰列表选择出生时辰（每 2 小时一辰）
③ 为每位当事人选择性别
④ 点击「排盘」，AI 对比两张命盘，生成合盘解读

命盘须知
• 时辰是命盘的核心数据，实在记不清可前后两辰各查一次对比
• 合盘需双方提供准确数据，数据不全会影响解读精度
• 合盘结论展示缘分倒向，而非固定命运；双方尽力可逆转或强化格局
• 农历输入时，若不确定是否闰月，建议查阅家谱或改用阳历

合盘通识（传统命理规则）
• 高分代表相合，低分代表摩擦点——两者均可化解，无绝对好坏
• 缘分非恒量：双方大运流年的交汇会持续动态调整命盘互动
• 一次合盘是当下快照，建议随生命阶段变化定期复盘
• 不以命格评判对方——命盘是理解工具，而非评判标签

伦理守则
• 为他人输入生辰前，请得到对方知情同意
• 解读结果不构成医疗、法律或心理建议
• 重大决策请咋询有执业资质的专业人士

命盘仅供参考，人生由自己书写
• 不问他人隐私——为第三方排盘须征得当事人同意
• 不用命盘标签化他人——格局高低不代表品德优劣，不得用于歧视
• 命盘解读不可替代医疗诊断或心理治疗
• 双人合盘须双方数据均准确，数据不足时分析局限性增加

所有解读为参考，命运掌握在自己手中`,
  profile_about: 'HexAstral 简介',
  profile_language_row: '语言',

  // ──────── About 页面 i18n ─────────────────────────────────────────
  about_intro: 'HexAstral 汇聚八字、紫微、周易、梅花四脉，以当代语言重述千年命理。',
  about_bazi_title: '八字命理',
  about_bazi_body:
    '以出生年月日时的天干地支排定「四柱」，每柱含天干与地支，共八字。五行生克制化的关系，揭示人生格局、性格底色与大运流年的起伏轨迹。HexAstral 双盘并立，命格逐层铺开，以当代语言呈现你的人生地形。',
  about_yiching_title: '周易 · 六十四卦',
  about_yiching_body:
    '《周易》是中华文明最古老的智慧典籍，距今逾五千年。以阴阳二爻组合成六十四卦象，映射天地万象与人事变迁。六爻摇卦通过当下时刻的随机性，捕捉时间能量的印记，以卦象为镜，照见问题的深层结构。',
  about_stellar_title: '星宫命理',
  about_stellar_body:
    '星宫命理源于唐末五代，以出生时辰排定十二宫命盘，每宫对应人生不同层面：命宫、财帛、事业、感情……百余颗星曜按天文规律落宫，星曜组合揭示生命蓝图。HexAstral 以古典排盘法则为基础，将繁复的星象关系化为可读可用的人生指引。',
  about_mission_title: 'HexAstral 的使命',
  about_mission_body:
    'HexAstral 让古人凝结于典籍之中的命理智慧，在掌心复活。命不是囚笼，是地图——它告诉你地形，却不替你选路。每一次起卦、排盘，都是一次与时间的对话。',
  about_manifesto_title: '核心理念',
  about_manifesto_body:
    '在东方哲学中，“命”是你降生时的地形，“运”是你将要遇的天气。我们从不认为人类是星辰无能为力的囚徒。\n\nHexAstral 使用命格与星宫双引擎，不是为了叫你臣服，而是递给你一台雷达。当风暴预警时，我们指引你避风；当顺风到来时，我们催促你扬帆。\n\n“天行健，君子以自强不息。”\n\n知天命，而后胜天。',
  about_footer: '古典智慧，现代界面',

  // SKU Detail
  sku_detail_cost: '消耗',
  sku_detail_pro_free: 'Pro 免费',
  sku_detail_access: '使用条件',
  sku_detail_pro_required: '需要 Pro',
  sku_detail_start: '开始解读',

  // Settings
  settings_unlock_hexastral: '解锁 HexAstral',
  settings_about: '关于 HexAstral',
  settings_clear_cache: '清空缓存并重置',
  settings_clear_confirm: '将清除所有本地数据并重新开始引导流程。确定吗？',

  profile_upgrade_sub: 'Pro 年度 · 深度解读',

  // ──────── 六爻摇卦界面 ────────────────────────────────────────────
  yiching_liuyao_badge: '六爻金钱卦',
  yiching_shake_initial: '屏息凝神，摇晃手机',
  yiching_shake_progress: '已得{n}爻，继续摇晃',
  yiching_shake_complete: '六爻已齐，天机呈现',
  yiching_shake_coins_hint: '三枚铜钱将随摇晃落定，共摇六次',
  yiching_hex_header: '卦　象',
  yiching_hex_changing: '有变爻 · 本卦化之卦',
  yiching_hex_static: '无变爻 · 静卦',
  yiching_yao_name_1: '初爻',
  yiching_yao_name_2: '二爻',
  yiching_yao_name_3: '三爻',
  yiching_yao_name_4: '四爻',
  yiching_yao_name_5: '五爻',
  yiching_yao_name_6: '上爻',
  coin_face_yang: '字',
  coin_face_yin: '背',
  liuyao_laoyin: '老阴',
  liuyao_shaoyang: '少阳',
  liuyao_shaoyin: '少阴',
  liuyao_laoyang: '老阳',
  liuyao_result_label: '{total}点 · {name}',

  // ─── Onboarding ──────────────────────────────────────────────────────────
  ob_hero_brand: 'HexAstral',
  ob_hero_tagline: '天星之道\n东方命理，解码未来',
  ob_hero_cta: '开启探索',
  ob_hero_disclaimer: '天星数据 · 命格 · 星宫命理 · 易经',
  ob_continue: '继续',
  ob_birthdate_q: '你出生于\n哪一天？',
  ob_birthdate_hint: '出生日期',
  ob_birthtime_q: '你出生于\n哪个时辰？',
  ob_birthtime_hint: '出生时辰 · 地支',
  ob_birthtime_skip: '不知道出生时辰',
  ob_gender_q: '你的命主\n阴阳属性？',
  ob_gender_hint: '性别 · 命主阴阳',
  ob_name_q: '你的姓名？',
  ob_name_hint: '用于占卜与命理合参 · 可跳过',
  ob_name_placeholder: '姓名',
  ob_gender_yang: 'YANG · 阳',
  ob_gender_yin: 'YIN · 阴',
  ob_gender_male: '男',
  ob_gender_female: '女',
  ob_city_q: '你出生于\n哪座城市？',
  ob_city_hint: '出生城市 · 用于计算真太阳时',
  ob_city_ph: '纽约、东京、伦敦……',
  ob_city_note: '我们将校正真太阳时，天文精度 ±1 分钟。',
  ob_city_skip: '跳过（使用近似值）',
  ob_bridge_line1: '未开口前，已感受到一室的分量',
  ob_bridge_line2: '每天与矛盾握手言和',
  ob_bridge_line3: '被尚未可解释的事物所吸引',
  ob_bridge_cred: '我们采用中国天文历法数据推算四柱，真太阳时已校正。',
  ob_animal_0: '鼠',
  ob_animal_1: '牛',
  ob_animal_2: '虎',
  ob_animal_3: '兔',
  ob_animal_4: '龙',
  ob_animal_5: '蛇',
  ob_animal_6: '马',
  ob_animal_7: '羊',
  ob_animal_8: '猴',
  ob_animal_9: '鸡',
  ob_animal_10: '狗',
  ob_animal_11: '猪',
  ob_lunar_fmt: '{year}年 ({ganZhi}{animal}年) {monthName}{dayName}',
  ob_lunar_fmt_leap: '{year}年 ({ganZhi}{animal}年) 闰{monthName}{dayName}',
  ob_auth_q: '领取你的\n天命档案。',
  ob_auth_hint: '创建账户 · 永久保存命盘',
  ob_auth_apple: '  使用 Apple 登录',
  ob_auth_google: '  使用 Google 登录',
  ob_auth_loading: '登录中…',
  ob_auth_guest: '以访客身份继续',
  ob_auth_guest_note: '访客数据不会跨设备保存。',
  ob_notify_q: '开启\n通知？',
  ob_notify_hint: '每日运势一览，第一时间知道好友关注了你。',
  ob_notify_cta: '开启通知',
  ob_notify_skip: '暂不开启',
  ob_notify_daily_title: '今日运势速览',
  ob_notify_daily_body: '顺势而为，相信你已拟好的方案。',
  ob_notify_friend_body: 'Aurora Chen 将你加为因缘联系人。',
  ob_notify_now: '刚刚',
  ob_notify_yesterday: '昨天',
  ob_today_label: '今日',
  ob_today_natal: '命主年柱',

  // Onboarding — 地支标签
  ob_branch_0: '子',
  ob_branch_1: '丑',
  ob_branch_2: '寅',
  ob_branch_3: '卯',
  ob_branch_4: '辰',
  ob_branch_5: '巳',
  ob_branch_6: '午',
  ob_branch_7: '未',
  ob_branch_8: '申',
  ob_branch_9: '酉',
  ob_branch_10: '戌',
  ob_branch_11: '亥',
  // Onboarding — 天干标签
  ob_stem_0: '甲',
  ob_stem_1: '乙',
  ob_stem_2: '丙',
  ob_stem_3: '丁',
  ob_stem_4: '戊',
  ob_stem_5: '己',
  ob_stem_6: '庚',
  ob_stem_7: '辛',
  ob_stem_8: '壬',
  ob_stem_9: '癸',
  // Onboarding — 出生时辰
  ob_time_0: '子时',
  ob_time_1: '丑时',
  ob_time_2: '寅时',
  ob_time_3: '卯时',
  ob_time_4: '辰时',
  ob_time_5: '巳时',
  ob_time_6: '午时',
  ob_time_7: '未时',
  ob_time_8: '申时',
  ob_time_9: '酉时',
  ob_time_10: '戌时',
  ob_time_11: '亥时',
  ob_time_unknown: '时辰不详',
  ob_city_search_ph: '搜索城市名称…',
  ob_city_no_results: '暂无匹配城市',

  // ── New 5-Tab Architecture ──
  tab_home: '命',
  tab_void: '卦',
  tab_report: '书',
  tab_you: '我',
  // ── Phase J · J.3.4 Discovery cards ──
  discover_section_label: '其他应用',
  discover_kindred_title: '看你和 TA 的缘',
  discover_kindred_subtitle: 'Kindred · 双盘合婚 · 缘分笺',
  discover_faceoracle_title: '面相 · 手相 AI 解读',
  discover_faceoracle_subtitle: 'FaceOracle · 一张照片 · 结构化解读',
  discover_feng_title: '看你居所的风水',
  discover_feng_subtitle: 'Fēng · 八宅 · 命卦定吉凶方位',
  discover_dreamoracle_title: '解梦',
  discover_dreamoracle_subtitle: 'DreamOracle · 解析梦境符号',
  discover_coincast_title: '摇卦 · 六爻',
  discover_coincast_subtitle: 'CoinCast · 摇出今日的卦象',
  discover_numerology_title: '梅花 · Numerology',
  discover_numerology_subtitle: 'Numerology · 数字与梅花起卦',
  void_hero_title: '自由起卦',
  void_hero_subtitle: '写下你的问题，以蓍草问天地',
  void_free_quota: '本月剩余 {{n}} 次',

  // Home
  home_marquee: '今日宇宙能量已更新',
  home_daily_fortune: '今日运势',
  home_fortune_loading: '正在解读星盘…',
  home_setup_birth: '设置出生信息',
  home_setup_birth_hint: '输入您的出生信息，解锁每日运势',
  home_add_friends: '添加好友',
  home_write_thought: '写下念头',
  home_thought_prompt: '今天有什么心事？',

  // 念头日记
  thought_title: '念头',
  thought_placeholder: '感受、疑惑、领悟 — 自由书写。',
  thought_save: '保存',
  thought_saved: '念头已保存。',

  explore_dream_title: '解梦',
  explore_dream_placeholder: '我梦见在安静的湖里游泳……',
  explore_dream_cta: '开始解读',
  explore_dream_back: '← 返回',
  explore_dream_min_hint: '请至少输入 8 个字符。',
  explore_dream_loading: '正在解读梦境…',
  explore_dream_error: '解读失败，请稍后重试。',
  explore_dream_result_title: '解梦结果',
  explore_dream_result_heading: '解读',
  explore_dream_result_empty: '未返回解读正文。',

  // Bonds — 缘分关系
  bond_dim_long_term: '长期',
  bond_dim_attraction: '吸引',
  bond_dim_communication: '沟通',
  bond_dim_emotional: '情感',
  bonds_invite_msg: '探索我们之间的星象缘分 — 下载HexAstral，录入你的生辰：',
  // Legacy friends keys

  // Void
  void_self: '自我',
  void_love: '感情',
  void_work: '事业',
  void_mood: '心境',
  void_self_q1: '现在这段时间，我该如何安顿自己？',
  void_self_q2: '我最近的内耗从何而来？',
  void_self_q3: '我身上有什么潜力还没被激活？',
  void_love_q1: '现在的感情，我需要继续等待吗？',
  void_love_q2: '我和 TA 之间有没有还没说出口的事？',
  void_love_q3: '这段关系值得我继续投入吗？',
  void_work_q1: '现在跳槽/转型，时机合适吗？',
  void_work_q2: '这个机会我该抓住，还是再等等？',
  void_work_q3: 'AI 时代，我的路应该怎么走？',
  void_mood_q1: '我最近的低落情绪从哪里来？',
  void_mood_q2: '如何从现在的疲惫感中找回能量？',
  void_mood_q3: '我的焦虑有没有在提示我什么？',

  // Shop / 坊
  shop_upgrade_pro: '升级 Pro',
  shop_upgrade_desc: '无限解读 · 深度报告 · 无广告',
  shop_readings: '解读服务',
  shop_sku_yiching: '易经占卜',
  shop_cta_unlock: '解锁',
  // Compatibility card
  shop_compatibility_label: '双人合盘',
  shop_compatibility_title: '宿命羁绊合盘',
  shop_compatibility_desc:
    '揭示两星轨间的神秘引力。深度解读你们的长期契合度、情感共鸣与前世今生的宿命羁绊。',
  shop_relationship_label: '双人关系',
  shop_relationship_title: '双人关系解读',
  shop_relationship_desc:
    '朋友、同事、上下级、兄弟姐妹、亲子 — 输入双方生辰，以星宫命格双盘揭示两人之间的真实关系能量。',
  shop_dim_long_term: '长期契合',
  shop_dim_communication: '沟通方式',
  shop_dim_attraction: '相互吸引',
  shop_dim_emotional: '情感共鸣',
  // 合盘页
  synastry_person_a: '甲方',
  synastry_person_b: '乙方',
  synastry_generate: '开始合盘分析',
  synastry_cost_note: 'Pro 会员 · 每月配额内免费',
  synastry_loading: '正在排盘合参…',
  fate_loading_step1: '排盘中…',
  fate_loading_step2: '合参八字与紫微…',
  fate_loading_step3: 'AI 解读命盘中…',
  fate_loading_step4: '即将完成…',
  synastry_reset: '重新合盘',
  synastry_page_title: '命盘分析',
  synastry_mode_single: '单人',
  synastry_mode_dual: '合盘',
  synastry_reanalyze: '重新分析',
  synastry_before_reading: '须知',
  synastry_result_fused: '综合解读',
  synastry_result_natal: '命格',
  synastry_result_stellar: '星宫',
  synastry_view_natal_detail: '查看命格详情',
  synastry_view_stellar_detail: '查看星宫详情',
  report_destiny_title: '天命解读',
  report_view_natal: '详细命格',
  report_view_stellar: '详细星宫',
  report_public_link_copied: '分享链接',
  report_revoke_public: '撤销公开',
  detail_natal_title: '命格详情',
  // Shop 分类标题
  shop_cat_divination: '占卜',
  shop_cat_destiny: '命理',

  // Shop CTA 状态
  shop_coming_soon: '即将上线',
  shop_single_price: '{price} 单次',

  // SKU detail CTA 状态
  sku_detail_single_cta: '{price} 单次解锁',
  sku_detail_purchased: '已购 · 开始解读',
  sku_detail_or_subscribe: '或订阅 Pro 无限畅读',
  sku_hero_destiny_label: '星宫 · 命格',

  // 新 SKU locale keys（与 sku-catalog.ts localePrefix 对应）
  shop_divination_label: '六爻占卜',
  shop_divination_title: '周易起卦',
  shop_divination_desc:
    '摇动手机，以天地之力成卦。HexAstral 六爻易理精准推演，洞见一事吉凶与走向。',

  shop_fate_reading_label: '天命解读',
  shop_fate_reading_title: '命理全盘',
  shop_fate_reading_desc:
    '整合命格四柱与星宫命盘，深度解析你的性格密码与人生格局，涵盖大运走势与流年运势推演。',

  // You
  you_updates: '动态',
  you_profile: '资料',
  you_chart: '星盘',
  you_saved: '收藏',
  you_settings: '设置',
  you_updates_empty: '暂无新动态',
  you_updates_recent: '最近',
  you_updates_notifications: '通知',
  you_profile_edit: '编辑资料',
  profile_real_name_label: '姓名',
  you_avatar_history: '历史头像',
  you_profile_identity_card: '命理身份',
  you_chart_birth_info: '出生信息',
  you_chart_setup: '设置出生信息',
  you_chart_full_reading: '查看完整星盘解读',
  you_chart_fate: '命理双盘',
  you_chart_destiny_reading: '命途综合解析',
  you_chart_oracle: '占卜',
  you_chart_no_reports: '暂无解读记录',
  you_chart_view: '查看报告',
  you_chart_generate: '开始排盘',
  you_chart_date_prefix: '排盘于',
  you_chart_empty_hint: '点击下方按钮生成你的命盘',
  you_chart_generate_cta: '生成命盘',
  you_chart_view_full_reading: '查看完整解读',
  you_chart_cta_generate: '生成命盘',
  you_chart_section_natal: '命格解析',
  you_chart_section_stellar: '星宫格局',
  you_saved_empty: '暂无收藏内容',
  you_settings_birth_info: '出生信息',

  // Settings sections
  settings_section_you: '我的',
  settings_name: '昵称',
  settings_name_placeholder: '设置显示名称',
  settings_real_name_placeholder: '用于占卜与命理合参',
  settings_username: '用户名',
  settings_phone: '添加手机号',
  settings_phone_hint: '让好友找到你',
  settings_phone_coming_soon: '手机号绑定即将上线',
  settings_email: '邮箱',
  settings_email_add: '添加邮箱',
  settings_email_verify_title: '验证邮箱',
  settings_email_input_placeholder: '请输入邮箱地址',
  settings_email_send_code: '发送验证码',
  settings_email_code_sent: '验证码已发送至',
  settings_email_verify_btn: '验证',
  settings_email_code_error: '验证码无效或已过期，请重试',
  settings_email_req_error: '发送失败，请稍后重试',
  settings_email_invalid: '请输入有效的邮箱地址',
  settings_email_resend: '更换邮箱 / 重新发送',
  settings_profile_photo: '头像',
  settings_chart_public: '公开星盘',
  settings_chart_public_desc: '开启后，你的命盘将通过个人主页链接向他人可见。',
  share_public_chart: '分享公开命盘',
  settings_username_required_for_public: '请先设置用户名，再公开星盘',
  profile_save_failed_title: '保存失败',
  profile_save_failed_body: '资料未能同步到服务器，请检查网络后重试。',
  settings_section_chart: '星盘信息',
  settings_birth_date: '出生日期',
  settings_birth_time: '出生时辰',
  settings_birth_place: '出生地点',
  settings_birth_calendar_solar: '公历',
  settings_birth_calendar_lunar: '农历',
  settings_birth_lunar_note: '农历换算即将上线，请暂时输入公历日期',
  settings_palm_reading: '手相录入',
  settings_palm_reading_hint: '上次记录',
  settings_palm_reading_none: '未录入',
  settings_section_records: '记录',
  settings_history_divination: '占卜记录',
  settings_history_daily_signals: '每日运势记录',
  settings_history_deep_reading: '合盘解读',
  settings_section_preferences: '偏好设置',
  settings_notifications: '通知',
  settings_theme: '主题',
  settings_theme_system: '跟随系统',
  settings_theme_light: '浅色',
  settings_theme_dark: '深色',
  settings_section_account: '账户',
  settings_section_support: '支持',
  settings_share_invite: '邀请好友',
  settings_feedback: '反馈与建议',
  settings_faq: '常见问题',
  settings_rate_app: '评价 App',
  settings_privacy_policy: '隐私政策',
  settings_terms_of_service: '服务条款',
  settings_version: '版本',

  // Notifications screen
  notif_hint: '选择你希望在此设备上接收的通知类型，随时可修改。',
  toggle_on: '开启',
  toggle_off: '关闭',
  notif_daily_fortune: '每日运势',
  notif_daily_fortune_desc: '每天一条个性化日运推送',
  notif_lucky_window: '吉期将至',
  notif_lucky_window_desc: '当流年大运出现利好之窗，第一时间通知你',
  notif_chart_transit: '流年大运切换',
  notif_chart_transit_desc: '新岁气场转换，星盘能量格局更新',
  notif_fate_report_ready: '命运报告已生成',
  notif_fate_report_ready_desc: '你的星宫·命格·流年综合报告已完成，速来查阅',

  // Bonds — contacts & detail
  contacts_loading: '加载中...',
  bond_detail_dimensions: '契合维度',
  bond_detail_archetype_label: '关系原型',
  archetype_cat_harmony: '和谐',
  archetype_cat_tension: '张力',
  archetype_cat_growth: '成长',
  archetype_cat_karmic: '业力',
  archetype_cat_volatile: '动荡',
  trial_badge: '试用中',
  trial_days_remaining: '试用剩余 {days} 天',
  trial_expired: '试用期已结束',
  chat_trial_daily_limit: '试用期每日 AI 对话次数已达上限',
  bond_delete_action: '删除',
  optional: '可选',
  coins: '铜钱',

  // DDL Welcome
  ddl_welcome_title: '欢迎回来',
  ddl_welcome_personal: '你的「{dayMaster}」命盘已就绪',
  ddl_welcome_pairing: '你们的契合度：{score} 分',
  ddl_welcome_generic: '你的解读已还原',
  ddl_welcome_subtitle: '已同步网页端数据，继续你的命理之旅。',
  ddl_welcome_cta: '查看我的命盘',

  // ─── Gender ───
  gender_male: '男',
  gender_female: '女',

  // ─── Natal component labels ───
  natal_four_pillars: '四柱',
  natal_pillar_year: '年柱',
  natal_pillar_month: '月柱',
  natal_pillar_day: '日柱',
  natal_pillar_hour: '时柱',
  natal_pillar_year_short: '年',
  natal_pillar_month_short: '月',
  natal_pillar_day_short: '日',
  natal_pillar_hour_short: '时',
  natal_day_master: '日主',
  natal_day_master_strength: '日主强弱',
  natal_primary_pattern: '主格局',
  natal_secondary_pattern: '辅格：',
  natal_favorable_god: '用神',
  natal_unfavorable_god: '忌神',
  natal_ten_gods_distribution: '十神分布',
  natal_ai_reading: 'AI 解读',
  natal_overview: '总论',
  natal_personality: '性格',
  natal_career: '事业',
  natal_relationship: '感情',
  natal_wealth: '财运',
  natal_health: '健康',
  natal_yearly_tips: '流年提示',
  natal_advice: '开运建议',
  natal_favorable_label: '喜',

  natal_tab_empty_body: '还没有命盘。请补充出生时辰与城市以获得更准确的四柱，然后生成命盘。',
  natal_tab_empty_birth_cta: '编辑出生资料',
  natal_tab_generate_cta: '立即生成命盘',
  natal_tab_generate_error: '生成失败，请检查出生资料或稍后再试。',
  natal_tab_parse_error: '无法解析命盘数据。',

  // ─── Stellar component labels ───
  stellar_body_star: '身主',

  stellar_tab_empty_body: '还没有紫微命盘。请补充出生城市以校准宫位，然后生成星盘。',
  stellar_tab_empty_birth_cta: '编辑出生资料',
  stellar_tab_generate_cta: '立即生成星盘',
  stellar_tab_generate_error: '生成失败，请检查出生资料或稍后再试。',
  stellar_tab_parse_error: '无法解析星盘数据。',

  // ─── Fate tab ───
  fate_hero_generating: '正在为你生成命盘…',
  fate_today_golden_line: '今日金句',
  fate_today_golden_line_pending: '正在为你拈一句金句…',
  home_today_day_pillar: '今日干支',
  home_today_solar_term: '当前节气',
  home_today_zodiac: '本年生肖',
  home_today_date: '日期',
  home_today_weekday: '星期',
  home_today_moon_phase: '月相',
  moon_phase_new: '新月',
  moon_phase_waxing_crescent: '娥眉月',
  moon_phase_first_quarter: '上弦月',
  moon_phase_waxing_gibbous: '盈凸月',
  moon_phase_full: '满月',
  moon_phase_waning_gibbous: '亏凸月',
  moon_phase_last_quarter: '下弦月',
  moon_phase_waning_crescent: '残月',
  you_profile_quick_access: '快捷查看',
  you_profile_quick_natal: '八字',
  you_profile_quick_stellar: '紫微',
  you_profile_quick_full_reading: '完整解读',
  fate_hero_guest_banner: '登录后解锁 AI 命盘解读',
  fate_hero_guest_cta: '登录',
  fate_hero_retry_title: '生成超时，请重试',
  fate_hero_retry_cta: '重试',
  fate_hero_empty_title: '开启你的命运之旅',
  fate_hero_empty_cta: '前往排盘',
  fate_hero_view_natal: '查看命格详情',
  fate_hero_view_stellar: '查看星宫详情',
  fate_essence_title: '双盘合参',
  fate_dimension_career: '事业',
  fate_dimension_wealth: '财富',
  fate_dimension_love: '感情',
  fate_dimension_health: '健康',
  fate_dimension_locked_hint: '解锁查看',
  fate_premium_monthly: '本月运势',
  fate_premium_decade: '大运转折',
  fate_premium_huaji: '化忌警示',
  fate_unlock_full_report: '解锁完整命书',
  fate_upgrade_pro: '升级 Pro',
  fate_insight_career: '事业',
  fate_insight_wealth: '财运',
  fate_insight_relationship: '感情',
  fate_insight_health: '健康',

  // ─── Fate Static Card (Free 用户全静态命盘) ───
  static_section_title: '命盘速读',
  static_section_subtitle: '全部由你的真太阳时排盘计算，无 AI 推断',
  static_label_day_master: '日主',
  static_label_geju: '格局',
  static_label_favorable: '喜用神',
  static_label_strength: '日主旺衰',
  static_label_soul_star: '命主',
  static_label_body_star: '身主',
  static_label_five_class: '五行局',
  static_label_current_dayun: '当前大运',
  static_label_dayun_timeline: '大运推演',
  static_label_now: '当前',
  static_dayun_age_range: '{start}–{end} 岁',
  static_unlock_ai_hint: '解锁 AI 综合解读 →',

  // ─── 阅读模式切换 ───
  reading_mode_beginner: '入门',
  reading_mode_beginner_desc: '通俗解读 · 术语注解',
  reading_mode_expert: '专家',
  reading_mode_expert_desc: '原文术语 · 深度分析',
  reading_mode_expert_locked: '专家模式为 Pro 专属',

  // ─── Hook — 天干 (Day Master Stem) ───
  hook_stem_jia_one_liner: '参天之木，破土向天',
  hook_stem_jia_tag: '秩序的开拓者',
  hook_stem_yi_one_liner: '藤蔓蜿蜒，柔而不折',
  hook_stem_yi_tag: '温润的编织者',
  hook_stem_bing_one_liner: '烈日当空，万物皆明',
  hook_stem_bing_tag: '光芒的布道者',
  hook_stem_ding_one_liner: '烛火摇曳，照亮暗夜',
  hook_stem_ding_tag: '幽微的洞察者',
  hook_stem_wu_one_liner: '厚德载物，不动如山',
  hook_stem_wu_tag: '大地的守护者',
  hook_stem_ji_one_liner: '沃土无声，万物自生',
  hook_stem_ji_tag: '隐忍的滋养者',
  hook_stem_geng_one_liner: '百炼成钢，削铁如泥',
  hook_stem_geng_tag: '刚毅的执行者',
  hook_stem_xin_one_liner: '秋露凝霜，锋芒内敛',
  hook_stem_xin_tag: '精致的雕琢者',
  hook_stem_ren_one_liner: '大江东去，一往无前',
  hook_stem_ren_tag: '奔涌的先驱者',
  hook_stem_gui_one_liner: '春雨润物，无声而化',
  hook_stem_gui_tag: '沉静的感知者',

  // ─── Hook — 星宫主星 (Soul Palace Major Star) ───
  hook_star_stellar_tag: '星宫坐命：天生的王者',
  hook_star_tianji_tag: '天机坐命：运筹帷幄的谋士',
  hook_star_taiyang_tag: '太阳坐命：燃烧自我的光源',
  hook_star_wuqu_tag: '武曲坐命：铁血柔情的将帅',
  hook_star_tiantong_tag: '天同坐命：云淡风轻的福星',
  hook_star_lianzhen_tag: '廉贞坐命：桀骜不驯的孤狼',
  hook_star_tianfu_tag: '天府坐命：统御全局的宰相',
  hook_star_taiyin_tag: '太阴坐命：月华流转的智者',
  hook_star_tanlang_tag: '贪狼坐命：燃烧边界的探索者',
  hook_star_jumen_tag: '巨门坐命：洞穿真相的辩者',
  hook_star_tianxiang_tag: '天相坐命：斡旋乾坤的能臣',
  hook_star_tianliang_tag: '天梁坐命：悲天悯人的长者',
  hook_star_qisha_tag: '七杀坐命：逆天改命的孤勇者',
  hook_star_pojun_tag: '破军坐命：秩序的破坏者',

  // ── Ritual Loading ──
  ritual_aligning_stems: '正在对齐天干地支...',
  ritual_mapping_palaces: '载入星宫十二宫...',
  ritual_synthesizing: '双盘合参，演算命运...',

  // ── Hero CTA ──
  hero_generate_reading: '解锁命运全解',
  hero_view_full_reading: '查看完整解读',
  fate_hero_open_loop: '命盘深处，尚有未解之谜',
  fate_tab_upgrade_hint: '升级解锁全部洞见',

  // ── Synastry push ──
  synastry_push_resonance_title: '今日缘分感应强烈 ✨',
  synastry_push_resonance_body: '你们的命格今日高度共振，适合深度交流与心灵连结。',
  synastry_push_tension_title: '今日因果课题显现',
  synastry_push_tension_body: '今日流日与缘分产生张力，是彼此成长的契机——保持倾听与耐心。',
  tab_me: '我',

  // ── Almanac (日历通书) ──
  almanac_section_title: '通书',
  almanac_rating: '运势',
  almanac_lucky_color: '吉色',
  almanac_lucky_direction: '吉方',
  almanac_dos: '今日宜',
  almanac_donts: '今日忌',
  almanac_relation_sheng_wo: '生我 · 大吉',
  almanac_relation_ke_wo: '克我 · 注意',
  almanac_relation_wo_sheng: '我生 · 平',
  almanac_relation_wo_ke: '我克 · 平',
  almanac_relation_tonglei: '同类 · 吉',

  // ── Fortune paywall ──
  fortune_locked_preview: '升级 Pro 解锁今日完整运势解读',
  fortune_unlock_pro: '升级 Pro',

  // ── Tone preference ──
  tone_preference_label: 'AI 解读语气',
  tone_gentle_label: '温和',
  tone_straight_label: '直白',
  tone_poetic_label: '诗意',

  // ── Bond relationship stage ──

  // ── Life Log ──
  life_log_title: '人生日志',
  life_log_empty: '还没有记录任何人生节点',
  life_log_add_first: '记录第一个节点',
  life_event_new_title: '新增事件',
  life_event_date_label: '事件日期',
  life_event_type_label: '类型',
  life_event_title_label: '标题',
  life_event_title_placeholder: '简要描述这个节点',
  life_event_title_required: '请输入标题',
  life_event_desc_label: '详情（可选）',
  life_event_desc_placeholder: '记录当时的心情、语境或任何细节…',
  life_event_ai_interpretation: 'AI 命理解读',
  life_event_delete_confirm_title: '删除事件',
  life_event_delete_confirm_msg: '确定要删除这条记录？',
  life_event_type_career: '事业',
  life_event_type_relationship: '感情',
  life_event_type_health: '健康',
  life_event_type_travel: '旅行',
  life_event_type_education: '学业',
  life_event_type_family: '家庭',
  life_event_type_other: '其他',

  // ── P0 Fortune Paywall ──
  fortune_paywall_hook_desc: '今日命理已就绪 — 解锁全文，掌握先机',
  fortune_social_proof: '已有 12,000+ 用户每日查看运势',

  // ── P1A Onboarding Share ──
  feedback_prompt: '这次解读准确吗？',
  feedback_accurate: '准',
  feedback_ok: '还行',
  feedback_off: '偏差',

  // ── P2C Timeline Stamp ──
  timeline_stamp_cta: '验证此事件',
  timeline_verify_alert_title: '印证已记录',
  timeline_verify_alert_msg: '你的反馈帮助命理 AI 更了解你。',

  // ── Chat — AI 大师对话 ──
  chat_title: 'Ask HexAstral',
  chat_placeholder: '询问本次解读…',
  chat_powered_by_ai: 'Powered by AI',
  chat_send: '发送',
  chat_pro_unlimited: 'Pro 会员 · 每月配额内追问',
  chat_insufficient: '✦ 不足，请充值',
  chat_loading: '大师正在解读…',
  chat_error: '发送失败，请重试',
  chat_empty_hint: '请 HexAstral 深度解读本次报告',
  chat_cta_label: 'Ask HexAstral',
  home_greeting_named: '你好，{name}',
  home_greeting_anon: '欢迎回来',
  chat_cta_desc: '追问 AI · 深入解读',

  // ── Reading for Others ──
  reading_for_others_title: '为他人生成命盘',
  reading_for_others_subtitle: '填写对方生辰，生成命盘并发送邮件邀请领取',
  reading_for_others_recipient_name: '姓名（选填）',
  reading_for_others_recipient_name_ph: '对方姓名',
  reading_for_others_email: '邮箱',
  reading_for_others_email_ph: '对方邮箱',
  reading_for_others_gender: '性别',
  reading_for_others_male: '男',
  reading_for_others_female: '女',
  reading_for_others_birthdate: '出生日期',
  reading_for_others_birthtime: '出生时辰',
  reading_for_others_city: '出生地（选填）',
  reading_for_others_city_ph: '城市',
  reading_for_others_type: '命盘类型',
  reading_for_others_type_fate: '命途合参（命格 × 星宫）',
  reading_for_others_type_natal: '命格命理',
  reading_for_others_type_stellar: '星宫命理',
  reading_for_others_pro_included: 'Pro 专属功能（免费使用）',
  reading_for_others_pro_required: '需要 Pro 会员',
  reading_for_others_generate: '生成并发送邮件',
  reading_for_others_success_title: '命盘已生成',
  reading_for_others_success_msg: '已发送邮件通知，对方下载 App 后绑定该邮箱即可领取。',
  reading_for_others_error: '生成失败，请重试',
  reading_for_others_entry: '为他人生成命盘',
  reading_for_others_entry_desc: '替朋友、家人查询命盘并发送',

  // ── Pro 配额 ───────────────────────────────────────────────
  quota_synastry: '合盘',
  quota_divination: '占卜',
  quota_chat_pool: '追问',
  quota_used: '已用 {used}/{limit}',
  quota_remaining: '剩余 {remaining}',
  quota_overflow_notice: '配额已用完',
  quota_monthly_reset: '每月自动重置',

  // ── Pro 专属 AI 日历 ──────────────────────────────────────
  almanac_pro_title: '今日深度日历',
  almanac_pro_tagline_label: '今日主题',
  almanac_pro_career: '事业',
  almanac_pro_wealth: '财运',
  almanac_pro_love: '感情',
  almanac_pro_health: '状态',
  almanac_pro_time_hint: '最佳时辰',
  almanac_pro_lucky_color: '吉色',
  almanac_pro_caution: '今日忌',
  almanac_pro_bonds_title: '羁绊今日洞察',
  almanac_pro_bond_tip: '建言',
  almanac_pro_locked_title: 'Pro 专属深度日历',
  almanac_pro_locked_desc: 'AI 个性化命格日历 · 羁绊关系洞察 · 每日更新',
  almanac_pro_unlock_cta: '解锁 Pro 查看',

  // ── 聊天追问 ─────────────────────────────────────────────
  chat_free_remaining: '免费追问剩余 {remaining} 条',
  chat_pool_remaining: '本月追问池剩余 {remaining} 条',
  chat_free_badge: '免费',
  chat_brand_subtitle: 'HexAstral · 东方珄琅的 AI',
  chat_prompt_career: '事业方向如何？',
  chat_prompt_love: '感情走向如何？',
  chat_prompt_money: '近期财运怎样？',
  chat_prompt_recent: '近期需要注意什么？',

  // ── 通知升级 Paywall 文案（替换旧版本） ─────────────────
  paywall_benefit_1: 'AI 个人日历 · 五维深度解读 · 羁绊今日洞察',
  paywall_benefit_2: '无限合盘 · 无限占卜 · 每次解读 5 条免费追问',
  paywall_benefit_3: '优先 AI 模型 · 无广告 · 优先新功能',

  // ── Paywall 对比表 ──────────────────────────────────────
  paywall_vs_free: '免费',
  paywall_vs_pro: 'Pro',
  paywall_vs_almanac: '每日运势',
  paywall_vs_synastry: '合盘',
  paywall_vs_divination: '占卜',
  paywall_vs_chat: '命盘答疑',
  paywall_vs_bonds: '羁绊洞察',
  paywall_vs_push: '推送通知',
  paywall_vs_basic: '基础',
  paywall_vs_ai_deep: 'AI 深度',
  paywall_vs_per_reading: '5次/解读',
  paywall_vs_ai_personal: 'AI 个性化',
  paywall_vs_monthly_3: '3次/月',
  paywall_vs_synastry_free: '3个关系',
  paywall_vs_divination_free: '3次/月',
  paywall_vs_chat_free: '2次/解读',
  paywall_vs_chat_pro: '10次/解读 + 月度池',
  paywall_vs_bonds_free: '基础',
  sys_error: 'System Error',
  ziwei_shengong: 'Body Palace',
  ziwei_daxian: 'Decadal %{start}-%{end}',
  ziwei_empty_palace: 'Empty Palace',

  // ── 出生信息修改权限 ──────────────────────────────────────
  birth_change_gate_title: '更改出生信息',
  birth_change_gate_desc: '更改出生信息将重新生成全部命盘，此操作需升级 Pro 后方可进行。',

  // ── 年度解读标题 ──────────────────────────────────────────
  fate_year_overview: '年度总论',
  fate_monthly_highlights: '月份重点',
  fate_personality_core: '人格核心',
  fate_decade_arc: '本运十年',
  fate_hidden_traits: '你不知道的自己',
  fate_shensha_warnings: '神煞警示',
  fate_severity_high: '高',
  fate_severity_medium: '中',
  fate_severity_low: '低',

  // ── 紫微宫位描述 ──────────────────────────────────────────
  stellar_palace_ming_desc: '统摄先天个性、人生走向与整体命格',
  stellar_palace_xiongdi_desc: '反映兄弟姐妹缘分及同辈人际关系',
  stellar_palace_fuqi_desc: '揭示感情缘分、婚姻模式与伴侣特质',
  stellar_palace_zinv_desc: '关联子嗣缘分、创造力与晚年助力',
  stellar_palace_caibo_desc: '代表财富结构、进财方式与理财格局',
  stellar_palace_jie_desc: '显示身体健康状态与应对压力的方式',
  stellar_palace_qianyi_desc: '代表外出运势、迁居机遇与对外交往',
  stellar_palace_jiaoyou_desc: '映照朋友圈质量、贵人助力与社交格局',
  stellar_palace_guanlu_desc: '显示事业发展潜力、工作成就与社会地位',
  stellar_palace_tianzhai_desc: '关联家庭环境、不动产积累与安全感',
  stellar_palace_fude_desc: '象征精神世界、享乐态度与深层内心欲望',
  stellar_palace_fumu_desc: '反映与父母、师长及上级的缘分与互动',
  reading_lang_mismatch: '此解读以 {lang} 生成',
  reading_lang_regenerate: '以当前语言重新生成',

  // Profile · 命理签名 / 此刻 / 足迹 / 公开
  you_signature_loading: '正在生成命理签名…',
  you_signature_empty: '排盘后将自动生成你的命理签名',
  you_signature_pro_hint: '解锁 Pro 可切换签名风格并自定义语调',
  you_signature_apply: '生成',
  you_signature_style_title: '签名风格',
  you_signature_style_classical: '古典 · 四字',
  you_signature_style_sharp: '毒舌 · 短评',
  you_signature_style_poetic: '诗意 · 现代',
  you_signature_style_custom: '自定义',
  you_signature_lang_label: '解释风格',
  you_signature_lang_term: '术语',
  you_signature_lang_plain: '白话',
  you_signature_custom_placeholder: '描述你想要的语调，如：像深夜电台 DJ 一样温柔',
  you_present_moment_title: '此刻',
  you_present_moment_view_full: '查看完整命盘',
  you_recent_activity_title: '足迹',
  you_recent_activity_empty: '还没有阅读记录',
  you_recent_activity_kind_fate: '命盘',
  you_recent_activity_kind_yiching: '易经',
  you_visibility_section_title: '公开内容',
  you_visibility_signature: '命理签名',
  you_visibility_bazi: '八字命盘',
  you_visibility_ziwei: '紫微命盘',
  you_visibility_dayun: '大运流年',
  you_visibility_basic: '基本资料',
  you_visibility_plain_intro: 'HexAstral解读',
  you_visibility_help_a11y: '说明',
  you_visibility_basic_help:
    '开启后，公开页 hexastral.com/u/你的用户名 可展示头像、昵称、@用户名、加入 HexAstral 的年份以及累计解读次数。',
  you_visibility_signature_help: '开启后，访客可在公开页与链接预览中看到你的命理签句及说明。',
  you_visibility_plain_intro_help:
    '开启后，命书第一章的节选文字可能出现在公开页「HexAstral解读」区域。',
  you_visibility_bazi_help:
    '开启后，在数据可用时，公开页可展示八字四柱结构（由命盘接口提供）。网页不展示公历出生日期与出生城市。',
  you_visibility_ziwei_help: '开启后，在可成功排盘时，公开页可展示紫微斗数十二宫命盘网格。',

  // Phase 5/6/7 deep refactor — added 2026-04-29
  fate_signature_loading: '推算命格中…',
  signal_today_label: '今日信号',
  signal_energy_label: '能量',
  signal_energy_rising: '上升',
  signal_energy_steady: '平稳',
  signal_energy_productive: '高产',
  signal_energy_guarded: '谨慎',
  signal_energy_volatile: '动荡',
  signal_today_lens_label: '今日视角',
  signal_upgrade_label: '解锁完整信号',
  signal_watch_for_label: '留心',
  signal_lucky_hour: '吉时',
  signal_lucky_direction: '吉方',
  signal_lucky_color: '吉色',
  signal_lucky_advice: '建议',
  signal_why_label: '为什么？',
  signal_why_locked_pro: '升级 Pro 解锁推理链',
  signal_loading: '正在生成今日信号…',
  signal_empty: '暂无今日信号，请稍后再试',
  signal_error: '今日信号生成失败，请稍后重试',
  signal_retry: '重试',
  signal_no_chart_title: '尚未排盘',
  signal_no_chart_desc: '完成你的命盘后，每天的信号会自动生成。',
  signal_no_chart_cta: '前往排盘',
  today_hexagram_label: '今日卦象',
  quick_ask_hexastral: '问',
  quick_ask_caption: '向 HexAstral 提问',
  quick_cast_hexagram: '卦',
  quick_cast_caption: '起卦问事',
  quick_bond: 'Kindred',
  quick_bond_caption: '连接他人',
  quick_actions_label: '快捷入口',
  fate_actions_section_label: '入口',
  fate_report_digest_title: '命书摘要',
  fate_recent_section_title: '最近',
  fate_recent_empty_hint: '你的占卜记录将在此显示',
  fate_recent_see_all: '查看全部',
  fate_home_quiet_hint: '占卜与每日运势会出现在「最近」与历史记录中。',
  quick_status_remaining: '剩余 {n}',
  quick_status_pro_cast: '今日 {today} · 本月 {month}',
  quick_status_pro_chat: '追问池 {remaining}/{limit}',
  quick_status_pro_pair: '合盘 {remaining}/{limit}',
  welcome_primer_title: '命运主页',
  welcome_primer_subtitle: '先从问、卦、缘开始，逐步建立你的每日节奏。',
  seven_day_trail_label: '七日轨迹',
  seven_day_trail_empty: '这七天还未留下记录，明日起渐渐亮起',
  seven_day_trail_pro_locked: '升级 Pro 查看完整历史',
  onboarding_step_value_hook_title: '在 90 秒内看到你的第一份命盘',
  onboarding_continue: '继续',
  onboarding_birthtime_precise: '我知道精确出生时间',
  onboarding_birthtime_shichen: '只记得大致时辰',
  onboarding_birthtime_unknown: '不知道出生时间',
  onboarding_reveal_cta: '听我细说 →',
  onboarding_auth_gate_title: '保存你的第一份命盘',
  onboarding_ai_reveal_loading: '正在生成你的首份解读…',
  onboarding_push_opt_in_title: '每日清晨收到一句话提醒',
  onboarding_push_opt_in_enable: '启用通知',
  onboarding_push_opt_in_skip: '稍后再说',
  report_toc_title: '命书目录',
  report_chapter_versions: '版本',
  report_ch1_title: '命格',
  report_ch2_title: '维度',
  report_ch3_title: '紫微',
  report_ch4_title: '流年',
  report_ch5_title: '隐藏特质',
  report_ch6_title: '行动手册',
  report_regen_requires_pro_title: '命盘已变更',
  report_regen_requires_pro_body:
    '本章基于您之前的命盘生成。变更八字/紫微相关出生后重新撰写命书需要订阅 HexAstral Pro。',
  report_chapter_pro_locked: '升级 Pro 解锁本章',
  report_history_drawer_title: '历史版本',
  report_refresh_button: '换个角度看',
  report_trust_ledger: '此为模型解读，仅作镜照参考',
  report_loading: '撰写中…',
  report_summary: '本章核心',
  report_sections: '展开细节',
  report_highlights: '亮点',
  report_watch_outs: '留意',
  report_no_current: '尚未生成',
  report_unlock_pro_cta: '升级 Pro',
  report_pro_hint: '升级 Pro 可“换个角度重写”并查看历史版本',
  report_history_empty: '暂无历史版本',
  report_tap_back_latest: '轻触返回最新版',
  report_perspective_placeholder: '想从哪个角度重写？',
  report_perspective_submit: '生成新版本',
  report_perspective_cancel: '取消',
  report_chapter_locked_body: '本章节为 Pro 专属，升级后可查看完整解读、版本历史与重写功能。',
  report_generated_at: '生成于',
  report_model_label: '模型',
  report_ch4_current_dayun: '当前大运',
  report_ch4_focus_one_thing: '当前聚焦',
  report_ch5_dormant_pattern: '潜伏模式',
  report_ch6_immediate_action: '立即行动',
  report_ch6_timeframe_today: '今天',
  report_ch6_timeframe_this_week: '本周',
  report_ch6_thirty_day_focus: '30 天行动焦点',
  report_ch6_ninety_day_direction: '90 天方向',
  report_ch6_delay_for_now: '暂缓事项',
  report_style_preset_label: '语气预设',
  report_style_preset_direct: '直白',
  report_style_preset_coach: '教练',
  report_style_preset_gentle: '温和',
  report_style_seed_placeholder: '可选补充语气（例如：更利落、更克制）',
  report_regen_chat_hint: '这里用于调整角度与语气；细节追问建议在 Ask HexAstral 对话中继续。',
  report_version_label: '第 {n} 版',

  // ─── Birth-info form-as-conversation (Phase C.1) ───
  birth_conv_intro_title: '让我们认识一下你的命盘',
  birth_conv_intro_subtitle: '4 个简单问题，约 90 秒',
  birth_conv_intro_cta: '轻触开始',
  birth_conv_date_title: '你的生日',
  birth_conv_time_title: '你出生在哪个时辰',
  birth_conv_time_subtitle: '选择最接近的时辰；不知道也没关系',
  birth_conv_time_skip: '我不知道时辰',
  birth_conv_time_unknown: '未指定',
  birth_conv_gender_title: '你的性别',
  birth_conv_gender_subtitle: '用于八字大运推算',
  birth_conv_gender_male: '男',
  birth_conv_gender_female: '女',
  birth_conv_place_title: '你出生在哪个城市',
  birth_conv_place_search_placeholder: '搜索城市…',
  birth_conv_review_title: '准备就绪',
  birth_conv_review_submit: '生成命盘',
  birth_conv_next: '继续',

  // ─── Chapter sharing (Phase C.3) ───
  share_chapter_cta: '分享此章节',
  share_chart_cta: '分享命盘',
  share_chapter_pending: '生成分享链接…',
  share_chapter_needs_signin: '请先登录后再分享',
} as const

export type TranslationKeys = keyof typeof zh
