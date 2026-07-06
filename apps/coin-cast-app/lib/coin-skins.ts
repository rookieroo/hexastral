import AsyncStorage from '@react-native-async-storage/async-storage'
import * as THREE from 'three'

import { createYaoCapTexture } from '@/components/casting-scene/coinCapTextures'

const STORAGE_KEY = 'coincast_coin_skin_v1'

export const COIN_SKIN_IDS = [
  'qing-tong',
  'kangxi',
  'tang-yin',
  'warring-states',
  'imperial-lacquer',
] as const

export type CoinSkinId = (typeof COIN_SKIN_IDS)[number]

export interface CoinSkinPreset {
  id: CoinSkinId
  /** i18n key under coin-cast strings */
  labelKey:
    | 'skinQingTong'
    | 'skinKangxi'
    | 'skinTangYin'
    | 'skinWarringStates'
    | 'skinImperialLacquer'
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

/** Five distinguishable yang/yin cap palettes — edge / yang (+Y) / yin (-Y). */
export const COIN_SKIN_PRESETS: Record<CoinSkinId, CoinSkinPreset> = {
  'qing-tong': {
    id: 'qing-tong',
    labelKey: 'skinQingTong',
    edge: '#7a6348',
    yang: '#c9b08a',
    yin: '#3d3024',
    edgeRoughness: 0.46,
    yangRoughness: 0.34,
    yinRoughness: 0.78,
    edgeMetalness: 0.24,
    yangMetalness: 0.32,
    yinMetalness: 0.08,
  },
  kangxi: {
    id: 'kangxi',
    labelKey: 'skinKangxi',
    edge: '#a08050',
    yang: '#e8c890',
    yin: '#2a2018',
    edgeRoughness: 0.44,
    yangRoughness: 0.38,
    yinRoughness: 0.82,
    edgeMetalness: 0.18,
    yangMetalness: 0.22,
    yinMetalness: 0.05,
  },
  'tang-yin': {
    id: 'tang-yin',
    labelKey: 'skinTangYin',
    edge: '#9098a0',
    yang: '#e4e8ee',
    yin: '#3a424a',
    edgeRoughness: 0.4,
    yangRoughness: 0.32,
    yinRoughness: 0.7,
    edgeMetalness: 0.28,
    yangMetalness: 0.35,
    yinMetalness: 0.12,
  },
  'warring-states': {
    id: 'warring-states',
    labelKey: 'skinWarringStates',
    edge: '#5c4a38',
    yang: '#9a8060',
    yin: '#221a14',
    edgeRoughness: 0.78,
    yangRoughness: 0.72,
    yinRoughness: 0.88,
    edgeMetalness: 0.06,
    yangMetalness: 0.04,
    yinMetalness: 0.02,
  },
  'imperial-lacquer': {
    id: 'imperial-lacquer',
    labelKey: 'skinImperialLacquer',
    edge: '#6b5040',
    yang: '#c44a3a',
    yin: '#141210',
    edgeRoughness: 0.62,
    yangRoughness: 0.55,
    yinRoughness: 0.84,
    edgeMetalness: 0.08,
    yangMetalness: 0.06,
    yinMetalness: 0.04,
  },
}

export const DEFAULT_COIN_SKIN_ID: CoinSkinId = 'qing-tong'

function isCoinSkinId(value: string): value is CoinSkinId {
  return (COIN_SKIN_IDS as readonly string[]).includes(value)
}

export async function getCoinSkinId(): Promise<CoinSkinId> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw && isCoinSkinId(raw)) return raw
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

/** Cylinder materials: [edge, yang cap (+Y), yin cap (-Y)]. Cached per skin. */
export function createCoinSkinMaterials(skinId: CoinSkinId): THREE.MeshStandardMaterial[] {
  const cached = materialCache.get(skinId)
  if (cached) return cached

  const preset = COIN_SKIN_PRESETS[skinId]
  const capColors = { id: preset.id, edge: preset.edge, yang: preset.yang, yin: preset.yin }
  const yangMap = createYaoCapTexture('yang', capColors)
  const yinMap = createYaoCapTexture('yin', capColors)

  const materials = [
    new THREE.MeshStandardMaterial({
      color: preset.edge,
      roughness: preset.edgeRoughness,
      metalness: preset.edgeMetalness,
    }),
    new THREE.MeshStandardMaterial({
      color: preset.yang,
      map: yangMap,
      roughness: preset.yangRoughness,
      metalness: preset.yangMetalness,
    }),
    new THREE.MeshStandardMaterial({
      color: preset.yin,
      map: yinMap,
      roughness: preset.yinRoughness,
      metalness: preset.yinMetalness,
    }),
  ]

  materialCache.set(skinId, materials)
  return materials
}
