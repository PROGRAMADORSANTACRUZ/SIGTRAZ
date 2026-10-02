// Redimensiona/comprime una imagen (dataURL) para reducir su almacenamiento.
export function comprimirDataUrl(
  dataUrl: string,
  maxLado = 1000,
  calidad = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxLado || height > maxLado) {
        if (width >= height) {
          height = Math.round((height * maxLado) / width)
          width = maxLado
        } else {
          width = Math.round((width * maxLado) / height)
          height = maxLado
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', calidad))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
