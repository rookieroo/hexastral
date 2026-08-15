import { describe, expect, test } from 'bun:test'
import { auspiceRoutes, pushVariation, renderAuspicePush } from './auspice'

// The handlers only read query params + @zhop/astro-core (no db / env / rate-limit),
// so the sub-app can be exercised directly via .request() without bindings.

describe('GET /api/auspice/day', () => {
  test('returns a full deterministic AlmanacDay envelope', async () => {
    const res = await auspiceRoutes.request('/day?date=2026-06-12')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.date).toBe('2026-06-12')

    const { day } = body.data
    expect(day.ganZhi).toBe('丁巳') // huangli.com: 丁巳日
    expect(day.mansion.name).toBe('娄') // huangli.com: 西方娄金狗
    expect(day.dayOfficer).toBe('闭')
    expect(Array.isArray(day.goodFor)).toBe(true)
    // SPAM-19 rename: server emits `clashAnimal` (not `zodiac`) to keep
    // reviewer-visible payloads free of Western-astrology vocabulary.
    expect(day.clash).toEqual({ branch: '亥', clashAnimal: '猪' }) // 巳日冲亥(猪)
    expect(day.evilDirection).toBe('东') // 巳酉丑日 煞东
    expect(day.hours).toHaveLength(12)
    expect(day.solarTerm.prev.name).toBeDefined()
    expect(day.solarTerm.next.name).toBeDefined()
    // Sprint 2 Tier-1 audit #7: next 节气 ships with a second-level UTC instant
    // (C.1.8 VSOP87) the client renders in local time.
    expect(day.solarTerm.next.instant).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(day.solarTerm.prev.instant).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    // Sprint 2 Tier-1 audit #5: year pillar (立春-aware). June 12 2026 is past
    // 立春, so the year pillar is 丙午 (生肖 马 / Horse).
    expect(day.yearGanZhi).toEqual({ stem: '丙', branch: '午', animal: '马' })
    // Sprint 2 Tier-1 audit #8: 农历 (lunarDate) ships with month / day numbers,
    // localized monthName + dayName (with "闰" prefix when applicable), and the
    // glance-significant `isFirst` (初一) / `isFifteenth` (十五) booleans.
    // 2026 has no leap month — `isLeap` must be false.
    expect(day.lunarDate.year).toBe(2026)
    expect(typeof day.lunarDate.month).toBe('number')
    expect(day.lunarDate.month).toBeGreaterThanOrEqual(1)
    expect(day.lunarDate.month).toBeLessThanOrEqual(12)
    expect(typeof day.lunarDate.day).toBe('number')
    expect(day.lunarDate.day).toBeGreaterThanOrEqual(1)
    expect(day.lunarDate.day).toBeLessThanOrEqual(30)
    expect(day.lunarDate.isLeap).toBe(false)
    expect(typeof day.lunarDate.monthName).toBe('string')
    expect(typeof day.lunarDate.dayName).toBe('string')
    expect(day.lunarDate.isFirst).toBe(day.lunarDate.day === 1)
    expect(day.lunarDate.isFifteenth).toBe(day.lunarDate.day === 15)

    // Forward-compat placeholders for C.3 / C.4.
    expect(body.data.personalization).toBeNull()
    // No birth subject → no personalized hook (the generic no-八字 corpus is a later slice).
    expect(body.data.dailyHook).toBeNull()
    expect(body.data.explanation).toBeNull()
  })

  test('defaults to today (UTC) when no date is given', async () => {
    const res = await auspiceRoutes.request('/day')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('rejects an impossible calendar date', async () => {
    const res = await auspiceRoutes.request('/day?date=2026-02-31')
    expect(res.status).toBe(400)
  })

  test('fills a deterministic personalization block when birthDate is given', async () => {
    const res = await auspiceRoutes.request('/day?date=2026-06-12&birthDate=1990-08-15')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.personalization).not.toBeNull()
    expect(typeof body.data.personalization.dayMaster).toBe('string')
    expect(['吉', '平', '凶']).toContain(body.data.personalization.fit)
    expect(Array.isArray(body.data.personalization.reasons)).toBe(true)
    // Sprint 2 Tier-1 audit #10: `benming` is true when birth-year branch
    // matches the current year-pillar branch. 1990 is 庚午年 (post-立春),
    // 2026 is 丙午年 (post-立春) — both 午, so this user is in their 本命年.
    expect(body.data.personalization.benming).toBe(true)
    // Daily hook (en slice): a birthDate subject gets a personalized corpus one-liner
    // (the non-CJK DAU hook), keyed deterministically so push + home echo the same line.
    expect(body.data.dailyHook).not.toBeNull()
    expect(typeof body.data.dailyHook.title).toBe('string')
    expect(body.data.dailyHook.title.length).toBeGreaterThan(0)
    expect(typeof body.data.dailyHook.lens).toBe('string')
    expect(body.data.dailyHook.hookKey).toMatch(/^(support|output|wealth|pressure|peer):/)
    // explanation stays a placeholder — the LLM (C.4) is never in this deterministic path
    expect(body.data.explanation).toBeNull()
  })
})

