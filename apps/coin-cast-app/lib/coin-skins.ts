import AsyncStorage from '@react-native-async-storage/async-storage'
import * as THREE from 'three'

import { createCoinEdgeTextures } from '@/components/casting-scene/coinCapTextures'
import { COIN_BACK_SOURCES, COIN_FACE_SOURCES } from '@/lib/coin-skin-assets'

const STORAGE_KEY = 'coincast_coin_skin_v2'

/** 中华大五帝钱 — ink-wash vector faces from `scripts/wudi-coins.mjs`. */
export const COIN_SKIN_IDS = [
  'qin-banliang',
  'han-wuzhu',
  'tang-kaiyuan',
  'song-songyuan',
  'ming-yongle',
] as const

export type CoinSkinId = (typeof COIN_SKIN_IDS)[number]

export interface CoinSkinPreset {
  id: CoinSkinId
  labelKey:
    | 'skinQinBanliang'
    | 'skinHanWuzhu'
    | 'skinTangKaiyuan'
    | 'skinSongSongyuan'
    | 'skinMingYongle'
  edge: string
  yang: string
  yin: string
  edgeRoughness: number
  yangRoughness: number
  yinRoughness: number
  edgeMetalness: number
  yangMetalness: number
  yinMetalness: number
}

export const COIN_SKIN_PRESETS: Record<CoinSkinId, CoinSkinPreset> = {
  'qin-banliang': {
    id: 'qin-banliang',
    labelKey: 'skinQinBanliang',
    edge: '#5a5854',
    yang: '#d8d4cc',
    yin: '#4a4844',
    edgeRoughness: 0.72,
    yangRoughness: 0.78,
    yinRoughness: 0.88,
    edgeMetalness: 0.08,
    yangMetalness: 0.12,
    yinMetalness: 0.04,
  },
  'han-wuzhu': {
    id: 'han-wuzhu',
    labelKey: 'skinHanWuzhu',
    edge: '#3e5048',
    yang: '#b8c8bc',
    yin: '#3a4840',
    edgeRoughness: 0.74,
    yangRoughness: 0.8,
    yinRoughness: 0.9,
    edgeMetalness: 0.06,
    yangMetalness: 0.1,
    yinMetalness: 0.03,
  },
  'tang-kaiyuan': {
    id: 'tang-kaiyuan',
    labelKey: 'skinTangKaiyuan',
    edge: '#6a5430',
    yang: '#e8d4a8',
    yin: '#5a4820',
    edgeRoughness: 0.7,
    yangRoughness: 0.76,
    yinRoughness: 0.86,
    edgeMetalness: 0.1,
    yangMetalness: 0.14,
    yinMetalness: 0.05,
  },
  'song-songyuan': {
    id: 'song-songyuan',
    labelKey: 'skinSongSongyuan',
    edge: '#5a4828',
    yang: '#dcc8a0',
    yin: '#4a3820',
    edgeRoughness: 0.7,
    yangRoughness: 0.76,
    yinRoughness: 0.86,
    edgeMetalness: 0.09,
    yangMetalness: 0.13,
    yinMetalness: 0.04,
  },
  'ming-yongle': {
    id: 'ming-yongle',
    labelKey: 'skinMingYongle',
    edge: '#2e4038',
    yang: '#b8c8bc',
    yin: '#2a3830',
    edgeRoughness: 0.74,
    yangRoughness: 0.8,
    yinRoughness: 0.9,
    edgeMetalness: 0.06,
    yangMetalness: 0.1,
    yinMetalness: 0.03,
  },
}

export const DEFAULT_COIN_SKIN_ID: CoinSkinId = 'qin-banliang'

const LEGACY_SKIN_MAP: Record<string, CoinSkinId> = {
  'qing-tong': 'qin-banliang',
  kangxi: 'tang-kaiyuan',
  'tang-yin': 'tang-kaiyuan',
  'warring-states': 'qin-banliang',
  'imperial-lacquer': 'ming-yongle',
  taiji: 'qin-banliang',
  mu: 'han-wuzhu',
  huo: 'ming-yongle',
  jin: 'tang-kaiyuan',
  shui: 'han-wuzhu',
  tu: 'song-songyuan',
}

function isCoinSkinId(value: string): value is CoinSkinId {
  return (COIN_SKIN_IDS as readonly string[]).includes(value)
}

