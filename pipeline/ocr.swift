// Text extraction helpers built on macOS frameworks (no downloads needed).
//   swift pipeline/ocr.swift pdf  <file.pdf>    → plain text of every page (PDFKit)
//   swift pipeline/ocr.swift ocr  <image>       → Hebrew+English OCR (Vision)
//   swift pipeline/ocr.swift langs              → list Vision OCR languages
import Foundation
import PDFKit
import Vision
import ImageIO

let a = CommandLine.arguments
guard a.count >= 2 else { fatalError("usage: ocr.swift pdf|ocr|langs <file>") }

switch a[1] {
case "langs":
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    print((try? req.supportedRecognitionLanguages()) ?? [])
case "pdf":
    guard let doc = PDFDocument(url: URL(fileURLWithPath: a[2])) else { fatalError("bad pdf") }
    for i in 0..<doc.pageCount { print(doc.page(at: i)?.string ?? ""); print("\u{0C}") }
case "ocr":
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("bad image") }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = true
    let supported = (try? req.supportedRecognitionLanguages()) ?? []
    req.recognitionLanguages = ["he-IL", "en-US"].filter { supported.contains($0) }
    try VNImageRequestHandler(cgImage: cg).perform([req])
    let lines = (req.results ?? [])
        .sorted { $0.boundingBox.midY > $1.boundingBox.midY }
        .compactMap { $0.topCandidates(1).first?.string }
    print(lines.joined(separator: "\n"))
default:
    fatalError("unknown mode")
}
