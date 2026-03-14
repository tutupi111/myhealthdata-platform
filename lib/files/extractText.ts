/**
 * 从 PDF / DOCX / 图片提取纯文本；v0.5 支持 OCR（扫描 PDF、jpg、png）。
 * 用于 AI 解析前的文本准备。仅限 server 使用（API route / backend）。
 */
import "server-only";

import { runOCR } from "./ocr";

const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC = "application/msword";
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

/** PDF 文本长度低于此值时尝试 OCR（扫描版或几乎无文字） */
const MIN_TEXT_LENGTH_BEFORE_OCR = 50;

export const IMAGE_PLACEHOLDER_TEXT = "[图片暂未解析]";
export const IMAGE_UNPARSED_DOC_TYPE = "image_unparsed";

const PDF_EXTRACT_FAILED_PREFIX = "PDF 文本提取失败：";
const DOCX_EXTRACT_FAILED_PREFIX = "DOCX 文本提取失败：";

export interface ExtractResult {
  text: string;
  /** 仅当明确为图片（或 OCR 占位）时为 true，用于写 doc_type = image_unparsed */
  isPlaceholder: boolean;
  /** 提取阶段错误信息，应写入 processing_error */
  error?: string;
}

function isPdfByMimeOrExt(mime: string, fileName?: string): boolean {
  const normalized = (mime || "").toLowerCase().trim();
  if (normalized === PDF) return true;
  if (fileName && fileName.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

function isDocxByMimeOrExt(mime: string, fileName?: string): boolean {
  const normalized = (mime || "").toLowerCase().trim();
  if (normalized === DOCX || normalized === DOC) return true;
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".docx") || lower.endsWith(".doc")) return true;
  }
  return false;
}

function isImageType(mime: string): boolean {
  return IMAGE_TYPES.includes((mime || "").toLowerCase().trim());
}

/**
 * 从 buffer 与 mime 提取文本。
 * @param buffer - 文件内容（Node Buffer 或 Uint8Array）
 * @param mimeType - 可选，MIME 类型（空或 application/octet-stream 时用 fileName 辅助判断）
 * @param fileName - 可选，用于按扩展名走 PDF/DOCX 分支
 */
export async function extractText(
  buffer: Buffer | Uint8Array,
  mimeType?: string,
  fileName?: string
): Promise<ExtractResult> {
  const normalized = (mimeType ?? "").toLowerCase().trim();

  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
    console.log("[extractText] file_type/mime:", normalized || "(empty)", "fileName:", fileName ?? "(none)");
  }

  if (isImageType(mimeType ?? "")) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[extractText] branch: image, running OCR");
    }
    const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
    try {
      const ocrText = await runOCR(buf, mimeType ?? "");
      if (ocrText && ocrText.trim().length > 0) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
          console.log("[extractText] image OCR ok, extracted_text length:", ocrText.trim().length);
        }
        return { text: ocrText.trim(), isPlaceholder: false };
      }
    } catch (e) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.error("[extractText] image OCR failed:", e instanceof Error ? e.message : e);
      }
    }
    return { text: IMAGE_PLACEHOLDER_TEXT, isPlaceholder: true };
  }

  if (isPdfByMimeOrExt(mimeType ?? "", fileName)) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[extractText] branch: PDF, running extractPdf");
    }
    const pdfResult = await extractPdf(buffer, mimeType ?? "", fileName);
    if (pdfResult.error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[extractText] PDF extract failed:", pdfResult.error, "extracted_text length: 0");
      }
      return {
        text: "",
        isPlaceholder: false,
        error: PDF_EXTRACT_FAILED_PREFIX + pdfResult.error,
      };
    }
    let text = (pdfResult.text || "").trim();
    const len = text.length;
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[extractText] PDF extract ok, extracted_text length:", len);
    }
    if (!text || len < MIN_TEXT_LENGTH_BEFORE_OCR) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[extractText] PDF text empty or short, running OCR");
      }
      const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
      try {
        const ocrText = await runOCR(buf, PDF);
        if (ocrText && ocrText.trim().length > 0) {
          text = ocrText.trim();
          if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
            console.log("[extractText] PDF OCR ok, extracted_text length:", text.length);
          }
          return { text, isPlaceholder: false };
        }
      } catch (e) {
        if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
          console.error("[extractText] PDF OCR failed:", e instanceof Error ? e.message : e);
        }
      }
      return { text: "", isPlaceholder: false };
    }
    return { text, isPlaceholder: false };
  }

  if (isDocxByMimeOrExt(mimeType ?? "", fileName)) {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[extractText] branch: DOCX, running extractDocx");
    }
    const docxResult = await extractDocx(buffer);
    if (docxResult.error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[extractText] DOCX extract failed:", docxResult.error);
      }
      return {
        text: "",
        isPlaceholder: false,
        error: DOCX_EXTRACT_FAILED_PREFIX + docxResult.error,
      };
    }
    const len = (docxResult.text || "").length;
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[extractText] DOCX extract ok, extracted_text length:", len);
    }
    return {
      text: (docxResult.text || "").trim(),
      isPlaceholder: !(docxResult.text && docxResult.text.trim()),
    };
  }

  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
    console.log("[extractText] branch: unsupported type, fallback (not image placeholder for PDF)");
  }
  return {
    text: "[不支持的文件类型] " + (normalized || "(空)"),
    isPlaceholder: true,
  };
}

interface PdfExtractResult {
  text?: string;
  error?: string;
}

const PDF_EXTRACT_SCHEME = "unpdf (serverless PDF.js)";

/**
 * 使用 unpdf 从 PDF 提取文本（适配 Next.js/Node，避免 pdf-parse 的 defineProperty 问题）。
 * 传入 Buffer 或 Uint8Array，内部转为 Uint8Array 供 getDocumentProxy 使用。
 */
async function extractPdf(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  fileName?: string
): Promise<PdfExtractResult> {
  const ext = fileName ? (fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "") : "";
  const bufferLength = buffer instanceof Buffer ? buffer.length : buffer.byteLength ?? (buffer as Uint8Array).length;

  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
    console.log("[extractPdf] mime type:", mimeType || "(empty)", "file extension:", ext || "(none)", "buffer length:", bufferLength);
    console.log("[extractPdf] 使用的提取方案:", PDF_EXTRACT_SCHEME);
  }

  let u8: Uint8Array;
  if (buffer instanceof Buffer) {
    u8 = new Uint8Array(buffer);
  } else if (buffer instanceof Uint8Array) {
    u8 = buffer;
  } else {
    u8 = new Uint8Array(buffer as ArrayBuffer);
  }

  if (!u8 || u8.length === 0) {
    const msg = "buffer 为空或无效";
    console.error("[extractPdf]", msg);
    return { error: msg };
  }

  try {
    const { getDocumentProxy, extractText: unpdfExtractText } = await import("unpdf");
    const pdf = await getDocumentProxy(u8);
    const result = await unpdfExtractText(pdf, { mergePages: true });
    const text = typeof result.text === "string" ? result.text.trim() : "";

    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.log("[extractPdf] extracted_text length:", text.length);
    }

    return { text };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[extractPdf] error:", message);
    if (stack) console.error("[extractPdf] full stack:", stack);
    const detail = stack ? `${message}\n${stack}` : message;
    return { error: detail };
  }
}

interface DocxExtractResult {
  text?: string;
  error?: string;
}

async function extractDocx(buffer: Buffer | Uint8Array): Promise<DocxExtractResult> {
  const buf = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: buf });
    const text = (result && result.value) ? result.value.trim() : "";
    return { text };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[extractDocx] error:", message, e);
    return { error: message };
  }
}
