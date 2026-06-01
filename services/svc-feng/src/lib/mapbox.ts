/**
 * Mapbox Static Images API adapter.
 *
 * This is the **only** place that talks to Mapbox. The interface is small
 * enough that swapping to a different provider (MapTiler, self-hosted OSM,
 * etc.) is a contained change.
 *
 * V1 supports:
 *   - Satellite tiles (mapbox/satellite-v9)
 *   - Satellite + streets (mapbox/satellite-streets-v12)
 *   - Streets only (mapbox/streets-v12)
 *
 * Mapbox Static Images API reference:
 *   https://docs.mapbox.com/api/maps/static-images/
 *   Pattern: GET /styles/v1/{username}/{style_id}/static/{lng},{lat},{zoom},{bearing},{pitch}/{width}x{height}@2x?access_token={token}
 */

export type MapMode = 'satellite' | 'satellite-streets' | 'streets' | 'outdoors'

const STYLE_ID: Record<MapMode, string> = {
  satellite: 'mapbox/satellite-v9',
  'satellite-streets': 'mapbox/satellite-streets-v12',
  streets: 'mapbox/streets-v12',
  outdoors: 'mapbox/outdoors-v12',
}

export interface FetchMapInput {
  lat: number
  lng: number
  zoom: number
  /** Output pixel width (server bumps to @2x retina). */
  width: number
  /** Output pixel height (server bumps to @2x retina). */
  height: number
  mode: MapMode
  /** Bearing degrees (0 = north up). */
  bearing?: number
  /** Pitch degrees (0 = top-down). */
  pitch?: number
}

export interface FetchMapResult {
  bytes: ArrayBuffer
  contentType: string
}

const MAX_DIMENSION = 1280 // Mapbox cap on a single non-tiled request

export class MapboxError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'MapboxError'
  }
}

export async function fetchMapImage(input: FetchMapInput, token: string): Promise<FetchMapResult> {
  if (!token) {
    throw new MapboxError('MAPBOX_TOKEN missing', 500)
  }
  const w = Math.min(Math.round(input.width), MAX_DIMENSION)
  const h = Math.min(Math.round(input.height), MAX_DIMENSION)
  const style = STYLE_ID[input.mode]
  const bearing = input.bearing ?? 0
  const pitch = input.pitch ?? 0
  const url =
    `https://api.mapbox.com/styles/v1/${style}/static/` +
    `${input.lng},${input.lat},${input.zoom},${bearing},${pitch}/` +
    `${w}x${h}@2x?access_token=${encodeURIComponent(token)}&logo=false&attribution=false`

  const res = await fetch(url)
  if (!res.ok) {
    throw new MapboxError(`Mapbox responded ${res.status}: ${await res.text()}`, res.status)
  }
  return {
    bytes: await res.arrayBuffer(),
    contentType: res.headers.get('content-type') ?? 'image/png',
  }
}
