import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type SesionActiva } from '../services/api'

function haceCuanto(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'hace instantes'
  if (min === 1) return 'hace 1 minuto'
  if (min < 60) return `hace ${min} minutos`
  const horas = Math.floor(min / 60)
  if (horas === 1) return 'hace 1 hora'
  return `hace ${horas} horas`
}

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SesionesActivas() {
  const [sesiones, setSesiones] = useState<SesionActiva[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [cerrando, setCerrando] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<SesionActiva | null>(null)

  const cargar = useCallback(async () => {
    try {
      const datos = await api.getSesiones()
      setSesiones(datos)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las sesiones')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    // Refresca la lista automaticamente cada 15 segundos.
    const id = window.setInterval(cargar, 15000)
    return () => window.clearInterval(id)
  }, [cargar])

  const cerrar = async (sesion: SesionActiva) => {
    setConfirmar(null)
    setCerrando(sesion.id)
    try {
      await api.cerrarSesion(sesion.id)
      await cargar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesion')
    } finally {
      setCerrando(null)
    }
  }

  const nombreCompleto = (s: SesionActiva) =>
    [s.nombre, s.apellido].filter(Boolean).join(' ').trim() || s.email

  const total = sesiones.length
  const ordenadas = useMemo(
    () =>
      [...sesiones].sort(
        (a, b) =>
          new Date(b.ultimaActividad).getTime() -
          new Date(a.ultimaActividad).getTime(),
      ),
    [sesiones],
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Sesiones activas
          </h1>
          <p className="text-sm text-slate-500">
            Usuarios conectados en este momento. Las sesiones se cierran solas
            tras 5 minutos de inactividad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
            {total} {total === 1 ? 'conectado' : 'conectados'}
          </span>
          <button
            type="button"
            onClick={cargar}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Conectado</th>
              <th className="px-4 py-3">Ultima actividad</th>
              <th className="px-4 py-3 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : ordenadas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No hay usuarios conectados.
                </td>
              </tr>
            ) : (
              ordenadas.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {nombreCompleto(s)}
                      {s.esActual && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                          Tu sesion
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.rol}</td>
                  <td className="px-4 py-3 text-slate-600">{s.empresa ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {fechaHora(s.creadaEn)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {haceCuanto(s.ultimaActividad)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={cerrando === s.id}
                      onClick={() => setConfirmar(s)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {cerrando === s.id ? 'Cerrando...' : 'Cerrar sesion'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">
              Cerrar sesion
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirmar.esActual
                ? 'Vas a cerrar tu propia sesion y saldras de la aplicacion. ¿Continuar?'
                : `Se cerrara la sesion de ${nombreCompleto(confirmar)}. El usuario tendra que iniciar sesion de nuevo. ¿Continuar?`}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmar(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => cerrar(confirmar)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Si, cerrar sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
