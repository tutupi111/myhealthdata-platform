/**
 * v0.5 OCR 模块：统一 OCR 入口，支持 jpg/png/扫描 PDF。
 * 使用 tesseract.js；PDF 先通过 unpdf + @napi-rs/canvas 转成图片再 OCR。
 * 结果写入 ai_logs（task_type=ocr_extract, model_name=tesseract）。
 *
 * 仅限 server 端使用（API route / server code），不要在 React 组件或 client 中 import。
 * @napi-rs/canvas 仅在 ocrPdfBuffer 内通过 loadCanvas() 动态加载，无顶层 import。
 */
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

const OCR_MODEL_NAME = "tesseract";
const TASK_TYPE_OCR = "ocr_extract";

/** 支持 OCR 的图片 MIME */
const OCR_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const PDF_MIME = "application/pdf";

/** 单例：OCR worker 只初始化一次，后续请求复用 */
let ocrWorker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;
/** 初始化中的 Promise，避免并发/重复初始化导致首次失败 */
let ocrWorkerInitPromise: Promise<Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null> | null = null;

/**
 * 获取或创建 tesseract worker，仅初始化一次并复用。
 * 若正在初始化则复用同一 Promise，避免多次并发创建。
 * 初始化失败时返回 null，不抛出；调用方应返回空字符串并记录日志。
 */
async function getWorker(): Promise<Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null> {
  if (ocrWorker) return ocrWorker;
  if (ocrWorkerInitPromise) return ocrWorkerInitPromise;

  ocrWorkerInitPromise = (async (): Promise<Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null> => {
    try {
      const Tesseract = await import("tesseract.js");
      const pathMod = await import("path");
      const path = pathMod.default ?? pathMod;
      const workerPath = path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js");

      const worker = await Tesseract.createWorker("chi_sim+eng", undefined, {
        workerPath,
        logger: () => {},
      });
      ocrWorker = worker;
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[ocr] tesseract worker initialized (singleton)");
      }
      return worker;
    } catch (e) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.error("[ocr] getWorker init failed:", e instanceof Error ? e.message : e);
      }
      ocrWorkerInitPromise = null;
      return null;
    }
  })();

  return ocrWorkerInitPromise;
}

function isPdfMime(mime: string): boolean {
  return (mime || "").toLowerCase().trim() === PDF_MIME;
}

function isOcrImageMime(mime: string): boolean {
  return OCR_IMAGE_TYPES.includes((mime || "").toLowerCase().trim());
}

/**
 * 对单张图片 buffer 做 tesseract 识别，返回文本。
 * 复用 getWorker() 单例，不每次 create/terminate，避免冷启动导致首次请求超时。
 */
async function recognizeImageWithTesseract(imageBuffer: Buffer): Promise<string> {
  const worker = await getWorker();
  if (!worker) return "";

  try {
    const { data } = await worker.recognize(imageBuffer);
    return (data?.text || "").trim();
  } catch (e) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.error("[ocr] recognizeImageWithTesseract error:", e instanceof Error ? e.message : e);
    }
    return "";
  }
}

/** PDF OCR 最多处理页数，避免大 PDF 过慢 */
const PDF_OCR_MAX_PAGES = 3;

/**
 * 仅在 PDF 渲染时动态加载 canvas，避免 Next.js 打包时解析 .node 二进制。
 * 必须在 server 端调用（API route / server code）。
 */
async function loadCanvas(): Promise<typeof import("@napi-rs/canvas")> {
  const canvas = await import("@napi-rs/canvas");
  return canvas;
}

/**
 * PDF 转成图片后逐页 OCR，最多处理前 PDF_OCR_MAX_PAGES 页。
 */
