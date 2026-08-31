import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaFormacion } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import {
  ESTADOS_FORMACION,
  type Formacion,
  type EstadoFormacion,
} from '../types/trazabilidad'

const formVacio = (): NuevaFormacion => ({
  titulo: '',
  tema: '',
  instructor: '',
  participante: '',
  estado: 'Programada',
  fecha: undefined,
  duracionHoras: undefined,
})

const COLOR_ESTADO: Record<EstadoFormacion, string> = {
  Programada: 'bg-slate-100 text-slate-700',
  'En curso': 'bg-amber-100 text-amber-800',
  Completada: 'bg-emerald-100 text-emerald-800',
}

export function Formaciones() {
  const [formaciones, setFormaciones] = useState<Formacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaFormacion>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'Todas' | EstadoFormacion>(
    'Todas',
  )

  const [aEliminar, setAEliminar] = useState<Formacion | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setFormaciones(await api.getFormaciones())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar formaciones',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.titulo.trim() !== '', [form])

  const formacionesFiltradas = useMemo(() => {
    if (filtroEstado === 'Todas') return formaciones
    return formaciones.filter((f) => f.estado === filtroEstado)
  }, [formaciones, filtroEstado])

  function actualizar<K extends keyof NuevaFormacion>(
    campo: K,
    valor: NuevaFormacion[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(formacion: Formacion) {
    setEditandoId(formacion.id)
    setForm({
      titulo: formacion.titulo,
      tema: formacion.tema ?? '',
      instructor: formacion.instructor ?? '',
      participante: formacion.participante ?? '',
      estado: formacion.estado,
      fecha: formacion.fecha,
      duracionHoras: formacion.duracionHoras,
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
      const datos: NuevaFormacion = {
        titulo: form.titulo.trim(),
        tema: form.tema?.trim() || undefined,
        instructor: form.instructor?.trim() || undefined,
        participante: form.participante?.trim() || undefined,
        estado: form.estado,
        fecha: form.fecha || undefined,
        duracionHoras: form.duracionHoras,
      }
      if (editandoId) {
        const actualizada = await api.actualizarFormacion(editandoId, datos)
        setFormaciones((prev) =>
          prev.map((f) => (f.id === editandoId ? actualizada : f)),
        )
      } else {
        const creada = await api.crearFormacion(datos)
        setFormaciones((prev) => [creada, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la formacion',
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
      await api.eliminarFormacion(aEliminar.id, password)
      setFormaciones((prev) => prev.filter((f) => f.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar la formacion',
      )
    } finally {
      setEliminando(false)
    }
  }

  const programadas = formaciones.filter(
    (f) => f.estado === 'Programada',
  ).length
  const completadas = formaciones.filter(
    (f) => f.estado === 'Completada',
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Formacion</h2>
          <p className="text-slate-500">
            Capacitaciones y entrenamientos del personal
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
        <Kpi label="Total" value={formaciones.length} />
        <Kpi label="Programadas" value={programadas} />
        <Kpi label="Completadas" value={completadas} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar formacion' : 'Nueva formacion'}
          </h3>

          <Campo label="Titulo">
            <input
              value={form.titulo}
              onChange={(e) => actualizar('titulo', e.target.value)}
              placeholder="Buenas practicas de manufactura"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Tema / Area">
            <input
              value={form.tema ?? ''}
              onChange={(e) => actualizar('tema', e.target.value)}
              placeholder="Inocuidad / Seguridad"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Instructor">
            <input
              value={form.instructor ?? ''}
              onChange={(e) => actualizar('instructor', e.target.value)}
              placeholder="Nombre del instructor"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Participante">
            <input
              value={form.participante ?? ''}
              onChange={(e) => actualizar('participante', e.target.value)}
              placeholder="Nombre o area participante"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Estado">
            <select
              value={form.estado}
              onChange={(e) =>
                actualizar('estado', e.target.value as EstadoFormacion)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ESTADOS_FORMACION.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Fecha">
            <input
              type="date"
              value={form.fecha ?? ''}
              onChange={(e) => actualizar('fecha', e.target.value || undefined)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Duracion (horas)">
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.duracionHoras ?? ''}
              onChange={(e) =>
                actualizar(
                  'duracionHoras',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
              placeholder="2"
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
                  : 'Crear formacion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {(['Todas', ...ESTADOS_FORMACION] as const).map((estado) => (
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
              <th className="px-4 py-3 font-medium">Instructor</th>
              <th className="px-4 py-3 font-medium">Participante</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {formacionesFiltradas.map((formacion) => (
              <tr key={formacion.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">
                    {formacion.titulo}
                  </p>
                  {formacion.tema && (
                    <p className="text-xs text-slate-500">{formacion.tema}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formacion.instructor ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formacion.participante ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[formacion.estado]}`}
                  >
                    {formacion.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formacion.fecha ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(formacion)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(formacion)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {formacionesFiltradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando formaciones...'
                    : error
                      ? `Error: ${error}`
                      : filtroEstado === 'Todas'
                        ? 'Sin formaciones registradas.'
                        : `Sin formaciones en estado "${filtroEstado}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar formacion"
          descripcion={`Vas a eliminar la formacion "${aEliminar.titulo}".`}
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
