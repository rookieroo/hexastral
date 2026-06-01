/**
 * 命格预设人格画像 — 确定性兜底库
 *
 * 用途：当 Gemini Flash 超时或失败时返回的 Natal 派生人格内容。
 * 用户永远不会看到泛化的 locale 字符串——总能得到命盘相关的内容。
 *
 * 结构：
 *   - STEM_PROFILES[天干][locale] → { personalityBullets[3], fateTease, warning }
 *   - BRANCH_MODIFIERS[地支][locale] → 替换 bullet[2] 的月支微调句
 *
 * 支持 locale：zh / en（其余语言回退到 en，zh-Hant 回退到 zh）
 */

export type PresetPersonality = {
  personalityBullets: [string, string, string]
  fateTease: string
  warning: string
}

type LocaleMap<T> = { zh: T; en: T }

// ── 日主天干人格档案 ─────────────────────────────────────────────────────────

const STEM_PROFILES: Record<string, LocaleMap<PresetPersonality>> = {
  甲: {
    zh: {
      personalityBullets: [
        '骨子里是攀升者，停滞比失败更让你难受',
        '给予庇护是天性，却常忘了问自己是否也需要被看见',
        '对未知保持好奇，对阻碍保持执拗',
      ],
      fateTease: '有一个你一直绕开的方向，正悄悄靠近你的轨道……',
      warning: '正面突破的劲头有时会在最需要弯曲的地方折断……',
    },
    en: {
      personalityBullets: [
        'Built to rise — stagnation hurts you more than failure',
        'You shelter others instinctively, rarely asking to be seen yourself',
        'Curious about the unknown, stubborn against obstruction',
      ],
      fateTease: "A direction you've long avoided is quietly entering your orbit…",
      warning: 'The force that drives you forward is the same one that breaks when it should bend…',
    },
  },
  乙: {
    zh: {
      personalityBullets: [
        '以柔克刚是你的生存之道，没人注意到你什么时候扎了根',
        '读懂周围的能量比大多数人快，只是很少说出来',
        '适应力强到几乎无声无息，但内核从未真正动摇',
      ],
      fateTease: '你长期在弯曲中等待的那扇门，可能比你以为的更近……',
      warning: '适应得太好，有时会让你忘记了本来想去往的方向……',
    },
    en: {
      personalityBullets: [
        'Flexible where others break — you root quietly without anyone noticing',
        'You read the room faster than most and almost never say what you noticed',
        'Adaptable to the point of invisibility, but your core never actually shifts',
      ],
      fateTease: "The door you've been bending toward for so long may be closer than you think…",
      warning: 'Adapting too well can make you forget the direction you originally chose…',
    },
  },
  丙: {
    zh: {
      personalityBullets: [
        '天生的光源，凡靠近者皆被你的热度改变',
        '付出是本能，但没有人问过那个热烈的你需要什么',
        '你的感染力是真实的，耗尽也是真实的',
      ],
      fateTease: '你的可见度即将在意想不到的地方接受一次考验……',
      warning: '不停给予光热的代价，你一个人扛着，没跟任何人说过……',
    },
    en: {
      personalityBullets: [
        'A natural light source — everyone near you gets changed by your warmth',
        'Giving is instinct, but no one ever asked what the generous version of you needs',
        'Your charisma is real; so is the depletion that follows it',
      ],
      fateTease: "Your visibility is about to be tested in a way you didn't plan for…",
      warning: "The cost of radiating heat without receiving it — you've been carrying it alone…",
    },
  },
  丁: {
    zh: {
      personalityBullets: [
        '烛光而非烈焰：渺小、持久、照亮最近的人',
        '很少有人第一眼就懂你，但懂了之后就舍不得',
        '那团从未说出口的火，是你最深的驱动力',
      ],
      fateTease: '那团从未说出口的火，正从无声积累走向被看见的临界点……',
      warning: '向内燃烧而不说出口的部分，迟早会在最意外的时机找到出口……',
    },
    en: {
      personalityBullets: [
        'A candle, not a bonfire — steady warmth for whoever is closest',
        'Few understand you at first glance; once they do they rarely leave',
        "The fire you've never spoken aloud is your deepest engine",
      ],
      fateTease:
        "That fire you've never fully spoken aloud is approaching the point of being seen…",
      warning: 'What burns inward without release tends to find the most unexpected exit point…',
    },
  },
  戊: {
    zh: {
      personalityBullets: [
        '如山岳般承载，别人的重量你扛，自己的重量你独吞',
        '包容一切是你的天性，但世界上最孤独的往往是撑住一切的人',
        '稳是你的优点，也是把你困住的那道无形的墙',
      ],
      fateTease: '那个在所有稳重之下等待被发现的你，已经等了很久了……',
      warning: '埋入土里的东西不会消失，只是在等一个时机破土而出……',
    },
    en: {
      personalityBullets: [
        'Mountain energy — you hold what others cannot, and absorb what they will not',
        'You contain everything, which means the loneliest version of you is also the most invisible',
        'Steadiness is your strength and the invisible wall that holds you in',
      ],
      fateTease:
        'The version of you buried beneath all that reliability has been waiting for a long time…',
      warning: "What gets pressed into the ground doesn't disappear, it accumulates pressure…",
    },
  },
  己: {
    zh: {
      personalityBullets: [
        '滋养型人格，细腻到能接住别人漏掉的每一粒情绪',
        '低调运筹，从不提需求，以至于有时忘了自己也有',
        '表面上什么都不争，内心有一个没有说出口的世界',
      ],
      fateTease: '你一直在安静耕耘的那件事，离破土的时间越来越近……',
      warning: '最安静的声音往往藏着最重要的答案，你还没有听见它……',
    },
    en: {
      personalityBullets: [
        'You absorb what others drop — every emotional detail registers, even when you say nothing',
        'Quietly strategic, rarely asking for anything — until you forget asking is even an option',
        'Nothing on the surface; a whole world inside that has never been spoken',
      ],
      fateTease: "What you've been tending to in silence is getting closer to breaking through…",
      warning:
        "The quietest part of you holds the most important answer, and you haven't listened yet…",
    },
  },
  庚: {
    zh: {
      personalityBullets: [
        '原则比利益更难撼动，那是你的铠甲，也是别人无法绕过的墙',
        '真实得有时刺伤人，但这份锐利换来了一种罕见的可信',
        '孤峭是你的常态，这让你清醒，也让你难被靠近',
      ],
      fateTease: '有一场你无法用原则解决的考验正在靠近你的生命轨道……',
      warning: '你对别人的标准，迟早会被同等的力度回到你自己身上……',
    },
    en: {
      personalityBullets: [
        'Your principles outlast your strategies — they are your armor and your wall',
        'Honest to the point of hurt, which is exactly why the people who stay, stay completely',
        'Solitary clarity is your natural state — it keeps you sharp and hard to reach',
      ],
      fateTease: "A test that can't be solved by principles alone is approaching your life's edge…",
      warning: 'The standards you hold others to tend to circle back in ways you do not expect…',
    },
  },
  辛: {
    zh: {
      personalityBullets: [
        '对细节的洁癖来自一种信念：粗糙了就不再是你',
        '感受力极强，美能触动你，瑕疵也能，你无法假装不在意',
        '不会轻易动心，一旦动了，就是深入骨髓',
      ],
      fateTease: '有一件同时美丽又令人不安的事，正在朝你的命盘靠近……',
      warning: '你称之为高标准的事情，有时候会把你真正需要的东西挡在门外……',
    },
    en: {
      personalityBullets: [
        'Precision is identity — you cannot be approximate and still be you',
        'Beauty moves you; so does every imperfection; you cannot pretend otherwise',
        'Slow to open, permanent once you do',
      ],
      fateTease: 'Something beautiful and destabilizing is moving toward your chart…',
      warning:
        'What you frame as high standards sometimes blocks exactly what you are waiting for…',
    },
  },
  壬: {
    zh: {
      personalityBullets: [
        '大水漫流，表面轻松，暗处有深渊，只有你知道在哪里',
        '策略感强，包容一切，却极难被真正接近',
        '奔流不止，一直在找一个能承受你全部重量的地方',
      ],
      fateTease: '你一直逆势而行的那股暗流，有可能在这个节点发生转向……',
      warning: '水越深越难读，包括你自己有时候也读不懂自己……',
    },
    en: {
      personalityBullets: [
        'Deep, broad water — easy to be near, almost impossible to truly enter',
        'You understand everything and everyone; what you keep hidden is how rarely you feel understood',
        'Always moving, always searching for somewhere that can hold your full weight',
      ],
      fateTease: "The current you've been moving against may be about to shift direction…",
      warning: 'The deeper water runs, the harder it is to read — even for yourself…',
    },
  },
  癸: {
    zh: {
      personalityBullets: [
        '安静而绵绵，内里藏着比外表深得多的执念',
        '不争、不说，却什么都感受着、记着',
        '你习惯滋养别人，却不擅长为自己开口',
      ],
      fateTease: '你过去某段经历的重量，正在以另一种方式回到你的现在……',
      warning: '接纳了太多别人的情绪，有时候找不到哪部分才是自己的……',
    },
    en: {
      personalityBullets: [
        'Quiet surface, mountain depth — you hold things longer than anyone realizes',
        "You don't fight or announce, you feel and remember long after everyone else has moved on",
        'You nourish others instinctively; speaking up for yourself is the ongoing work',
      ],
      fateTease:
        'The weight of something from your past is finding its way back into your present…',
      warning:
        "When you absorb everyone else's emotional world, finding your own voice becomes the work…",
    },
  },
}