describe('renderAuspicePush — daily hook (en slice)', () => {
  const ymd = { year: 2026, month: 6, day: 12 } // 丁巳日
  const mkSub = (over: Record<string, unknown>) =>
    ({ locale: 'en', birthDate: '1990-08-15', isPro: false, ...over }) as unknown as Parameters<
      typeof renderAuspicePush
    >[2]

  test('anonymous with birth still gets public 黄历 (no personal hook)', () => {
    const msg = renderAuspicePush('morning', ymd, mkSub({ locale: 'en' }))
    expect(msg).not.toBeNull()
    expect(msg?.body).toMatch(/Good|Avoid|—/)
    expect(msg?.data.hookKey).toBeUndefined()
  })

  test('signed-in en morning push leads with the hook, not the 干支 day-label', () => {
    const msg = renderAuspicePush(
      'morning',
      ymd,
      mkSub({ locale: 'en', portfolioUserId: 'user_test' })
    )
    expect(msg).not.toBeNull()
    // Title is the English corpus hook — NOT the raw 干支 "丁巳"/"… day" label; the body
    // is the natural-language lens (no 宜/Good list).
    expect(msg?.title).toBeTruthy()
    expect(msg?.title).not.toMatch(/[一-鿿]/)
    expect(msg?.body).not.toMatch(/Good|Avoid/)
    expect(msg?.data.type).toBe('auspice_daily')
    expect(typeof msg?.data.hookKey).toBe('string')
  })

  test('en morning push without a birthDate falls back to the legacy 宜忌 body', () => {
    const msg = renderAuspicePush('morning', ymd, mkSub({ birthDate: null }))
    expect(msg).not.toBeNull()
    // No subject → no hook → legacy path (the body carries the 宜/忌 list).
    expect(msg?.body).toMatch(/Good|Avoid|—/)
    expect(msg?.data.hookKey).toBeUndefined()
  })

  test('zh-Hans morning body stays CJK; en null mode → modern gloss', () => {
    const zh = renderAuspicePush('morning', ymd, mkSub({ locale: 'zh-Hans', yijiMode: null }))
    expect(zh?.body).toMatch(/宜/)
    expect(zh?.body).toMatch(/[一-鿿]/)

    const en = renderAuspicePush(
      'morning',
      ymd,
      mkSub({ locale: 'en', birthDate: null, yijiMode: null })
    )
    // en + null mode → modern English glosses in the legacy body path.
    expect(en?.body).toMatch(/Good|Avoid/)
  })

  test('zh push 宜忌 follows the 黄历原声 voice switch', () => {
    // classical → 原文动词（绝无白话词）；contemporary（默认）→ 白话动词（绝无原文词）。
    const classical = renderAuspicePush(
      'morning',
      ymd,
      mkSub({ locale: 'zh-Hans', voiceMode: 'classical' })
    )
    expect(classical?.body).toMatch(/宜/)
    expect(classical?.body).not.toMatch(/结婚|开业|签约|搬家|入住|开工|就医/)

    const contemporary = renderAuspicePush('morning', ymd, mkSub({ locale: 'zh-Hans' }))
    expect(contemporary?.body).toMatch(/宜/)
    expect(contemporary?.body).not.toMatch(/嫁娶|开市|立券|移徙|入宅/)

    // 原文订阅者连「对你而言」现代标题都去掉 — 推送保持纯行话。
    const signedClassical = renderAuspicePush(
      'morning',
      ymd,
      mkSub({ locale: 'zh-Hans', voiceMode: 'classical', portfolioUserId: 'u1' })
    )
    expect(signedClassical?.title).not.toMatch(/对你而言|For you/)
    expect(signedClassical?.title).toMatch(/[一-鿿]/)
  })

  test('en evening heads-up no longer repeats "Tomorrow" in the body', () => {
    // Jun 19 2026 = 端午 (festivalToday), so the evening fires regardless of fit — lets us
    // assert the dedup without depending on a 吉/凶 day. Old body was "Tomorrow: …".
    // Evening personal fit is Pro-gated; use isPro so the evening path still renders.
    const msg = renderAuspicePush(
      'evening',
      { year: 2026, month: 6, day: 19 },
      mkSub({ isPro: true, portfolioUserId: 'user_test' })
    )
    expect(msg).not.toBeNull()
    expect(msg?.title).toBe('Tomorrow')
    expect(msg?.body).not.toMatch(/Tomorrow/)
  })

  test('zh morning push is unchanged — keeps 干支日 + 宜忌', () => {
    const msg = renderAuspicePush('morning', ymd, mkSub({ locale: 'zh-Hans' }))
    expect(msg).not.toBeNull()
    expect(msg?.title).toContain('丁巳日') // zh still leads with the 干支日 label
    expect(msg?.body).toContain('宜')
    expect(msg?.data.hookKey).toBeUndefined() // zh path untouched this slice
  })
})

