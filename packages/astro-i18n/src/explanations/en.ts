/**
 * @zhop/astro-i18n — explanations dictionary (en)
 *
 * One-line teaching captions, ≤80 chars each. Used by iOS beginner mode
 * to render greyed-out hint text under each canonical token.
 */

import type { ExplanationDict } from '../types-explanations'

export const explanationsEn: ExplanationDict = {
  element: {
    金: 'Metal — righteousness, structure, autumn, west; resolute personality',
    木: 'Wood — benevolence, growth, spring, east; warm and aspiring nature',
    水: 'Water — wisdom, flow, winter, north; clever and adaptive mind',
    火: 'Fire — propriety, radiance, summer, south; passionate and outgoing',
    土: 'Earth — trust, stability, transitions, center; grounded and reliable',
  },

  shishen: {
    比肩: 'Same yin/yang as Day Master — peers, siblings, partners',
    劫财: 'Opposite yin/yang same element — competition, rivalry, lost wealth',
    食神: 'Day Master generates, same polarity — talent, food, gentle output',
    伤官: 'Day Master generates, opposite polarity — rebellion, creativity',
    偏财: 'Day Master controls, same polarity — windfalls, side income',
    正财: 'Day Master controls, opposite polarity — stable income, spouse (M)',
    七杀: 'Controls Day Master, same polarity — pressure, challenge, authority',
    正官: 'Controls Day Master, opposite polarity — career, status, husband (F)',
    偏印: 'Generates Day Master, same polarity — niche skills, solitude',
    正印: 'Generates Day Master, opposite polarity — mother, learning, support',
  },

  stem: {
    甲: 'Yang Wood — towering tree, upright and ambitious, climbs high',
    乙: 'Yin Wood — vine and grass, flexible, survives by leveraging force',
    丙: 'Yang Fire — blazing sun, brilliant and influential, openly bright',
    丁: 'Yin Fire — candle flame, warm and intimate, lights the dark',
    戊: 'Yang Earth — high mountain, stable, accommodating, grounded',
    己: 'Yin Earth — fertile field, gentle and nurturing, grows life',
    庚: 'Yang Metal — axe and iron, decisive, breaks and builds clearly',
    辛: 'Yin Metal — jewelry, refined and sharp, values external quality',
    壬: 'Yang Water — river and ocean, vast and bold, far-reaching ambition',
    癸: 'Yin Water — dew and spring, quiet wisdom, nourishes silently',
  },

  branch: {
    子: 'Yang within yin, 23-1, Rat, contains Gui (yin water)',
    丑: 'Yin Earth, 1-3, Ox, contains Ji-Gui-Xin',
    寅: 'Yang Wood, 3-5, Tiger, contains Jia-Bing-Wu',
    卯: 'Yin Wood, 5-7, Rabbit, contains Yi',
    辰: 'Yang Earth, 7-9, Dragon, contains Wu-Yi-Gui',
    巳: 'Yang Fire, 9-11, Snake, contains Bing-Geng-Wu',
    午: 'Yang within yin, 11-13, Horse, contains Ding-Ji',
    未: 'Yin Earth, 13-15, Goat, contains Ji-Ding-Yi',
    申: 'Yang Metal, 15-17, Monkey, contains Geng-Ren-Wu',
    酉: 'Yin Metal, 17-19, Rooster, contains Xin',
    戌: 'Yang Earth, 19-21, Dog, contains Wu-Xin-Ding',
    亥: 'Yang Water, 21-23, Pig, contains Ren-Jia',
  },

  geju: {
    正官格: 'Direct Officer pattern — steady career, social standing, honor',
    七杀格: 'Seven Killings pattern — bold and competitive, military or sports',
    正财格: 'Direct Wealth pattern — disciplined finance, stable marriage',
    偏财格: 'Indirect Wealth pattern — entrepreneurial, broad networks',
    食神格: 'Eating God pattern — talent, comfort, gentle and humble',
    伤官格: 'Hurting Officer pattern — gifted, distinctive, suits creative work',
    正印格: 'Direct Resource pattern — scholarly, mentor support, academia',
    偏印格: 'Indirect Resource pattern — niche expertise, mystical inclinations',
    建禄格: 'Established Salary — self-reliant, succeeds through independence',
    羊刃格: 'Ram Blade — sharp aggressive force, suits military, sports, finance',
    从弱格: 'Follow-the-Weak — extreme weakness yields to flow; great if obeyed',
    从强格: 'Follow-the-Strong — extreme strength stands alone; needs flow',
  },

  dayMasterStrength: {
    极强: 'Extreme strength — needs outlets via output or wealth, not support',
    偏强: 'Slightly strong — favors wealth/officer/output stars; avoid resource',
    中和: 'Balanced — most ideal; uses favorable element with equilibrium',
    偏弱: 'Slightly weak — favors resource and peer support; avoid drainage',
    极弱: 'Extreme weakness — best follows the dominant flow (Follow patterns)',
  },

  ziweiMajor: {
    紫微: 'Emperor Star — authority, leadership, high self-regard; central is best',
    天机: 'Mind Star — strategy, change, quick thinking; suits planning roles',
    太阳: 'Sun Star — fame, father, male elders; warm and outgoing',
    武曲: 'Wealth Star — finance, action, military bearing; finance/military',
    天同: 'Bliss Star — gentle, enjoyment, harmony; suits service industries',
    廉贞: 'Chastity Star — talent with complex emotions; arts or government',
    天府: 'Treasury Star — steady, conservative finance, calm leadership',
    太阴: 'Moon Star — mother, women, gentle and artistic',
    贪狼: 'Wolf Star — talent, social, desire and adventure',
    巨门: 'Gate Star — sharp speech, debate, suits oratory professions',
    天相: 'Seal Star — assistant role, suits supporting positions',
    天梁: 'Shade Star — longevity, mentor support; medicine, law, education',
    七杀: 'General Star — fierce, decisive, independent; entrepreneurship',
    破军: 'Breaker Star — pioneering, breaks the old; large changes, must lead',
  },

  ziweiAux: {
    文昌: 'Literary Brilliance — exams, writing, academic success',
    文曲: 'Literary Melody — eloquence, art, emotional expression',
    左辅: 'Left Assistant — steady male helper figures',
    右弼: 'Right Assistant — flexible female helper figures',
    天魁: 'Heavenly Mentor — male elder benefactor, turns peril to safety',
    天钺: 'Heavenly Maiden — female elder benefactor, turns peril to safety',
  },

  palace: {
    命宫: 'Self Palace — core personality, appearance, life pattern',
    兄弟: 'Siblings Palace — siblings, peer partners, recent collaborations',
    夫妻: 'Spouse Palace — partner traits, romantic style, marriage state',
    子女: 'Children Palace — children, creativity, subordinates',
    财帛: 'Wealth Palace — direct income, money management, financial view',
    疾厄: 'Health Palace — illness tendencies, physical constitution',
    迁移: 'Travel Palace — luck abroad, travel, external interaction style',
    奴仆: 'Friends Palace — social circle, employees, networks',
    官禄: 'Career Palace — career direction, promotion, work fit',
    田宅: 'Property Palace — real estate, home environment, family ambiance',
    福德: 'Fortune Palace — pleasures, hobbies, latent blessings',
    父母: 'Parents Palace — parental ties, elder rapport, supervisor support',
  },

  mutagen: {
    禄: 'Lu — wealth, popularity, abundance; smooth flow and accumulation',
    权: 'Quan — power, capability, control; amplified but can become rigid',
    科: 'Ke — fame, learning, mentors; lifts reputation and knowledge',
    忌: 'Ji — fixation, obstacles, attachment; brings tests and challenges',
  },

  brightness: {
    庙: 'Temple — strongest position; auspicious stars more so, malefic dampened',
    旺: 'Prosperous — strong force, clear effect, leverage actively',
    得: 'Settled — operates smoothly, moderately strong effect',
    利: 'Beneficial — workable but needs leverage, moderate effect',
    平: 'Neutral — average force, no notable benefit or harm',
    不: 'Insufficient — limited effect, benefic loses shine, malefic weakens',
    陷: 'Fallen — weakest, malefic intensifies, benefic struggles to manifest',
  },

  fiveElementsClass: {
    水二局: 'Water-2: clever and adaptive; cycles begin age 2, 10-year intervals',
    木三局: 'Wood-3: kind and aspiring; cycles begin age 3, 10-year intervals',
    金四局: 'Metal-4: resolute and decisive; cycles begin age 4, 10-year intervals',
    土五局: 'Earth-5: steady and grounded; cycles begin age 5, 10-year intervals',
    火六局: 'Fire-6: passionate and active; cycles begin age 6, 10-year intervals',
  },
}
