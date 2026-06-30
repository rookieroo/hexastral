/**
 * Mapillary street-level imagery fetch (小峦头 形煞 source).
 *
 * Top-down satellite can't see eye-level 形煞 (天斩煞 between buildings, 尖角冲射,
 * 高压/电塔, 招牌/烟囱煞). Mapillary supplies street photos near the site; the VLM
 * reads 形煞 from them. Each image carries a `compass_angle` (camera heading) used
 * to bin findings into a 八卦宫 — we do NOT ask the VLM for site-relative geometry.
 *
 * Mapillary imagery is CC-BY-SA: attribution is required wherever surfaced.
 */

const GRAPH = 'https://graph.mapillary.com/images'

export interface StreetImage {
  id: string
  /** Camera heading in degrees (true north); 0 if unknown. */
  compassAngle: number
  base64: string
  mimeType: 'image/jpeg'
}

interface MapillaryImageMeta {
  id: string
  compass_angle?: number
  thumb_1024_url?: string
  geometry?: { coordinates?: [number, number] }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

/** Bucket meta by 45° octant and keep one per octant (direction diversity). */
function diversifyByOctant(metas: MapillaryImageMeta[], max: number): MapillaryImageMeta[] {
  const byOctant = new Map<number, MapillaryImageMeta>()
  for (const m of metas) {
    if (!m.thumb_1024_url) continue
    const oct = Math.round(((m.compass_angle ?? 0) % 360) / 45) % 8
    if (!byOctant.has(oct)) byOctant.set(oct, m)
    if (byOctant.size >= max) break
  }
  return [...byOctant.values()].slice(0, max)
}

export interface FetchStreetImagesInput {
  lat: number
  lng: number
  token: string
  /** Half-extent of the search box in degrees (~150m default). */
  bboxDeg?: number
  maxImages?: number
  signal?: AbortSignal
}

/** Fetch up to `maxImages` direction-diverse street photos near the site. */
export async function fetchStreetImages(input: FetchStreetImagesInput): Promise<StreetImage[]> {
  if (!input.token) return []
  const dLat = input.bboxDeg ?? 0.0015
  const dLng = dLat / Math.max(0.2, Math.cos((input.lat * Math.PI) / 180))
  const bbox = `${input.lng - dLng},${input.lat - dLat},${input.lng + dLng},${input.lat + dLat}`

  const url = new URL(GRAPH)
  url.searchParams.set('access_token', input.token)
  url.searchParams.set('fields', 'id,compass_angle,thumb_1024_url,geometry')
  url.searchParams.set('bbox', bbox)
  url.searchParams.set('limit', '40')

  const res = await fetch(url.toString(), { signal: input.signal })
  if (!res.ok) throw new Error(`mapillary images ${res.status}`)
  const data = (await res.json()) as { data?: MapillaryImageMeta[] }
  const picked = diversifyByOctant(data.data ?? [], input.maxImages ?? 4)

  const images = await Promise.all(
    picked.map(async (m): Promise<StreetImage | null> => {
      try {
        const imgRes = await fetch(m.thumb_1024_url as string, { signal: input.signal })
        if (!imgRes.ok) return null
        return {
          id: m.id,
          compassAngle: ((m.compass_angle ?? 0) % 360 + 360) % 360,
          base64: toBase64(await imgRes.arrayBuffer()),
          mimeType: 'image/jpeg',
        }
      } catch {
        return null
      }
    })
  )
  return images.filter((x): x is StreetImage => x !== null)
}

/** Required attribution string (Mapillary CC-BY-SA). */
export const MAPILLARY_ATTRIBUTION = 'Street imagery © Mapillary contributors (CC BY-SA)'
