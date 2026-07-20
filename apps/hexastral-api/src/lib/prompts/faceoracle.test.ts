import { describe, expect, it } from 'bun:test'
import {
  buildFaceOraclePrompt,
  faceoracleCautionObservations,
  faceoracleDensityGaps,
} from './faceoracle'

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

  it('has six-chapter craft with natal=future / period=near split and palm sides', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Six chapters')
    expect(prompt).toContain('FUTURE MAIN')
    expect(prompt).toContain('NEAR WINDOW preview')
    expect(prompt).toContain('overview ≠ face')
    expect(prompt).toContain('Field roles (NO ECHO)')
    expect(prompt).toContain('Ban: copying the same sentence')
    // Palm convention (gender innate/acquired) must be taught in the prompt.
    expect(prompt).toContain('Palm sides')
    expect(prompt).toContain('palmConvention')
    expect(prompt).not.toContain('App Store 4.3(b)')
    expect(prompt).not.toContain('Safety floor')
    expect(prompt).not.toContain('Terms §3')
  })

  it('does not carry char-count floors or life-scene HARD catalogs', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).not.toContain('Life-scene catalog')
    expect(prompt).not.toContain('missing_scene_cluster')
    // No "Body XXX 字" volume floors remain in the chapter spec.
    expect(prompt).not.toMatch(/Body\s+\d+/)
  })

  it('injects the caller-provided palm convention + future dayun band', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('palmConvention=男')
    expect(prompt).toContain('dayunFuture=')
  })

  it('teaches data ownership, null-over-repeat, breadth, and honesty (anti cherry-pick)', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Data ownership')
    expect(prompt).toContain('Prefer null over repeat')
    expect(prompt).toContain('Honesty over flattery')
    expect(prompt).toContain('cherry-pick')
    // Breadth + life/heart lines are stated in the citation contract.
    expect(prompt).toContain('≥5 DISTINCT featureKeys')
    expect(prompt).toContain('lifeLine AND heartLine')
  })

  it('carries the inference-chain mandate, crutch-phrase ban, and depth few-shot', () => {
    const prompt = buildFaceOraclePrompt(base)
    expect(prompt).toContain('Inference chain')
    expect(prompt).toContain('Crutch phrases BANNED')
    expect(prompt).toContain('Depth calibration')
    // period (会发生什么) vs advice (你该做什么) split is spelled out.
    expect(prompt).toContain('会发生什么')
    expect(prompt).toContain('你该做什么')
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

  it('flags event count, near-window, and three-axis coverage', () => {
    const gaps = faceoracleDensityGaps({ events: [{ axis: 'career', startMonth: '2030-01' }] }, [
      { kind: 'face', evidence: 'x', dynamic: 'y', reef: null, remedy: null, citations: [] },
    ])
    expect(gaps).toContain('events<5')
    expect(gaps).toContain('events.near<2')
    expect(gaps).toContain('events.axis<3')
    expect(gaps).toContain('face.citations<4')
  })

  it('flags palms missing a hand and bare part-enum locus', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'palms',
        evidence: 'x',
        dynamic: 'y',
        reef: null,
        remedy: null,
        citations: [
          { locus: 'palm_l', featureKey: 'lifeLine', part: 'palm_l', note: 'a' },
          { locus: '感情线', featureKey: 'heartLine', part: 'palm_l', note: 'b' },
        ],
      },
    ])
    expect(gaps).toContain('palms.missing_innate_or_acquired')
    expect(gaps).toContain('citations.locus_is_part_enum')
  })

  it('flags natal without future years and natal echoing period', () => {
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
        kind: 'period',
        evidence: shared,
        dynamic: 'z',
        reef: null,
        remedy: null,
        citations: [],
      },
    ])
    expect(gaps).toContain('natal.future_thin')
    expect(gaps).toContain('natal.dup_period')
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
          citations: [
            { locus: 'tianTing', featureKey: 'tianTing', note: 'a' },
            { locus: 'yinTang', featureKey: 'yinTang', note: 'b' },
          ],
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
        citations: [
          { locus: '印堂', featureKey: 'yinTang', note: '开阔微杂' },
          { locus: '天庭', featureKey: 'tianTing', note: '微平' },
        ],
      },
    ])
    expect(gaps.some((g) => g.startsWith('field.dynamic_eq_evidence'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('field.reef_echo'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('field.remedy_echo'))).toBe(true)
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

  it('flags 流年 reef sprayed into ≥2 non-period chapters', () => {
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

  it('flags dynamic restating goldenLine and citation note pasting the body', () => {
    const golden = '印堂开阔气色偏杂情绪易起伏'
    const evidence =
      '印堂开阔气色偏杂情绪易起伏，需在关键节点稳住心气，这段证据足够长用来测试引用回声检测。'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'face',
        goldenLine: golden,
        evidence,
        dynamic: `${golden}，因此近半年宜先稳后进不宜冒进以免情绪牵动判断`,
        reef: null,
        remedy: null,
        citations: [{ locus: '印堂', featureKey: 'yinTang', note: '印堂开阔气色偏杂情绪易起伏' }],
      },
    ])
    expect(gaps.some((g) => g.startsWith('field.dynamic_eq_golden'))).toBe(true)
    expect(gaps.some((g) => g.startsWith('cite.note_echo_body'))).toBe(true)
  })

  it('flags face breadth (<5 distinct loci) and palms missing life/heart line', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'face',
        evidence: 'x',
        dynamic: 'y',
        reef: null,
        remedy: null,
        citations: [
          { locus: '天庭', featureKey: 'tianTing', note: 'a' },
          { locus: '印堂', featureKey: 'yinTang', note: 'b' },
        ],
      },
      {
        kind: 'palms',
        evidence: 'x',
        dynamic: 'y',
        reef: null,
        remedy: null,
        citations: [
          { locus: '生命线', featureKey: 'lifeLine', part: 'palm_l', note: 'a' },
          { locus: '智慧线', featureKey: 'headLine', part: 'palm_r', note: 'b' },
        ],
      },
    ])
    expect(gaps).toContain('cite.face_breadth')
    expect(gaps).toContain('palms.missing_life_or_heart_line')
  })

  it('flags period collapsing into advice (the ch5≈ch6 bug)', () => {
    const shared = '近半年宜先稳后进不宜冒进以免情绪牵动判断这段话足够长用于回声检测'
    const gaps = faceoracleDensityGaps({ events: [] }, [
      { kind: 'period', evidence: 'a', dynamic: shared, reef: null, remedy: null, citations: [] },
      { kind: 'advice', evidence: 'b', dynamic: shared, reef: null, remedy: null, citations: [] },
    ])
    expect(gaps).toContain('period.dup_advice')
  })

  it('flags advice that carries no actionable per-axis steps', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      { kind: 'advice', evidence: 'x', dynamic: 'y', reef: null, remedy: null, citations: [] },
    ])
    expect(gaps).toContain('advice.not_actionable')
  })

  it('flags thin one-liner evidence/dynamic fields (deepen trigger)', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'face',
        evidence: '短评',
        dynamic: '这里稍微长一点但仍不足四十字的动态描述',
        reef: null,
        remedy: null,
        citations: [],
      },
    ])
    expect(gaps).toContain('field.thin_evidence:face')
    expect(gaps).toContain('field.thin_dynamic:face')
  })

  it('does NOT emit any caution word gap (caution is log-only, never a retry gate)', () => {
    const gaps = faceoracleDensityGaps({ events: [] }, [
      {
        kind: 'face',
        evidence: 'x',
        dynamic: 'y',
        reef: null,
        remedy: null,
        citations: [{ locus: '天庭', featureKey: 'tianTing', note: '饱满圆润主早年有靠' }],
      },
    ])
    expect(gaps.some((g) => g.startsWith('cite.caution'))).toBe(false)
  })
})

describe('faceoracleCautionObservations (log-only)', () => {
  it('observes when face notes name no tension, and stays silent when they do', () => {
    const absent = faceoracleCautionObservations([
      {
        kind: 'face',
        citations: [{ note: '天庭饱满主早年有靠' }, { note: '准头圆厚聚财有力' }],
      },
    ])
    expect(absent).toContain('caution_word_absent:face')

    const present = faceoracleCautionObservations([
      {
        kind: 'face',
        citations: [{ note: '印堂偏杂情绪易波动，宜留意' }],
      },
    ])
    expect(present).not.toContain('caution_word_absent:face')
  })
})
