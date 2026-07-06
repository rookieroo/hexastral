import type { CoinSkinId } from '@/lib/coin-skins'

/** 中华大五帝钱 · 正面(字面) — 水墨印章矢量临摹 (`docs/design/coins/wudi-ink-*.svg`). */
export const COIN_FACE_SOURCES: Record<CoinSkinId, number> = {
  'qin-banliang': require('../assets/coins/faces/qin-banliang.png'),
  'han-wuzhu': require('../assets/coins/faces/han-wuzhu.png'),
  'tang-kaiyuan': require('../assets/coins/faces/tang-kaiyuan.png'),
  'song-songyuan': require('../assets/coins/faces/song-songyuan.png'),
  'ming-yongle': require('../assets/coins/faces/ming-yongle.png'),
}

/** 中华大五帝钱 · 背面(幕面) — 光背 + 星月纹 (`docs/design/coins/wudi-ink-*-back.svg`). */
export const COIN_BACK_SOURCES: Record<CoinSkinId, number> = {
  'qin-banliang': require('../assets/coins/faces/qin-banliang-back.png'),
  'han-wuzhu': require('../assets/coins/faces/han-wuzhu-back.png'),
  'tang-kaiyuan': require('../assets/coins/faces/tang-kaiyuan-back.png'),
  'song-songyuan': require('../assets/coins/faces/song-songyuan-back.png'),
  'ming-yongle': require('../assets/coins/faces/ming-yongle-back.png'),
}