describe('pushVariation — free push repetition guard', () => {
  test('deterministic per device+date', () => {
    expect(pushVariation('device-a', '2026-06-12')).toEqual(pushVariation('device-a', '2026-06-12'))
  })

  test('verbs stay within 3-5 and the picks spread across a month', () => {
    const seen = new Set<string>()
    for (let i = 1; i <= 30; i++) {
      const date = `2026-06-${String(i).padStart(2, '0')}`
      const v = pushVariation('device-a', date)
      expect([3, 4, 5]).toContain(v.verbs)
      expect(['none', 'dayGod', 'pengZu', 'mansion']).toContain(v.extra)
      seen.add(`${v.verbs}:${v.withClash}:${v.extra}`)
    }
    // Not the same variant every single day — the rotation actually moves.
    expect(seen.size).toBeGreaterThan(1)
  })

  test('the extra clause pool rotates across a month', () => {
    const extras = new Set<string>()
    for (let i = 1; i <= 30; i++) {
      const date = `2026-06-${String(i).padStart(2, '0')}`
      extras.add(pushVariation('device-a', date).extra)
    }
    expect(extras.size).toBeGreaterThan(1)
  })

  test('different devices on the same day spread across variants', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 12; i++) {
      const v = pushVariation(`device-${i}`, '2026-06-12')
      seen.add(`${v.verbs}:${v.withClash}`)
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  test('offset walks the variant space deterministically (repeat-guard fallback)', () => {
    const base = pushVariation('device-a', '2026-06-12', 0)
    const seen = new Set<string>()
    for (let off = 0; off < 24; off++) {
      const v = pushVariation('device-a', '2026-06-12', off)
      expect([3, 4, 5]).toContain(v.verbs)
      seen.add(`${v.verbs}:${v.withClash}:${v.extra}`)
      expect(pushVariation('device-a', '2026-06-12', off)).toEqual(v) // stable
    }
    // The offset chain covers more than one distinct variant.
    expect(seen.size).toBeGreaterThan(1)
    // offset 1 is not the base variant.
    expect(pushVariation('device-a', '2026-06-12', 1)).not.toEqual(base)
  })

  test('zh morning body carries the 冲煞 clause only when the variation picks it; en never CJK', () => {
    const ymd = { year: 2026, month: 6, day: 12 }
    const zh = renderAuspicePush('morning', ymd, {
      locale: 'zh-Hans',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-zh',
    })
    const en = renderAuspicePush('morning', ymd, {
      locale: 'en',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-en',
    })
    const v = pushVariation('device-zh', '2026-06-12')
    if (v.withClash) expect(zh?.body).toMatch(/冲.煞/)
    else expect(zh?.body).not.toMatch(/冲.煞/)
    expect(en?.body).not.toMatch(/[一-鿿]/)
  })

  test('signed-in zh body adds the rotating corpus hook; anonymous stays bare', () => {
    const ymd = { year: 2026, month: 6, day: 12 }
    const anon = renderAuspicePush('morning', ymd, {
      locale: 'zh-Hans',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-zh',
    })
    const signed = renderAuspicePush('morning', ymd, {
      locale: 'zh-Hans',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-zh',
      portfolioUserId: 'user_test',
    })
    expect(signed?.title).toContain('丁巳日') // 干支-led convention stays
    expect(signed?.body).toContain('宜')
    // The hook line is the only difference between the two tiers for this device.
    expect(signed?.body.length).toBeGreaterThan(anon?.body.length ?? 0)
    expect(signed?.body).not.toBe(anon?.body)
  })

  test('variationOffset shifts the rendered body (guard fallback path)', () => {
    const ymd = { year: 2026, month: 6, day: 12 }
    const sub = {
      locale: 'zh-Hans',
      birthDate: '1990-08-15',
      isPro: false,
      deviceId: 'device-zh',
    }
    const base = renderAuspicePush('morning', ymd, sub, 0)
    const seen = new Set<string>()
    for (let off = 0; off < 24; off++) {
      const m = renderAuspicePush('morning', ymd, sub, off)
      expect(m?.title).toContain('丁巳日')
      seen.add(`${m?.title}|${m?.body}`)
    }
    // The offset chain yields more than one distinct rendering.
    expect(seen.size).toBeGreaterThan(1)
    // The guard's exact success condition: some offset escapes the base body.
    const escapes = Array.from({ length: 23 }, (_, i) => i + 1).some(
      (off) => JSON.stringify(renderAuspicePush('morning', ymd, sub, off)) !== JSON.stringify(base)
    )
    expect(escapes).toBe(true)
  })
})

describe('GET /api/auspice/month', () => {
  test('returns a batch month payload with per-day 农历 + 节气 marks + rating', async () => {
    const res = await auspiceRoutes.request('/month?year=2026&month=6')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.year).toBe(2026)
    expect(body.data.month).toBe(6)
    expect(typeof body.data.lunarMonthHeader).toBe('string')
    expect(body.data.lunarMonthHeader.length).toBeGreaterThan(0)
    // June 2026 has 30 days
    expect(body.data.days).toHaveLength(30)
    // First day shape sanity
    const d1 = body.data.days[0]
    expect(d1.day).toBe(1)
    expect(d1.date).toBe('2026-06-01')
    expect(typeof d1.lunarDay).toBe('number')
    expect(typeof d1.lunarDayName).toBe('string')
    expect(typeof d1.isLunarFirst).toBe('boolean')
    expect(typeof d1.isLunarFifteenth).toBe('boolean')
    expect(typeof d1.isLeapMonth).toBe('boolean')
    expect([1, 2, 3, 4, 5]).toContain(d1.overallRating)
    // 芒种 falls on Jun 5-6 and 夏至 on Jun 21-22 in 2026 — exactly one 节气
    // name should appear among the days. (We don't assert specific gregorian
    // days to avoid coupling the test to VSOP87 sub-day boundary calls.)
    const termDays = body.data.days.filter(
      (d: { solarTermName: string | null }) => d.solarTermName !== null
    )
    expect(termDays.length).toBeGreaterThanOrEqual(1)
    expect(termDays.length).toBeLessThanOrEqual(3)
  })

  test('rejects out-of-range year / month', async () => {
    const r1 = await auspiceRoutes.request('/month?year=1899&month=6')
    expect(r1.status).toBe(400)
    const r2 = await auspiceRoutes.request('/month?year=2026&month=13')
    expect(r2.status).toBe(400)
  })

  test('zh-Hans public holidays: 春节 on Feb 17, 国庆 on Oct 1', async () => {
    const feb = await (
      await auspiceRoutes.request('/month?year=2026&month=2&locale=zh-Hans')
    ).json()
    expect(feb.data.locale).toBe('zh-Hans')
    const chunjie = feb.data.days.find((d: { day: number }) => d.day === 17)
    expect(chunjie.publicHoliday).toBe('春节')
    const oct = await (
      await auspiceRoutes.request('/month?year=2026&month=10&locale=zh-Hans')
    ).json()
    const guoqing = oct.data.days.find((d: { day: number }) => d.day === 1)
    expect(guoqing.publicHoliday).toBe('国庆')
    // Random non-holiday day stays null.
    const ordinary = oct.data.days.find((d: { day: number }) => d.day === 15)
    expect(ordinary.publicHoliday).toBeNull()
  })

  test('ja public holidays: 建国記念の日 Feb 11, 春分の日 (solar-term)', async () => {
    const feb = await (await auspiceRoutes.request('/month?year=2026&month=2&locale=ja')).json()
    expect(feb.data.locale).toBe('ja')
    const kenkoku = feb.data.days.find((d: { day: number }) => d.day === 11)
    expect(kenkoku.publicHoliday).toBe('建国記念の日')
    // 春分の日 falls on the gregorian day of 春分 — verify there's exactly
    // one day in March that has the holiday + matches 春分 solar term.
    const mar = await (await auspiceRoutes.request('/month?year=2026&month=3&locale=ja')).json()
    const shunbun = mar.data.days.find(
      (d: { publicHoliday: string | null }) => d.publicHoliday === '春分の日'
    )
    expect(shunbun).toBeDefined()
    expect(shunbun.solarTermName).toBe('春分')
  })

  test('en public holidays: Chinese festivals in English (no US holidays)', async () => {
    // EN locale mirrors the 8 cultural festivals — NOT US federal holidays.
    // 端午 (Dragon Boat Festival) 2026 lands on the gregorian Jun 19.
    const jun = await (await auspiceRoutes.request('/month?year=2026&month=6&locale=en')).json()
    const duanwu = jun.data.days.find(
      (d: { publicHoliday: string | null }) => d.publicHoliday === 'Dragon Boat Festival'
    )
    expect(duanwu).toBeDefined()
    expect(duanwu.day).toBe(19)
    // US holidays must NOT leak into the EN calendar — Juneteenth (also Jun 19)
    // and Independence Day (Jul 4) were the worst offenders pre-cleanup.
    const jul = await (await auspiceRoutes.request('/month?year=2026&month=7&locale=en')).json()
    const jul4 = jul.data.days.find((d: { day: number }) => d.day === 4)
    expect(jul4.publicHoliday).toBeNull()
    const nov = await (await auspiceRoutes.request('/month?year=2026&month=11&locale=en')).json()
    const thx = nov.data.days.find(
      (d: { publicHoliday: string | null }) => d.publicHoliday === 'Thanksgiving'
    )
    expect(thx).toBeUndefined()
  })

  test('defaults to zh-Hans when no locale is provided', async () => {
    const res = await (await auspiceRoutes.request('/month?year=2026&month=10')).json()
    expect(res.data.locale).toBe('zh-Hans')
    expect(res.data.days.find((d: { day: number }) => d.day === 1).publicHoliday).toBe('国庆')
  })
})

