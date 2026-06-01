export type BondRadarDimensionKey = 'long_term' | 'attraction' | 'communication' | 'emotional'

export type BondRadarDimension = {
  key: BondRadarDimensionKey
  name: string
  score: number | null
  maxScore: number | null
  note: string | null
  isLocked: boolean
}

export type BondRadarLabels = Record<BondRadarDimensionKey, string>

export type BondRadarPalette = {
  accent: string
  secondary: string
  separator: string
}
