// Compact moon phase glyph — same math as iPhone YuunPhaseLogo / watch-widget.

import SwiftUI

func hexColor(_ hex: String) -> Color {
  var s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
  if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
  var v: UInt64 = 0
  Scanner(string: s).scanHexInt64(&v)
  return Color(
    red: Double((v >> 16) & 0xff) / 255,
    green: Double((v >> 8) & 0xff) / 255,
    blue: Double(v & 0xff) / 255
  )
}

struct WatchPhaseLogo: View {
  let phase: Double

  var body: some View {
    Canvas { context, size in
      let side = min(size.width, size.height)
      let cx = side / 2
      let cy = side / 2
      let R = side * 0.42
      let moon = CGRect(x: cx - R, y: cy - R, width: R * 2, height: R * 2)

      var p = phase.truncatingRemainder(dividingBy: 1)
      if p < 0 { p += 1 }
      let isWaning = p > 0.5
      let cosPhase = cos(2 * Double.pi * p)
      let termPos = (1 + cosPhase) / 2
      let tilt = 22.0 * Double.pi / 180
      let sign: CGFloat = isWaning ? -1 : 1
      let gx1 = CGPoint(x: cx - sign * R * cos(tilt), y: cy - R * sin(tilt))
      let gx2 = CGPoint(x: cx + sign * R * cos(tilt), y: cy + R * sin(tilt))
      let pw = 0.42
      let s0 = max(0, termPos - pw * 0.55)
      let s1 = max(0, termPos - pw * 0.12)
      let s2 = min(1, termPos + pw * 0.12)
      let s3 = min(1, termPos + pw * 0.5)

      let lit = hexColor("#FAFAFA")
      let voidC = hexColor("#121218")

      context.fill(Path(ellipseIn: moon), with: .color(lit))
      let shadow = Gradient(stops: [
        .init(color: voidC.opacity(1), location: 0),
        .init(color: voidC.opacity(1), location: s0),
        .init(color: voidC.opacity(0.55), location: s1),
        .init(color: voidC.opacity(0.12), location: s2),
        .init(color: voidC.opacity(0), location: s3),
        .init(color: voidC.opacity(0), location: 1),
      ])
      context.fill(Path(ellipseIn: moon), with: .linearGradient(shadow, startPoint: gx1, endPoint: gx2))
    }
    .aspectRatio(1, contentMode: .fit)
  }
}
