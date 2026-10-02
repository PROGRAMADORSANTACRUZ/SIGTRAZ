import { useEffect, useState } from 'react'
import {
  descargarCambios,
  estadoGuardado,
  EVENTO_GUARDADO,
  reintentarGuardados,
} from '../services/almacenamientoDatos'

export function EstadoGuardado() {
  const [estado, setEstado] = useState(estadoGuardado)

  useEffect(() => {
    const actualizar = () => setEstado(estadoGuardado())
    const protegerCambios = (evento: BeforeUnloadEvent) => {
      if (!estadoGuardado().pendientes) return
      evento.preventDefault()
      evento.returnValue = ''
    }
    actualizar()
    window.addEventListener(EVENTO_GUARDADO, actualizar)
    window.addEventListener('beforeunload', protegerCambios)
    return () => {
      window.removeEventListener(EVENTO_GUARDADO, actualizar)
      window.removeEventListener('beforeunload', protegerCambios)
    }
  }, [])

  if (!estado.pendientes && !estado.heredados) return null

  return (
    <div role={estado.errores.length ? 'alert' : 'status'} aria-live="polite" className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="min-w-0 basis-full break-words sm:basis-auto sm:flex-1">
        {estado.errores.length > 0
          ? `No se pudo guardar en la base de datos: ${estado.errores[0][1]}`
          : estado.pendientes > 0
            ? `Guardando en la base de datos (${estado.pendientes})... No cierres esta ventana.`
            : 'Hay datos antiguos del navegador distintos de la base de datos. Conserva una copia para recuperarlos.'}
      </div>
      {estado.errores.length > 0 && (
        <button type="button" onClick={reintentarGuardados} className="rounded border border-amber-500 px-3 py-1.5 font-semibold">Reintentar guardado</button>
      )}
      {(estado.errores.length > 0 || estado.heredados > 0) && (
        <button type="button" onClick={descargarCambios} className="rounded border border-amber-500 px-3 py-1.5 font-semibold">Descargar copia</button>
      )}
    </div>
  )
}