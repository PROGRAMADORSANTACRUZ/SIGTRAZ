import { useEffect, useMemo, useState } from 'react'
import { inputClase } from '../../components/ui'
import { leerCatalogo, guardarCatalogo } from './catalogosStore'
import {
  propietariosSeed,
  proveedoresSeed,
  firmadoresSeed,
  prediosSeed,
  municipiosSeed,
  departamentosSeed,
  corralesSeed,
  cuartosFriosSeed,
  dictamenSeed,
  beneficioEmergenciaSeed,
  beneficioCondicionesEspecialesSeed,
  hallazgosSeed,
  dictamen2Seed,
  organosSeed,
  patologiasSeed,
} from './datosCatalogos'

interface TablaCatalogoProps {
  titulo: string
  semilla: string[]
}

function TablaCatalogo({ titulo, semilla }: TablaCatalogoProps) {
  const [items, setItems] = useState<string[]>(() =>
    leerCatalogo(titulo, semilla),
  )
  const [busqueda, setBusqueda] = useState('')
  const [nuevo, setNuevo] = useState('')

  useEffect(() => {
    guardarCatalogo(titulo, items)
  }, [titulo, items])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.toLowerCase().includes(q))
  }, [items, busqueda])

  function agregar(e: React.FormEvent) {
    e.preventDefault()
    const valor = nuevo.trim().toUpperCase()
    if (!valor) return
    if (items.some((i) => i.toUpperCase() === valor)) {
      setNuevo('')
      return
    }
    setItems((prev) =>
      [...prev, valor].sort((a, b) => a.localeCompare(b, 'es')),
    )
    setNuevo('')
  }

  function eliminar(valor: string) {
    setItems((prev) => prev.filter((i) => i !== valor))
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm [&_input]:uppercase [&_input::placeholder]:normal-case">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold uppercase text-slate-900">
            {titulo}
          </h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        <input
          className={inputClase}
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <form onSubmit={agregar} className="flex gap-2">
          <input
            className={inputClase}
            placeholder="Agregar nuevo"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            +
          </button>
        </form>
      </div>

      <div className="max-h-96 overflow-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtrados.map((item) => (
                <tr key={item} className="group hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{item}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => eliminar(item)}
                      className="text-xs text-slate-300 hover:text-red-600 group-hover:text-slate-400"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
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

export function Datos() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Datos
        </h2>
        <p className="text-slate-500">
          Catalogos de propietarios, proveedores y firmadores.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TablaCatalogo titulo="Propietarios" semilla={propietariosSeed} />
        <TablaCatalogo titulo="Proveedores" semilla={proveedoresSeed} />
        <TablaCatalogo titulo="Firmadores" semilla={firmadoresSeed} />
        <TablaCatalogo titulo="Predios" semilla={prediosSeed} />
        <TablaCatalogo titulo="Municipios" semilla={municipiosSeed} />
        <TablaCatalogo titulo="Departamentos" semilla={departamentosSeed} />
        <TablaCatalogo titulo="Corrales" semilla={corralesSeed} />
        <TablaCatalogo titulo="Cuartos fríos" semilla={cuartosFriosSeed} />
        <TablaCatalogo titulo="Dictamen" semilla={dictamenSeed} />
        <TablaCatalogo
          titulo="Beneficio de emergencia"
          semilla={beneficioEmergenciaSeed}
        />
        <TablaCatalogo
          titulo="Beneficio bajo condiciones especiales"
          semilla={beneficioCondicionesEspecialesSeed}
        />
        <TablaCatalogo titulo="Hallazgos" semilla={hallazgosSeed} />
        <TablaCatalogo titulo="Dictamen 2" semilla={dictamen2Seed} />
        <TablaCatalogo titulo="Organos" semilla={organosSeed} />
        <TablaCatalogo titulo="Patologias" semilla={patologiasSeed} />
      </div>
    </div>
  )
}