describe('GET /api/auspice/search', () => {
  test('returns up to 3 days ranked by fitness, with reasoning', async () => {
    const res = await auspiceRoutes.request('/search?event=wedding&from=2026-06-01&to=2026-06-30')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.event).toBe('wedding')
    expect(body.data.top.length).toBeGreaterThan(0)
    expect(body.data.top.length).toBeLessThanOrEqual(3)

    // Scores are sorted descending.
    const scores = body.data.top.map((t: { score: number }) => t.score)
    expect([...scores].sort((a: number, b: number) => b - a)).toEqual(scores)

    // A 30-day window always contains a 嫁娶-favourable day, so the top pick is recommended
    // and its reasoning surfaces the matched 宜 verb. Default register = 白话 (结婚);
    // scoring payload stays canonical (嫁娶).
    expect(body.data.top[0].recommended).toBe(true)
    expect(body.data.top[0].reasoning).toContain('宜结婚')
    expect(body.data.top[0].day.goodFor).toContain('嫁娶')
  })

  test('voiceMode=classical renders 原文 verbs in reasoning (zh)', async () => {
    const res = await auspiceRoutes.request(
      '/search?event=wedding&from=2026-06-01&to=2026-06-30&voiceMode=classical'
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.top[0].reasoning).toContain('宜嫁娶')
    expect(body.data.top[0].day.goodFor).toContain('嫁娶')
  })

  test('rejects an unbounded range', async () => {
    const res = await auspiceRoutes.request('/search?event=travel&from=2026-01-01&to=2026-12-31')
    expect(res.status).toBe(400)
  })

  test('hot-word alias 相亲 resolves to wedding scoring', async () => {
    const res = await auspiceRoutes.request(
      '/search?event=%E7%9B%B8%E4%BA%B2&from=2026-06-01&to=2026-06-30'
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.event).toBe('wedding')
    expect(body.data.top[0].day.goodFor).toContain('嫁娶')
  })

  test('locale=en formats reasoning with modern display verbs', async () => {
    const res = await auspiceRoutes.request(
      '/search?event=wedding&from=2026-06-01&to=2026-06-30&locale=en'
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.top[0].reasoning).toMatch(/宜Wedding|宜嫁娶/)
    // Scoring payload stays canonical.
    expect(body.data.top[0].day.goodFor).toContain('嫁娶')
  })
})

