import { describe, expect, it } from 'bun:test'
import {
  buildFaceOracleChaptersPrompt,
  buildFaceOracleLociPrompt,
  buildFaceOraclePrompt,
  faceoracleCautionObservations,
  faceoracleDensityGaps,
  faceoracleSoftObservations,
} from './faceoracle'
import {
  buildFaceoracleLanguageBlock,
  faceoracleBodyLooksWrongLocale,
  faceoracleFieldsLookWrongLocale,
} from './faceoracle-locale'

describe('buildFaceOraclePrompt (ADR-0028 craft)', () => {
  const base = {
    faceFeatures: '{"chin":"ok"}',
    palmLeftFeatures: '{"lifeLine":"ok"}',
    palmRightFeatures: '{"lifeLine":"ok"}',
    natalSummary:
      'solar=1990-1-1; palmConvention=男: left(palm_l)=先天 · right(palm_r)=后天; dayunFull=1:甲子@0-9y/1990-1999 | 2:乙丑@10-19y/2000-2009; dayunFuture=丙寅@40-49y/2030-2039',
    locale: 'zh-CN',
    horizonMonths: 3 as const,
    outputKind: 'oneshot' as const,
  }

  it('includes three feature blocks, natal, events schema, and horizon', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('FaceFeatures:')
    expect(prompt).toContain('PalmLeftFeatures:')
    expect(prompt).toContain('PalmRightFeatures:')
    expect(prompt).toContain('NatalSummary:')
    expect(prompt).toContain('HorizonMonths: 3')
    expect(prompt).toContain('"events"')
  })

  it('has five-chapter craft with natal=future / horizon=near+actions and palm sides', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Five chapters')
    expect(prompt).toContain('未来主章')
    expect(prompt).not.toContain('FUTURE MAIN')
    expect(prompt).not.toContain('palm tension')
    expect(prompt).toContain('近运与行动')
    expect(prompt).toContain('overview ≠ face')
    expect(prompt).toContain('Field roles')
    expect(prompt).toContain('One sentence, one owner')
    expect(prompt).toContain('掌侧')
    expect(prompt).toContain('palmConvention')
    expect(prompt).toContain('"loci"')
    expect(prompt).not.toContain('App Store 4.3(b)')
    expect(prompt).not.toContain('Safety floor')
    expect(prompt).not.toContain('Terms §3')
  })

  it('does not carry char-count floors or life-scene HARD catalogs', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).not.toContain('Life-scene catalog')
    expect(prompt).not.toContain('missing_scene_cluster')
    expect(prompt).not.toMatch(/Body\s+\d+/)
  })

  it('injects the caller-provided palm convention + future dayun band', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('palmConvention=男')
    expect(prompt).toContain('dayunFuture=')
  })

  it('teaches loci-first, null-over-repeat, breadth, and honesty (anti cherry-pick)', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Loci-first')
    expect(prompt).toContain('One sentence, one owner')
    expect(prompt).toContain('Prefer null over repeat')
    expect(prompt).toContain('Honesty over flattery')
    expect(prompt).toContain('cherry-pick')
  })

  it('splits Pass1 loci vs Pass2 chapters; keeps inference + horizon actions', () => {
    const loci = buildFaceOracleLociPrompt(base)
    const chapters = buildFaceOracleChaptersPrompt(base, '[]')
    expect(loci).toContain('Pass 1')
    expect(loci).toContain('16–20')
    expect(loci).not.toContain('"chapters"')
    expect(chapters).toContain('Pass 2')
    expect(chapters).toContain('Inference chain')
    expect(chapters).toContain('Crutch phrases BANNED')
    expect(chapters).toContain('会发生什么')
    expect(chapters).toContain('你该做什么')
    expect(chapters).not.toContain('Depth calibration')
  })

  it('carries the age-anchored window mandate (Xingqi edge)', () => {
    const prompt = buildFaceOracleChaptersPrompt(base, '[]')
    expect(prompt).toContain('currentAge')
    expect(prompt).toContain('palmLiunianHint')
    expect(prompt).toContain('已走段')
    expect(prompt).toContain('下一窗口')
  })

  it('teaches curated mounts keys without mandatory full coverage', () => {
    const loci = buildFaceOracleLociPrompt(base)
    expect(loci).toContain('mountJupiter')
    expect(loci).toContain('mountVenus')
    expect(loci).toContain('mountMars')
    expect(loci).toContain('FULL coverage is NOT required')
    expect(loci).toContain('Prefer omit over fabricate')
    expect(loci).toContain('NEVER paste raw VLM feature text')
  })
})