async function ocrPdfBuffer(buffer: Buffer | Uint8Array): Promise<string> {
  const u8 = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;
  const { getResolvedPDFJS, renderPageAsImage } = await import("unpdf");
  const pdfjs = await getResolvedPDFJS();
  const doc = await pdfjs.getDocument(u8).promise;
  const numPages = doc.numPages;
  const maxPages = Math.min(numPages, PDF_OCR_MAX_PAGES);
  const parts: string[] = [];

  for (let p = 1; p <= maxPages; p++) {
    const arrayBuf = await renderPageAsImage(doc, p, {
      canvasImport: async () => {
        const canvas = await loadCanvas();
        return canvas;
      },
      scale: 2,
    });
    const pageBuffer = Buffer.from(arrayBuf);
    const pageText = await recognizeImageWithTesseract(pageBuffer);
    if (pageText) parts.push(pageText);
  }

  await doc.destroy();
  return parts.join("\n\n").trim();
}

/**
 * 写入 ai_logs：task_type=ocr_extract, model_name=tesseract。
 * 全部在 try/catch 内，失败不影响主流程，不抛出。
 */
async function writeOcrLog(params: {
  recordId?: string | null;
  status: "completed" | "failed";
  errorMessage?: string | null;
  durationMs: number;
}): Promise<void> {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.from("ai_logs").insert({
      record_id: params.recordId ?? null,
      task_type: TASK_TYPE_OCR,
      model_name: OCR_MODEL_NAME,
      status: params.status,
      error_message: params.errorMessage ?? null,
      duration_ms: params.durationMs,
    });
  } catch (e) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.error("[ocr] writeOcrLog error:", e);
    }
  }
}

/**
 * OCR 预热：提前初始化 Tesseract worker，避免首次用户上传时才创建。
 * 可在服务器启动时或首次加载 OCR 模块时调用；失败仅打日志，不抛出。
 */
export async function warmupOCR(): Promise<void> {
  try {
    const worker = await getWorker();
    if (worker && typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[ocr] OCR worker warmed up");
    }
    if (!worker && typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.warn("[ocr] OCR warmup failed: getWorker returned null");
    }
  } catch (e) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.warn("[ocr] OCR warmup failed", e);
    }
  }
}

/**
 * 统一 OCR 入口。
 * @param fileBuffer - 文件内容（Node Buffer）
 * @param mimeType - 可选，用于区分 PDF 与图片。不传时按内容或默认当图片处理
 * @param recordId - 可选，用于 ai_logs 关联
 * @returns 识别出的文本字符串
 */
export async function runOCR(
  fileBuffer: Buffer,
  mimeType?: string,
  recordId?: string | null
): Promise<string> {
  const start = Date.now();
  const mime = (mimeType || "").toLowerCase().trim();

  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
    console.log("[ocr] runOCR start, mime:", mime || "(none)", "buffer length:", fileBuffer.length);
  }

  try {
    let text: string;

    if (isPdfMime(mime)) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[ocr] PDF path: render pages then tesseract");
      }
      text = await ocrPdfBuffer(fileBuffer);
    } else if (isOcrImageMime(mime) || !mime) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[ocr] image path: tesseract directly");
      }
      text = await recognizeImageWithTesseract(fileBuffer);
    } else {
      // 未知类型尝试按图片 OCR
      text = await recognizeImageWithTesseract(fileBuffer);
    }

    const durationMs = Date.now() - start;
    try {
      await writeOcrLog({ recordId, status: "completed", durationMs });
    } catch {
      // 日志失败不影响主流程，仍返回 OCR 文本
    }

    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[ocr] runOCR done, extracted_text length:", (text || "").length, "duration_ms:", durationMs);
    }

    return text || "";
  } catch (e) {
    const durationMs = Date.now() - start;
    const message = e instanceof Error ? e.message : String(e);
    try {
      await writeOcrLog({ recordId, status: "failed", errorMessage: message, durationMs });
    } catch {
      // 日志失败不影响主流程
    }
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.error("[ocr] runOCR error:", message, e);
    }
    return "";
  }
}
