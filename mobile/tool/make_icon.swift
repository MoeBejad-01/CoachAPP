// Renders the Coach HQ mark (the website logo: a barbell on the brand gradient)
// as a 1024px app icon with no alpha channel. Used by tool/make_icons.sh.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let s = CGFloat(size) / 32
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.translateBy(x: 0, y: CGFloat(size)); ctx.scaleBy(x: 1, y: -1)

func rgb(_ hex: UInt32) -> CGColor {
  CGColor(colorSpace: cs, components: [CGFloat((hex >> 16) & 255) / 255, CGFloat((hex >> 8) & 255) / 255, CGFloat(hex & 255) / 255, 1])!
}
let grad = CGGradient(colorsSpace: cs, colors: [rgb(0x0B3D91), rgb(0x007AFF), rgb(0x3BA7F2)] as CFArray, locations: [0, 0.6, 1])!
ctx.drawLinearGradient(grad, start: .zero, end: CGPoint(x: size, y: size), options: [])

// Soft glow behind the bar.
let glow = CGGradient(colorsSpace: cs, colors: [CGColor(colorSpace: cs, components: [1, 1, 1, 0.18])!, CGColor(colorSpace: cs, components: [1, 1, 1, 0])!] as CFArray, locations: [0, 1])!
ctx.drawRadialGradient(glow, startCenter: CGPoint(x: 512, y: 512), startRadius: 0, endCenter: CGPoint(x: 512, y: 512), endRadius: 520, options: [])

func rr(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ r: CGFloat) {
  ctx.addPath(CGPath(roundedRect: CGRect(x: x * s, y: y * s, width: w * s, height: h * s), cornerWidth: r * s, cornerHeight: r * s, transform: nil))
}
ctx.setFillColor(rgb(0xFFFFFF))
rr(6, 15, 20, 2, 1); rr(8, 10, 3, 12, 1.5); rr(21, 10, 3, 12, 1.5); rr(4.5, 12.5, 2.5, 7, 1.25); rr(25, 12.5, 2.5, 7, 1.25)
ctx.fillPath()
ctx.setFillColor(rgb(0x7FE7D6))
ctx.fillEllipse(in: CGRect(x: (26 - 2.2) * s, y: (7 - 2.2) * s, width: 4.4 * s, height: 4.4 * s))

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
print("wrote", out.path)
