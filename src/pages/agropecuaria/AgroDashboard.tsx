import { useEffect, useMemo, useState } from 'react'

function leerRegistros<T = Record<string, unknown>>(clave: string): T[] {
  try {
    const datos = JSON.parse(localStorage.getItem(clave) || '[]')
    return Array.isArray(datos) ? (datos as T[]) : []
  } catch {
    return []
  }
}

const INDICADORES = [
  { clave: 'agro_antemortem', titulo: 'Ordenes Ante Mortem', campoFecha: 'fechaIngreso' },
  { clave: 'agro_cronologia', titulo: 'Cronologias', campoFecha: 'fecha' },
  { clave: 'agro_posmortem', titulo: 'Pos Mortem', campoFecha: 'fecha' },
]

const ESPECIES = [
  { campo: 'novillo', label: 'Novillo', color: '#2563eb' },
  { campo: 'vaca', label: 'Vaca', color: '#16a34a' },
  { campo: 'toro', label: 'Toro', color: '#d97706' },
  { campo: 'bufalo', label: 'Bufalo', color: '#7c3aed' },
]

interface RegistroAnteMortem {
  fechaIngreso?: string
  novillo?: number
  vaca?: number
  toro?: number
  bufalo?: number
}

interface RegistroCronologia {
  fecha?: string
}

export function AgroDashboard() {
  const [version, setVersion] = useState(0)
  const hoy = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    const refrescar = () => setVersion((v) => v + 1)
    window.addEventListener('focus', refrescar)
    window.addEventListener('storage', refrescar)
    return () => {
      window.removeEventListener('focus', refrescar)
      window.removeEventListener('storage', refrescar)
    }
  }, [])

  const conteos = useMemo(
    () =>
      INDICADORES.map(
        (i) =>
          leerRegistros<Record<string, unknown>>(i.clave).filter(
            (r) => String(r[i.campoFecha] ?? '').slice(0, 10) === hoy,
          ).length,
      ),
    [version, hoy],
  )

  const especies = useMemo(() => {
    const registros = leerRegistros<RegistroAnteMortem>('agro_antemortem').filter(
      (r) => (r.fechaIngreso ?? '').slice(0, 10) === hoy,
    )
    return ESPECIES.map((e) => ({
      ...e,
      total: registros.reduce(
        (acc, r) => acc + (Number(r[e.campo as keyof RegistroAnteMortem]) || 0),
        0,
      ),
    }))
  }, [version, hoy])

  const maxEspecie = Math.max(1, ...especies.map((e) => e.total))

  const cronologiaPorAnio = useMemo(() => {
    const registros = leerRegistros<RegistroCronologia>('agro_cronologia')
    const mapa = new Map<string, number>()
    for (const r of registros) {
      const anio = (r.fecha || '').slice(0, 4)
      if (!anio) continue
      mapa.set(anio, (mapa.get(anio) || 0) + 1)
    }
    return Array.from(mapa.entries())
      .map(([anio, total]) => ({ anio, total }))
      .sort((a, b) => a.anio.localeCompare(b.anio))
  }, [version])

  const maxAnio = Math.max(1, ...cronologiaPorAnio.map((a) => a.total))

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Agropecuaria Santacruz
        </h2>
        <p className="text-slate-500">
          Resumen del dia de hoy:{' '}
          {new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {INDICADORES.map((ind, i) => (
          <div
            key={ind.clave}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{ind.titulo}</p>
            <p className="mt-1 font-display text-3xl font-bold text-brand-700">
              {conteos[i]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            Animales por especie
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            Total registrado hoy en Ante Mortem.
          </p>
          <div className="space-y-3">
            {especies.map((e) => (
              <div key={e.campo} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-medium text-slate-600">
                  {e.label}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="flex h-full items-center justify-end rounded-full px-2 text-xs font-semibold text-white transition-all"
                    style={{
                      width: `${Math.max((e.total / maxEspecie) * 100, e.total > 0 ? 8 : 0)}%`,
                      backgroundColor: e.color,
                    }}
                  >
                    {e.total > 0 ? e.total : ''}
                  </div>
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-bold text-slate-700">
                  {e.total}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-slate-900">
            Cronologias por año
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            Numero de cronologias registradas por año.
          </p>
          {cronologiaPorAnio.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Aun no hay cronologias registradas.
            </p>
          ) : (
            <div className="flex h-48 items-end justify-around gap-4">
              {cronologiaPorAnio.map((a) => (
                <div
                  key={a.anio}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-sm font-bold text-slate-700">
                    {a.total}
                  </span>
                  <div
                    className="w-full max-w-[3rem] rounded-t-md bg-brand-500 transition-all"
                    style={{ height: `${(a.total / maxAnio) * 100}%` }}
                  />
                  <span className="text-sm font-medium text-slate-600">
                    {a.anio}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
