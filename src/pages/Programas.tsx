import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoPrograma } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  FRECUENCIAS_PROGRAMA,
  type FrecuenciaPrograma,
  type Plantilla,
  type Programa,
} from '../types/trazabilidad'

const formVacio = (): NuevoPrograma => ({
  nombre: '',
  plantillaId: undefined,
  frecuencia: 'Mensual',
  responsable: '',
  proximaFecha: undefined,
  activo: true,
})

const COLOR_FRECUENCIA: Record<FrecuenciaPrograma, string> = {
  Diaria: 'bg-red-100 text-red-800',
  Semanal: 'bg-amber-100 text-amber-800',
  Mensual: 'bg-sky-100 text-sky-800',
  Anual: 'bg-violet-100 text-violet-800',
}

export function Programas() {
  const [programas, setProgramas] = useState<Programa[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoPrograma>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todos' | 'Activos' | 'Inactivos'>(
    'Todos',
  )

  const [aEliminar, setAEliminar] = useState<Programa | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [prog, pla] = await Promise.all([
        api.getProgramas(),
        api.getPlantillas(),
      ])
      setProgramas(prog)
      setPlantillas(pla)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar programas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const programasFiltrados = useMemo(() => {
    if (filtro === 'Activos') return programas.filter((p) => p.activo)
    if (filtro === 'Inactivos') return programas.filter((p) => !p.activo)
    return programas
  }, [programas, filtro])

  function actualizar<K extends keyof NuevoPrograma>(
    campo: K,
    valor: NuevoPrograma[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(programa: Programa) {
    setEditandoId(programa.id)
    setForm({
      nombre: programa.nombre,
      plantillaId: programa.plantillaId,
      frecuencia: programa.frecuencia,
      responsable: programa.responsable ?? '',
      proximaFecha: programa.proximaFecha,
      activo: programa.activo,
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevoPrograma = {
        nombre: form.nombre.trim(),
        plantillaId: form.plantillaId,
        frecuencia: form.frecuencia,
        responsable: form.responsable?.trim() || undefined,
        proximaFecha: form.proximaFecha || undefined,
        activo: form.activo,
      }
      if (editandoId) {
        const actualizado = await api.actualizarPrograma(editandoId, datos)
        setProgramas((prev) =>
          prev.map((p) => (p.id === editandoId ? actualizado : p)),
        )
      } else {
        const creado = await api.crearPrograma(datos)
        setProgramas((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el programa',
      )
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(password: string) {
    if (!aEliminar || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarPrograma(aEliminar.id, password)
      setProgramas((prev) => prev.filter((p) => p.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el programa',
      )
    } finally {
      setEliminando(false)
    }
  }

  const activos = programas.filter((p) => p.activo).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Programas</h2>
          <p className="text-slate-500">
            Inspecciones programadas de forma recurrente
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total" value={programas.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="Inactivos" value={programas.length - activos} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar programa' : 'Nuevo programa'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Nombre *">
              <input
                value={form.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
                required
                placeholder="Inspeccion mensual de cuartos frios"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Plantilla">
              <select
                value={form.plantillaId ?? ''}
                onChange={(e) =>
                  actualizar('plantillaId', e.target.value || undefined)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Sin plantilla</option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Frecuencia">
              <select
                value={form.frecuencia}
                onChange={(e) =>
                  actualizar(
                    'frecuencia',
                    e.target.value as FrecuenciaPrograma,
                  )
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {FRECUENCIAS_PROGRAMA.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Responsable">
              <input
                value={form.responsable ?? ''}
                onChange={(e) => actualizar('responsable', e.target.value)}
                placeholder="Nombre del responsable"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Proxima fecha">
              <input
                type="date"
                value={form.proximaFecha ?? ''}
                onChange={(e) =>
                  actualizar('proximaFecha', e.target.value || undefined)
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <label className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => actualizar('activo', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-slate-700">Activo</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            {errorForm && (
              <span className="mr-auto text-sm text-red-600">{errorForm}</span>
            )}
            <button
              type="button"
              onClick={cerrarForm}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : editandoId
                  ? 'Guardar cambios'
                  : 'Crear programa'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {(['Todos', 'Activos', 'Inactivos'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filtro === f
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Plantilla</th>
              <th className="px-4 py-3 font-medium">Frecuencia</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Proxima fecha</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programasFiltrados.map((programa) => (
              <tr key={programa.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {programa.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {programa.plantillaNombre ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_FRECUENCIA[programa.frecuencia]}`}
                  >
                    {programa.frecuencia}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {programa.responsable ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {programa.proximaFecha ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      programa.activo
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {programa.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(programa)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(programa)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {programasFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando programas...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin programas registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar programa"
          descripcion={`Vas a eliminar el programa "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
