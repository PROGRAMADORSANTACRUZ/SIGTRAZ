import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoProducto } from '../services/api'
import { CargaMasivaProductos } from '../components/CargaMasivaProductos'
import { ModalEliminar } from '../components/ModalEliminar'
import type { Producto } from '../types/trazabilidad'

const UNIDADES = ['kg', 'g', 'L', 'mL', 'unidad', 'caja', 'saco']

const CATEGORIAS = [
  '1 Res',
  '2 Cerdo',
  '3 Viscera',
  '4 Pollo',
  '5 Pescado',
  '6 Embutidos',
  '7 Otros',
]

const CATEGORIA_POR_DIGITO: Record<string, string> = {
  '1': '1 Res',
  '2': '2 Cerdo',
  '3': '3 Viscera',
  '4': '4 Pollo',
  '5': '5 Pescado',
  '6': '6 Embutidos',
}

/** Deriva la categoria a partir del primer digito de la Referencia (SKU). */
function categoriaDe(producto: Producto): string {
  const primerDigito = producto.sku.trim().match(/\d/)?.[0]
  return (primerDigito && CATEGORIA_POR_DIGITO[primerDigito]) || '7 Otros'
}

const formVacio = (): NuevoProducto => ({
  item: '',
  sku: '',
  nombre: '',
  unidad: 'kg',
})

export function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarCarga, setMostrarCarga] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoProducto>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Producto | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setProductos(await api.getProductos())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(
    () =>
      form.sku.trim() !== '' &&
      form.nombre.trim() !== '' &&
      form.unidad.trim() !== '' &&
      (editandoId != null || (form.item?.trim() ?? '') !== ''),
    [form, editandoId],
  )

  function actualizar<K extends keyof NuevoProducto>(
    campo: K,
    valor: NuevoProducto[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(producto: Producto) {
    setEditandoId(producto.id)
    setForm({
      item: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      unidad: producto.unidad,
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
      const datos: NuevoProducto = {
        sku: form.sku.trim(),
        nombre: form.nombre.trim(),
        unidad: form.unidad.trim(),
      }
      if (editandoId) {
        const actualizado = await api.actualizarProducto(editandoId, datos)
        setProductos((prev) =>
          prev
            .map((p) => (p.id === editandoId ? actualizado : p))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creado = await api.crearProducto({
          ...datos,
          item: form.item?.trim(),
        })
        setProductos((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el producto',
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
      await api.eliminarProducto(aEliminar.id, password)
      setProductos((prev) => prev.filter((p) => p.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el producto',
      )
    } finally {
      setEliminando(false)
    }
  }

  const categorias = new Set(productos.map((p) => categoriaDe(p))).size

  const grupos = useMemo(() => {
    const mapa = new Map<string, Producto[]>()
    for (const p of productos) {
      const cat = categoriaDe(p)
      if (!mapa.has(cat)) mapa.set(cat, [])
      mapa.get(cat)!.push(p)
    }
    return Array.from(mapa.entries())
      .map(([categoria, items]) => ({
        categoria,
        items: items
          .slice()
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria))
  }, [productos])

  const gruposFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return grupos
      .filter(
        (g) => filtroCategoria === 'Todas' || g.categoria === filtroCategoria,
      )
      .map((g) => ({
        ...g,
        items: termino
          ? g.items.filter(
              (p) =>
                p.id.toLowerCase().includes(termino) ||
                p.sku.toLowerCase().includes(termino) ||
                p.nombre.toLowerCase().includes(termino),
            )
          : g.items,
      }))
      .filter((g) => g.items.length > 0)
  }, [grupos, filtroCategoria, busqueda])

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Productos</h2>
          <p className="text-slate-500">Catalogo de productos trazables</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMostrarCarga(true)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Carga masiva
          </button>
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total productos" value={productos.length} />
        <Kpi label="Categorias" value={categorias} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar producto' : 'Nuevo producto'}
          </h3>

          <Campo label="Item">
            <input
              value={form.item ?? ''}
              onChange={(e) => actualizar('item', e.target.value)}
              placeholder="1001234"
              disabled={editandoId != null}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />
          </Campo>

          <Campo label="Referencia">
            <input
              value={form.sku}
              onChange={(e) => actualizar('sku', e.target.value)}
              placeholder="1-CAF-001"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Desc. Item">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              placeholder="Cafe tostado premium"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="U.M. Invent.">
            <select
              value={form.unidad}
              onChange={(e) => actualizar('unidad', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
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
                  : 'Crear producto'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600">
          Filtrar por categoria
        </label>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {['Todas', ...CATEGORIAS].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por Item, Referencia o Desc. Item..."
          className="w-full flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-auto sm:min-w-[16rem]"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        {gruposFiltrados.map((grupo) => (
          <section
            key={grupo.categoria}
            className="rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="sticky top-0 z-20 flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-slate-100 px-5 py-3">
              <h3 className="font-semibold text-slate-800">
                {grupo.categoria}
              </h3>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {grupo.items.length} producto(s)
              </span>
            </div>
            <div>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="sticky top-[49px] z-10 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                    <th className="px-5 py-2.5">Item</th>
                    <th className="px-5 py-2.5">Referencia</th>
                    <th className="px-5 py-2.5">Desc. Item</th>
                    <th className="px-5 py-2.5">U.M. Invent.</th>
                    <th className="px-5 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grupo.items.map((producto) => (
                    <tr key={producto.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">
                        {producto.id}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {producto.sku}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {producto.nombre}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {producto.unidad}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => abrirEdicion(producto)}
                            className="text-brand-600 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setErrorEliminar(null)
                              setAEliminar(producto)
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {gruposFiltrados.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
            {cargando
              ? 'Cargando productos...'
              : error
                ? `Error: ${error}`
                : busqueda
                  ? `Sin resultados para "${busqueda}".`
                  : filtroCategoria === 'Todas'
                    ? 'Sin productos registrados.'
                    : `Sin productos en "${filtroCategoria}".`}
          </div>
        )}
      </div>

      {mostrarCarga && (
        <CargaMasivaProductos
          onCerrar={() => setMostrarCarga(false)}
          onCargado={() => void cargar()}
        />
      )}

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar producto"
          descripcion={`Vas a eliminar el producto "${aEliminar.nombre}".`}
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
