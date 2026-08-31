import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoActivo } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  ESTADOS_ACTIVO,
  type Activo,
  type EstadoActivo,
} from '../types/trazabilidad'

const formVacio = (): NuevoActivo => ({
  codigo: '',
  nombre: '',
  categoria: '',
  ubicacion: '',
  responsable: '',
  estado: 'Operativo',
  fechaAdquisicion: undefined,
})

const COLOR_ESTADO: Record<EstadoActivo, string> = {
  Operativo: 'bg-emerald-100 text-emerald-800',
  'En mantenimiento': 'bg-amber-100 text-amber-800',
  'Fuera de servicio': 'bg-red-100 text-red-800',
  Baja: 'bg-slate-200 text-slate-700',
}

export function Activos() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoActivo>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<Activo | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setActivos(await api.getActivos())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar activos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(
    () => form.codigo.trim() !== '' && form.nombre.trim() !== '',
    [form],
  )

  const activosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return activos
    return activos.filter(
      (a) =>
        a.codigo.toLowerCase().includes(t) ||
        a.nombre.toLowerCase().includes(t) ||
        (a.categoria ?? '').toLowerCase().includes(t) ||
        (a.ubicacion ?? '').toLowerCase().includes(t),
    )
  }, [activos, busqueda])

  function actualizar<K extends keyof NuevoActivo>(
    campo: K,
    valor: NuevoActivo[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(activo: Activo) {
    setEditandoId(activo.id)
    setForm({
      codigo: activo.codigo,
      nombre: activo.nombre,
      categoria: activo.categoria ?? '',
      ubicacion: activo.ubicacion ?? '',
      responsable: activo.responsable ?? '',
      estado: activo.estado,
      fechaAdquisicion: activo.fechaAdquisicion,
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
    if (!formValido || guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevoActivo = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        categoria: form.categoria?.trim() || undefined,
        ubicacion: form.ubicacion?.trim() || undefined,
        responsable: form.responsable?.trim() || undefined,
        estado: form.estado,
        fechaAdquisicion: form.fechaAdquisicion || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarActivo(editandoId, datos)
        setActivos((prev) =>
          prev
            .map((a) => (a.id === editandoId ? actualizado : a))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creado = await api.crearActivo(datos)
        setActivos((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el activo',
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
      await api.eliminarActivo(aEliminar.id, password)
      setActivos((prev) => prev.filter((a) => a.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el activo',
      )
    } finally {
      setEliminando(false)
    }
  }

  const operativos = activos.filter((a) => a.estado === 'Operativo').length
  const enMantenimiento = activos.filter(
    (a) => a.estado === 'En mantenimiento',
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activos</h2>
          <p className="text-slate-500">Inventario de equipos y activos</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total activos" value={activos.length} />
        <Kpi label="Operativos" value={operativos} />
        <Kpi label="En mantenimiento" value={enMantenimiento} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar activo' : 'Nuevo activo'}
          </h3>

          <Campo label="Codigo / Placa">
            <input
              value={form.codigo}
              onChange={(e) => actualizar('codigo', e.target.value)}
              placeholder="ACT-001"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Nombre">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              placeholder="Cuarto frio 2 / Montacargas"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Categoria">
            <input
              value={form.categoria ?? ''}
              onChange={(e) => actualizar('categoria', e.target.value)}
              placeholder="Refrigeracion / Transporte"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Ubicacion">
            <input
              value={form.ubicacion ?? ''}
              onChange={(e) => actualizar('ubicacion', e.target.value)}
              placeholder="Planta / Almacen"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Responsable">
            <input
              value={form.responsable ?? ''}
              onChange={(e) => actualizar('responsable', e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                actualizar('estado', e.target.value as EstadoActivo)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ESTADOS_ACTIVO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Fecha de adquisicion">
            <input
              type="date"
              value={form.fechaAdquisicion ?? ''}
              onChange={(e) =>
                actualizar('fechaAdquisicion', e.target.value || undefined)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="flex items-center justify-end gap-3 md:col-span-2">
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
              disabled={!formValido || guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? 'Guardando...'
                : editandoId
                  ? 'Guardar cambios'
                  : 'Crear activo'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por codigo, nombre, categoria o ubicacion..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-sm"
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activosFiltrados.map((activo) => (
              <tr key={activo.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-600">
                  {activo.codigo}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {activo.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {activo.categoria ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {activo.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[activo.estado]}`}
                  >
                    {activo.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(activo)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(activo)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {activosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando activos...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin activos registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar activo"
          descripcion={`Vas a eliminar el activo "${aEliminar.nombre}".`}
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
