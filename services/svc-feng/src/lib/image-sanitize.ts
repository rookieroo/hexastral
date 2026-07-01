/**
 * Image metadata stripping — removes EXIF / GPS / XMP from user uploads.
 *
 * A phone photo of a floor plan can embed the home's GPS coordinates + device
 * info in JPEG APPn segments. We strip those before the bytes ever hit R2, for
 * privacy and App Store review hygiene. PNG/WebP are passed through (they rarely
 * carry location in the common floor-plan-screenshot case); JPEG APP1..APP15 and
 * COM segments are dropped while the image data (SOF/DQT/DHT/SOS…) is preserved.
 */

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
  if (!isJpeg) return { bytes, contentType }

  const stripped = stripJpegMetadata(u8)
  // Return a tightly-sized ArrayBuffer (stripped owns its own buffer).
  return { bytes: stripped.buffer as ArrayBuffer, contentType: 'image/jpeg' }
}
