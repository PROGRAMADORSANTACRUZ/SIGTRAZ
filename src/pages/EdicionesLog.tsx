import { useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { Kpi } from '../components/ui'
import type { EdicionLog } from '../types/trazabilidad'

const MODULOS = ['Todos', 'Entrada', 'Acondicionamiento', 'Salida'] as const

function fmtFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function colorModulo(modulo: string): string {
  switch (modulo) {
    case 'Entrada':
      return 'bg-emerald-100 text-emerald-700'
    case 'Acondicionamiento':
      return 'bg-amber-100 text-amber-700'
    case 'Salida':
      return 'bg-sky-100 text-sky-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function EdicionesLog() {
  const [registros, setRegistros] = useState<EdicionLog[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modulo, setModulo] = useState<(typeof MODULOS)[number]>('Todos')
  const [busqueda, setBusqueda] = useState('')

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setRegistros(await api.getEdicionesLog())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el log')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (modulo !== 'Todos' && r.modulo !== modulo) return false
      if (!t) return true
      return (
        (r.usuarioNombre ?? '').toLowerCase().includes(t) ||
        (r.usuarioEmail ?? '').toLowerCase().includes(t) ||
        (r.loteInterno ?? '').toLowerCase().includes(t) ||
        (r.registroId ?? '').toLowerCase().includes(t) ||
        r.campo.toLowerCase().includes(t) ||
        String(r.consecutivo).includes(t)
      )
    })
  }, [registros, modulo, busqueda])

  const totalEdiciones = useMemo(
    () => new Set(registros.map((r) => r.consecutivo)).size,
    [registros],
  )
  const totalUsuarios = useMemo(
    () => new Set(registros.map((r) => r.usuarioNombre ?? r.usuarioId)).size,
    [registros],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Log de ediciones
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Auditoria de cambios en Entradas, Acondicionamiento y Salida: quien
          edito, que columna cambio y su consecutivo de edicion.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Ediciones registradas" value={totalEdiciones} />
        <Kpi label="Cambios de columna" value={registros.length} />
        <Kpi label="Usuarios que editaron" value={totalUsuarios} />
        <Kpi label="Mostrando" value={filtrados.length} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={modulo}
          onChange={(e) =>
            setModulo(e.target.value as (typeof MODULOS)[number])
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {MODULOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por usuario, lote, campo o consecutivo"
          className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={() => void cargar()}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Consecutivo</th>
              <th className="px-4 py-3">Fecha y hora</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Modulo</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Columna editada</th>
              <th className="px-4 py-3">Valor anterior</th>
              <th className="px-4 py-3">Valor nuevo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Cargando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No hay ediciones registradas.
                </td>
              </tr>
            ) : (
              filtrados.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-brand-700">
                    ED-{r.consecutivo}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {fmtFecha(r.fechaCreacion)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">
                      {r.usuarioNombre ?? 'Desconocido'}
                    </div>
                    {r.usuarioEmail && (
                      <div className="text-xs text-slate-400">
                        {r.usuarioEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorModulo(
                        r.modulo,
                      )}`}
                    >
                      {r.modulo}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {r.loteInterno ?? r.registroId ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {r.campo}
                  </td>
                  <td className="px-4 py-3 text-slate-500 line-through decoration-red-300">
                    {r.valorAnterior ?? '(vacio)'}
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-700">
                    {r.valorNuevo ?? '(vacio)'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
