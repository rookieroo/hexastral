import { getFourPillars, calculateHeHun, lunarToSolar, getTrueSolarTime } from '@zhop/astro-core'
import { getColdReading } from '../../lib/cold-readings'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod/v4'
import type { AppEnv } from '../../infra-types'

export const onboardingChartRoutes = new Hono<AppEnv>()

const personSchema = z.object({
  solarDate: z.string(),
  timeIndex: z.number().int().min(0).max(12),
  isLunar: z.boolean().optional(),
  isLeapMonth: z.boolean().optional(),
  useTrueSolarTime: z.boolean().optional(),
  exactTime: z.string().optional(),
  gender: z.enum(['男', '女', 'male', 'female']).default('male'),
  name: z.string().optional(),
  birthCity: z.string().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional()
})

const TIME_INDEX_TO_HOUR: Record<number, number> = {
  0: 23, 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11,
  7: 13, 8: 15, 9: 17, 10: 19, 11: 21, 12: 12,
}

function parseDateInput(person: z.infer<typeof personSchema>) {
  const parts = person.solarDate.split('-').map(Number)
  let year = parts[0] ?? 1990
  let month = parts[1] ?? 1
  let day = parts[2] ?? 1
  let hour = TIME_INDEX_TO_HOUR[person.timeIndex] ?? 12

  if (person.isLunar) {
    const solarD = lunarToSolar(year, month, day, person.isLeapMonth)
    year = solarD.getFullYear()
    month = solarD.getMonth() + 1
    day = solarD.getDate()
  }

  if (person.useTrueSolarTime && person.exactTime && person.longitude) {
    const [exactH, exactM] = person.exactTime.split(':').map(Number)
    if (exactH !== undefined && exactM !== undefined) {
      // Construct a naive date object to pass to getTrueSolarTime
      const dateForCalc = new Date(year, month - 1, day, exactH, exactM)
      const { date: corrected } = getTrueSolarTime(dateForCalc, person.longitude)
      year = corrected.getFullYear()
      month = corrected.getMonth() + 1
      day = corrected.getDate()
      hour = corrected.getHours()
    }
  }

  return { year, month, day, hour }
}

onboardingChartRoutes.post('/basic', zValidator('json', personSchema), async (c) => {
  const person = c.req.valid('json')
  const input = parseDateInput(person)
  const pillars = getFourPillars(input)
  const dayMaster = pillars.day.stem
  const monthBranch = pillars.month.branch
  const coldReading = getColdReading(dayMaster, monthBranch)

  return c.json({ pillars, dayMaster, monthBranch, coldReading })
})

const hehunInputSchema = z.object({
  personA: personSchema,
  personB: personSchema
})

onboardingChartRoutes.post('/compatibility', zValidator('json', hehunInputSchema), async (c) => {
  const { personA, personB } = c.req.valid('json')
  const inputA = parseDateInput(personA)
  const inputB = parseDateInput(personB)

  const pillarsA = getFourPillars(inputA)
  const pillarsB = getFourPillars(inputB)
  const result = calculateHeHun(pillarsA, pillarsB)

  return c.json({
    score: result.score,
    grade: result.gradeLabel,
    personA: { dayMaster: pillarsA.day.stem, pillars: pillarsA },
    personB: { dayMaster: pillarsB.day.stem, pillars: pillarsB },
    highlights: result.highlights.slice(0, 3),
  })
})
