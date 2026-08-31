import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoTrabajadorSolitario } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_TRABAJADOR_SOLITARIO,
  type EstadoTrabajadorSolitario,
  type TrabajadorSolitario,
} from '../types/trazabilidad'

const formVacio = (): NuevoTrabajadorSolitario => ({
  trabajador: '',
  ubicacion: '',
  actividad: '',
  estado: 'Activo',
  fecha: undefined,
  horaInicio: '',
  horaFin: '',
  contactoEmergencia: '',
})

const COLOR: Record<EstadoTrabajadorSolitario, string> = {
  Activo: 'bg-sky-100 text-sky-800',
  Finalizado: 'bg-emerald-100 text-emerald-800',
  Alerta: 'bg-red-100 text-red-800',
}

export function TrabajadoresSolitarios() {
  const [items, setItems] = useState<TrabajadorSolitario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todos' | EstadoTrabajadorSolitario>(
    'Todos',
  )

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoTrabajadorSolitario>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<TrabajadorSolitario | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getTrabajadoresSolitarios())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const filtrados = useMemo(() => {
    if (filtro === 'Todos') return items
    return items.filter((t) => t.estado === filtro)
  }, [items, filtro])

  function actualizar<K extends keyof NuevoTrabajadorSolitario>(
    campo: K,
    valor: NuevoTrabajadorSolitario[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(t: TrabajadorSolitario) {
    setEditandoId(t.id)
    setForm({
      trabajador: t.trabajador,
      ubicacion: t.ubicacion ?? '',
      actividad: t.actividad ?? '',
      estado: t.estado,
      fecha: t.fecha,
      horaInicio: t.horaInicio ?? '',
      horaFin: t.horaFin ?? '',
      contactoEmergencia: t.contactoEmergencia ?? '',
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevoTrabajadorSolitario = {
        trabajador: form.trabajador.trim(),
        ubicacion: form.ubicacion?.trim() || undefined,
        actividad: form.actividad?.trim() || undefined,
        estado: form.estado,
        fecha: form.fecha || undefined,
        horaInicio: form.horaInicio?.trim() || undefined,
        horaFin: form.horaFin?.trim() || undefined,
        contactoEmergencia: form.contactoEmergencia?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarTrabajadorSolitario(editandoId, datos)
        setItems((prev) => prev.map((t) => (t.id === editandoId ? upd : t)))
      } else {
        const creado = await api.crearTrabajadorSolitario(datos)
        setItems((prev) => [creado, ...prev])
      }
      setMostrarForm(false)
      setEditandoId(null)
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(password: string) {
    if (!aEliminar || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.eliminarTrabajadorSolitario(aEliminar.id, password)
      setItems((prev) => prev.filter((t) => t.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const activos = items.filter((t) => t.estado === 'Activo').length
  const alertas = items.filter((t) => t.estado === 'Alerta').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Trabajador en solitario
          </h2>
          <p className="text-slate-500">
            Control de personal que trabaja aislado
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
        <Kpi label="Total" value={items.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="En alerta" value={alertas} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar registro' : 'Nuevo registro'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Trabajador *">
              <input
                value={form.trabajador}
                onChange={(e) => actualizar('trabajador', e.target.value)}
                required
                className={inputClase}
              />
            </Campo>
            <Campo label="Ubicacion">
              <input
                value={form.ubicacion ?? ''}
                onChange={(e) => actualizar('ubicacion', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Actividad">
              <input
                value={form.actividad ?? ''}
                onChange={(e) => actualizar('actividad', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar(
                    'estado',
                    e.target.value as EstadoTrabajadorSolitario,
                  )
                }
                className={inputClase}
              >
                {ESTADOS_TRABAJADOR_SOLITARIO.map((s) => (
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
                onChange={(e) =>
                  actualizar('fecha', e.target.value || undefined)
                }
                className={inputClase}
              />
            </Campo>
            <Campo label="Hora inicio">
              <input
                type="time"
                value={form.horaInicio ?? ''}
                onChange={(e) => actualizar('horaInicio', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Hora fin">
              <input
                type="time"
                value={form.horaFin ?? ''}
                onChange={(e) => actualizar('horaFin', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Contacto de emergencia">
              <input
                value={form.contactoEmergencia ?? ''}
                onChange={(e) =>
                  actualizar('contactoEmergencia', e.target.value)
                }
                className={inputClase}
              />
            </Campo>
          </div>
          <div className="flex items-center justify-end gap-3">
            {errorForm && (
              <span className="mr-auto text-sm text-red-600">{errorForm}</span>
            )}
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : editandoId ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2">
        {(['Todos', ...ESTADOS_TRABAJADOR_SOLITARIO] as const).map((f) => (
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
              <th className="px-4 py-3 font-medium">Trabajador</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Actividad</th>
              <th className="px-4 py-3 font-medium">Horario</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {t.trabajador}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.actividad ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.horaInicio || t.horaFin
                    ? `${t.horaInicio ?? '?'} - ${t.horaFin ?? '?'}`
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge texto={t.estado} color={COLOR[t.estado]} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(t)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(t)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin registros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar registro"
          descripcion={`Vas a eliminar el registro de "${aEliminar.trabajador}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}
