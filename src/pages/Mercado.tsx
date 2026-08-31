import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoArticuloMercado } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { Campo, Kpi, inputClase } from '../components/ui'
import { type ArticuloMercado } from '../types/trazabilidad'

const formVacio = (): NuevoArticuloMercado => ({
  nombre: '',
  categoria: '',
  proveedor: '',
  precio: undefined,
  unidad: '',
  disponible: true,
  descripcion: '',
})

export function Mercado() {
  const [items, setItems] = useState<ArticuloMercado[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoArticuloMercado>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<ArticuloMercado | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getMercado())
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
    return items.filter((a) =>
      [a.nombre, a.categoria, a.proveedor]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
  }, [items, busqueda])

  function actualizar<K extends keyof NuevoArticuloMercado>(
    campo: K,
    valor: NuevoArticuloMercado[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(a: ArticuloMercado) {
    setEditandoId(a.id)
    setForm({
      nombre: a.nombre,
      categoria: a.categoria ?? '',
      proveedor: a.proveedor ?? '',
      precio: a.precio,
      unidad: a.unidad ?? '',
      disponible: a.disponible,
      descripcion: a.descripcion ?? '',
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
      const datos: NuevoArticuloMercado = {
        nombre: form.nombre.trim(),
        categoria: form.categoria?.trim() || undefined,
        proveedor: form.proveedor?.trim() || undefined,
        precio: form.precio,
        unidad: form.unidad?.trim() || undefined,
        disponible: form.disponible,
        descripcion: form.descripcion?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarArticulo(editandoId, datos)
        setItems((prev) => prev.map((a) => (a.id === editandoId ? upd : a)))
      } else {
        const creado = await api.crearArticulo(datos)
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
      await api.eliminarArticulo(aEliminar.id, password)
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

  const disponibles = items.filter((a) => a.disponible).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mercado</h2>
          <p className="text-slate-500">Catalogo de articulos y servicios</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Articulos" value={items.length} />
        <Kpi label="Disponibles" value={disponibles} />
        <Kpi label="No disponibles" value={items.length - disponibles} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar articulo' : 'Nuevo articulo'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Nombre *">
              <input
                value={form.nombre}
                onChange={(e) => actualizar('nombre', e.target.value)}
                required
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
            <Campo label="Proveedor">
              <input
                value={form.proveedor ?? ''}
                onChange={(e) => actualizar('proveedor', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Precio">
              <input
                type="number"
                step="any"
                value={form.precio ?? ''}
                onChange={(e) =>
                  actualizar(
                    'precio',
                    e.target.value === '' ? undefined : Number(e.target.value),
                  )
                }
                className={inputClase}
              />
            </Campo>
            <Campo label="Unidad">
              <input
                value={form.unidad ?? ''}
                onChange={(e) => actualizar('unidad', e.target.value)}
                placeholder="kg, unidad, caja..."
                className={inputClase}
              />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                checked={form.disponible}
                onChange={(e) => actualizar('disponible', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Disponible
              </span>
            </label>
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
        placeholder="Buscar articulo..."
        className={inputClase}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtrados.map((a) => (
          <div
            key={a.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-800">{a.nombre}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.disponible
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {a.disponible ? 'Disponible' : 'Agotado'}
              </span>
            </div>
            {a.categoria && (
              <p className="mt-1 text-xs text-slate-400">{a.categoria}</p>
            )}
            {a.descripcion && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                {a.descripcion}
              </p>
            )}
            <div className="mt-3 text-lg font-semibold text-slate-900">
              {a.precio != null
                ? `$${a.precio.toLocaleString('es-CO')}${a.unidad ? ' / ' + a.unidad : ''}`
                : 'Sin precio'}
            </div>
            {a.proveedor && (
              <p className="text-xs text-slate-400">Proveedor: {a.proveedor}</p>
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
                : 'Sin articulos.'}
          </div>
        )}
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar articulo"
          descripcion={`Vas a eliminar "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}