describe('faceoracleDensityGaps', () => {
  it('no longer emits char-based thin_chapter floors', () => {
    const gaps = faceoracleDensityGaps(
      { events: [{ axis: 'career' }, { axis: 'love' }, { axis: 'health' }] },
      [{ kind: 'overview', evidence: '短', dynamic: '短', reef: null, remedy: null }]
    )
    expect(gaps.some((g) => g.startsWith('corpus.thin_chapter'))).toBe(false)
  })

  it('flags thin event fuel under curated floors (events<3)', () => {
    const gaps = faceoracleDensityGaps({ events: [{ axis: 'career', startMonth: '2030-01' }] }, [
      { kind: 'face', evidence: 'x', dynamic: 'y', reef: null, remedy: null, citations: [] },
    ])
    expect(gaps).toContain('events<3')
    expect(gaps).toContain('events.near<1')
    expect(gaps).toContain('events.axis<2')
  })

  it('flags missing other-hand palm loci without a <4 face coverage floor', () => {
    const gaps = faceoracleDensityGaps(
      {
        events: [],
        loci: [
          { featureKey: 'tianTing', part: 'face', locus: '天庭', reading: 'a' },
          { featureKey: 'lifeLine', part: 'palm_l', locus: '生命线', reading: 'b' },
        ],
      },
      [{ kind: 'face', evidence: 'x', dynamic: 'y', reef: null, remedy: null }]
    )
    expect(gaps).not.toContain('face.citations<4')
    expect(gaps).toContain('palms.missing_innate_or_acquired')
  })

  it('moves identical career/love/health event notes to soft observations (client folds display)', () => {
    const same = '火旺生土，官星渐显，宜借势顺势。'
    const events = [
      { axis: 'career', note: same, startMonth: '2026-03' },
      { axis: 'love', note: same, startMonth: '2026-06' },
      { axis: 'health', note: same, startMonth: '2026-09' },
      { axis: 'career', note: 'extra', startMonth: '2027-01' },
      { axis: 'love', note: 'extra2', startMonth: '2027-04' },
    ]
    const gaps = faceoracleDensityGaps({ events }, [])
    expect(gaps).not.toContain('events.axis_note_dup')
    const obs = faceoracleSoftObservations({ events }, [])
    expect(obs).toContain('events.axis_note_dup')
  })

  it('flags palms missing a hand and bare part-enum locus (via loci[])', () => {
    const gaps = faceoracleDensityGaps(
      {
        events: [],
        loci: [
          { featureKey: 'lifeLine', part: 'palm_l', locus: 'palm_l', reading: 'a' },
          { featureKey: 'heartLine', part: 'palm_l', locus: '感情线', reading: 'b' },
          { featureKey: 'headLine', part: 'palm_l', locus: '智慧线', reading: 'c' },
          { featureKey: 'fateLine', part: 'palm_l', locus: '事业线', reading: 'd' },
        ],
      },
      [{ kind: 'palms', evidence: 'x', dynamic: 'y', reef: null, remedy: null }]
    )
    expect(gaps).toContain('palms.missing_innate_or_acquired')
    expect(gaps).toContain('citations.locus_is_part_enum')
  })

  it('flags natal without future years and natal echoing horizon', () => {
    const shared =
      '命主当前大运走得稳当事业与家庭都在积累这一段话足够长用来测跨章回声检测机制是否生效'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'natal',
        evidence: shared,
        dynamic: '这一步只讲当下没有提到任何未来的年份区间说明缺少未来时间线',
        reef: null,
        remedy: null,
        citations: [],
      },
      {
        kind: 'horizon',
        evidence: shared,
        dynamic: 'z',
        reef: null,
        remedy: null,
        citations: [],
      },
    ])
    expect(gaps).toContain('natal.future_thin')
    expect(gaps).toContain('natal.dup_horizon')
  })

  it('flags what-if fork sprayed across ≥2 chapters', () => {
    const fork =
      '若在35–37岁(乙巳、丙午流年)正式接管一摊事，可借火气助势，更稳当；若此窗口仍只做执行，40岁后再转会更费力。'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'overview',
        evidence: '总览钩子讲形气与大运张力，这段足够长。',
        dynamic: fork,
        reef: null,
        remedy: null,
      },
      {
        kind: 'natal',
        evidence: '日主与大运互证，这段也足够长避免空章。',
        dynamic: fork,
        reef: null,
        remedy: null,
      },
    ])
    expect(gaps).toContain('chapters.whatif_spray')
  })

  it('allows a single natal what-if without spray', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'natal',
        evidence: '日主与大运互证，这段也足够长避免空章。',
        dynamic:
          '若在42–44岁把副业转正职比继续广撒更稳；若不转，48岁后土运来时会更被动。',
        reef: null,
        remedy: null,
      },
      {
        kind: 'horizon',
        evidence: '近窗讲流年动作，这段也足够长。',
        dynamic: '2026丙午流年火透，宜把专长落成可交付的一块，而不是再开新摊子。',
        reef: null,
        remedy: null,
      },
    ])
    expect(gaps).not.toContain('chapters.whatif_spray')
  })

  it('accepts a natal chapter that names a future year', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'natal',
        evidence:
          '命主丙寅大运在2030-2039走木火通明，事业进入扩张带，这段文字足够长以避免误判为空章节。',
        dynamic: '未来这一步宜借势外拓，把前半场的积累转成后半场的话语权。',
        reef: null,
        remedy: null,
        citations: [],
      },
    ])
    expect(gaps).not.toContain('natal.future_thin')
  })

  it('flags overview dup face, evidence=golden, dynamic label stubs, and golden dup', () => {
    const dump =
      '天庭微凸发际低，印堂开阔微泛红，山根低平连印堂，额宽适中鬓角近，眉浓平直眉尾散，眼大有神卧蚕微，准头圆厚鼻翼宽'
    const gaps = faceoracleDensityGaps(
      {
        events: [{ axis: 'career' }, { axis: 'love' }, { axis: 'health' }, { axis: 'career' }],
      },
      [
        {
          kind: 'overview',
          goldenLine: dump,
          evidence: dump,
          dynamic: '形气总象',
          reef: null,
          remedy: null,
          citations: [],
        },
        {
          kind: 'face',
          goldenLine: dump,
          evidence: dump,
          dynamic: '三停五岳十二宫',
          reef: null,
          remedy: null,
          citations: [],
        },
      ]
    )
    expect(gaps).toContain('chapters.overview_dup_face')
    expect(gaps.some((g) => g.startsWith('field.evidence_eq_golden'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('field.dynamic_label_only'))).toBe(true)
    expect(gaps).toContain('chapters.golden_dup')
  })

  it('flags dynamic + reef + remedy echoing evidence', () => {
    const long =
      '命主三停匀称五岳平和但印堂开阔需留意情绪波动这是一句足够长的证据段落用来测回声检测机制'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'face',
        goldenLine: '印堂杂气，情绪口易晃',
        evidence: long,
        dynamic: long,
        reef: long,
        remedy: long,
        citations: [],
      },
    ])
    expect(gaps.some((g) => g.startsWith('field.dynamic_eq_evidence'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('field.reef_echo'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('field.remedy_echo'))).toBe(true)
  })

  it('flags an exact SHORT goldenLine duplicated across chapters (calibration fix)', () => {
    const gl = '乙木日主逢壬水生助，早年靠才智立身，乙巳运后事业渐成'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'overview',
        goldenLine: gl,
        evidence: 'a',
        dynamic: 'b',
        reef: null,
        remedy: null,
        citations: [],
      },
      {
        kind: 'natal',
        goldenLine: gl,
        evidence: 'c',
        dynamic: 'd',
        reef: null,
        remedy: null,
        citations: [],
      },
    ])
    expect(gaps).toContain('chapters.golden_dup')
  })

  it('flags cross-chapter reef/remedy repetition (the screenshot bug)', () => {
    const reef = '2026年丙午流年，火旺土燥，需注意情绪控制与健康节奏'
    const remedy = '多进行冥想与呼吸训练，提升情绪调节能力'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      { kind: 'overview', evidence: 'a', dynamic: 'b', reef, remedy, citations: [] },
      { kind: 'natal', evidence: 'c', dynamic: 'd', reef, remedy, citations: [] },
    ])
    expect(gaps).toContain('chapters.reef_dup')
    expect(gaps).toContain('chapters.remedy_dup')
  })

  it('flags 流年 reef sprayed into ≥2 non-horizon chapters', () => {
    const reef = '2026年丙午流年，火旺土燥，需注意情绪与健康'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      { kind: 'overview', evidence: 'a', dynamic: 'b', reef, remedy: null, citations: [] },
      {
        kind: 'palms',
        evidence: 'c',
        dynamic: 'd',
        reef: '2026年丙午流年再叠掌纹张力，宜稳中求进',
        remedy: null,
        citations: [],
      },
    ])
    expect(gaps).toContain('chapters.reef_liunian_spray')
  })

  it('flags dynamic restating goldenLine (hard) but moves note-echo to soft observations', () => {
    const golden = '印堂开阔气色偏杂情绪易起伏'
    const evidence =
      '印堂开阔气色偏杂情绪易起伏，需在关键节点稳住心气，这段证据足够长用来测试引用回声检测。'
    const chapters = [
      {
        kind: 'face' as const,
        goldenLine: golden,
        evidence,
        dynamic: `${golden}，因此近半年宜先稳后进不宜冒进以免情绪牵动判断`,
        reef: null,
        remedy: null,
        citations: [{ locus: '印堂', featureKey: 'yinTang', note: '印堂开阔气色偏杂情绪易起伏' }],
      },
    ]
    const gaps = faceoracleDensityGaps({ events: [] }, chapters)
    expect(gaps.some((g) => g.startsWith('field.dynamic_eq_golden'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('cite.note_echo_body'))).toBe(false)
    const obs = faceoracleSoftObservations({ events: [] }, chapters)
    expect(obs.some((g) => g.startsWith('cite.note_echo_body'))).toBe(true)
  })

  it('moves face breadth + palms life/heart/mounts/marks coverage to soft observations (loci[])', () => {
    const loci = [
      { featureKey: 'tianTing', part: 'face', locus: '天庭', reading: 'a' },
      { featureKey: 'yinTang', part: 'face', locus: '印堂', reading: 'b' },
      { featureKey: 'lifeLine', part: 'palm_l', locus: '生命线', reading: 'a' },
      { featureKey: 'headLine', part: 'palm_r', locus: '智慧线', reading: 'b' },
    ]
    const chapters = [
      { kind: 'face' as const, evidence: 'x', dynamic: 'y', reef: null, remedy: null },
      { kind: 'palms' as const, evidence: 'x', dynamic: 'y', reef: null, remedy: null },
    ]
    const gaps = faceoracleDensityGaps({ events: [], loci }, chapters)
    expect(gaps).not.toContain('cite.face_breadth')
    expect(gaps).not.toContain('palms.missing_life_or_heart_line')
    expect(gaps).not.toContain('palms.cite_coverage_mounts')
    expect(gaps).not.toContain('palms.missing_marks_cite')
    expect(gaps).not.toContain('face.cite_coverage')
    expect(gaps).not.toContain('palms.missing_innate_or_acquired')
    const obs = faceoracleSoftObservations({ events: [], loci }, chapters)
    expect(obs).toContain('cite.face_breadth')
    expect(obs).toContain('palms.missing_life_or_heart_line')
    expect(obs).toContain('palms.cite_coverage_mounts')
    expect(obs).toContain('palms.missing_marks_cite')
    expect(obs).toContain('face.cite_coverage')
  })

  it('moves horizon actionability floor to soft observations', () => {
    const chapters = [
      {
        kind: 'horizon' as const,
        evidence: 'x',
        dynamic: 'y',
        reef: null,
        remedy: null,
        citations: [],
      },
    ]
    const gaps = faceoracleDensityGaps({ events: [] }, chapters)
    expect(gaps).not.toContain('advice.not_actionable')
    const obs = faceoracleSoftObservations({ events: [] }, chapters)
    expect(obs).toContain('advice.not_actionable')
  })

  it('moves thin one-liner fields to soft observations (no more deepen retry)', () => {
    const chapters = [
      {
        kind: 'face' as const,
        evidence: '短评',
        dynamic: '这里稍微长一点但仍不足四十字的动态描述',
        reef: null,
        remedy: null,
        citations: [],
      },
    ]
    const gaps = faceoracleDensityGaps({ events: [] }, chapters)
    expect(gaps).not.toContain('field.thin_evidence:face')
    expect(gaps).not.toContain('field.thin_dynamic:face')
    const obs = faceoracleSoftObservations({ events: [] }, chapters)
    expect(obs).toContain('field.thin_evidence:face')
    expect(obs).toContain('field.thin_dynamic:face')
  })

  it('does NOT emit any caution word gap (caution is log-only, never a retry gate)', () => {
    const gaps = faceoracleDensityGaps(
      {
        events: [],
        loci: [{ featureKey: 'tianTing', part: 'face', locus: '天庭', reading: '饱满圆润主早年有靠' }],
      },
      [{ kind: 'face', evidence: 'x', dynamic: 'y', reef: null, remedy: null }]
    )
    expect(gaps.some((g) => g.startsWith('cite.caution'))).toBe(false)
  })
})