// ── 月支修饰句 — 替换 bullet[2] ──────────────────────────────────────────────

const BRANCH_MODIFIERS: Record<string, LocaleMap<string>> = {
  子: {
    zh: '冬水生人，内敛中藏着最汹涌的暗流——表面越平静，内里越复杂',
    en: 'Born in winter water — your introversion hides the deepest current; the calmer the surface, the more is running beneath',
  },
  丑: {
    zh: '土水相搏月，脚踏实地的背后压着一股想动的劲，两者同时存在',
    en: 'Earth-water tension month — grounded and restless in the same breath; both are real',
  },
  寅: {
    zh: '木旺破冬月，那股冲劲连你自己都压不住，等待和突破同时在拉你',
    en: 'Spring-surge month — that drive to break through is something even you cannot fully contain',
  },
  卯: {
    zh: '卯月生者，对自由的渴望和对深度联结的需求同样强烈，缺一都会空',
    en: 'Rabbit month — the need for freedom and the need for deep connection are equally urgent; neither can be sacrificed',
  },
  辰: {
    zh: '辰月水库，内蓄巨量，等一个时机一泻而出，旁人很难预判',
    en: 'Dragon-reservoir month — enormous stored energy awaiting a precise release point; almost no one sees it coming',
  },
  巳: {
    zh: '巳月直觉锋利，但想太多容易成为你最大的自我内耗来源',
    en: 'Snake-month intuition — exceptionally sharp, but overthinking is your primary drain from yourself',
  },
  午: {
    zh: '午月如火正旺，全力以赴是天然设置，只是满格投入的代价也是满格的',
    en: 'Peak-fire month — full commitment is your default mode; so is the full cost of it',
  },
  未: {
    zh: '未月静藏，你在安静地积蓄一些别人还看不见、摸不透的东西',
    en: 'Late-summer quiet — you are accumulating something in silence that others cannot yet see or name',
  },
  申: {
    zh: '申月金气旺，思维快，行动快，心有时快过脚，这是优势也是隐患',
    en: 'Metal-precision month — fast mind, fast action; your heart sometimes moves ahead of your footing',
  },
  酉: {
    zh: '酉月对细节极其敏感，你的优点和你的痛苦，来自同一个地方',
    en: 'Autumn-refinement month — your sensitivity to detail is both your greatest gift and your most reliable source of pain',
  },
  戌: {
    zh: '戌月处于转折，那种说不清楚的不安定感其实是在为下一段悄悄做准备',
    en: 'Transition-month — that undefinable restlessness is preparation in disguise for what comes after',
  },
  亥: {
    zh: '亥月水藏深，你此刻的状态是某段旅程的终点，也是另一段旅程的起始',
    en: 'Winter-beginning born — where you are now is simultaneously an ending and a threshold',
  },
}

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function normLang(lang: string): 'zh' | 'en' {
  if (lang === 'zh' || lang === 'zh-CN' || lang === 'zh-SG') return 'zh'
  // zh-Hant falls back to zh (same content, characters identical in meaning)
  if (lang.startsWith('zh')) return 'zh'
  // All other locales (en, ko, ja, de, es, vi, th) use en preset
  return 'en'
}

