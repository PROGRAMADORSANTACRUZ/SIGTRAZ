import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaAccion } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  ESTADOS_ACCION,
  PRIORIDADES_ACCION,
  type Accion,
  type EstadoAccion,
  type PrioridadAccion,
} from '../types/trazabilidad'

const formVacio = (): NuevaAccion => ({
  titulo: '',
  descripcion: '',
  prioridad: 'Media',
  estado: 'Pendiente',
  responsable: '',
  fechaVencimiento: undefined,
})

const COLOR_PRIORIDAD: Record<PrioridadAccion, string> = {
  Baja: 'bg-slate-100 text-slate-700',
  Media: 'bg-amber-100 text-amber-800',
  Alta: 'bg-red-100 text-red-800',
}

const COLOR_ESTADO: Record<EstadoAccion, string> = {
  Pendiente: 'bg-red-100 text-red-800',
  'En progreso': 'bg-amber-100 text-amber-800',
  Completada: 'bg-emerald-100 text-emerald-800',
}

export function Acciones() {
  const [acciones, setAcciones] = useState<Accion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaAccion>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'Todas' | EstadoAccion>(
    'Todas',
  )

  const [aEliminar, setAEliminar] = useState<Accion | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setAcciones(await api.getAcciones())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar acciones')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.titulo.trim() !== '', [form])

  const accionesFiltradas = useMemo(() => {
    if (filtroEstado === 'Todas') return acciones
    return acciones.filter((a) => a.estado === filtroEstado)
  }, [acciones, filtroEstado])

  function actualizar<K extends keyof NuevaAccion>(
    campo: K,
    valor: NuevaAccion[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(accion: Accion) {
    setEditandoId(accion.id)
    setForm({
      titulo: accion.titulo,
      descripcion: accion.descripcion ?? '',
      prioridad: accion.prioridad,
      estado: accion.estado,
      responsable: accion.responsable ?? '',
      fechaVencimiento: accion.fechaVencimiento,
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
      const datos: NuevaAccion = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        prioridad: form.prioridad,
        estado: form.estado,
        responsable: form.responsable?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
      }
      if (editandoId) {
        const actualizada = await api.actualizarAccion(editandoId, datos)
        setAcciones((prev) =>
          prev.map((a) => (a.id === editandoId ? actualizada : a)),
        )
      } else {
        const creada = await api.crearAccion(datos)
        setAcciones((prev) => [creada, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la accion',
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
      await api.eliminarAccion(aEliminar.id, password)
      setAcciones((prev) => prev.filter((a) => a.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar la accion',
      )
    } finally {
      setEliminando(false)
    }
  }

  const pendientes = acciones.filter((a) => a.estado === 'Pendiente').length
  const enProgreso = acciones.filter((a) => a.estado === 'En progreso').length
  const completadas = acciones.filter((a) => a.estado === 'Completada').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Acciones</h2>
          <p className="text-slate-500">
            Tareas y acciones correctivas de seguimiento
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total" value={acciones.length} />
        <Kpi label="Pendientes" value={pendientes} />
        <Kpi label="En progreso" value={enProgreso} />
        <Kpi label="Completadas" value={completadas} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar accion' : 'Nueva accion'}
          </h3>

          <Campo label="Titulo">
            <input
              value={form.titulo}
              onChange={(e) => actualizar('titulo', e.target.value)}
              placeholder="Corregir temperatura del cuarto frio 2"
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

          <Campo label="Prioridad">
            <select
              value={form.prioridad}
              onChange={(e) =>
                actualizar('prioridad', e.target.value as PrioridadAccion)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {PRIORIDADES_ACCION.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                actualizar('estado', e.target.value as EstadoAccion)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ESTADOS_ACCION.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Fecha limite">
            <input
              type="date"
              value={form.fechaVencimiento ?? ''}
              onChange={(e) =>
                actualizar('fechaVencimiento', e.target.value || undefined)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Descripcion">
            <textarea
              value={form.descripcion ?? ''}
              onChange={(e) => actualizar('descripcion', e.target.value)}
              rows={3}
              placeholder="Detalle de la accion a realizar"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 md:col-span-2"
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
                  : 'Crear accion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {(['Todas', ...ESTADOS_ACCION] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filtroEstado === estado
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {estado}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Titulo</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Prioridad</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha limite</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accionesFiltradas.map((accion) => (
              <tr key={accion.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{accion.titulo}</p>
                  {accion.descripcion && (
                    <p className="text-xs text-slate-500">
                      {accion.descripcion}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {accion.responsable ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_PRIORIDAD[accion.prioridad]}`}
                  >
                    {accion.prioridad}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[accion.estado]}`}
                  >
                    {accion.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {accion.fechaVencimiento ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(accion)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(accion)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {accionesFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando acciones...'
                    : error
                      ? `Error: ${error}`
                      : filtroEstado === 'Todas'
                        ? 'Sin acciones registradas.'
                        : `Sin acciones en estado "${filtroEstado}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar accion"
          descripcion={`Vas a eliminar la accion "${aEliminar.titulo}".`}
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
