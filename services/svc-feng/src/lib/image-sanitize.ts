/**
 * Image metadata stripping — removes EXIF / GPS / XMP from user uploads.
 *
 * A phone photo of a floor plan can embed the home's GPS coordinates + device
 * info. We strip those before the bytes ever hit R2, for privacy + App Store
 * review hygiene:
 *   - JPEG: drop APP1..APP15 (EXIF/XMP/ICC) + COM; keep JFIF (APP0) + image data.
 *   - PNG:  drop eXIf / iTXt / tEXt / zTXt chunks; keep IHDR/PLTE/IDAT/IEND etc.
 *   - WebP: passed through (RIFF EXIF/XMP stripping not yet implemented; WebP is
 *           an uncommon floor-plan upload format). Callers should not claim WebP
 *           metadata is stripped.
 */

/** Read a 4-byte ASCII chunk/marker type. */
function ascii4(b: Uint8Array, off: number): string {
  return String.fromCharCode(b[off] ?? 0, b[off + 1] ?? 0, b[off + 2] ?? 0, b[off + 3] ?? 0)
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const ch of chunks) total += ch.length
  const out = new Uint8Array(total)
  let off = 0
  for (const ch of chunks) {
    out.set(ch, off)
    off += ch.length
  }
  return out
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PNG_META_CHUNKS = new Set(['eXIf', 'iTXt', 'tEXt', 'zTXt'])

/** Drop PNG metadata chunks (eXIf/iTXt/tEXt/zTXt); keep everything else verbatim. */
function stripPngMetadata(input: Uint8Array): Uint8Array {
  if (input.length < 8 || !PNG_SIG.every((v, i) => input[i] === v)) return input
  const out: Uint8Array[] = [input.subarray(0, 8)]
  let i = 8
  while (i + 12 <= input.length) {
    // length is a 32-bit big-endian unsigned; avoid <<24 sign issues.
    const len =
      (input[i] ?? 0) * 0x1000000 +
      ((input[i + 1] ?? 0) << 16) +
      ((input[i + 2] ?? 0) << 8) +
      (input[i + 3] ?? 0)
    const type = ascii4(input, i + 4)
    const chunkEnd = i + 12 + len // length + type(4) + data + crc(4)
    if (chunkEnd > input.length) {
      out.push(input.subarray(i)) // malformed tail — keep verbatim, stop
      i = input.length
      break
    }
    if (!PNG_META_CHUNKS.has(type)) out.push(input.subarray(i, chunkEnd))
    i = chunkEnd
    if (type === 'IEND') break
  }
  return concat(out)
}

/** Drop JPEG metadata segments (APP1..APP15 + COM); keep JFIF (APP0) + image data. */
function stripJpegMetadata(input: Uint8Array): Uint8Array {
  // Not a JPEG (no SOI marker) → nothing to strip.
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return input

  const chunks: Uint8Array[] = [input.subarray(0, 2)] // SOI
  let i = 2
  while (i + 4 <= input.length) {
    if (input[i] !== 0xff) break // not a marker → malformed; stop scanning
    const marker = input[i + 1] as number
    if (marker === 0xda) break // SOS — entropy-coded image data follows
    const len = ((input[i + 2] as number) << 8) | (input[i + 3] as number)
    if (len < 2) break
    const segEnd = i + 2 + len
    if (segEnd > input.length) break
    // APP1..APP15 (EXIF/XMP/ICC-in-APP2 etc.) + COM comment = metadata.
    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe
    if (!isMetadata) chunks.push(input.subarray(i, segEnd))
    i = segEnd
  }
  chunks.push(input.subarray(i)) // remainder (SOS + data + EOI) verbatim

  let total = 0
  for (const ch of chunks) total += ch.length
  const out = new Uint8Array(total)
  let off = 0
  for (const ch of chunks) {
    out.set(ch, off)
    off += ch.length
  }
  return out
}

export function sanitizeImageBytes(
  bytes: ArrayBuffer,
  contentType: string
): { bytes: ArrayBuffer; contentType: string } {
  const u8 = new Uint8Array(bytes)
  const isJpeg =
    contentType.includes('jpeg') ||
    contentType.includes('jpg') ||
    (u8.length >= 2 && u8[0] === 0xff && u8[1] === 0xd8)
  if (isJpeg) {
    // Tightly-sized ArrayBuffer (stripped owns its own buffer).
    return { bytes: stripJpegMetadata(u8).buffer as ArrayBuffer, contentType: 'image/jpeg' }
  }
  const isPng =
    contentType.includes('png') || (u8.length >= 8 && PNG_SIG.every((v, i) => u8[i] === v))
  if (isPng) {
    return { bytes: stripPngMetadata(u8).buffer as ArrayBuffer, contentType: 'image/png' }
  }
  // WebP / other — passed through (see file header).
  return { bytes, contentType }
}
