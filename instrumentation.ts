/**
 * Next.js 服务端启动时执行（仅 Node 运行时）。
 * 如需 OCR 预热，请在 API 或 server 入口中显式调用 warmupOCR()，不要在此处 import ocr，避免 client bundle 引入 @napi-rs/canvas。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // warmup 已移除：instrumentation 与 client 可能共享 chunk，import ocr 会导致 canvas 被打进浏览器端
}