const EMERGENCY_FALLBACK_ZH: PresetPersonality = {
  personalityBullets: ['命盘正在解析中', '四柱藏着你的答案', '天道至简，命自有章'],
  fateTease: '你的命盘里藏着一个还没被看见的格局……',
  warning: '有一个反复出现的模式，你可能还没有正视它……',
}

const EMERGENCY_FALLBACK_EN: PresetPersonality = {
  personalityBullets: [
    'Chart analysis in progress',
    'Your four pillars hold the answer',
    'The pattern is already written',
  ],
  fateTease: 'There is a pattern in your chart that has not yet been fully seen…',
  warning: 'Something that keeps recurring in your life may be asking to be faced directly…',
}

/**
 * 根据日主天干 + 月支 + 语言返回预设人格画像
 * bullet[2] 被月支修饰句替换，提供二维个性化
 */
export function getPresetPersonality(
  dayStem: string,
  monthBranch: string,
  lang: string
): PresetPersonality {
  const l = normLang(lang)
  const stemData = STEM_PROFILES[dayStem]?.[l]
  if (!stemData) {
    return l === 'zh' ? EMERGENCY_FALLBACK_ZH : EMERGENCY_FALLBACK_EN
  }

  const branchMod = BRANCH_MODIFIERS[monthBranch]?.[l]
  const bullets: [string, string, string] = [
    stemData.personalityBullets[0],
    stemData.personalityBullets[1],
    branchMod ?? stemData.personalityBullets[2],
  ]

  return {
    personalityBullets: bullets,
    fateTease: stemData.fateTease,
    warning: stemData.warning,
  }
}
