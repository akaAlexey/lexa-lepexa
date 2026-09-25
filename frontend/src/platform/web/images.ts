import type { ImageService } from '../types.ts'

/** Фото целиком как data: URL — запасной путь, если браузер не умеет уменьшать. */
export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

/**
 * Веб: уменьшение на canvas до размера экрана телефона. Фото с камеры (4000 px, 5 МБ)
 * превращается в ~150 КБ — несколько снимков помещаются в память устройства.
 * В Android-оболочке заменяется нативным плагином с тем же интерфейсом.
 */
export function createWebImages(): ImageService {
  return {
    async prepare(file, maxSide = 1280) {
      if (typeof createImageBitmap !== 'function') return readAsDataUrl(file)
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return readAsDataUrl(file)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      return canvas.toDataURL('image/jpeg', 0.82)
    },
  }
}
