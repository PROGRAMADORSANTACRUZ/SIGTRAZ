import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'agro_antemortem'

interface RegistroAnteMortem {
  firmador: string
  novillo: number
  vaca: number
  toro: number
  bufalo: number
  fechaIngreso: string
}

function leerRegistros(): RegistroAnteMortem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function Informes() {
  const [registros, setRegistros] = useState<RegistroAnteMortem[]>(leerRegistros)
  // Por defecto se muestra solo el dia de hoy; el usuario filtra para ver mas.
  const [filtroMes, setFiltroMes] = useState(() =>
    new Date().toLocaleDateString('en-CA').slice(0, 7),
  )
  const [filtroDesde, setFiltroDesde] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [filtroHasta, setFiltroHasta] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )

  // Relee al montar por si se registraron datos en otra vista.
  useEffect(() => {
    setRegistros(leerRegistros())
  }, [])

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      const f = r.fechaIngreso || ''
      if (filtroMes && !f.startsWith(filtroMes)) return false
      if (filtroDesde && f < filtroDesde) return false
      if (filtroHasta && f > filtroHasta) return false
      return true
    })
  }, [registros, filtroMes, filtroDesde, filtroHasta])

  const { filas, total } = useMemo(() => {
    const mapa = new Map<string, number>()
    let total = 0
    filtrados.forEach((r) => {
      const reses =
        (r.novillo || 0) + (r.vaca || 0) + (r.toro || 0) + (r.bufalo || 0)
      const firmador = (r.firmador || 'SIN FIRMADOR').trim() || 'SIN FIRMADOR'
      mapa.set(firmador, (mapa.get(firmador) || 0) + reses)
      total += reses
    })
    const filas = [...mapa.entries()]
      .map(([firmador, reses]) => ({ firmador, reses }))
      .sort((a, b) => b.reses - a.reses)
    return { filas, total }
  }, [filtrados])

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Informes
        </h2>
        <p className="text-slate-500">
          Reses por firmador y total general del proceso.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Mes
          <input
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-36"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Desde
          <input
            type="date"
            data-no-upper
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Hasta
          <input
            type="date"
            data-no-upper
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        {(filtroMes || filtroDesde || filtroHasta) && (
          <button
            onClick={() => {
              const hoy = new Date().toLocaleDateString('en-CA')
              setFiltroMes(hoy.slice(0, 7))
              setFiltroDesde(hoy)
              setFiltroHasta(hoy)
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {filas.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          No hay reses registradas para el filtro seleccionado.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Firmador</th>
                <th className="px-4 py-3 text-right">Reses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((f) => (
                <tr key={f.firmador}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {f.firmador}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {f.reses.toLocaleString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 font-semibold text-emerald-800">
                <td className="px-4 py-3">Total general</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {total.toLocaleString('es-CO')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
