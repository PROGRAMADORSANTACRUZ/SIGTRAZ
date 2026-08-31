// Vista de dispositivo: permite ver la app dentro de un marco de tablet o
// celular (Escritorio = normal). Se guarda en localStorage.
const CLAVE = 'sigtraz_vista'

export type Vista = 'escritorio' | 'tablet' | 'celular'

export interface DimensionVista {
  ancho: number
  alto: number
  etiqueta: string
}

// Ancho aproximado (en px CSS) de un tablet y un celular. El alto ya no se usa
// porque la vista ocupa todo el alto de la pantalla.
export const DIMENSIONES: Record<'tablet' | 'celular', DimensionVista> = {
  tablet: { ancho: 900, alto: 1112, etiqueta: 'Tablet' },
  celular: { ancho: 430, alto: 800, etiqueta: 'Celular' },
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
