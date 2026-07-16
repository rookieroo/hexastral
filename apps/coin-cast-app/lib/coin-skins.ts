import AsyncStorage from '@react-native-async-storage/async-storage'
import * as THREE from 'three'

import { createCoinEdgeTextures } from '@/components/casting-scene/coinCapTextures'
import {
  COIN_BACK_SOURCES,
  COIN_BUMP_SOURCES,
  COIN_FACE_SOURCES,
} from '@/lib/coin-skin-assets'

const STORAGE_KEY = 'coincast_coin_skin_v2'

/** Dynasty keys shared across ink / rubbing / seal themes. */
export const COIN_DYNASTY_IDS = [
  'qin-banliang',
  'han-wuzhu',
  'tang-kaiyuan',
  'song-songyuan',
  'ming-yongle',
] as const

export type CoinDynastyId = (typeof COIN_DYNASTY_IDS)[number]

export type CoinSkinStyle = 'ink' | 'rubbing' | 'seal'

export const COIN_SKIN_STYLES: readonly CoinSkinStyle[] = ['ink', 'rubbing', 'seal']

/** 五帝钱 × 三主题 — 15 procedural skins. */
export const COIN_SKIN_IDS = COIN_DYNASTY_IDS.flatMap((dynastyId) =>
  COIN_SKIN_STYLES.map((style) => `${dynastyId}-${style}` as const)
)

export type CoinSkinId = (typeof COIN_SKIN_IDS)[number]

export interface CoinSkinPreset {
  id: CoinSkinId
  dynastyId: CoinDynastyId
  style: CoinSkinStyle
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
  /** bumpMap scale — higher = stronger cast relief under scene lights. */
  bumpScale: number
}

const DYNASTY_LABELS: Record<
  CoinDynastyId,
  CoinSkinPreset['labelKey']
> = {
  'qin-banliang': 'skinQinBanliang',
  'han-wuzhu': 'skinHanWuzhu',
  'tang-kaiyuan': 'skinTangKaiyuan',
  'song-songyuan': 'skinSongSongyuan',
  'ming-yongle': 'skinMingYongle',
}

/** Matte paper — bone rim, low metal. */
const INK_SURFACE = {
  edge: '#4a4036',
  yang: '#e0d6c4',
  yin: '#2a241c',
  edgeRoughness: 0.88,
  yangRoughness: 0.92,
  yinRoughness: 0.94,
  edgeMetalness: 0.04,
  yangMetalness: 0.02,
  yinMetalness: 0.02,
  bumpScale: 0.07,
} as const

/** Darker matte rubbing paper — heavier ink ground. */
const RUBBING_SURFACE = {
  edge: '#2a2824',
  yang: '#d8d0c0',
  yin: '#1a1814',
  edgeRoughness: 0.94,
  yangRoughness: 0.96,
  yinRoughness: 0.97,
  edgeMetalness: 0.02,
  yangMetalness: 0.01,
  yinMetalness: 0.01,
  bumpScale: 0.075,
} as const

/** Cinnabar seal — low metal warm edge. */
const SEAL_SURFACE = {
  edge: '#6a3028',
  yang: '#c8a098',
  yin: '#3a1814',
  edgeRoughness: 0.75,
  yangRoughness: 0.82,
  yinRoughness: 0.86,
  edgeMetalness: 0.12,
  yangMetalness: 0.08,
  yinMetalness: 0.06,
  bumpScale: 0.065,
} as const

const STYLE_SURFACES: Record<
  CoinSkinStyle,
  Omit<CoinSkinPreset, 'id' | 'dynastyId' | 'style' | 'labelKey'>
> = {
  ink: INK_SURFACE,
  rubbing: RUBBING_SURFACE,
  seal: SEAL_SURFACE,
}

