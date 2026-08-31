// Vista de dispositivo: permite ver la app dentro de un marco de tablet o
// celular (Escritorio = normal). Se guarda en localStorage.
const CLAVE = 'sigtraz_vista'

export type Vista = 'escritorio' | 'tablet' | 'celular'

export interface DimensionVista {
  ancho: number
  alto: number
  etiqueta: string
}

// Medidas aproximadas de un iPad y un celular modernos (en px CSS).
export const DIMENSIONES: Record<'tablet' | 'celular', DimensionVista> = {
  tablet: { ancho: 834, alto: 1112, etiqueta: 'Tablet' },
  celular: { ancho: 390, alto: 800, etiqueta: 'Celular' },
}

export function vistaGuardada(): Vista {
  const v = localStorage.getItem(CLAVE)
  return v === 'tablet' || v === 'celular' ? v : 'escritorio'
}

export function guardarVista(vista: Vista): void {
  localStorage.setItem(CLAVE, vista)
}

// True cuando la app corre dentro de un iframe (la vista previa de dispositivo).
// Se usa para no anidar el marco de forma infinita.
export function dentroDeIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}
