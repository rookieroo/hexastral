/**
 * Classical 日签 (文言 register) — the 「黄历原声」 replacement for the
 * contemporary daily tips. Cultural-reference register: classical phrasing,
 * almanac vocabulary, no prediction claims. Day-of-year indexed → deterministic,
 * rotates without repeats (~30 days) like the contemporary set.
 */

import type { Locale } from '@/lib/i18n'

const TIPS: Record<'zh-Hans' | 'zh-Hant', readonly string[]> = {
  'zh-Hans': [
    '日有定规，事有次序，缓行则安。',
    '宜扫尘除旧，室净则心明。',
    '昨夜之思，留于昨夜；今日之事，始于今朝。',
    '言寡尤，行寡悔，禄在其中矣。',
    '晨起整衣冠，出门有礼数，诸事自顺。',
    '欲速则不达，见小利则大事不成。',
    '静以修身，俭以养德，明志致远。',
    '与人为善，福虽未至，祸已远行。',
    '日中则昃，月盈则亏，谦受益也。',
    '饮食有节，起居有常，不妄作劳。',
    '凡事豫则立，不豫则废。',
    '君子终日乾乾，夕惕若厉，无咎。',
    '积善之家，必有余庆。',
    '己所不欲，勿施于人。',
    '三人行，必有我师焉。',
    '工欲善其事，必先利其器。',
    '岁不我与，寸阴是竞。',
    '千里之行，始于足下。',
    '合抱之木，生于毫末。',
    '知人者智，自知者明。',
    '慎终如始，则无败事。',
    '流水不腐，户枢不蠹。',
    '天行有常，不为尧存，不为桀亡。',
    '道虽迩，不行不至；事虽小，不为不成。',
    '不积跬步，无以至千里。',
    '锲而不舍，金石可镂。',
    '君子和而不同，小人同而不和。',
    '见贤思齐焉，见不贤而内自省也。',
    '岁寒，然后知松柏之后凋也。',
    '逝者如斯夫，不舍昼夜。',
  ],
  'zh-Hant': [
    '日有定規，事有次序，緩行則安。',
    '宜掃塵除舊，室淨則心明。',
    '昨夜之思，留於昨夜；今日之事，始於今朝。',
    '言寡尤，行寡悔，祿在其中矣。',
    '晨起整衣冠，出門有禮數，諸事自順。',
    '欲速則不達，見小利則大事不成。',
    '靜以修身，儉以養德，明志致遠。',
    '與人為善，福雖未至，禍已遠行。',
    '日中則昃，月盈則虧，謙受益也。',
    '飲食有節，起居有常，不妄作勞。',
    '凡事豫則立，不豫則廢。',
    '君子終日乾乾，夕惕若厲，無咎。',
    '積善之家，必有餘慶。',
    '己所不欲，勿施於人。',
    '三人行，必有我師焉。',
    '工欲善其事，必先利其器。',
    '歲不我與，寸陰是競。',
    '千里之行，始於足下。',
    '合抱之木，生於毫末。',
    '知人者智，自知者明。',
    '慎終如始，則無敗事。',
    '流水不腐，戶樞不蠹。',
    '天行有常，不為堯存，不為桀亡。',
    '道雖邇，不行不至；事雖小，不為不成。',
    '不積跬步，無以至千里。',
    '鍥而不捨，金石可鏤。',
    '君子和而不同，小人同而不和。',
    '見賢思齊焉，見不賢而內自省也。',
    '歲寒，然後知松柏之後凋也。',
    '逝者如斯夫，不捨晝夜。',
  ],
}

/** Deterministic classical tip for a date — day-of-year indexed. */
export function classicalDailyTip(date: string, locale: Locale): string {
  const list = TIPS[locale === 'zh-Hant' ? 'zh-Hant' : 'zh-Hans'] ?? TIPS['zh-Hans']
  const day = new Date(`${date}T00:00:00Z`)
  const start = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  const dayOfYear = Math.floor((day.getTime() - start.getTime()) / 86_400_000)
  return list[dayOfYear % list.length] ?? list[0] ?? ''
}
