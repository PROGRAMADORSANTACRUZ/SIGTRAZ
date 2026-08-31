import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoAviso } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_AVISO,
  PRIORIDADES_AVISO,
  type Aviso,
  type EstadoAviso,
  type PrioridadAviso,
} from '../types/trazabilidad'

const formVacio = (): NuevoAviso => ({
  titulo: '',
  mensaje: '',
  prioridad: 'Media',
  dirigidoA: '',
  estado: 'Borrador',
  fecha: undefined,
})

const COLOR_PRIORIDAD: Record<PrioridadAviso, string> = {
  Baja: 'bg-slate-100 text-slate-600',
  Media: 'bg-sky-100 text-sky-800',
  Alta: 'bg-red-100 text-red-800',
}

const COLOR_ESTADO: Record<EstadoAviso, string> = {
  Borrador: 'bg-amber-100 text-amber-800',
  Publicado: 'bg-emerald-100 text-emerald-800',
  Archivado: 'bg-slate-100 text-slate-600',
}

export function Avisos() {
  const [items, setItems] = useState<Aviso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todos' | EstadoAviso>('Todos')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoAviso>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Aviso | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getAvisos())
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
    return items.filter((a) => a.estado === filtro)
  }, [items, filtro])

  function actualizar<K extends keyof NuevoAviso>(
    campo: K,
    valor: NuevoAviso[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(a: Aviso) {
    setEditandoId(a.id)
    setForm({
      titulo: a.titulo,
      mensaje: a.mensaje ?? '',
      prioridad: a.prioridad,
      dirigidoA: a.dirigidoA ?? '',
      estado: a.estado,
      fecha: a.fecha,
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
      const datos: NuevoAviso = {
        titulo: form.titulo.trim(),
        mensaje: form.mensaje?.trim() || undefined,
        prioridad: form.prioridad,
        dirigidoA: form.dirigidoA?.trim() || undefined,
        estado: form.estado,
        fecha: form.fecha || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarAviso(editandoId, datos)
        setItems((prev) => prev.map((a) => (a.id === editandoId ? upd : a)))
      } else {
        const creado = await api.crearAviso(datos)
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
      await api.eliminarAviso(aEliminar.id, password)
      setItems((prev) => prev.filter((a) => a.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const publicados = items.filter((a) => a.estado === 'Publicado').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Avisos</h2>
          <p className="text-slate-500">Comunicados y anuncios del sistema</p>
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
        <Kpi label="Publicados" value={publicados} />
        <Kpi
          label="Prioridad alta"
          value={items.filter((a) => a.prioridad === 'Alta').length}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar aviso' : 'Nuevo aviso'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Titulo *">
              <input
                value={form.titulo}
                onChange={(e) => actualizar('titulo', e.target.value)}
                required
                className={inputClase}
              />
            </Campo>
            <Campo label="Dirigido a">
              <input
                value={form.dirigidoA ?? ''}
                onChange={(e) => actualizar('dirigidoA', e.target.value)}
                placeholder="Todo el personal, Area X..."
                className={inputClase}
              />
            </Campo>
            <Campo label="Prioridad">
              <select
                value={form.prioridad}
                onChange={(e) =>
                  actualizar('prioridad', e.target.value as PrioridadAviso)
                }
                className={inputClase}
              >
                {PRIORIDADES_AVISO.map((p) => (
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
                  actualizar('estado', e.target.value as EstadoAviso)
                }
                className={inputClase}
              >
                {ESTADOS_AVISO.map((s) => (
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
          </div>
          <Campo label="Mensaje">
            <textarea
              value={form.mensaje ?? ''}
              onChange={(e) => actualizar('mensaje', e.target.value)}
              rows={3}
              className={inputClase}
            />
          </Campo>
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
        {(['Todos', ...ESTADOS_AVISO] as const).map((f) => (
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtrados.map((a) => (
          <div
            key={a.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">{a.titulo}</h3>
              <Badge texto={a.prioridad} color={COLOR_PRIORIDAD[a.prioridad]} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <Badge texto={a.estado} color={COLOR_ESTADO[a.estado]} />
              {a.fecha && <span>{a.fecha}</span>}
              {a.dirigidoA && <span>· {a.dirigidoA}</span>}
            </div>
            {a.mensaje && (
              <p className="mt-2 text-sm text-slate-600">{a.mensaje}</p>
            )}
            <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-3 text-sm">
              <button
                onClick={() => abrirEdicion(a)}
                className="text-brand-600 hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  setErrorEliminar(null)
                  setAEliminar(a)
                }}
                className="text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-10 text-center text-slate-400">
            {cargando
              ? 'Cargando...'
              : error
                ? `Error: ${error}`
                : 'Sin avisos.'}
          </div>
        )}
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar aviso"
          descripcion={`Vas a eliminar "${aEliminar.titulo}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}
