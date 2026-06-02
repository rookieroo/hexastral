import { wuxingColors } from '@zhop/hexastral-tokens/palette'

const STEM_WUXING: Record<string, keyof typeof wuxingColors> = {
  甲: 'wood',
  乙: 'wood',
  丙: 'fire',
  丁: 'fire',
  戊: 'earth',
  己: 'earth',
  庚: 'metal',
  辛: 'metal',
  壬: 'water',
  癸: 'water',
}

const WUXING_CHAR: Record<string, keyof typeof wuxingColors> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
}

export function stemAccent(stem: string, fallback: string): string {
  const key = STEM_WUXING[stem]
  return key ? wuxingColors[key].accent : fallback
}

export function elementAccent(char: string, fallback: string): string {
  const byChar = WUXING_CHAR[char]
  if (byChar) return wuxingColors[byChar].accent
  const byStem = STEM_WUXING[char]
  return byStem ? wuxingColors[byStem].accent : fallback
}
