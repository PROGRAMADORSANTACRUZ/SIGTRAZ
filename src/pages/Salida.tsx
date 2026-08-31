import { useEffect, useMemo, useState } from 'react'
import { api, type NuevaSalida } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorProducto } from '../components/SelectorProducto'
import { SelectorBuscable } from '../components/SelectorBuscable'
import { SelectorFicha } from '../components/SelectorFicha'
import { EtiquetaSalida } from '../components/EtiquetaSalida'
import { PesoInput } from '../components/PesoInput'
import { Campo, Kpi, inputClase } from '../components/ui'
import { imprimirActaDespacho } from '../utils/actaDespacho'
import { usePuntoVenta } from '../store/PuntoVentaContext'
import { guardarTraslado } from '../store/trasladosStore'
import type { Salida as Registro, Entrada, Producto, Acondicionamiento, FichaTecnica, Cliente, PuntoVenta } from '../types/trazabilidad'

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10)
}

const formVacio = (): NuevaSalida => ({
  fecha: hoy(),
  producto: '',
  productoId: '',
  lote: '',
  cantidad: undefined,
  unidad: '',
  destino: 'Sala de ventas',
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

export function Salida() {
  const { disponibles, activo } = usePuntoVenta()
  const [items, setItems] = useState<Registro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [acondicionamientos, setAcondicionamientos] = useState<Acondicionamiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
  const [fichas, setFichas] = useState<FichaTecnica[]>([])
  const [fichaSalidaId, setFichaSalidaId] = useState('')
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
  const [form, setForm] = useState<NuevaSalida>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  const [aEliminar, setAEliminar] = useState<Registro | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [etiqueta, setEtiqueta] = useState<Registro | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getSalidas())
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
    api
      .getClientes()
      .then((datos) => setClientes(datos.filter((c) => c.activo)))
      .catch(() => setClientes([]))
    api
      .getPuntosVenta()
      .then(setPuntosVenta)
      .catch(() => setPuntosVenta([]))
    api
      .getFichas()
      .then(setFichas)
      .catch(() => setFichas([]))
  }, [])

  // Todos los lotes registrados en Entradas, con su producto y kilos.
  // Permite escribir un lote y autocompletar el producto correspondiente.
  const todosLosLotes = useMemo(() => {
    const mapa = new Map<string, { productoId: string; kilos: number }>()
    const agregar = (lote: string | undefined, productoId: string, kilos: number) => {
      const l = lote?.trim()
      if (!l || !productoId) return
      const prev = mapa.get(l)
      mapa.set(l, {
        productoId: prev?.productoId ?? productoId,
        kilos: (prev?.kilos ?? 0) + kilos,
      })
    }
    // Lotes de Entradas: solo el lote interno (EN...).
    entradas.forEach((e) => {
      agregar(e.loteInterno, e.productoId, e.cantidad)
    })
    // Lotes de Acondicionamiento: interno (AC...) del producto resultante.
    acondicionamientos.forEach((a) => {
      const prod = productos.find((p) => p.nombre === a.productoResultante)
      if (!prod) return
      agregar(a.loteInterno, prod.id, a.cantidadResultante ?? 0)
    })
    return Array.from(mapa.entries()).map(([lote, info]) => ({
      lote,
      productoId: info.productoId,
      kilos: info.kilos,
    }))
  }, [entradas, acondicionamientos, productos])

  const productoPorId = useMemo(() => {
    const mapa = new Map<string, Producto>()
    productos.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [productos])

  // Opciones del destino: clientes activos y puntos de venta.
  const opcionesDestino = useMemo(() => {
    const nombres = new Set<string>(['Sala de ventas'])
    puntosVenta.forEach((p) => {
      if (p.pdv?.trim()) nombres.add(p.pdv.trim())
    })
    clientes.forEach((c) => {
      const nombre = [c.nombre, c.apellidos].filter(Boolean).join(' ').trim()
      if (nombre) nombres.add(nombre)
    })
    return Array.from(nombres)
  }, [clientes, puntosVenta])

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

  // Kilos de cada producto dentro de un lote: `${lote}||${productoId}` -> kilos.
  const kilosPorLoteProducto = useMemo(() => {
    const mapa = new Map<string, number>()
    const agregar = (
      lote: string | undefined,
      productoId: string | undefined,
      kilos: number,
    ) => {
      const l = lote?.trim()
      if (!l || !productoId) return
      const key = `${l}||${productoId}`
      mapa.set(key, (mapa.get(key) ?? 0) + (kilos || 0))
    }
    entradas.forEach((e) => {
      const codigos = new Set(
        [e.loteInterno, e.loteCodigo, e.loteExterno]
          .map((v) => v?.trim())
          .filter((v): v is string => Boolean(v)),
      )
      codigos.forEach((c) => agregar(c, e.productoId, e.cantidad))
    })
    acondicionamientos.forEach((a) => {
      const prod = productos.find((p) => p.nombre === a.productoResultante)
      agregar(a.loteInterno, prod?.id, a.cantidadResultante ?? 0)
    })
    return mapa
  }, [entradas, acondicionamientos, productos])

  // Fechas (sacrificio/empaque/vencimiento) por lote, obtenidas de las
  // entradas y del acondicionamiento. Se usan para la etiqueta de salida.
  const fechasPorLote = useMemo(() => {
    const mapa = new Map<
      string,
      { sacrificio?: string; empaque?: string; vencimiento?: string }
    >()
    // Entradas: aportan sacrificio (fechaBeneficio), empaque y vencimiento.
    entradas.forEach((e) => {
      const codigos = new Set(
        [e.loteInterno, e.loteCodigo, e.loteExterno]
          .map((v) => v?.trim())
          .filter((v): v is string => Boolean(v)),
      )
      codigos.forEach((lote) => {
        mapa.set(lote, {
          sacrificio: e.fechaBeneficio,
          empaque: e.fechaEmpaque,
          vencimiento: e.fechaVencimiento,
        })
      })
    })
    // Acondicionamiento: aporta empaque y vencimiento del lote interno (AC...).
    acondicionamientos.forEach((a) => {
      const lote = a.loteInterno?.trim()
      if (!lote) return
      const prev = mapa.get(lote) ?? {}
      mapa.set(lote, {
        ...prev,
        empaque: a.fechaEmpaque ?? prev.empaque,
        vencimiento: a.fechaVencimiento ?? prev.vencimiento,
      })
    })
    return mapa
  }, [entradas, acondicionamientos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((r) => {
      if (q) {
        const coincide = [
          r.producto,
          r.lote,
          r.destino,
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

  // Consecutivo visual por modulo (S-1, S-2...). El mas antiguo es el 1.
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
            <td>${cel(r.destino)}</td>
            <td>${cel(r.documento)}</td>
          </tr>`,
      )
      .join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Salidas</title>
      <style>
        body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}
        h1{font-size:18px;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #888;padding:4px 6px;text-align:left}
        th{background:#efe7e0}
      </style></head><body>
      <h1>Salidas (${filas.length})</h1>
      <table><thead><tr>
        <th>#</th><th>Fecha</th><th>Lote interno</th><th>Producto</th><th>Lote</th>
        <th>Cantidad</th><th>Destino</th><th>Documento</th>
      </tr></thead><tbody>${filasHtml}</tbody></table>
      </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  // Lote interno (SA...) del registro en edicion; en creacion se genera al guardar.
  const loteInternoActual = editandoId
    ? items.find((r) => r.id === editandoId)?.loteInterno
    : undefined

  function actualizar<K extends keyof NuevaSalida>(
    campo: K,
    valor: NuevaSalida[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir producto: guarda nombre, id y unidad; reinicia lote y cantidad.
  function elegirProducto(id: string) {
    const p = productos.find((x) => x.id === id)
    const lote = form.lote?.trim()
    // Si ya hay un lote elegido, trae la cantidad de ESE producto en el lote.
    const kilos = lote
      ? kilosPorLoteProducto.get(`${lote}||${id}`)
      : undefined
    setForm((prev) => ({
      ...prev,
      productoId: id,
      producto: p?.nombre ?? '',
      unidad: p?.unidad ?? prev.unidad,
      cantidad: kilos ?? prev.cantidad,
    }))
  }

  // Al escribir/elegir un lote en el buscador: si el lote tiene un solo
  // producto se autocompleta con su cantidad; si tiene varios, el usuario
  // elige el producto (y ahi se carga la cantidad de ese producto).
  function elegirLoteGlobal(lote: string) {
    const esAC = lote.toUpperCase().startsWith('AC')
    const l = lote.trim()
    const ids = productosPorLote.get(l)
    if (ids && ids.size === 1) {
      const pid = [...ids][0]
      const p = productos.find((x) => x.id === pid)
      const kilos = kilosPorLoteProducto.get(`${l}||${pid}`)
      setForm((prev) => ({
        ...prev,
        lote,
        productoId: pid,
        producto: p?.nombre ?? prev.producto,
        unidad: p?.unidad ?? prev.unidad,
        cantidad: kilos ?? prev.cantidad,
        fechaVencimiento: esAC ? '' : prev.fechaVencimiento,
      }))
      return
    }
    // Sin match o con varios productos: solo fija el lote y limpia el producto
    // para que se seleccione y traiga su cantidad.
    setForm((prev) => ({
      ...prev,
      lote,
      productoId: ids && ids.size > 1 ? '' : prev.productoId,
      cantidad: ids && ids.size > 1 ? undefined : prev.cantidad,
      fechaVencimiento: esAC ? '' : prev.fechaVencimiento,
    }))
  }

  // Al elegir Vida util (ficha): si tiene dias de vencimiento y el lote no es
  // AC, calcula la fecha de vencimiento = fecha de salida + diasVencimiento.
  function elegirFichaSalida(id: string) {
    setFichaSalidaId(id)
    const esAC = (form.lote ?? '').toUpperCase().startsWith('AC')
    if (esAC) return
    const ficha = fichas.find((f) => f.id === id)
    setForm((prev) => {
      let fechaVencimiento = prev.fechaVencimiento
      if (ficha?.diasVencimiento && prev.fecha) {
        const base = new Date(prev.fecha)
        if (!Number.isNaN(base.getTime())) {
          base.setDate(base.getDate() + ficha.diasVencimiento)
          const offset = base.getTimezoneOffset() * 60000
          fechaVencimiento = new Date(base.getTime() - offset)
            .toISOString()
            .slice(0, 10)
        }
      }
      return { ...prev, fechaVencimiento }
    })
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setFichaSalidaId('')
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
      destino: r.destino ?? '',
      responsable: r.responsable ?? '',
      documento: r.documento ?? '',
      observaciones: r.observaciones ?? '',
      fechaVencimiento: r.fechaVencimiento ?? '',
    })
    setFichaSalidaId('')
    setErrorForm(null)
    setMostrarForm(true)
  }

  // Si el destino de la salida es otro punto de venta, genera un certificado de
  // traslado que aparecera como aviso en el dashboard de ese punto.
  function registrarTrasladoSiAplica(salida: Registro) {
    const destino = (salida.destino ?? '').trim()
    if (!destino) return
    const pdvDestino = puntosVenta.find(
      (p) => p.pdv?.trim().toUpperCase() === destino.toUpperCase(),
    )
    if (!pdvDestino) return
    const pdvOrigen = disponibles.find((p) => Number(p.id) === activo)
    // No tiene sentido un traslado hacia el mismo punto de origen.
    if (pdvOrigen && Number(pdvOrigen.id) === Number(pdvDestino.id)) return
    guardarTraslado({
      id: `TR-${salida.id}-${Date.now()}`,
      origen: pdvOrigen?.pdv?.trim() || 'Origen',
      origenDireccion: pdvOrigen?.direccion,
      origenTelefono: pdvOrigen?.telefono,
      destino: pdvDestino.pdv.trim(),
      producto: salida.producto,
      lote: salida.loteInterno ?? salida.lote,
      cantidad: salida.cantidad,
      unidad: salida.unidad,
      documento: salida.documento,
      responsable: salida.responsable,
      fecha: salida.fecha ?? new Date().toISOString(),
    })
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevaSalida = {
        fecha: form.fecha || undefined,
        producto: form.producto.trim(),
        productoId: form.productoId?.trim() || undefined,
        lote: form.lote?.trim() || undefined,
        cantidad:
          typeof form.cantidad === 'number' ? form.cantidad : undefined,
        unidad: form.unidad?.trim() || undefined,
        destino: form.destino?.trim() || undefined,
        responsable: form.responsable?.trim() || undefined,
        documento: form.documento?.trim() || undefined,
        observaciones: form.observaciones?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarSalida(editandoId, datos)
        setItems((prev) => prev.map((r) => (r.id === editandoId ? upd : r)))
      } else {
        const creado = await api.crearSalida(datos)
        setItems((prev) => [creado, ...prev])
        registrarTrasladoSiAplica(creado)
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
      await api.eliminarSalida(aEliminar.id, password)
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

  const procesos = new Set(items.map((r) => r.destino).filter(Boolean)).size

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Salida</h2>
          <p className="text-slate-500">
            Registro de salidas y despachos de producto
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
        <Kpi label="Destinos" value={procesos} />
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
            {editandoId ? 'Editar salida' : 'Nueva salida'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.65fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1.5fr)_minmax(0,1.15fr)]">
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
            <Campo label="Lote interno">
              <input
                value={loteInternoActual ?? ''}
                readOnly
                disabled
                data-no-upper
                placeholder="Automatico"
                className={`${inputClase} bg-slate-100 text-slate-500`}
              />
            </Campo>
            <Campo label="Producto *">
              <SelectorProducto
                productos={productosDelLote}
                value={form.productoId ?? ''}
                onChange={elegirProducto}
              />
            </Campo>
            <Campo label={`Cantidad (${form.unidad || 'unidad'})`}>
              <PesoInput
                value={form.cantidad ?? undefined}
                onChange={(v) => actualizar('cantidad', v)}
                className={inputClase}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Destino / cliente">
              <SelectorBuscable
                opciones={opcionesDestino}
                value={form.destino ?? ''}
                onChange={(v) => actualizar('destino', v)}
                placeholder="Sala de ventas, cliente, punto de venta..."
                buscarPlaceholder="Buscar o escribir destino..."
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
            <Campo
              label={
                (form.lote ?? '').toUpperCase().startsWith('AC')
                  ? 'Vida útil (no aplica para AC)'
                  : 'Vida útil'
              }
            >
              <SelectorFicha
                fichas={fichas}
                value={fichaSalidaId}
                onChange={elegirFichaSalida}
              />
            </Campo>
            <Campo
              label={
                (form.lote ?? '').toUpperCase().startsWith('AC')
                  ? 'Fecha de vencimiento (no aplica para AC)'
                  : 'Fecha de vencimiento'
              }
            >
              <input
                type="date"
                value={form.fechaVencimiento ?? ''}
                onChange={(e) =>
                  actualizar('fechaVencimiento', e.target.value)
                }
                disabled={(form.lote ?? '').toUpperCase().startsWith('AC')}
                className={`${inputClase} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
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
            placeholder="Producto, lote, destino, responsable..."
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
              <th className="px-4 py-3 font-medium">Destino</th>
              <th className="px-4 py-3 font-medium">Documento</th>
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
                  {`S-${consecutivos.get(r.id) ?? indice + 1}`}
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
                <td className="px-4 py-3 text-slate-600">{r.destino ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.documento ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {esInstitucional(r.destino) && (
                      <button
                        onClick={() =>
                          imprimirActaDespacho({
                            titulo: 'ACTA DE DESPACHO',
                            cliente: r.destino,
                            destino: r.destino,
                            fecha: r.fecha,
                            documento: r.documento,
                            responsable: r.responsable,
                            observaciones: r.observaciones,
                            items: [
                              {
                                producto: r.producto,
                                lote: r.lote,
                                cantidad: r.cantidad,
                                unidad: r.unidad,
                              },
                            ],
                          })
                        }
                        title="Acta de despacho (cliente institucional)"
                        aria-label="Acta de despacho"
                        className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                      >
                        <IconoActa />
                      </button>
                    )}
                    <button
                      onClick={() => setEtiqueta(r)}
                      title="Etiqueta"
                      aria-label="Etiqueta"
                      className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                    >
                      <IconoEtiqueta />
                    </button>
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
          titulo="Eliminar salida"
          descripcion={`Vas a eliminar la salida de "${aEliminar.producto}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}

      {etiqueta && (
        <EtiquetaSalida
          registro={etiqueta}
          producto={
            etiqueta.productoId
              ? productoPorId.get(etiqueta.productoId)
              : undefined
          }
          fechaSacrificio={fechasPorLote.get(etiqueta.lote ?? '')?.sacrificio}
          fechaEmpaque={fechasPorLote.get(etiqueta.lote ?? '')?.empaque}
          fechaVencimiento={
            etiqueta.fechaVencimiento ||
            fechasPorLote.get(etiqueta.lote ?? '')?.vencimiento
          }
          onCerrar={() => setEtiqueta(null)}
        />
      )}
    </div>
  )
}

// Es institucional cuando el destino esta definido y no es la venta al detalle.
function esInstitucional(destino?: string): boolean {
  const d = (destino ?? '').trim().toLowerCase()
  return d !== '' && d !== 'sala de ventas'
}

function IconoActa() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  )
}

function IconoEtiqueta() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5V5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.4.6l9 9a2 2 0 0 1 0 2.8l-4.1 4.1a2 2 0 0 1-2.8 0l-9-9A2 2 0 0 1 3 8.5Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
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
