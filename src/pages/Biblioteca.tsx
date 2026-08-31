import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoRecursoBiblioteca } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Campo, Kpi, inputClase } from '../components/ui'
import { type RecursoBiblioteca } from '../types/trazabilidad'

const formVacio = (): NuevoRecursoBiblioteca => ({
  titulo: '',
  tipo: '',
  categoria: '',
  enlace: '',
  descripcion: '',
})

export function Biblioteca() {
  const [items, setItems] = useState<RecursoBiblioteca[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoRecursoBiblioteca>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<RecursoBiblioteca | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getBiblioteca())
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
    const q = busqueda.trim().toLowerCase()
    if (!q) return items
    return items.filter((r) =>
      [r.titulo, r.tipo, r.categoria]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
  }, [items, busqueda])

  function actualizar<K extends keyof NuevoRecursoBiblioteca>(
    campo: K,
    valor: NuevoRecursoBiblioteca[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: RecursoBiblioteca) {
    setEditandoId(r.id)
    setForm({
      titulo: r.titulo,
      tipo: r.tipo ?? '',
      categoria: r.categoria ?? '',
      enlace: r.enlace ?? '',
      descripcion: r.descripcion ?? '',
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
      const datos: NuevoRecursoBiblioteca = {
        titulo: form.titulo.trim(),
        tipo: form.tipo?.trim() || undefined,
        categoria: form.categoria?.trim() || undefined,
        enlace: form.enlace?.trim() || undefined,
        descripcion: form.descripcion?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarRecurso(editandoId, datos)
        setItems((prev) => prev.map((r) => (r.id === editandoId ? upd : r)))
      } else {
        const creado = await api.crearRecurso(datos)
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
      await api.eliminarRecurso(aEliminar.id, password)
      setItems((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Biblioteca</h2>
          <p className="text-slate-500">Recursos, guias y material de apoyo</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Recursos" value={items.length} />
        <Kpi
          label="Categorias"
          value={new Set(items.map((r) => r.categoria).filter(Boolean)).size}
        />
        <Kpi
          label="Con enlace"
          value={items.filter((r) => r.enlace).length}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar recurso' : 'Nuevo recurso'}
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
                placeholder="PDF, Video, Enlace..."
                className={inputClase}
              />
            </Campo>
            <Campo label="Categoria">
              <input
                value={form.categoria ?? ''}
                onChange={(e) => actualizar('categoria', e.target.value)}
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

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar recurso..."
        className={inputClase}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((r) => (
          <div
            key={r.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">{r.titulo}</h3>
              {r.tipo && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {r.tipo}
                </span>
              )}
            </div>
            {r.categoria && (
              <p className="mt-1 text-xs text-slate-400">{r.categoria}</p>
            )}
            {r.descripcion && (
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                {r.descripcion}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              {r.enlace ? (
                <a
                  href={r.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  Abrir enlace
                </a>
              ) : (
                <span className="text-slate-300">Sin enlace</span>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => abrirEdicion(r)}
                  className="text-brand-600 hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setErrorEliminar(null)
                    setAEliminar(r)
                  }}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-10 text-center text-slate-400">
            {cargando
              ? 'Cargando...'
              : error
                ? `Error: ${error}`
                : 'Sin recursos en la biblioteca.'}
          </div>
        )}
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar recurso"
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
