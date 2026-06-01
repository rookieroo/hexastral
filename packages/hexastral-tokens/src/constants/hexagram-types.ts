export type { Fortune } from './fortune'

/** 完整卦象数据（64 卦知识库） */
export interface HexagramData {
  number: number
  name: string
  pinyin: string
  symbol: string
  upperTrigram: string
  lowerTrigram: string
  judgment: string
  image: string
  judgmentExplain: string
  keywords: string[]
  fortune: import('./fortune').Fortune
  lines: string[]
}

/** 卦象列表项（精简） */
export interface HexagramListItem {
  number: number
  name: string
  pinyin: string
  symbol: string
  keywords: string[]
  fortune: import('./fortune').Fortune
}
