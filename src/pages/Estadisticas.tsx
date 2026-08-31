import { useEffect, useState } from 'react'
import { api, type Estadisticas as TEstadisticas } from '../services/api'
import { Kpi } from '../components/ui'

const COLORES = [
  'bg-brand-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-sky-500',
  'bg-violet-500',
]

function GraficoBarras({
  titulo,
  datos,
}: {
  titulo: string
  datos: { etiqueta: string; valor: number }[]
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-800">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin datos.</p>
      ) : (
        <div className="space-y-3">
          {datos.map((d, i) => (
            <div key={d.etiqueta} className="text-sm">
              <div className="mb-1 flex justify-between">
                <span className="text-slate-600">{d.etiqueta}</span>
                <span className="font-semibold text-slate-800">{d.valor}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${COLORES[i % COLORES.length]}`}
                  style={{ width: `${(d.valor / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Estadisticas() {
  const [datos, setDatos] = useState<TEstadisticas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        setDatos(await api.getEstadisticas())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar')
      } finally {
        setCargando(false)
      }
    }
    void cargar()
  }, [])

  if (cargando) {
    return (
      <div className="py-16 text-center text-slate-400">
        Cargando estadisticas...
      </div>
    )
  }

  if (error || !datos) {
    return (
      <div className="py-16 text-center text-red-500">
        {error ?? 'No se pudieron cargar las estadisticas.'}
      </div>
    )
  }

  const t = datos.totales

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Estadisticas</h2>
        <p className="text-slate-500">Indicadores globales del sistema</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Acciones" value={t.acciones} />
        <Kpi label="Inspecciones" value={t.inspecciones} />
        <Kpi label="Activos" value={t.activos} />
        <Kpi label="Contratistas" value={t.contratistas} />
        <Kpi label="Contratiempos" value={t.contratiempos} />
        <Kpi label="Investigaciones" value={t.investigaciones} />
        <Kpi label="Documentos" value={t.documentos} />
        <Kpi label="Sensores" value={t.sensores} />
        <Kpi label="Avisos" value={t.avisos} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoBarras
          titulo="Acciones por estado"
          datos={datos.accionesPorEstado}
        />
        <GraficoBarras
          titulo="Inspecciones por estado"
          datos={datos.inspeccionesPorEstado}
        />
        <GraficoBarras
          titulo="Activos por estado"
          datos={datos.activosPorEstado}
        />
        <GraficoBarras
          titulo="Contratiempos por gravedad"
          datos={datos.contratiemposPorGravedad}
        />
        <GraficoBarras
          titulo="Sensores por estado"
          datos={datos.sensoresPorEstado}
        />
      </div>
    </div>
  )
}