describe('faceoracleCautionObservations (log-only)', () => {
  it('observes when face readings name no tension, and stays silent when they do', () => {
    const absent = faceoracleCautionObservations(
      [],
      [
        { part: 'face', reading: '天庭饱满主早年有靠' },
        { part: 'face', reading: '准头圆厚聚财有力' },
      ]
    )
    expect(absent).toContain('caution_word_absent:face')

    const present = faceoracleCautionObservations(
      [],
      [{ part: 'face', reading: '印堂偏杂情绪易波动，宜留意' }]
    )
    expect(present).not.toContain('caution_word_absent:face')
  })
})

describe('faceoracleSoftObservations (log-only, demoted gates)', () => {
  it('returns nothing for empty input (never a retry gate)', () => {
    expect(faceoracleSoftObservations({ events: [] }, [])).toEqual([])
  })
})

describe('faceoracle locale drift (language-split)', () => {
  const jaSample =
    '形に見える天庭の広がりと印堂の清さから、気の流れではこの大運の前半で事業線が立つ。留意すべきは山根の弱さで、感情の波が健康リズムに影響しやすい。'

  const zhSample =
    '形上可见天庭开阔印堂清亮，气机上宜留意山根偏弱带来的情绪波动，事业线在戊寅运前段转清晰，宜择业专精而非广撒。'

  const enSample =
    'Form shows a broad forehead and clear glabella; qi-flow worth noting a thinner nasal root through the current decade. Career axis: specialize rather than scatter between ages 34 and 37.'

  it('does NOT flag normal Japanese kana+kanji prose as drift', () => {
    expect(faceoracleBodyLooksWrongLocale('ja', jaSample)).toBe(false)
    expect(faceoracleBodyLooksWrongLocale('ja-JP', jaSample)).toBe(false)
  })

  it('flags Chinese-only prose under ja locale (no kana)', () => {
    expect(faceoracleBodyLooksWrongLocale('ja', zhSample)).toBe(true)
  })

  it('flags English-heavy prose under ja locale', () => {
    expect(faceoracleBodyLooksWrongLocale('ja', enSample)).toBe(true)
  })

  it('keeps en CJK-ratio drift behavior unchanged', () => {
    expect(faceoracleBodyLooksWrongLocale('en', enSample)).toBe(false)
    expect(faceoracleBodyLooksWrongLocale('en', zhSample)).toBe(true)
  })

  it('flags English leakage in zh body; clean zh passes', () => {
    expect(faceoracleBodyLooksWrongLocale('zh-CN', zhSample)).toBe(false)
    expect(faceoracleBodyLooksWrongLocale('zh-Hant', zhSample)).toBe(false)
    expect(
      faceoracleBodyLooksWrongLocale(
        'zh-CN',
        '掌纹形气张力偏紧，future 大运带宜留意节奏，palm tension 不宜妄动。'
      )
    ).toBe(true)
  })

  it('zh language block bans English craft tokens', () => {
    const block = buildFaceoracleLanguageBlock('zh-CN')
    expect(block).toContain('禁止')
    expect(block).toContain('future')
    expect(block).toContain('tension')
    expect(block).toContain('palm')
  })

  it('en/ja language block keeps 汉字 terms and bans romanization-as-primary', () => {
    const en = buildFaceoracleLanguageBlock('en')
    expect(en).toContain('Yuel-aligned')
    expect(en).toContain('NEVER romanize')
    expect(en).toContain('天庭')
    expect(en).not.toContain('romanization (汉字)')
    const ja = buildFaceoracleLanguageBlock('ja')
    expect(ja).toContain('漢字')
    expect(ja).toContain('天庭')
  })

  it('ja field guard flags Latin leakage but not kanji locus names', () => {
    expect(faceoracleFieldsLookWrongLocale('ja', ['天庭', '生命線', '印堂の清さ'])).toBe(false)
    expect(
      faceoracleFieldsLookWrongLocale('ja', [
        'Stay balanced and keep healthy through this decade window ahead.',
      ])
    ).toBe(true)
  })

  it('en field guard still catches a Chinese goldenLine', () => {
    expect(faceoracleFieldsLookWrongLocale('en', ['庚金坐酉，早年靠硬本事立身'])).toBe(true)
    expect(faceoracleFieldsLookWrongLocale('en', ['Specialize before age 37.'])).toBe(false)
  })

  it('ja language block includes writer glossary parity with EN', () => {
    const block = buildFaceoracleLanguageBlock('ja')
    expect(block).toContain('天庭')
    expect(block).toContain('印堂')
    expect(block).toContain('山根')
    expect(block).toContain('骨相')
    expect(block).toContain('气色')
    expect(block).toContain('生命线')
    expect(block).toContain('事业线')
    expect(block).toContain('金星丘')
  })
})
