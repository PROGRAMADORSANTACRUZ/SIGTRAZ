import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaEntrada } from '../services/api'
import { useEntradas } from '../store/EntradasContext'
import { EtiquetaEntrada } from '../components/EtiquetaEntrada'
import type { Entrada, Producto } from '../types/trazabilidad'

function hoyLocalDateTime(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 16)
}

const entradaVacia = (productoId = ''): NuevaEntrada => ({
  fecha: hoyLocalDateTime(),
  productoId,
  loteCodigo: '',
  cantidad: 0,
  proveedor: '',
  almacen: '',
  responsable: '',
  documento: '',
  notas: '',
  fechaVencimiento: '',
  fechaBeneficio: '',
  fechaEmpaque: '',
  conservacion: '',
  instrucciones: '',
  empresa: '',
})

export function Entradas() {
  const { entradas, cargando, error, agregarEntrada } = useEntradas()
  const [productos, setProductos] = useState<Producto[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState<NuevaEntrada>(() => entradaVacia())
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [etiqueta, setEtiqueta] = useState<Entrada | null>(null)

  useEffect(() => {
    api
      .getProductos()
      .then((datos) => {
        setProductos(datos)
        setForm((prev) =>
          prev.productoId ? prev : { ...prev, productoId: datos[0]?.id ?? '' },
        )
      })
      .catch(() => setProductos([]))
  }, [])

  const productoPorId = useMemo(() => {
    const mapa = new Map<string, Producto>()
    productos.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [productos])

  const formValido = useMemo(
    () =>
      form.productoId.trim() !== '' &&
      form.loteCodigo.trim() !== '' &&
      form.cantidad > 0 &&
      form.proveedor.trim() !== '' &&
      form.almacen.trim() !== '' &&
      form.responsable.trim() !== '',
    [form],
  )

  function actualizar<K extends keyof NuevaEntrada>(
    campo: K,
    valor: NuevaEntrada[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido || guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const creada = await agregarEntrada({
        ...form,
        fecha: new Date(form.fecha).toISOString(),
        documento: form.documento?.trim() || undefined,
        notas: form.notas?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
        fechaBeneficio: form.fechaBeneficio || undefined,
        fechaEmpaque: form.fechaEmpaque || undefined,
        conservacion: form.conservacion?.trim() || undefined,
        instrucciones: form.instrucciones?.trim() || undefined,
        empresa: form.empresa?.trim() || undefined,
      })
      setForm(entradaVacia(productos[0]?.id ?? ''))
      setMostrarForm(false)
      setEtiqueta(creada)
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo registrar la entrada',
      )
    } finally {
      setGuardando(false)
    }
  }

  const totalUnidades = entradas.reduce((acc, e) => acc + e.cantidad, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Entradas</h2>
          <p className="text-slate-500">
            Recepcion de mercancia y lotes al almacen
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {mostrarForm ? 'Cancelar' : '+ Nueva entrada'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Entradas registradas" value={entradas.length} />
        <Kpi label="Unidades recibidas" value={totalUnidades} />
        <Kpi
          label="Proveedores"
          value={new Set(entradas.map((e) => e.proveedor)).size}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <Campo label="Producto">
            <select
              value={form.productoId}
              onChange={(e) => actualizar('productoId', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.sku})
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Codigo de lote">
            <input
              value={form.loteCodigo}
              onChange={(e) => actualizar('loteCodigo', e.target.value)}
              placeholder="L-XXX-2026-0000"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Cantidad">
            <input
              type="number"
              min={0}
              value={form.cantidad || ''}
              onChange={(e) =>
                actualizar('cantidad', Number(e.target.value) || 0)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Fecha y hora">
            <input
              type="datetime-local"
              value={form.fecha}
              onChange={(e) => actualizar('fecha', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Proveedor">
            <input
              value={form.proveedor}
              onChange={(e) => actualizar('proveedor', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Almacen destino">
            <input
              value={form.almacen}
              onChange={(e) => actualizar('almacen', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Responsable">
            <input
              value={form.responsable}
              onChange={(e) => actualizar('responsable', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Documento (guia / factura)">
            <input
              value={form.documento ?? ''}
              onChange={(e) => actualizar('documento', e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-semibold text-slate-800">
              Datos de etiqueta (opcionales)
            </p>
            <p className="text-xs text-slate-500">
              Se usan para generar la etiqueta imprimible del lote.
            </p>
          </div>

          <Campo label="Fecha de vencimiento">
            <input
              type="date"
              value={form.fechaVencimiento ?? ''}
              onChange={(e) => actualizar('fechaVencimiento', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Fecha de beneficio / produccion">
            <input
              type="date"
              value={form.fechaBeneficio ?? ''}
              onChange={(e) => actualizar('fechaBeneficio', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Fecha de empaque">
            <input
              type="date"
              value={form.fechaEmpaque ?? ''}
              onChange={(e) => actualizar('fechaEmpaque', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Empacado por (empresa)">
            <input
              value={form.empresa ?? ''}
              onChange={(e) => actualizar('empresa', e.target.value)}
              placeholder="Ej. Carnes Santacruz SAS"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Condiciones de conservacion" className="md:col-span-2">
            <input
              value={form.conservacion ?? ''}
              onChange={(e) => actualizar('conservacion', e.target.value)}
              placeholder="Ej. Conserve a una temperatura de -18 C"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Instrucciones de uso" className="md:col-span-2">
            <input
              value={form.instrucciones ?? ''}
              onChange={(e) => actualizar('instrucciones', e.target.value)}
              placeholder="Ej. Cocinar, asar, freir, hornear."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Notas" className="md:col-span-2">
            <textarea
              value={form.notas ?? ''}
              onChange={(e) => actualizar('notas', e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="flex items-center justify-end gap-3 md:col-span-2">
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
              disabled={!formValido || guardando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium">Almacen</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium text-right">Etiqueta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entradas.map((entrada) => {
              const producto = productoPorId.get(entrada.productoId)
              return (
                <tr key={entrada.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(entrada.fecha).toLocaleString('es')}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {producto?.nombre ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {entrada.loteCodigo}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {entrada.cantidad} {producto?.unidad}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {entrada.proveedor}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {entrada.almacen}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {entrada.documento ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEtiqueta(entrada)}
                      className="text-brand-600 hover:underline"
                    >
                      Imprimir
                    </button>
                  </td>
                </tr>
              )
            })}
            {entradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando entradas...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin entradas registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {etiqueta && (
        <EtiquetaEntrada
          entrada={etiqueta}
          producto={productoPorId.get(etiqueta.productoId)}
          onCerrar={() => setEtiqueta(null)}
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

function Campo({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
