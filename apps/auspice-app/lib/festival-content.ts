/**
 * Festival / 节气 content registry + routing helpers.
 *
 * Long-form entries live under `lib/culture/festivals/` (one file per entry).
 * The detail page (`app/festival/[id].tsx`) renders registry matches; otherwise
 * it shows a "coming soon" placeholder.
 */

import {
  CHONGYANG,
  CHUNFEN,
  CHUNJIE,
  DASHU,
  DONGZHI,
  DUANWU,
  type FestivalContent,
  GUYU,
  JINGZHE,
  LICHUN,
  LIXIA,
  MANGZHONG,
  QINGMING,
  QIXI,
  XIAOMAN,
  XIAOSHU,
  XIAZHI,
  YUANXIAO,
  YUSHUI,
  ZHONGQIU,
} from './culture/festivals'

export type {
  FestivalContent,
  FestivalContentKind,
  LocalizedSection,
} from './culture/festivals/schema'

const REGISTRY: Record<string, FestivalContent> = {
  [CHUNJIE.id]: CHUNJIE,
  [ZHONGQIU.id]: ZHONGQIU,
  [LICHUN.id]: LICHUN,
  [DUANWU.id]: DUANWU,
  [YUANXIAO.id]: YUANXIAO,
  [QINGMING.id]: QINGMING,
  [QIXI.id]: QIXI,
  [CHONGYANG.id]: CHONGYANG,
  [DONGZHI.id]: DONGZHI,
  // 节气 (jieqi-*) — 立春 ships in lichun.ts; the rest fill in by season.
  [YUSHUI.id]: YUSHUI,
  [JINGZHE.id]: JINGZHE,
  [CHUNFEN.id]: CHUNFEN,
  [GUYU.id]: GUYU,
  [LIXIA.id]: LIXIA,
  [XIAOMAN.id]: XIAOMAN,
  [MANGZHONG.id]: MANGZHONG,
  [XIAZHI.id]: XIAZHI,
  [XIAOSHU.id]: XIAOSHU,
  [DASHU.id]: DASHU,
}

/**
 * 24 节气 → pinyin. Used on /glossary and home chips to route to
 * `/festival/jieqi-{pinyin}`. 清明 + 冬至 use festival ids instead.
 */
export const JIEQI_PINYIN: Readonly<Record<string, string>> = {
  立春: 'lichun',
  雨水: 'yushui',
  惊蛰: 'jingzhe',
  春分: 'chunfen',
  清明: 'qingming',
  谷雨: 'guyu',
  立夏: 'lixia',
  小满: 'xiaoman',
  芒种: 'mangzhong',
  夏至: 'xiazhi',
  小暑: 'xiaoshu',
  大暑: 'dashu',
  立秋: 'liqiu',
  处暑: 'chushu',
  白露: 'bailu',
  秋分: 'qiufen',
  寒露: 'hanlu',
  霜降: 'shuangjiang',
  立冬: 'lidong',
  小雪: 'xiaoxue',
  大雪: 'daxue',
  冬至: 'dongzhi',
  小寒: 'xiaohan',
  大寒: 'dahan',
}

export function solarTermTargetId(termName: string): string | null {
  if (termName === '清明') return 'qingming'
  if (termName === '冬至') return 'dongzhi'
  const py = JIEQI_PINYIN[termName]
  return py ? `jieqi-${py}` : null
}

export function getFestivalContent(id: string): FestivalContent | null {
  return REGISTRY[id] ?? null
}

/** First `n` characters of `body` followed by an ellipsis when truncated. */
export function previewBody(body: string, n: number): string {
  if (body.length <= n) return body
  return `${body.slice(0, n).trimEnd()}…`
}
