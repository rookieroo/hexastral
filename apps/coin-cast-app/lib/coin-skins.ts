import AsyncStorage from '@react-native-async-storage/async-storage'
import * as THREE from 'three'

import { createCoinEdgeTextures } from '@/components/casting-scene/coinCapTextures'
import {
  LOGO_COIN_BACK,
  LOGO_COIN_BUMP,
  LOGO_COIN_FACE,
} from '@/lib/coin-skin-assets'
import { getImagePixelSize } from '@/lib/coin-skin-upload'

const STORAGE_KEY = 'coincast_coin_skin_v3'

export type CoinSkinMode = 'logo' | 'custom'

export interface CoinSkinConfig {
  mode: CoinSkinMode
  /** Persistent file URI (documentDirectory) when mode === 'custom'. */
  customObverseUri?: string
}

export const DEFAULT_COIN_SKIN: CoinSkinConfig = { mode: 'logo' }

/** Logo-aligned bronze surface — matches app mark palette. */
export const LOGO_COIN_SURFACE = {
  edge: '#5a4d3e',
  yang: '#c2b18e',
  yin: '#3b3226',
  edgeRoughness: 0.66,
  yangRoughness: 0.74,
  yinRoughness: 0.78,
  edgeMetalness: 0.24,
  yangMetalness: 0.19,
  yinMetalness: 0.16,
  bumpScale: 0.07,
} as const

function cacheKey(config: CoinSkinConfig): string {
  if (config.mode === 'logo') return 'logo'
  return `custom:${config.customObverseUri ?? ''}`
}

function parseStoredConfig(raw: string | null): CoinSkinConfig | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'mode' in parsed &&
      (parsed.mode === 'logo' || parsed.mode === 'custom')
    ) {
      const cfg = parsed as CoinSkinConfig
      if (cfg.mode === 'custom' && typeof cfg.customObverseUri === 'string') {
        return cfg
      }
      if (cfg.mode === 'logo') return { mode: 'logo' }
    }
  } catch {
    // fall through — legacy string ids
  }
  return null
}

/** Any legacy skin id or v2 preset → logo default. */
function migrateLegacySkinId(raw: string): CoinSkinConfig {
  void raw
  return DEFAULT_COIN_SKIN
}

export async function getCoinSkinConfig(): Promise<CoinSkinConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const parsed = parseStoredConfig(raw)
    if (parsed) return parsed

    const legacyV2 = await AsyncStorage.getItem('coincast_coin_skin_v2')
    if (legacyV2) {
      const migrated = migrateLegacySkinId(legacyV2)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      return migrated
    }
    const legacyV1 = await AsyncStorage.getItem('coincast_coin_skin_v1')
    if (legacyV1) {
      const migrated = migrateLegacySkinId(legacyV1)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      return migrated
    }
  } catch (err) {
    console.warn('[coin-skins] read failed', err)
  }
  return DEFAULT_COIN_SKIN
}

export async function setCoinSkinConfig(config: CoinSkinConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (err) {
    console.warn('[coin-skins] write failed', err)
  }
}

const materialCache = new Map<string, THREE.MeshStandardMaterial[]>()
const loadCache = new Map<string, Promise<THREE.MeshStandardMaterial[]>>()

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

/** Scale texture to fit cap UV without cropping (letterbox via repeat/offset). */
export function applyContainTextureMapping(
  texture: THREE.Texture,
  imageWidth: number,
  imageHeight: number
): void {
  const maxDim = Math.max(imageWidth, imageHeight)
  const rw = imageWidth / maxDim
  const rh = imageHeight / maxDim
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(rw, rh)
  texture.offset.set((1 - rw) / 2, (1 - rh) / 2)
  texture.needsUpdate = true
}

function buildMaterialsFromMaps(
  obverseMap: THREE.Texture,
  reverseMap: THREE.Texture,
  bumpMap: THREE.Texture,
  alphaMap: THREE.Texture
): THREE.MeshStandardMaterial[] {
  const preset = LOGO_COIN_SURFACE
  const { edgeMap } = createCoinEdgeTextures({
    id: 'logo',
    edge: preset.edge,
    yang: preset.yang,
    yin: preset.yin,
  })

  return [
    new THREE.MeshStandardMaterial({
      color: preset.edge,
      map: edgeMap,
      roughness: preset.edgeRoughness,
      metalness: preset.edgeMetalness,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: reverseMap,
      bumpMap,
      bumpScale: preset.bumpScale * 0.55,
      alphaMap,
      transparent: true,
      alphaTest: 0.06,
      roughness: preset.yangRoughness,
      metalness: preset.yangMetalness,
    }),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: obverseMap,
      bumpMap,
      bumpScale: preset.bumpScale,
      alphaMap,
      transparent: true,
      alphaTest: 0.06,
      roughness: preset.yinRoughness,
      metalness: preset.yinMetalness,
    }),
  ]
}

async function loadLogoTextures(): Promise<{
  obverse: THREE.Texture
  reverse: THREE.Texture
  bump: THREE.Texture
  alpha: THREE.Texture
}> {
  const { loadAsync } = await import('expo-three')
  const [obverse, reverse, bump] = await Promise.all([
    loadAsync(LOGO_COIN_FACE),
    loadAsync(LOGO_COIN_BACK),
    loadAsync(LOGO_COIN_BUMP),
  ])
  configureCapTexture(obverse)
  configureCapTexture(reverse)
  configureBumpTexture(bump)
  const alpha = obverse.clone()
  configureCapTexture(alpha)
  return { obverse, reverse, bump, alpha }
}

/** Load cap materials for logo default or a user-uploaded face (contain fit, no crop). */
export async function loadCoinSkinMaterials(
  config: CoinSkinConfig = DEFAULT_COIN_SKIN
): Promise<THREE.MeshStandardMaterial[]> {
  const key = cacheKey(config)
  const cached = materialCache.get(key)
  if (cached) return cached

  const inflight = loadCache.get(key)
  if (inflight) return inflight

  const promise = (async () => {
    const logo = await loadLogoTextures()
    let obverseMap = logo.obverse
    let reverseMap = logo.reverse

    if (config.mode === 'custom' && config.customObverseUri) {
      const { loadAsync } = await import('expo-three')
      const custom = await loadAsync(config.customObverseUri)
      configureCapTexture(custom)
      const { width, height } = await getImagePixelSize(config.customObverseUri)
      applyContainTextureMapping(custom, width, height)
      obverseMap = custom
      reverseMap = custom
    }

    const materials = buildMaterialsFromMaps(
      obverseMap,
      reverseMap,
      logo.bump,
      logo.alpha
    )
    materialCache.set(key, materials)
    return materials
  })()

  loadCache.set(key, promise)
  try {
    return await promise
  } finally {
    loadCache.delete(key)
  }
}

/** @deprecated Use `loadCoinSkinMaterials`. */
export function createCoinSkinMaterials(): THREE.MeshStandardMaterial[] {
  const cached = materialCache.get('logo')
  if (cached) return cached
  void loadCoinSkinMaterials(DEFAULT_COIN_SKIN)
  const preset = LOGO_COIN_SURFACE
  const { edgeMap } = createCoinEdgeTextures({
    id: 'logo',
    edge: preset.edge,
    yang: preset.yang,
    yin: preset.yin,
  })
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

/** Clear GPU material cache after skin change. */
export function invalidateCoinSkinMaterialCache(): void {
  materialCache.clear()
  loadCache.clear()
}