function buildPresets(): Record<CoinSkinId, CoinSkinPreset> {
  const out = {} as Record<CoinSkinId, CoinSkinPreset>
  for (const dynastyId of COIN_DYNASTY_IDS) {
    for (const style of COIN_SKIN_STYLES) {
      const id = `${dynastyId}-${style}` as CoinSkinId
      out[id] = {
        id,
        dynastyId,
        style,
        labelKey: DYNASTY_LABELS[dynastyId],
        ...STYLE_SURFACES[style],
      }
    }
  }
  return out
}

export const COIN_SKIN_PRESETS: Record<CoinSkinId, CoinSkinPreset> = buildPresets()

export const DEFAULT_COIN_SKIN_ID: CoinSkinId = 'han-wuzhu-ink'

export function coinSkinIdFor(dynastyId: CoinDynastyId, style: CoinSkinStyle): CoinSkinId {
  return `${dynastyId}-${style}` as CoinSkinId
}

export function dynastyFromSkinId(id: CoinSkinId): CoinDynastyId {
  return COIN_SKIN_PRESETS[id].dynastyId
}

export function styleFromSkinId(id: CoinSkinId): CoinSkinStyle {
  return COIN_SKIN_PRESETS[id].style
}

const LEGACY_SKIN_MAP: Record<string, CoinSkinId> = {
  'qing-tong': 'qin-banliang-ink',
  kangxi: 'tang-kaiyuan-ink',
  'tang-yin': 'tang-kaiyuan-ink',
  'warring-states': 'qin-banliang-ink',
  'imperial-lacquer': 'ming-yongle-ink',
  taiji: 'qin-banliang-ink',
  mu: 'han-wuzhu-ink',
  huo: 'ming-yongle-ink',
  jin: 'tang-kaiyuan-ink',
  shui: 'han-wuzhu-ink',
  tu: 'song-songyuan-ink',
  // Legacy photo ids (no theme suffix) → ink
  'qin-banliang': 'qin-banliang-ink',
  'han-wuzhu': 'han-wuzhu-ink',
  'tang-kaiyuan': 'tang-kaiyuan-ink',
  'song-songyuan': 'song-songyuan-ink',
  'ming-yongle': 'ming-yongle-ink',
}

function isCoinSkinId(value: string): value is CoinSkinId {
  return (COIN_SKIN_IDS as readonly string[]).includes(value)
}

function normalizeStoredSkinId(raw: string): CoinSkinId | null {
  if (isCoinSkinId(raw)) return raw
  const mapped = LEGACY_SKIN_MAP[raw]
  if (mapped) return mapped
  return null
}

export async function getCoinSkinId(): Promise<CoinSkinId> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) {
      const normalized = normalizeStoredSkinId(raw)
      if (normalized) {
        if (normalized !== raw) await AsyncStorage.setItem(STORAGE_KEY, normalized)
        return normalized
      }
    }
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

function configureBumpTexture(tex: THREE.Texture): void {
  tex.colorSpace = THREE.NoColorSpace
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
  reverseMap: THREE.Texture,
  bumpMap: THREE.Texture
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
      bumpMap,
      bumpScale: preset.bumpScale * 0.55,
      transparent: true,
      alphaTest: 0.06,
      roughness: preset.yangRoughness,
      metalness: preset.yangMetalness,
    }),
    // bottom cap (−Y) → face 2 → 字面 (阴)
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: obverseMap,
      bumpMap,
      bumpScale: preset.bumpScale,
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
    const [obverseMap, reverseMap, bumpMap] = await Promise.all([
      loadAsync(COIN_FACE_SOURCES[skinId]),
      loadAsync(COIN_BACK_SOURCES[skinId]),
      loadAsync(COIN_BUMP_SOURCES[skinId]),
    ])
    configureCapTexture(obverseMap)
    configureCapTexture(reverseMap)
    configureBumpTexture(bumpMap)
    return buildMaterialsFromMaps(skinId, obverseMap, reverseMap, bumpMap)
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
