import Flutter
import PDFKit
import UIKit
import Vision

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    ReportReader.register(messenger: engineBridge.applicationRegistrar.messenger())
  }
}

/// Reads the text of an InBody report (photo or PDF) on the phone with Apple's
/// Vision and PDFKit; nothing is uploaded. Returns lines with their position
/// (0...1, top-left origin) so the Dart side can pair labels with values.
enum ReportReader {
  static func register(messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(name: "coachhq/report_reader", binaryMessenger: messenger)
    channel.setMethodCallHandler { call, result in
      guard let args = call.arguments as? [String: Any], let path = args["path"] as? String else {
        result(FlutterError(code: "args", message: "Missing path", details: nil))
        return
      }
      guard call.method == "readImage" || call.method == "readPdf" else {
        result(FlutterMethodNotImplemented)
        return
      }
      DispatchQueue.global(qos: .userInitiated).async {
        let lines = call.method == "readImage" ? readImage(path) : readPdf(path)
        DispatchQueue.main.async {
          if let lines = lines {
            result(lines)
          } else {
            result(FlutterError(code: "unreadable", message: "Could not read the file", details: nil))
          }
        }
      }
    }
  }

  static func readImage(_ path: String) -> [[String: Any]]? {
    guard let image = UIImage(contentsOfFile: path), let cg = image.cgImage else { return nil }
    return recognize(cg, orientation: orientation(image.imageOrientation))
  }

  static func readPdf(_ path: String) -> [[String: Any]]? {
    guard let doc = PDFDocument(url: URL(fileURLWithPath: path)), let page = doc.page(at: 0) else { return nil }
    // PDFs exported with real text: use it line by line.
    if let text = page.string, text.trimmingCharacters(in: .whitespacesAndNewlines).count > 20 {
      let rows = text.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
      let n = Double(max(rows.count, 1))
      return rows.enumerated().map { i, row in
        ["text": row, "x": 0.0, "y": Double(i) / n, "w": 1.0, "h": 0.8 / n]
      }
    }
    // Scanned PDFs: render the first page and read it like a photo.
    let box = page.bounds(for: .mediaBox)
    let scale = 2000 / max(box.width, box.height)
    let image = page.thumbnail(of: CGSize(width: box.width * scale, height: box.height * scale), for: .mediaBox)
    guard let cg = image.cgImage else { return nil }
    return recognize(cg, orientation: .up)
  }

  static func recognize(_ image: CGImage, orientation: CGImagePropertyOrientation) -> [[String: Any]] {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:])
    try? handler.perform([request])
    return (request.results ?? []).compactMap { observation in
      guard let text = observation.topCandidates(1).first?.string else { return nil }
      let b = observation.boundingBox
      return ["text": text, "x": Double(b.minX), "y": Double(1 - b.maxY), "w": Double(b.width), "h": Double(b.height)]
    }
  }

  static func orientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