// Sprint 2 deliverable #3 — 4 specialized 择日 routes. Each is a thin wrapper
// over the generic ranking pipeline with activity-tuned officer boosts that
// nudge the score toward 建除十二神 classically auspicious for the activity.
// Sprint 3 chunk 1 — /festivals page batch endpoint. One request feeds both
// the 24 节气 timeline and the 8-festival list.
describe('GET /api/auspice/year-overview', () => {
  test('returns 24 solar terms + 8 festivals for a valid year', async () => {
    const res = await auspiceRoutes.request('/year-overview?year=2026')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.year).toBe(2026)
    expect(body.data.solarTerms).toHaveLength(24)
    expect(body.data.festivals).toHaveLength(8)
    // 立春 in gregorian 2026 lands early February. Lookup by name (not
    // positional index — astro-core enumerates the year's terms in gregorian
    // calendar order, so 立春's index isn't 0).
    const lichun = body.data.solarTerms.find((t: { name: string }) => t.name === '立春')
    expect(lichun).toBeDefined()
    expect(lichun.date).toMatch(/^2026-02-/)
    expect(lichun.instant).toMatch(/^2026-/)
    // The 8 festival IDs are stable + sorted by gregorian date.
    const ids = body.data.festivals.map((f: { id: string }) => f.id)
    expect(new Set(ids)).toEqual(
      new Set([
        'chunjie',
        'yuanxiao',
        'qingming',
        'duanwu',
        'qixi',
        'zhongqiu',
        'chongyang',
        'dongzhi',
      ])
    )
    const dates = body.data.festivals.map((f: { solarDate: string }) => f.solarDate)
    expect([...dates].sort()).toEqual(dates)
    // 春节 2026 = 农历正月初一 (Feb 17, 2026 per the public almanac).
    const chunjie = body.data.festivals.find((f: { id: string }) => f.id === 'chunjie')
    expect(chunjie.solarDate).toBe('2026-02-17')
    expect(chunjie.kind).toBe('lunar')
    expect(chunjie.lunarLabel).toBe('正月初一')
    // 清明 + 冬至 are solar-term-anchored, lunarLabel = null.
    const qingming = body.data.festivals.find((f: { id: string }) => f.id === 'qingming')
    expect(qingming.kind).toBe('solar-term')
    expect(qingming.lunarLabel).toBeNull()
  })

  test('rejects out-of-range year', async () => {
    const r1 = await auspiceRoutes.request('/year-overview?year=1899')
    expect(r1.status).toBe(400)
    const r2 = await auspiceRoutes.request('/year-overview?year=2101')
    expect(r2.status).toBe(400)
  })
})

