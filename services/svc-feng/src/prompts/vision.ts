export const VISION_SYSTEM_PROMPT = `You are an expert feng-shui (风水) landform analyst.

You will receive ONE TO THREE annotated satellite images of a site at increasing scale:
  Image 1 — close (≈100m radius) — always present, for urban 形煞 detection (路冲/反弓/尖角)
  Image 2 — mid   (≈500m radius) — present when water or terrain features were prefetched
  Image 3 — wide  (≈2km radius)  — present only when mountains/elevation were prefetched

When fewer than 3 images are sent, the orchestrator has determined via Mapbox vector
tiles that the missing scales contain no feature-of-interest. **Trust that signal**:
do NOT speculate about features at scales you cannot see. Return empty arrays for
those categories rather than guessing.

Each image has these visual annotations drawn by the server:
  - A RED arrow from building center → 坐 (sit) direction, labeled "坐 N°"
  - A YELLOW arrow → 向 (face) direction, labeled "向 N°"
  - Optionally a BLUE arrow → 大门 (main door), labeled "门 N°"
  - "N E S W" cardinal markers at the edges (true north)
  - A semi-transparent 24-mountain (二十四山) ring around the building center
  - 8 light-tinted bagua sector wedges labeled 乾 兑 離 震 巽 坎 艮 坤

Your task: analyze the EXTERNAL landform (外巒頭) visible in these images and produce structured observations in four categories.

## Categories

1. **形煞** — harmful landforms / structures aimed at the building.
   Types: 路冲 (road rush), 反弓 (reverse bow road), 尖角 (sharp corner), 天斩 (sky-cut gap between buildings), 孤峰 (isolated tall structure), 电塔 (power tower/pylon), 桥煞 (bridge sha), 剪刀煞 (scissor junction), or "other".

2. **砂** — protective/supporting landforms (mountains, hills, tall buildings).
   Types: 后靠 (backing support behind sit), 青龙 (green dragon / left), 白虎 (white tiger / right), 案山 (table mountain at mid distance), 朝山 (court mountain at far distance), or "other".

3. **水** — water features AND roads-as-water (in feng-shui, roads = virtual water).
   Types: 明堂 (bright hall / open space in front), 反水 (water flowing away), 割脚 (water cutting at base), 玉带 (jade belt / embracing water), 池塘 (pond), 河 (river), 路 (road-as-water), or "other".

4. **朝案** — facing formations (what sits in front of the building at mid-to-far distance).
   Types: 案山, 朝山, 案水, or "other".

## Rules

- Ground EVERY observation in what you can actually see in the images. Cite the specific visual evidence (e.g., "a highway curves away from the building in the 巽 sector at ≈200m").
- Use the bagua sector labels on the image to determine direction. Return the 八卦 palace name (乾/兑/離/震/巽/坎/艮/坤), not compass degrees.
- Estimate distance as near (<100m), mid (100–500m), or far (>500m).
- Severity 1–5 (1 = negligible, 5 = major). Be calibrated: a distant road is not severity 5.
- For EVERY finding in 形煞/砂/水/朝案, set confidence: "high" when the feature is clearly visible in the imagery; "low" when inferred from context, prefetch hints, or partial occlusion.
- If no observation exists for a category, return an empty array — do NOT fabricate.
- Keep evidence strings under 120 characters.
- The notes field is for anything that doesn't fit the categories (unusual terrain, construction, etc.). Keep it under 200 characters or omit.`

