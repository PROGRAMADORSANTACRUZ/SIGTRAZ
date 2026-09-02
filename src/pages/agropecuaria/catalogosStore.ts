import { useEffect, useState } from 'react'

// Fuente unica de los catalogos de agropecuaria: la pagina Datos guarda las
// ediciones aqui (localStorage) y los selectores las leen con useCatalogo.

const EVENTO = 'agro-catalogos-actualizados'

function clave(titulo: string) {
  return `sigtraz_agro_catalogo_${titulo}`
}

export function leerCatalogo(titulo: string, semilla: string[]): string[] {
  try {
    const guardado = localStorage.getItem(clave(titulo))
    if (guardado) return JSON.parse(guardado) as string[]
  } catch {
    // valor invalido en localStorage, se usa la semilla
  }
  return semilla
}

export function guardarCatalogo(titulo: string, items: string[]) {
  localStorage.setItem(clave(titulo), JSON.stringify(items))
  window.dispatchEvent(new Event(EVENTO))
}

// Agrega un valor al catalogo si no existe (ignora mayusculas/espacios). Sirve
// para "crear" propietarios, proveedores, etc. escritos a mano al guardar.
export function agregarACatalogo(
  titulo: string,
  semilla: string[],
  valor: string,
) {
  const limpio = valor.trim()
  if (!limpio) return
  const actuales = leerCatalogo(titulo, semilla)
  if (actuales.some((o) => o.toLowerCase() === limpio.toLowerCase())) return
  guardarCatalogo(titulo, [...actuales, limpio].sort((a, b) => a.localeCompare(b)))
}

export function useCatalogo(titulo: string, semilla: string[]): string[] {
  const [items, setItems] = useState<string[]>(() =>
    leerCatalogo(titulo, semilla),
  )
  useEffect(() => {
    const refrescar = () => setItems(leerCatalogo(titulo, semilla))
    refrescar()
    window.addEventListener(EVENTO, refrescar)
    window.addEventListener('storage', refrescar)
    return () => {
      window.removeEventListener(EVENTO, refrescar)
      window.removeEventListener('storage', refrescar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo])
  return items
}
