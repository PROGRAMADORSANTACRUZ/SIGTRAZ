import { useEffect, useMemo, useState } from 'react'
import { api, type NuevaDevolucion } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorProducto } from '../components/SelectorProducto'
import { SelectorBuscable } from '../components/SelectorBuscable'
import { PesoInput } from '../components/PesoInput'
import { Campo, Kpi, inputClase } from '../components/ui'
import type {
  Devolucion as Registro,
  Entrada,
  Producto,
  Acondicionamiento,
} from '../types/trazabilidad'

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10)
}

const MOTIVOS = [
  'Producto vencido',
  'Producto en mal estado',
  'Empaque dañado',
  'Error en el despacho',
  'No conforme con el pedido',
  'Sobrante',
]

const formVacio = (): NuevaDevolucion => ({
  fecha: hoy(),
  producto: '',
  productoId: '',
  lote: '',
  cantidad: undefined,
  unidad: '',
  origen: 'Sala de ventas',
  motivo: '',
  responsable: '',
  documento: '',
  observaciones: '',
  fechaVencimiento: '',
})

function fmtFecha(valor?: string): string {
  if (!valor) return '-'
  const [a, m, d] = valor.slice(0, 10).split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

export function Devolucion() {
  const [items, setItems] = useState<Registro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [acondicionamientos, setAcondicionamientos] = useState<
    Acondicionamiento[]
  >([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  // Por defecto se muestra solo el dia de hoy; el usuario filtra para ver mas.
  const [filtroDesde, setFiltroDesde] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [filtroHasta, setFiltroHasta] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevaDevolucion>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Registro | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getDevoluciones())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
    api
      .getProductos()
      .then(setProductos)
      .catch(() => setProductos([]))
    api
      .getEntradas()
      .then(setEntradas)
      .catch(() => setEntradas([]))
    api
      .getAcondicionamientos()
      .then(setAcondicionamientos)
      .catch(() => setAcondicionamientos([]))
  }, [])

  // Todos los lotes registrados (Entradas y Acondicionamiento) para
  // autocompletar el producto al elegir un lote.
  const todosLosLotes = useMemo(() => {
    const mapa = new Map<string, { productoId: string }>()
    const agregar = (lote: string | undefined, productoId: string) => {
      const l = lote?.trim()
      if (!l || !productoId) return
      if (!mapa.has(l)) mapa.set(l, { productoId })
    }
    entradas.forEach((e) => {
      const codigos = new Set(
        [e.loteInterno, e.loteCodigo, e.loteExterno]
          .map((v) => v?.trim())
          .filter((v): v is string => Boolean(v)),
      )
      codigos.forEach((lote) => agregar(lote, e.productoId))
    })
    acondicionamientos.forEach((a) => {
      const prod = productos.find((p) => p.nombre === a.productoResultante)
      if (!prod) return
      agregar(a.loteInterno, prod.id)
    })
    return Array.from(mapa.keys()).map((lote) => ({ lote }))
  }, [entradas, acondicionamientos, productos])

  // Productos asociados a cada lote (entradas y acondicionamiento).
  const productosPorLote = useMemo(() => {
    const mapa = new Map<string, Set<string>>()
    const agregar = (lote: string | undefined, productoId?: string) => {
      const l = lote?.trim()
      if (!l || !productoId) return
      if (!mapa.has(l)) mapa.set(l, new Set())
      mapa.get(l)!.add(productoId)
    }
    entradas.forEach((e) => {
      ;[e.loteInterno, e.loteCodigo, e.loteExterno].forEach((c) =>
        agregar(c, e.productoId),
      )
    })
    acondicionamientos.forEach((a) => {
      const prod = productos.find((p) => p.nombre === a.productoResultante)
      agregar(a.loteInterno, prod?.id)
    })
    return mapa
  }, [entradas, acondicionamientos, productos])

  // Al digitar un lote, el selector de Producto solo muestra los productos
  // amarrados a ese lote. Sin lote (o lote desconocido) muestra todos.
  const productosDelLote = useMemo(() => {
    const lote = form.lote?.trim()
    if (!lote) return productos
    const ids = productosPorLote.get(lote)
    if (!ids || ids.size === 0) return productos
    return productos.filter((p) => ids.has(p.id))
  }, [productos, productosPorLote, form.lote])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((r) => {
      if (q) {
        const coincide = [
          r.producto,
          r.lote,
          r.origen,
          r.motivo,
          r.responsable,
          r.documento,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
        if (!coincide) return false
      }
      if (filtroDesde || filtroHasta) {
        const fecha = r.fecha ? r.fecha.slice(0, 10) : ''
        if (filtroDesde && fecha < filtroDesde) return false
        if (filtroHasta && fecha > filtroHasta) return false
      }
      return true
    })
  }, [items, busqueda, filtroDesde, filtroHasta])

  const hayFiltros = Boolean(busqueda || filtroDesde || filtroHasta)

  // Consecutivo visual por modulo (D-1, D-2...). El mas antiguo es el 1.
  const consecutivos = useMemo(() => {
    const m = new Map<string, number>()
    items.forEach((r, k) => m.set(r.id, items.length - k))
    return m
  }, [items])

  const todosMarcados =
    filtrados.length > 0 && filtrados.every((r) => seleccionados.has(r.id))

  const seleccionadosLista = useMemo(
    () => filtrados.filter((r) => seleccionados.has(r.id)),
    [filtrados, seleccionados],
  )

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function alternarTodos() {
    setSeleccionados(
      todosMarcados ? new Set() : new Set(filtrados.map((r) => r.id)),
    )
  }

  function imprimir(filas: Registro[]) {
    if (filas.length === 0) return
    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) return
    const cel = (v?: string | number | null) =>
      v == null || v === '' ? '&nbsp;' : String(v)
    const filasHtml = filas
      .map(
        (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${cel(fmtFecha(r.fecha))}</td>
            <td>${cel(r.loteInterno)}</td>
            <td>${cel(r.producto)}</td>
            <td>${cel(r.lote)}</td>
            <td>${cel(r.cantidad != null ? `${r.cantidad} ${r.unidad ?? ''}` : '')}</td>
            <td>${cel(r.origen)}</td>
            <td>${cel(r.motivo)}</td>
          </tr>`,
      )
      .join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Devoluciones</title>
      <style>
        body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}
        h1{font-size:18px;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #888;padding:4px 6px;text-align:left}
        th{background:#efe7e0}
      </style></head><body>
      <h1>Devoluciones (${filas.length})</h1>
      <table><thead><tr>
        <th>#</th><th>Fecha</th><th>Lote interno</th><th>Producto</th><th>Lote</th>
        <th>Cantidad</th><th>Origen</th><th>Motivo</th>
      </tr></thead><tbody>${filasHtml}</tbody></table>
      </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  function actualizar<K extends keyof NuevaDevolucion>(
    campo: K,
    valor: NuevaDevolucion[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir producto: guarda nombre, id y unidad.
  function elegirProducto(id: string) {
    const p = productos.find((x) => x.id === id)
    setForm((prev) => ({
      ...prev,
      productoId: id,
      producto: p?.nombre ?? '',
      unidad: p?.unidad ?? prev.unidad,
    }))
  }

  // Al escribir/elegir un lote: si tiene un solo producto lo autocompleta.
  function elegirLoteGlobal(lote: string) {
    const l = lote.trim()
    const ids = productosPorLote.get(l)
    if (ids && ids.size === 1) {
      const pid = [...ids][0]
      const p = productos.find((x) => x.id === pid)
      setForm((prev) => ({
        ...prev,
        lote,
        productoId: pid,
        producto: p?.nombre ?? prev.producto,
        unidad: p?.unidad ?? prev.unidad,
      }))
      return
    }
    setForm((prev) => ({
      ...prev,
      lote,
      productoId: ids && ids.size > 1 ? '' : prev.productoId,
    }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: Registro) {
    setEditandoId(r.id)
    setForm({
      fecha: r.fecha ?? hoy(),
      producto: r.producto,
      productoId: r.productoId ?? '',
      lote: r.lote ?? '',
      cantidad: r.cantidad,
      unidad: r.unidad ?? '',
      origen: r.origen ?? '',
      motivo: r.motivo ?? '',
      responsable: r.responsable ?? '',
      documento: r.documento ?? '',
      observaciones: r.observaciones ?? '',
      fechaVencimiento: r.fechaVencimiento ?? '',
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
      const datos: NuevaDevolucion = {
        fecha: form.fecha || undefined,
        producto: form.producto.trim(),
        productoId: form.productoId?.trim() || undefined,
        lote: form.lote?.trim() || undefined,
        cantidad:
          typeof form.cantidad === 'number' ? form.cantidad : undefined,
        unidad: form.unidad?.trim() || undefined,
        origen: form.origen?.trim() || undefined,
        motivo: form.motivo?.trim() || undefined,
        responsable: form.responsable?.trim() || undefined,
        documento: form.documento?.trim() || undefined,
        observaciones: form.observaciones?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarDevolucion(editandoId, datos)
        setItems((prev) => prev.map((r) => (r.id === editandoId ? upd : r)))
      } else {
        const creado = await api.crearDevolucion(datos)
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
      await api.eliminarDevolucion(aEliminar.id, password)
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
    <div className="space-y-6">      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Devolucion</h2>
          <p className="text-slate-500">
            Registro de devoluciones de producto
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
        <Kpi label="Registros" value={items.length} />
        <Kpi
          label="Origenes"
          value={new Set(items.map((r) => r.origen).filter(Boolean)).size}
        />
        <Kpi
          label="Responsables"
          value={new Set(items.map((r) => r.responsable).filter(Boolean)).size}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar devolucion' : 'Nueva devolucion'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Fecha">
              <input
                type="date"
                value={form.fecha ?? ''}
                onChange={(e) => actualizar('fecha', e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Lote">
              <SelectorBuscable
                opciones={todosLosLotes.map((l) => l.lote)}
                value={form.lote ?? ''}
                onChange={(v) => elegirLoteGlobal(v)}
                placeholder="Escribe o elige un lote"
                buscarPlaceholder="Buscar lote..."
                permitirLibre
              />
            </Campo>
            <Campo label="Producto *">
              <SelectorProducto
                productos={productosDelLote}
                value={form.productoId ?? ''}
                onChange={elegirProducto}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label={`Cantidad (${form.unidad || 'unidad'})`}>
              <PesoInput
                value={form.cantidad ?? undefined}
                onChange={(v) => actualizar('cantidad', v)}
                className={inputClase}
              />
            </Campo>
            <Campo label="Origen / cliente">
              <SelectorBuscable
                opciones={['Sala de ventas']}
                value={form.origen ?? ''}
                onChange={(v) => actualizar('origen', v)}
                placeholder="Sala de ventas, cliente, punto de venta..."
                buscarPlaceholder="Buscar o escribir origen..."
                permitirLibre
              />
            </Campo>
            <Campo label="Motivo de la devolucion">
              <SelectorBuscable
                opciones={MOTIVOS}
                value={form.motivo ?? ''}
                onChange={(v) => actualizar('motivo', v)}
                placeholder="Selecciona o escribe el motivo"
                buscarPlaceholder="Buscar o escribir motivo..."
                permitirLibre
              />
            </Campo>
            <Campo label="Documento">
              <input
                value={form.documento ?? ''}
                onChange={(e) => actualizar('documento', e.target.value)}
                placeholder="Remision, factura..."
                className={inputClase}
              />
            </Campo>
            <Campo label="Fecha de vencimiento">
              <input
                type="date"
                value={form.fechaVencimiento ?? ''}
                onChange={(e) =>
                  actualizar('fechaVencimiento', e.target.value)
                }
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
            <div className="md:col-span-3">
              <Campo label="Observaciones">
                <textarea
                  value={form.observaciones ?? ''}
                  onChange={(e) => actualizar('observaciones', e.target.value)}
                  rows={2}
                  className={inputClase}
                />
              </Campo>
            </div>
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

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Buscar
          </label>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Producto, lote, origen, motivo..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Desde
          </label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Hasta
          </label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              const hoy = new Date().toLocaleDateString('en-CA')
              setBusqueda('')
              setFiltroDesde(hoy)
              setFiltroHasta(hoy)
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </button>
        )}
        <button
          type="button"
          disabled={filtrados.length === 0}
          onClick={alternarTodos}
          className="rounded-md border border-brand-500 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
        <button
          type="button"
          disabled={seleccionadosLista.length === 0}
          onClick={() => imprimir(seleccionadosLista)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Imprimir
          {seleccionadosLista.length > 0 && ` (${seleccionadosLista.length})`}
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={alternarTodos}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Lote interno</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((r, indice) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(r.id)}
                    onChange={() => alternarSeleccion(r.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3 text-slate-400 tabular-nums">
                  {`D-${consecutivos.get(r.id) ?? indice + 1}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {fmtFecha(r.fecha)}
                </td>
                <td className="px-4 py-3 font-medium text-brand-700">
                  {r.loteInterno ?? '-'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.producto}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.lote ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.cantidad != null
                    ? `${r.cantidad} ${r.unidad ?? ''}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.origen ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.motivo ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => abrirEdicion(r)}
                      title="Editar"
                      aria-label="Editar"
                      className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                    >
                      <IconoLapiz />
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(r)
                      }}
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    >
                      <IconoBasura />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
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
          titulo="Eliminar devolucion"
          descripcion={`Vas a eliminar la devolucion de "${aEliminar.producto}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

function IconoLapiz() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function IconoBasura() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  )
}
