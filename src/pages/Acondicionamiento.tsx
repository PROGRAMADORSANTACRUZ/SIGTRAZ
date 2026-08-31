import { useEffect, useMemo, useState } from 'react'
import { api, type NuevoAcondicionamiento } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorProducto } from '../components/SelectorProducto'
import { SelectorBuscable } from '../components/SelectorBuscable'
import { SelectorFicha } from '../components/SelectorFicha'
import { EtiquetaAcondicionamiento } from '../components/EtiquetaAcondicionamiento'
import { PesoInput } from '../components/PesoInput'
import { Campo, Kpi, inputClase } from '../components/ui'
import { imprimirActaDespacho } from '../utils/actaDespacho'
import { usePuntoVenta } from '../store/PuntoVentaContext'
import { useAuth } from '../store/AuthContext'
import type {
  Acondicionamiento as Registro,
  Cliente,
  Entrada,
  FichaTecnica,
  Producto,
} from '../types/trazabilidad'

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 16)
}

// Convierte una fecha ISO (o Date) al formato datetime-local (yyyy-MM-ddTHH:mm)
// en la zona horaria local, para precargar el input al editar.
function isoALocal(iso?: string): string {
  if (!iso) return hoy()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return hoy()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

const formVacio = (): NuevoAcondicionamiento => ({
  fecha: hoy(),
  producto: '',
  productoId: '',
  lote: '',
  cantidadEntrada: undefined,
  unidad: '',
  productoResultante: '',
  cantidadResultante: undefined,
  proceso: '',
  responsable: '',
  observaciones: '',
  fichaId: '',
  empresa: 'CARNES SANTACRUZ',
  conservacion: 'Conserve a una temperatura de -18 C',
  instrucciones: 'Cocinar completamente antes de consumir',
  fechaVencimiento: '',
  fechaEmpaque: hoy().slice(0, 10),
  destino: 'SALA DE VENTAS',
  placaVehiculo: '',
  temperaturaVehiculo: '',
  temperaturaProducto: '',
})

function fmtFecha(valor?: string): string {
  if (!valor) return '-'
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) {
    const [a, m, dia] = valor.slice(0, 10).split('-')
    return a && m && dia ? `${dia}/${m}/${a}` : valor
  }
  return d.toLocaleString('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Acondicionamiento() {
  const { disponibles, activo } = usePuntoVenta()
  const { usuario } = useAuth()
  const [items, setItems] = useState<Registro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [fichas, setFichas] = useState<FichaTecnica[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
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
  const [form, setForm] = useState<NuevoAcondicionamiento>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  // Se activa al intentar guardar con campos faltantes: pinta de rojo lo que falta.
  const [intentoGuardar, setIntentoGuardar] = useState(false)

  const [aEliminar, setAEliminar] = useState<Registro | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [etiqueta, setEtiqueta] = useState<Registro | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const [registroAEditar, setRegistroAEditar] = useState<Registro | null>(null)
  const [passwordEditar, setPasswordEditar] = useState('')
  const [errorEditar, setErrorEditar] = useState<string | null>(null)
  const [verificandoPassword, setVerificandoPassword] = useState(false)
  const [passwordVerificada, setPasswordVerificada] = useState('')

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setItems(await api.getAcondicionamientos())
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
      .getFichas()
      .then(setFichas)
      .catch(() => setFichas([]))
    api
      .getClientes()
      .then(setClientes)
      .catch(() => setClientes([]))
  }, [])

  // Lotes de entrada disponibles: solo el lote interno generado por el sistema
  // en cada Entrada (no el codigo externo). Se usa como buscador.
  const todosLosLotes = useMemo(() => {
    const mapa = new Map<string, { productoId: string; kilos: number }>()
    const agregar = (
      lote: string | undefined,
      productoId: string,
      kilos: number,
    ) => {
      const l = lote?.trim()
      if (!l || !productoId) return
      const prev = mapa.get(l)
      mapa.set(l, {
        productoId: prev?.productoId ?? productoId,
        kilos: (prev?.kilos ?? 0) + kilos,
      })
    }
    entradas.forEach((e) => {
      agregar(e.loteInterno, e.productoId, e.cantidad)
    })
    return Array.from(mapa.entries()).map(([lote, info]) => ({
      lote,
      productoId: info.productoId,
      kilos: info.kilos,
    }))
  }, [entradas])

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
        [e.loteInterno, e.loteCodigo]
          .map((v) => v?.trim())
          .filter((v): v is string => Boolean(v)),
      )
      codigos.forEach((c) => agregar(c, e.productoId, e.cantidad))
    })
    return mapa
  }, [entradas])

  // Lote compuesto {lote externo del proveedor}-{lote interno del acond.}.
  // Ej. QWERTY123-AL1-AC2. Se usa en certificado y etiqueta.
  const loteCompuesto = (r: Registro): string => {
    const lo = r.lote?.trim()
    const ent = entradas.find(
      (e) => e.loteInterno?.trim() === lo || e.loteCodigo?.trim() === lo,
    )
    const externo = ent?.loteExterno?.trim()
    const interno = r.loteInterno?.trim()
    return (
      [externo, interno].filter(Boolean).join('-') || lo || 'SIN LOTE'
    )
  }

  // Fecha de beneficio (sacrificio) del lote del registro. Si el lote aparece
  // en varias entradas, toma la mas reciente.
  const fechaBeneficioDe = (r: Registro): string | undefined => {
    const lo = r.lote?.trim()
    if (!lo) return undefined
    const fechas = entradas
      .filter(
        (e) => e.loteInterno?.trim() === lo || e.loteCodigo?.trim() === lo,
      )
      .map((e) => e.fechaBeneficio?.trim())
      .filter((v): v is string => Boolean(v))
    if (fechas.length === 0) return undefined
    return fechas.reduce((mas, f) =>
      new Date(f).getTime() > new Date(mas).getTime() ? f : mas,
    )
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter((r) => {
      if (q) {
        const coincide = [
          r.producto,
          r.lote,
          r.proceso,
          r.responsable,
          r.productoResultante,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
        if (!coincide) return false
      }
      if (filtroDesde || filtroHasta) {
        const fecha = r.fecha ? isoALocal(r.fecha).slice(0, 10) : ''
        if (filtroDesde && fecha < filtroDesde) return false
        if (filtroHasta && fecha > filtroHasta) return false
      }
      return true
    })
  }, [items, busqueda, filtroDesde, filtroHasta])

  const hayFiltros = Boolean(busqueda || filtroDesde || filtroHasta)

  // Consecutivo visual por modulo (A-1, A-2...). El mas antiguo es el 1.
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
            <td>${cel(r.producto)}</td>
            <td>${cel(r.loteInterno)}</td>
            <td>${cel(r.lote)}</td>
            <td>${cel(r.cantidadEntrada != null ? `${r.cantidadEntrada} ${r.unidad ?? ''}` : '')}</td>
            <td>${cel(r.productoResultante)}</td>
            <td>${cel(r.cantidadResultante != null ? `${r.cantidadResultante} ${r.unidad ?? ''}` : '')}</td>
            <td>${cel(r.proceso)}</td>
            <td>${cel(r.responsable)}</td>
          </tr>`,
      )
      .join('')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acondicionamiento</title>
      <style>
        body{font-family:Arial,sans-serif;margin:24px;color:#1e293b}
        h1{font-size:18px;margin:0 0 12px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #888;padding:4px 6px;text-align:left}
        th{background:#efe7e0}
      </style></head><body>
      <h1>Acondicionamiento (${filas.length})</h1>
      <table><thead><tr>
        <th>#</th><th>Fecha</th><th>Producto</th><th>Lote interno</th><th>Lote</th>
        <th>Kilos</th><th>Se convierte en</th><th>Kilos result.</th><th>Proceso</th><th>Responsable</th>
      </tr></thead><tbody>${filasHtml}</tbody></table>
      </body></html>`)
    win.document.close()
    win.focus()
    win.print()
  }

  function actualizar<K extends keyof NuevoAcondicionamiento>(
    campo: K,
    valor: NuevoAcondicionamiento[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir producto: guarda nombre, id y unidad. Si ya hay un lote elegido,
  // trae la cantidad de ESE producto en el lote.
  function elegirProducto(id: string) {
    const p = productos.find((x) => x.id === id)
    const lote = form.lote?.trim()
    const kilos = lote
      ? kilosPorLoteProducto.get(`${lote}||${id}`)
      : undefined
    setForm((prev) => ({
      ...prev,
      productoId: id,
      producto: p?.nombre ?? '',
      unidad: p?.unidad ?? prev.unidad,
      cantidadEntrada: kilos ?? prev.cantidadEntrada,
    }))
  }

  // Al escribir/elegir un lote solo se fija el lote. El producto NO se
  // autocompleta: el usuario elige que producto de ese lote va a procesar.
  function elegirLote(lote: string) {
    setForm((prev) => ({
      ...prev,
      lote,
      productoId: '',
      producto: '',
      cantidadEntrada: undefined,
    }))
  }

  // Al elegir producto resultante (buscador por id) guarda su nombre.
  function elegirResultante(id: string) {
    const p = productos.find((x) => x.id === id)
    actualizar('productoResultante', p?.nombre ?? '')
  }

  // Al elegir ficha tecnica: si tiene dias de vencimiento, calcula la fecha
  // de vencimiento a partir de la fecha del proceso (fecha + diasVencimiento).
  function elegirFicha(id: string) {
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
      return { ...prev, fichaId: id, fechaVencimiento }
    })
  }

  const idResultante = useMemo(
    () =>
      productos.find((p) => p.nombre === form.productoResultante)?.id ?? '',
    [productos, form.productoResultante],
  )

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setIntentoGuardar(false)
    setMostrarForm(true)
  }

  // Pide la contrasena antes de abrir el formulario de edicion.
  function pedirPasswordEdicion(r: Registro) {
    setRegistroAEditar(r)
    setPasswordEditar('')
    setErrorEditar(null)
  }

  // Verifica la contrasena; si es correcta abre el formulario de edicion.
  async function confirmarPasswordEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!registroAEditar || verificandoPassword) return
    if (!passwordEditar.trim()) {
      setErrorEditar('Ingresa tu contrasena')
      return
    }
    setVerificandoPassword(true)
    setErrorEditar(null)
    try {
      await api.verificarPassword(passwordEditar)
      setPasswordVerificada(passwordEditar)
      abrirEdicion(registroAEditar)
      setRegistroAEditar(null)
      setPasswordEditar('')
    } catch (err) {
      setErrorEditar(
        err instanceof Error ? err.message : 'Contrasena incorrecta',
      )
    } finally {
      setVerificandoPassword(false)
    }
  }

  function abrirEdicion(r: Registro) {
    setEditandoId(r.id)
    setForm({
      fecha: r.fecha ? isoALocal(r.fecha) : hoy(),
      producto: r.producto,
      productoId: r.productoId ?? '',
      lote: r.lote ?? '',
      cantidadEntrada: r.cantidadEntrada,
      unidad: r.unidad ?? '',
      productoResultante: r.productoResultante ?? '',
      cantidadResultante: r.cantidadResultante,
      proceso: r.proceso ?? '',
      responsable: r.responsable ?? '',
      observaciones: r.observaciones ?? '',
      fichaId: r.fichaId ?? '',
      empresa: r.empresa ?? '',
      conservacion: r.conservacion ?? '',
      instrucciones: r.instrucciones ?? '',
      fechaVencimiento: r.fechaVencimiento ?? '',
      fechaEmpaque: r.fechaEmpaque ?? '',
      destino: r.destino ?? '',
      placaVehiculo: r.placaVehiculo ?? '',
      temperaturaVehiculo: r.temperaturaVehiculo ?? '',
      temperaturaProducto: r.temperaturaProducto ?? '',
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (guardando) return
    const faltan: string[] = []
    if (!form.fecha) faltan.push('Fecha')
    if (!(form.lote ?? '').trim()) faltan.push('Lote')
    if (!(form.productoId ?? '').trim()) faltan.push('Producto')
    if (typeof form.cantidadEntrada !== 'number' || !(form.cantidadEntrada > 0))
      faltan.push('Kilos del lote')
    if (!(form.productoResultante ?? '').trim()) faltan.push('Se convierte en')
    if (
      typeof form.cantidadResultante !== 'number' ||
      !(form.cantidadResultante > 0)
    )
      faltan.push('Kilos resultantes')
    if (!(form.proceso ?? '').trim()) faltan.push('Proceso')
    if (!(form.fichaId ?? '').trim()) faltan.push('Vida útil')
    if (!(form.fechaVencimiento ?? '').trim()) faltan.push('Fecha de vencimiento')
    if (!(form.fechaEmpaque ?? '').trim()) faltan.push('Fecha de empaque')
    if (!(form.responsable ?? '').trim()) faltan.push('Responsable')
    if (faltan.length > 0) {
      setIntentoGuardar(true)
      setErrorForm(`Falta por llenar: ${faltan.join(', ')}`)
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevoAcondicionamiento = {
        fecha: form.fecha || undefined,
        producto: form.producto.trim(),
        productoId: form.productoId?.trim() || undefined,
        lote: form.lote?.trim() || undefined,
        cantidadEntrada:
          typeof form.cantidadEntrada === 'number'
            ? form.cantidadEntrada
            : undefined,
        unidad: form.unidad?.trim() || undefined,
        productoResultante: form.productoResultante?.trim() || undefined,
        cantidadResultante:
          typeof form.cantidadResultante === 'number'
            ? form.cantidadResultante
            : undefined,
        proceso: form.proceso?.trim() || undefined,
        responsable: form.responsable?.trim() || undefined,
        observaciones: form.observaciones?.trim() || undefined,
        fichaId: form.fichaId?.trim() || undefined,
        empresa: form.empresa?.trim() || undefined,
        conservacion: form.conservacion?.trim() || undefined,
        instrucciones: form.instrucciones?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento?.trim() || undefined,
        fechaEmpaque: form.fechaEmpaque?.trim() || undefined,
        destino: form.destino?.trim() || undefined,
        placaVehiculo: form.placaVehiculo?.trim() || undefined,
        temperaturaVehiculo: form.temperaturaVehiculo?.trim() || undefined,
        temperaturaProducto: form.temperaturaProducto?.trim() || undefined,
      }
      if (editandoId) {
        const upd = await api.actualizarAcondicionamiento(
          editandoId,
          datos,
          passwordVerificada,
        )
        setItems((prev) => prev.map((r) => (r.id === editandoId ? upd : r)))
      } else {
        const creado = await api.crearAcondicionamiento(datos)
        setItems((prev) => [creado, ...prev])
      }
      setMostrarForm(false)
      setEditandoId(null)
      setPasswordVerificada('')
      setIntentoGuardar(false)
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
      await api.eliminarAcondicionamiento(aEliminar.id, password)
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

  const procesos = new Set(items.map((r) => r.proceso).filter(Boolean)).size

  // Clase del input con borde rojo cuando el campo obligatorio esta vacio.
  const claseRoja =
    'w-full rounded-md border border-red-500 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'
  const clase = (falta: boolean) =>
    intentoGuardar && falta ? claseRoja : inputClase

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Acondicionamiento
          </h2>
          <p className="text-slate-500">
            Transformacion de producto recibido en producto terminado
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
        <Kpi label="Tipos de proceso" value={procesos} />
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
            {editandoId ? 'Editar registro' : 'Nuevo registro'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <Campo label="Fecha">
                <input
                  type="datetime-local"
                  value={form.fecha ?? ''}
                  onChange={(e) => actualizar('fecha', e.target.value)}
                  className={clase(!form.fecha)}
                />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Lote">
                <SelectorBuscable
                  opciones={todosLosLotes.map((l) => l.lote)}
                  value={form.lote ?? ''}
                  onChange={(v) => elegirLote(v)}
                  placeholder="Escribe o elige un lote"
                  buscarPlaceholder="Buscar lote..."
                  permitirLibre
                  invalido={intentoGuardar && !(form.lote ?? '').trim()}
                />
              </Campo>
            </div>
            <div className="md:col-span-5">
              <Campo label="Producto *">
                <SelectorProducto
                  productos={productos}
                  value={form.productoId ?? ''}
                  onChange={elegirProducto}
                  invalido={intentoGuardar && !(form.productoId ?? '').trim()}
                />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Kg Entrada">
                <PesoInput
                  value={form.cantidadEntrada ?? undefined}
                  onChange={(v) => actualizar('cantidadEntrada', v)}
                  className={clase(
                    typeof form.cantidadEntrada !== 'number' ||
                      !(form.cantidadEntrada > 0),
                  )}
                />
              </Campo>
            </div>
          </div>

          {/* Conversion: kilos que entran -> en que se convierte */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-brand-200 bg-brand-50 p-4 md:grid-cols-12">
            <div className="md:col-span-5">
              <Campo label="Se convierte en">
                <SelectorProducto
                  productos={productos}
                  value={idResultante}
                  onChange={elegirResultante}
                  invalido={intentoGuardar && !(form.productoResultante ?? '').trim()}
                />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Kg Salida">
                <PesoInput
                  value={form.cantidadResultante ?? undefined}
                  onChange={(v) => actualizar('cantidadResultante', v)}
                  className={clase(
                    typeof form.cantidadResultante !== 'number' ||
                      !(form.cantidadResultante > 0),
                  )}
                />
              </Campo>
            </div>
            <div className="md:col-span-2">
              <Campo label="Proceso">
                <select
                  value={form.proceso ?? ''}
                  onChange={(e) => actualizar('proceso', e.target.value)}
                  className={clase(!(form.proceso ?? '').trim())}
                >
                  <option value="">Selecciona un proceso</option>
                  <option value="Molienda">Molienda</option>
                  <option value="Empaque al vacio">Empaque al vacio</option>
                  <option value="No aplica">No aplica</option>
                </select>
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo label="Vida útil">
                <SelectorFicha
                  fichas={fichas}
                  value={form.fichaId ?? ''}
                  onChange={elegirFicha}
                  invalido={intentoGuardar && !(form.fichaId ?? '').trim()}
                />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo label="Fecha de vencimiento">
                <input
                  type="date"
                  value={form.fechaVencimiento ?? ''}
                  onChange={(e) => actualizar('fechaVencimiento', e.target.value)}
                  className={clase(!(form.fechaVencimiento ?? '').trim())}
                />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo label="Fecha de empaque">
                <input
                  type="date"
                  value={form.fechaEmpaque ?? ''}
                  onChange={(e) => actualizar('fechaEmpaque', e.target.value)}
                  className={clase(!(form.fechaEmpaque ?? '').trim())}
                />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo label="Responsable">
                <input
                  value={form.responsable ?? ''}
                  onChange={(e) => actualizar('responsable', e.target.value)}
                  className={clase(!(form.responsable ?? '').trim())}
                />
              </Campo>
            </div>
            <div className="md:col-span-3">
              <Campo label="Destino">
                <SelectorBuscable
                  opciones={[
                    'SALA DE VENTAS',
                    ...clientes.map((c) =>
                      [c.nombre, c.apellidos]
                        .filter(Boolean)
                        .join(' ')
                        .toUpperCase(),
                    ),
                  ]}
                  value={form.destino ?? ''}
                  onChange={(valor) => actualizar('destino', valor)}
                  placeholder="Selecciona el destino"
                  buscarPlaceholder="Buscar cliente..."
                  permitirLibre
                />
              </Campo>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Empacado por (empresa)">
              <input
                value={form.empresa ?? ''}
                onChange={(e) => actualizar('empresa', e.target.value)}
                placeholder="Ej. Carnes Santacruz SAS"
                className={inputClase}
              />
            </Campo>
            <Campo label="Condiciones de conservacion">
              <input
                value={form.conservacion ?? ''}
                onChange={(e) => actualizar('conservacion', e.target.value)}
                placeholder="Ej. Conserve a una temperatura de -18 C"
                className={inputClase}
              />
            </Campo>
            <Campo label="Instrucciones de uso">
              <input
                value={form.instrucciones ?? ''}
                onChange={(e) => actualizar('instrucciones', e.target.value)}
                placeholder="Ej. Cocinar, asar, freir, hornear."
                className={inputClase}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="T. Producto">
              <div className="relative">
                <input
                  value={form.temperaturaProducto ?? ''}
                  onChange={(e) =>
                    actualizar('temperaturaProducto', e.target.value)
                  }
                  placeholder="Ej. -15"
                  className={`${inputClase} pr-9`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                  °C
                </span>
              </div>
            </Campo>
            <Campo label="T. Vehiculo">
              <div className="relative">
                <input
                  value={form.temperaturaVehiculo ?? ''}
                  onChange={(e) =>
                    actualizar('temperaturaVehiculo', e.target.value)
                  }
                  placeholder="Ej. -18"
                  className={`${inputClase} pr-9`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                  °C
                </span>
              </div>
            </Campo>
            <Campo label="Placa del vehiculo">
              <input
                value={form.placaVehiculo ?? ''}
                onChange={(e) => actualizar('placaVehiculo', e.target.value)}
                placeholder="Ej. ABC123"
                className={inputClase}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            placeholder="Producto, lote, proceso, responsable..."
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
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Lote interno</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Kilos</th>
              <th className="px-4 py-3 font-medium">Se convierte en</th>
              <th className="px-4 py-3 font-medium">Kilos result.</th>
              <th className="px-4 py-3 font-medium">Proceso</th>
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
                  {`A-${consecutivos.get(r.id) ?? indice + 1}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {fmtFecha(r.fecha)}
                  {r.editado && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Editado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.producto}
                </td>
                <td className="px-4 py-3 font-medium text-brand-700">
                  {r.loteInterno ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.lote ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.cantidadEntrada != null
                    ? `${r.cantidadEntrada} ${r.unidad ?? ''}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.productoResultante ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.cantidadResultante != null
                    ? `${r.cantidadResultante} ${r.unidad ?? ''}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.proceso ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() =>
                        imprimirActaDespacho({
                          titulo: 'ACTA DE DESPACHO',
                          documento: r.loteInterno,
                          fecha: r.fecha,
                          cliente: r.destino,
                          destino: r.destino,
                          puntoVenta:
                            r.puntoVenta ??
                            disponibles.find((p) => Number(p.id) === activo)
                              ?.pdv,
                          responsable: r.responsable,
                          observaciones: r.observaciones,
                          placaVehiculo: r.placaVehiculo,
                          temperaturaVehiculo: r.temperaturaVehiculo,
                          temperaturaProducto: r.temperaturaProducto,
                          firmaCalidad: [usuario?.nombre, usuario?.apellido]
                            .filter(Boolean)
                            .join(' '),
                          items: [
                            {
                              producto: r.productoResultante || r.producto,
                              lote: loteCompuesto(r),
                              cantidad: r.cantidadResultante ?? r.cantidadEntrada,
                              unidad: r.unidad,
                              codigo: productos.find(
                                (p) =>
                                  p.nombre ===
                                  (r.productoResultante || r.producto),
                              )?.sku,
                              fechaBeneficio: fechaBeneficioDe(r),
                              fechaEmpaque: r.fechaEmpaque,
                              fechaVencimiento: r.fechaVencimiento,
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
                    <button
                      onClick={() => setEtiqueta(r)}
                      title="Etiqueta"
                      aria-label="Etiqueta"
                      className="rounded p-1.5 text-brand-600 hover:bg-brand-50"
                    >
                      <IconoEtiqueta />
                    </button>
                    <button
                      onClick={() => pedirPasswordEdicion(r)}
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
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
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
          titulo="Eliminar registro"
          descripcion={`Vas a eliminar el acondicionamiento de "${aEliminar.producto}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}

      {etiqueta && (
        <EtiquetaAcondicionamiento
          registro={etiqueta}
          loteCompuesto={loteCompuesto(etiqueta)}
          fechaBeneficio={fechaBeneficioDe(etiqueta)}
          producto={productos.find(
            (p) => p.nombre === etiqueta.productoResultante,
          )}
          ficha={fichas.find((f) => f.id === etiqueta.fichaId)}
          clienteDestino={clientes.find(
            (c) =>
              [c.nombre, c.apellidos]
                .filter(Boolean)
                .join(' ')
                .toUpperCase()
                .trim() === (etiqueta.destino ?? '').toUpperCase().trim(),
          )}
          onCerrar={() => setEtiqueta(null)}
        />
      )}

      {registroAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={confirmarPasswordEdicion}
            className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Editar registro
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Vas a editar el acondicionamiento de{' '}
                <span className="font-medium text-slate-700">
                  {registroAEditar.producto}
                </span>
                . Ingresa tu contrasena para poder editarlo.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contrasena
              </label>
              <input
                type="password"
                name="clave-edicion"
                autoComplete="new-password"
                autoFocus
                value={passwordEditar}
                onChange={(e) => setPasswordEditar(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {errorEditar && (
              <p className="text-sm text-red-600">{errorEditar}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRegistroAEditar(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={verificandoPassword}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verificandoPassword ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
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
