import { useSyncExternalStore } from 'react'

export interface CambioCampo {
  campo: string
  antes: string
  ahora: string
}

export interface MovimientoLog {
  id: string
  modulo: string
  accion: 'CREÓ' | 'EDITÓ' | 'ELIMINÓ'
  referencia: string
  usuario: string
  fecha: string
  cambios?: CambioCampo[]
}

let movimientos: MovimientoLog[] = leerInicial()
const listeners = new Set<() => void>()

const STORAGE_KEY = 'agro_movimientos'

function leerInicial(): MovimientoLog[] {
  try {
    return JSON.parse(localStorage.getItem('agro_movimientos') || '[]')
  } catch {
    return []
  }
}

export function agregarMovimiento(
  datos: Omit<MovimientoLog, 'id' | 'fecha'>,
) {
  movimientos = [
    {
      ...datos,
      id: crypto.randomUUID(),
      fecha: new Date().toLocaleString('es-CO'),
    },
    ...movimientos,
  ]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movimientos))
  listeners.forEach((l) => l())
}

export function useMovimientos() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => movimientos,
  )
}