export async function getCoinSkinId(): Promise<CoinSkinId> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw && isCoinSkinId(raw)) return raw
    const legacy = await AsyncStorage.getItem('coincast_coin_skin_v1')
    if (legacy) {
      const mapped = LEGACY_SKIN_MAP[legacy] ?? DEFAULT_COIN_SKIN_ID
      await AsyncStorage.setItem(STORAGE_KEY, mapped)
      return mapped
    }
  } catch (err) {
    console.warn('[coin-skins] read failed', err)
  }
  return DEFAULT_COIN_SKIN_ID
}

export async function setCoinSkinId(id: CoinSkinId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id)
  } catch (err) {
    console.warn('[coin-skins] write failed', err)
  }
}

const materialCache = new Map<CoinSkinId, THREE.MeshStandardMaterial[]>()
const loadCache = new Map<CoinSkinId, Promise<THREE.MeshStandardMaterial[]>>()

function configureCapTexture(tex: THREE.Texture): void {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
}

/**
 * Cylinder material slots: [side, top cap (+Y), bottom cap (−Y)].
 * 摇卦 convention — top cap up ⇒ face 3 (背/幕面 = 阳); bottom cap up ⇒ face 2 (字面 = 阴).
 * So the reverse (幕) rides the top cap and the obverse (字) the bottom cap.
 */
function buildMaterialsFromMaps(
  skinId: CoinSkinId,
  obverseMap: THREE.Texture,
  reverseMap: THREE.Texture
): THREE.MeshStandardMaterial[] {
  const preset = COIN_SKIN_PRESETS[skinId]
  const { edgeMap } = createCoinEdgeTextures({
    id: preset.id,
    edge: preset.edge,
    yang: preset.yang,
    yin: preset.yin,
  })

  const materials = [
    new THREE.MeshStandardMaterial({
      color: preset.edge,
      map: edgeMap,
      roughness: preset.edgeRoughness,
      metalness: preset.edgeMetalness,
    }),
    // top cap (+Y) → face 3 → 背/幕面 (阳)
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: reverseMap,
      transparent: true,
      alphaTest: 0.06,
      roughness: preset.yangRoughness,
      metalness: preset.yangMetalness,
    }),
    // bottom cap (−Y) → face 2 → 字面 (阴)
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: obverseMap,
      transparent: true,
      alphaTest: 0.06,
      roughness: preset.yinRoughness,
      metalness: preset.yinMetalness,
    }),
  ]

  materialCache.set(skinId, materials)
  return materials
}

/** Load both cap faces (字面 + 幕面) and build coin materials (async — requires expo-three). */
export async function loadCoinSkinMaterials(
  skinId: CoinSkinId
): Promise<THREE.MeshStandardMaterial[]> {
  const cached = materialCache.get(skinId)
  if (cached) return cached

  const inflight = loadCache.get(skinId)
  if (inflight) return inflight

  const promise = (async () => {
    const { loadAsync } = await import('expo-three')
    const [obverseMap, reverseMap] = await Promise.all([
      loadAsync(COIN_FACE_SOURCES[skinId]),
      loadAsync(COIN_BACK_SOURCES[skinId]),
    ])
    configureCapTexture(obverseMap)
    configureCapTexture(reverseMap)
    return buildMaterialsFromMaps(skinId, obverseMap, reverseMap)
  })()

  loadCache.set(skinId, promise)
  try {
    return await promise
  } finally {
    loadCache.delete(skinId)
  }
}

/** @deprecated Sync path removed — use `loadCoinSkinMaterials`. Kept for typecheck callers during transition. */
export function createCoinSkinMaterials(skinId: CoinSkinId): THREE.MeshStandardMaterial[] {
  const cached = materialCache.get(skinId)
  if (cached) return cached
  void loadCoinSkinMaterials(skinId)
  const preset = COIN_SKIN_PRESETS[skinId]
  const capColors = {
    id: preset.id,
    edge: preset.edge,
    yang: preset.yang,
    yin: preset.yin,
  }
  const { edgeMap } = createCoinEdgeTextures(capColors)
  return [
    new THREE.MeshStandardMaterial({
      color: preset.edge,
      map: edgeMap,
      roughness: preset.edgeRoughness,
      metalness: preset.edgeMetalness,
    }),
    new THREE.MeshStandardMaterial({
      color: preset.yang,
      roughness: preset.yangRoughness,
      metalness: preset.yangMetalness,
    }),
    new THREE.MeshStandardMaterial({
      color: preset.yin,
      roughness: preset.yinRoughness,
      metalness: preset.yinMetalness,
    }),
  ]
}
