import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoProducto } from '../services/api'
import { CargaMasivaProductos } from '../components/CargaMasivaProductos'
import type { Producto } from '../types/trazabilidad'

const UNIDADES = ['kg', 'g', 'L', 'mL', 'unidad', 'caja', 'saco']

const formVacio = (): NuevoProducto => ({
  sku: '',
  nombre: '',
  categoria: '',
  unidad: 'kg',
})

export function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarCarga, setMostrarCarga] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoProducto>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

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
      form.categoria.trim() !== '' &&
      form.unidad.trim() !== '',
    [form],
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
      sku: producto.sku,
      nombre: producto.nombre,
      categoria: producto.categoria,
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
        categoria: form.categoria.trim(),
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
        const creado = await api.crearProducto(datos)
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

  async function eliminar(producto: Producto) {
    if (
      !window.confirm(
        `Eliminar el producto "${producto.nombre}"? Esta accion no se puede deshacer.`,
      )
    )
      return
    try {
      await api.eliminarProducto(producto.id)
      setProductos((prev) => prev.filter((p) => p.id !== producto.id))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo eliminar el producto',
      )
    }
  }

  const categorias = new Set(productos.map((p) => p.categoria)).size

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
            + Nuevo producto
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

          <Campo label="SKU">
            <input
              value={form.sku}
              onChange={(e) => actualizar('sku', e.target.value)}
              placeholder="CAF-001"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Nombre">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              placeholder="Cafe tostado premium"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Categoria">
            <input
              value={form.categoria}
              onChange={(e) => actualizar('categoria', e.target.value)}
              placeholder="Bebidas"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Unidad">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productos.map((producto) => (
          <div
            key={producto.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-slate-800">
                {producto.nombre}
              </h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {producto.sku}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {producto.categoria} &middot; {producto.unidad}
            </p>
            <div className="mt-4 flex justify-end gap-3 text-sm">
              <button
                onClick={() => abrirEdicion(producto)}
                className="text-brand-600 hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => eliminar(producto)}
                className="text-red-600 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {productos.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
            {cargando
              ? 'Cargando productos...'
              : error
                ? `Error: ${error}`
                : 'Sin productos registrados.'}
          </div>
        )}
      </div>

      {mostrarCarga && (
        <CargaMasivaProductos
          onCerrar={() => setMostrarCarga(false)}
          onCargado={() => void cargar()}
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