describe('GET /api/auspice/{wedding,move-in,business,travel}', () => {
  const cases: Array<{
    path: string
    event: string
    goodOfficers: ReadonlySet<string>
  }> = [
    { path: '/wedding', event: 'wedding', goodOfficers: new Set(['成', '定']) },
    { path: '/move-in', event: 'move-in', goodOfficers: new Set(['定', '开', '建']) },
    { path: '/business', event: 'business', goodOfficers: new Set(['开', '收']) },
    { path: '/travel', event: 'travel', goodOfficers: new Set(['除', '开']) },
  ]

  for (const tc of cases) {
    test(`${tc.path} returns ranked dates with the right event tag`, async () => {
      const res = await auspiceRoutes.request(`${tc.path}?from=2026-06-01&to=2026-06-30`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.data.event).toBe(tc.event)
      expect(body.data.range).toEqual({ from: '2026-06-01', to: '2026-06-30' })
      expect(body.data.top.length).toBeGreaterThan(0)
      expect(body.data.top.length).toBeLessThanOrEqual(3)
      // Scores stable, sorted desc.
      const scores = body.data.top.map((t: { score: number }) => t.score)
      expect([...scores].sort((a: number, b: number) => b - a)).toEqual(scores)
    })
  }

  test('/wedding ranking differs from generic /search?event=wedding (officer boost applied)', async () => {
    // The specialized route emits activity-tuned reasoning when its top pick
    // hits a `成` or `定` officer; the generic route doesn't. At least one of
    // the top-3 picks from /wedding in a 30-day window will exercise this.
    const r1 = await auspiceRoutes.request('/wedding?from=2026-06-01&to=2026-06-30')
    const b1 = await r1.json()
    const reasonings: string[] = b1.data.top.map((t: { reasoning: string }) => t.reasoning)
    // At least one of the specialized reasonings carries the officer-tuned tag.
    const hasTunedTag = reasonings.some((r: string) => r.includes('相宜') || r.includes('相避'))
    expect(hasTunedTag).toBe(true)
  })

  test('rejects out-of-range span on specialized routes', async () => {
    const res = await auspiceRoutes.request('/travel?from=2026-01-01&to=2026-12-31')
    expect(res.status).toBe(400)
  })
})
