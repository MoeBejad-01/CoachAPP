package com.coachhq.coach_hq

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    // Reads the text of an InBody report (photo or PDF) on the phone with ML Kit;
    // nothing is uploaded. Returns lines with their position (0..1, top-left
    // origin) so the Dart side can pair labels with values.
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "coachhq/report_reader").setMethodCallHandler { call, result ->
            val path = call.argument<String>("path")
            if (path == null) {
                result.error("args", "Missing path", null)
                return@setMethodCallHandler
            }
            val input: InputImage? = try {
                when (call.method) {
                    "readImage" -> InputImage.fromFilePath(this, Uri.fromFile(File(path)))
                    "readPdf" -> renderPdf(path)?.let { InputImage.fromBitmap(it, 0) }
                    else -> {
                        result.notImplemented()
                        return@setMethodCallHandler
                    }
                }
            } catch (e: Exception) {
                null
            }
            if (input == null) {
                result.error("unreadable", "Could not read the file", null)
                return@setMethodCallHandler
            }
            val w = input.width.toDouble()
            val h = input.height.toDouble()
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                .process(input)
                .addOnSuccessListener { text ->
                    val lines = text.textBlocks.flatMap { it.lines }.mapNotNull { line ->
                        val b = line.boundingBox ?: return@mapNotNull null
                        mapOf(
                            "text" to line.text,
                            "x" to b.left / w,
                            "y" to b.top / h,
                            "w" to b.width() / w,
                            "h" to b.height() / h,
                        )
                    }
                    result.success(lines)
                }
                .addOnFailureListener { result.error("unreadable", it.message, null) }
        }
    }

    private fun renderPdf(path: String): Bitmap? {
        val fd = ParcelFileDescriptor.open(File(path), ParcelFileDescriptor.MODE_READ_ONLY)
        PdfRenderer(fd).use { renderer ->
            if (renderer.pageCount == 0) return null
            renderer.openPage(0).use { page ->
                val scale = 2000f / maxOf(page.width, page.height)
                val bitmap = Bitmap.createBitmap((page.width * scale).toInt(), (page.height * scale).toInt(), Bitmap.Config.ARGB_8888)
                bitmap.eraseColor(Color.WHITE)
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                return bitmap
            }
        }
    }
}
