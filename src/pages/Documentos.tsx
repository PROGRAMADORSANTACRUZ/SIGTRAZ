import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoDocumento } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Badge, Campo, Kpi, inputClase } from '../components/ui'
import {
  ESTADOS_DOCUMENTO,
  type Documento,
  type EstadoDocumento,
} from '../types/trazabilidad'

const formVacio = (): NuevoDocumento => ({
  titulo: '',
  tipo: '',
  version: '',
  responsable: '',
  estado: 'Borrador',
  fechaVigencia: undefined,
  enlace: '',
})

const COLOR: Record<EstadoDocumento, string> = {
  Borrador: 'bg-amber-100 text-amber-800',
  Vigente: 'bg-emerald-100 text-emerald-800',
  Obsoleto: 'bg-slate-100 text-slate-600',
}

export function Documentos() {
  const [items, setItems] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'Todos' | EstadoDocumento>('Todos')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoDocumento>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Documento | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getDocumentos())
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
    return items.filter((d) => d.estado === filtro)
  }, [items, filtro])

  function actualizar<K extends keyof NuevoDocumento>(
    campo: K,
    valor: NuevoDocumento[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(d: Documento) {
    setEditandoId(d.id)
    setForm({
      titulo: d.titulo,
      tipo: d.tipo ?? '',
      version: d.version ?? '',
      responsable: d.responsable ?? '',
      estado: d.estado,
      fechaVigencia: d.fechaVigencia,
      enlace: d.enlace ?? '',
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
      const datos: NuevoDocumento = {
        titulo: form.titulo.trim(),
        tipo: form.tipo?.trim() || undefined,
        version: form.version?.trim() || undefined,
        responsable: form.responsable?.trim() || undefined,
        estado: form.estado,
        fechaVigencia: form.fechaVigencia || undefined,
        enlace: form.enlace?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarDocumento(editandoId, datos)
        setItems((prev) => prev.map((d) => (d.id === editandoId ? upd : d)))
      } else {
        const creado = await api.crearDocumento(datos)
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
      await api.eliminarDocumento(aEliminar.id, password)
      setItems((prev) => prev.filter((d) => d.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  const vigentes = items.filter((d) => d.estado === 'Vigente').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Documentos</h2>
          <p className="text-slate-500">Documentacion controlada del sistema</p>
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
        <Kpi label="Vigentes" value={vigentes} />
        <Kpi
          label="Borradores"
          value={items.filter((d) => d.estado === 'Borrador').length}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar documento' : 'Nuevo documento'}
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
            <Campo label="Tipo">
              <input
                value={form.tipo ?? ''}
                onChange={(e) => actualizar('tipo', e.target.value)}
                placeholder="Procedimiento, Politica..."
                className={inputClase}
              />
            </Campo>
            <Campo label="Version">
              <input
                value={form.version ?? ''}
                onChange={(e) => actualizar('version', e.target.value)}
                placeholder="1.0"
                className={inputClase}
              />
            </Campo>
            <Campo label="Responsable">
              <input
                value={form.responsable ?? ''}
                onChange={(e) => actualizar('responsable', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Estado">
              <select
                value={form.estado}
                onChange={(e) =>
                  actualizar('estado', e.target.value as EstadoDocumento)
                }
                className={inputClase}
              >
                {ESTADOS_DOCUMENTO.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Fecha de vigencia">
              <input
                type="date"
                value={form.fechaVigencia ?? ''}
                onChange={(e) =>
                  actualizar('fechaVigencia', e.target.value || undefined)
                }
                className={inputClase}
              />
            </Campo>
            <Campo label="Enlace">
              <input
                value={form.enlace ?? ''}
                onChange={(e) => actualizar('enlace', e.target.value)}
                placeholder="https://..."
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
        {(['Todos', ...ESTADOS_DOCUMENTO] as const).map((f) => (
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
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {d.enlace ? (
                    <a
                      href={d.enlace}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {d.titulo}
                    </a>
                  ) : (
                    d.titulo
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{d.tipo ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{d.version ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {d.responsable ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <Badge texto={d.estado} color={COLOR[d.estado]} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(d)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(d)
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
                      : 'Sin documentos.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar documento"
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
