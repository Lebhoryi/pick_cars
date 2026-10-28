export interface CompressedImage {
  dataUrl: string
  width: number
  height: number
  bytes: number
  originalBytes: number
}

const MAX_BYTES = 12 * 1024 * 1024

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.round((base64.length * 3) / 4)
}

/**
 * 将用户上传的封面压缩为 JPEG data URL，避免把原图直接塞进 LocalStorage。
 * 默认最长边 1400px；若仍超过 ~700KB，则逐步降低质量与尺寸。
 */
export async function compressImage(file: File, maxWidth = 1400): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件（JPG / PNG / WebP）。')
  if (file.size > MAX_BYTES) throw new Error('图片超过 12MB，请先压缩后再上传。')

  const bitmap = await createImageBitmap(file)
  let targetWidth = Math.min(bitmap.width, maxWidth)
  let quality = 0.84
  let dataUrl = ''

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const scale = targetWidth / bitmap.width
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器无法创建画布，封面处理失败。')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrlBytes(dataUrl) <= 700 * 1024 || targetWidth <= 640) {
      bitmap.close()
      return {
        dataUrl,
        width,
        height,
        bytes: dataUrlBytes(dataUrl),
        originalBytes: file.size,
      }
    }
    targetWidth = Math.round(targetWidth * 0.78)
    quality = Math.max(0.6, quality - 0.08)
  }

  bitmap.close()
  return {
    dataUrl,
    width: Math.round(targetWidth),
    height: Math.round(targetWidth * 0.6),
    bytes: dataUrlBytes(dataUrl),
    originalBytes: file.size,
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
