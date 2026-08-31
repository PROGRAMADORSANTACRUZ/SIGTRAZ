import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoContratiempo } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_CONTRATIEMPO,
  GRAVEDADES_CONTRATIEMPO,
  type Contratiempo,
  type EstadoContratiempo,
  type GravedadContratiempo,
} from '../types/trazabilidad'

const formVacio = (): NuevoContratiempo => ({
  titulo: '',
  descripcion: '',
  gravedad: 'Media',
  estado: 'Abierto',
  ubicacion: '',
  reportadoPor: '',
  fecha: undefined,
})

const COLOR_GRAVEDAD: Record<GravedadContratiempo, string> = {
  Baja: 'bg-slate-100 text-slate-600',
  Media: 'bg-sky-100 text-sky-800',
  Alta: 'bg-amber-100 text-amber-800',
  Critica: 'bg-red-100 text-red-800',
}

const COLOR_ESTADO: Record<EstadoContratiempo, string> = {
  Abierto: 'bg-red-100 text-red-800',
  'En revision': 'bg-amber-100 text-amber-800',
  Cerrado: 'bg-emerald-100 text-emerald-800',
}

export function Contratiempos() {
  const [items, setItems] = useState<Contratiempo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todos' | EstadoContratiempo>('Todos')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoContratiempo>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Contratiempo | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getContratiempos())
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
    return items.filter((c) => c.estado === filtro)
  }, [items, filtro])

  function actualizar<K extends keyof NuevoContratiempo>(
    campo: K,
    valor: NuevoContratiempo[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(c: Contratiempo) {
    setEditandoId(c.id)
    setForm({
      titulo: c.titulo,
      descripcion: c.descripcion ?? '',
      gravedad: c.gravedad,
      estado: c.estado,
      ubicacion: c.ubicacion ?? '',
      reportadoPor: c.reportadoPor ?? '',
      fecha: c.fecha,
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
      const datos: NuevoContratiempo = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion?.trim() || undefined,
        gravedad: form.gravedad,
        estado: form.estado,
        ubicacion: form.ubicacion?.trim() || undefined,
        reportadoPor: form.reportadoPor?.trim() || undefined,
        fecha: form.fecha || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarContratiempo(editandoId, datos)
        setItems((prev) => prev.map((c) => (c.id === editandoId ? upd : c)))
      } else {
        const creado = await api.crearContratiempo(datos)
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
      await api.eliminarContratiempo(aEliminar.id, password)
      setItems((prev) => prev.filter((c) => c.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const abiertos = items.filter((c) => c.estado === 'Abierto').length
  const criticos = items.filter(
    (c) => c.gravedad === 'Critica' && c.estado !== 'Cerrado',
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contratiempos</h2>
          <p className="text-slate-500">
            Incidentes y eventos no planificados
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
        <Kpi label="Abiertos" value={abiertos} />
        <Kpi label="Criticos activos" value={criticos} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar contratiempo' : 'Nuevo contratiempo'}
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
            <Campo label="Ubicacion">
              <input
                value={form.ubicacion ?? ''}
                onChange={(e) => actualizar('ubicacion', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Gravedad">
              <select
                value={form.gravedad}
                onChange={(e) =>
                  actualizar(
                    'gravedad',
                    e.target.value as GravedadContratiempo,
                  )
                }
                className={inputClase}
              >
                {GRAVEDADES_CONTRATIEMPO.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar('estado', e.target.value as EstadoContratiempo)
                }
                className={inputClase}
              >
                {ESTADOS_CONTRATIEMPO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Reportado por">
              <input
                value={form.reportadoPor ?? ''}
                onChange={(e) => actualizar('reportadoPor', e.target.value)}
                className={inputClase}
              />
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
          <Campo label="Descripcion">
            <textarea
              value={form.descripcion ?? ''}
              onChange={(e) => actualizar('descripcion', e.target.value)}
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
        {(['Todos', ...ESTADOS_CONTRATIEMPO] as const).map((f) => (
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
              <th className="px-4 py-3 font-medium">Titulo</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Gravedad</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {c.titulo}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    texto={c.gravedad}
                    color={COLOR_GRAVEDAD[c.gravedad]}
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge texto={c.estado} color={COLOR_ESTADO[c.estado]} />
                </td>
                <td className="px-4 py-3 text-slate-600">{c.fecha ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(c)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(c)
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
                      : 'Sin contratiempos.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar contratiempo"
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