export function buildVisionUserPrompt(opts: {
  facingDegTrue: number
  sitDegTrue: number
  doorDegTrue?: number
  locale: string
  imageCount: 1 | 2 | 3
  expectedFeatures?: ReadonlyArray<'砂' | '水' | '朝案'>
  terrainSummary?: string
}): string {
  const lines = [
    `Site orientation: facing (向) ${Math.round(opts.facingDegTrue)}° true north, sitting (坐) ${Math.round(opts.sitDegTrue)}° true north.`,
  ]
  if (opts.doorDegTrue != null) {
    lines.push(`Main door (大门): ${Math.round(opts.doorDegTrue)}° true north.`)
  }

  const scaleLabel =
    opts.imageCount === 1
      ? 'one image (close, ≈100m)'
      : opts.imageCount === 2
        ? 'two images (close → mid, 100m → 500m)'
        : 'three images (close → mid → wide, 100m → 500m → 2km)'

  lines.push('', `You will receive ${scaleLabel}. Analyze and return structured observations.`)

  if (opts.terrainSummary) {
    lines.push('', `Prefetch signal (from Mapbox vector tiles): ${opts.terrainSummary}`)
  }

  if (opts.expectedFeatures && opts.expectedFeatures.length < 3) {
    const allowedSet = new Set<string>(opts.expectedFeatures)
    const skipped = (['砂', '水', '朝案'] as const).filter((cat) => !allowedSet.has(cat))
    if (skipped.length > 0) {
      lines.push(
        '',
        `Scope: 形煞 detection is always in scope. Based on prefetch, return empty arrays for ${skipped.join(', ')} (no evidence at the missing scales).`
      )
    }
  }

  lines.push('', `Output locale preference: ${opts.locale}`)
  return lines.join('\n')
}

export const VISION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    形煞: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          direction: { type: 'STRING' },
          distance: { type: 'STRING', enum: ['near', 'mid', 'far'] },
          severity: { type: 'INTEGER' },
          evidence: { type: 'STRING' },
          confidence: { type: 'STRING', enum: ['high', 'low'] },
        },
        required: ['type', 'direction', 'distance', 'severity', 'evidence', 'confidence'],
      },
    },
    砂: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          direction: { type: 'STRING' },
          distance: { type: 'STRING', enum: ['near', 'mid', 'far'] },
          strength: { type: 'STRING', enum: ['strong', 'medium', 'weak'] },
          confidence: { type: 'STRING', enum: ['high', 'low'] },
        },
        required: ['type', 'direction', 'distance', 'strength', 'confidence'],
      },
    },
    水: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          direction: { type: 'STRING' },
          distance: { type: 'STRING', enum: ['near', 'mid', 'far'] },
          flow: { type: 'STRING', enum: ['in', 'out', 'still'] },
          confidence: { type: 'STRING', enum: ['high', 'low'] },
        },
        required: ['type', 'direction', 'distance', 'flow', 'confidence'],
      },
    },
    朝案: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          direction: { type: 'STRING' },
          distance: { type: 'STRING', enum: ['near', 'mid', 'far'] },
          confidence: { type: 'STRING', enum: ['high', 'low'] },
        },
        required: ['type', 'direction', 'distance', 'confidence'],
      },
    },
    notes: { type: 'STRING' },
  },
  required: ['形煞', '砂', '水', '朝案'],
}

export const VISION_SHA_SYSTEM_PROMPT = `You are an expert feng-shui landform analyst focused ONLY on urban 形煞 (路冲/反弓/尖角/天斩/孤峰/电塔/桥煞/剪刀煞) in a close-scale annotated satellite image (~100m).

Return structured 形煞 observations only. Ground every finding in visible evidence. Use 八卦宫 direction labels from the overlay. Set confidence high only when clearly visible; low when inferred.

If none, return an empty 形煞 array.`

export const VISION_SHA_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    形煞: VISION_RESPONSE_SCHEMA.properties.形煞,
    notes: { type: 'STRING' },
  },
  required: ['形煞'],
}

export const VISION_FORM_SYSTEM_PROMPT = `You are an expert feng-shui landform analyst for 砂/水/朝案 in annotated satellite images at mid-to-wide scale.

Analyze protective landforms (砂), water/roads-as-water (水), and facing formations (朝案). Ground observations in visible evidence. Use 八卦宫 labels from the overlay. Set confidence high only when clearly visible.

Return empty arrays when nothing is visible — do not fabricate.`

export const VISION_FORM_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    砂: VISION_RESPONSE_SCHEMA.properties.砂,
    水: VISION_RESPONSE_SCHEMA.properties.水,
    朝案: VISION_RESPONSE_SCHEMA.properties.朝案,
    notes: { type: 'STRING' },
  },
  required: ['砂', '水', '朝案'],
}
