// Generates a soft foreground (person) mask for the portrait using Apple Vision.
// Usage: swift pipeline/portrait_mask.swift <input.jpg> <mask-out.png>
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else { fatalError("usage: portrait_mask <in> <maskOut>") }
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])

guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("cannot read image") }

// Person segmentation (accurate) gives hair-level detail; fall back to generic foreground.
let personReq = VNGeneratePersonSegmentationRequest()
personReq.qualityLevel = .accurate
personReq.outputPixelFormat = kCVPixelFormatType_OneComponent8
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([personReq])

let ctx = CIContext()
var maskCI: CIImage
if let buf = personReq.results?.first?.pixelBuffer {
    maskCI = CIImage(cvPixelBuffer: buf)
} else {
    let fg = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([fg])
    guard let obs = fg.results?.first else { fatalError("no subject found") }
    let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
    maskCI = CIImage(cvPixelBuffer: buf)
}
// scale mask to source size
let sx = CGFloat(cg.width) / maskCI.extent.width
let sy = CGFloat(cg.height) / maskCI.extent.height
maskCI = maskCI.transformed(by: CGAffineTransform(scaleX: sx, y: sy))

guard let outCG = ctx.createCGImage(maskCI, from: CGRect(x: 0, y: 0, width: cg.width, height: cg.height),
                                    format: .L8, colorSpace: CGColorSpaceCreateDeviceGray()) else { fatalError("render") }
guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError("dest") }
CGImageDestinationAddImage(dest, outCG, nil)
CGImageDestinationFinalize(dest)
print("mask written \(cg.width)x\(cg.height)")
