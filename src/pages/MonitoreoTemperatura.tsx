import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoMonitoreoTemperatura } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorBuscable } from '../components/SelectorBuscable'
import { usePuntoVenta } from '../store/PuntoVentaContext'
import type {
  MonitoreoTemperatura,
  MedicionTemp,
  PuntoVenta,
  CuartoFrio,
} from '../types/trazabilidad'

const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
]

const DIAS = 31

interface FormTemp {
  puntoVenta: string
  ubicacion: string
  cuartoFrioId: number | null
  serial: string
  mes: string
  anio: string
  funcionarios: string
  observaciones: string
  mediciones: MedicionTemp[]
}

function medicionesVacias(): MedicionTemp[] {
  return Array.from({ length: DIAS }, () => ({
    manianaEquipo: null,
    manianaProducto: null,
    tardeEquipo: null,
    tardeProducto: null,
  }))
}

const formVacio = (): FormTemp => ({
  puntoVenta: '',
  ubicacion: '',
  cuartoFrioId: null,
  serial: '',
  mes: MESES[new Date().getMonth()],
  anio: String(new Date().getFullYear()),
  funcionarios: '',
  observaciones: '',
  mediciones: medicionesVacias(),
})

// ------- Geometria de la grafica (compartida pantalla / impresion) -------
const TMAX = 15
const TMIN = -18
const DEG_PX = 30
const TOP_PAD = 56
const LEFT_PAD = 74
const COL_W = 36
const RIGHT_PAD = 16
const BOTTOM_PAD = 16
const COLS = DIAS * 2
// Cada temperatura ocupa una casilla completa (no una linea), por eso +1
const INNER_H = (TMAX - TMIN + 1) * DEG_PX
const TOTAL_W = LEFT_PAD + COLS * COL_W + RIGHT_PAD
const TOTAL_H = TOP_PAD + INNER_H + BOTTOM_PAD

// Borde superior de la casilla de la temperatura t
const yTop = (t: number) => TOP_PAD + (TMAX - t) * DEG_PX
// Centro de la casilla (ahi coinciden el numero y la marca)
const cy = (t: number) => yTop(t) + DEG_PX / 2
// Ambos puntos (Equipo y Producto) se marcan centrados en la misma casilla.
// La mitad izquierda del clic = Equipo, la mitad derecha = Producto.
const xPix = (slot: number) => LEFT_PAD + slot * COL_W + COL_W / 2

// Convierte coordenadas de mouse a slot (columna) y temperatura (casilla)
function slotDesdeX(x: number): number {
  return Math.floor((x - LEFT_PAD) / COL_W)
}
function tempDesdeY(y: number): number {
  const t = TMAX - Math.floor((y - TOP_PAD) / DEG_PX)
  return Math.max(TMIN, Math.min(TMAX, t))
}

function colorBanda(t: number): string {
  if (t >= 0 && t <= 4) return '#bfe3a8'
  if (t >= 5 && t <= 7) return '#fff2a8'
  return '#f3b4b4'
}

function puntosSerie(
  mediciones: MedicionTemp[],
  tipo: 'equipo' | 'producto',
): { x: number; y: number; slot: number }[] {
  const pts: { x: number; y: number; slot: number }[] = []
  mediciones.forEach((m, i) => {
    const manana = tipo === 'equipo' ? m.manianaEquipo : m.manianaProducto
    const tarde = tipo === 'equipo' ? m.tardeEquipo : m.tardeProducto
    if (manana != null) pts.push({ x: xPix(i * 2), y: cy(manana), slot: i * 2 })
    if (tarde != null)
      pts.push({ x: xPix(i * 2 + 1), y: cy(tarde), slot: i * 2 + 1 })
  })
  return pts
}

// Divide los puntos en tramos consecutivos (sin saltar cuadros vacios)
function segmentosContiguos(
  pts: { x: number; y: number; slot: number }[],
): { x: number; y: number }[][] {
  const segs: { x: number; y: number }[][] = []
  let actual: { x: number; y: number }[] = []
  pts.forEach((p, i) => {
    if (i > 0 && p.slot !== pts[i - 1].slot + 1) {
      if (actual.length) segs.push(actual)
      actual = []
    }
    actual.push({ x: p.x, y: p.y })
  })
  if (actual.length) segs.push(actual)
  return segs
}

// Devuelve los slots (columna dia/turno) ya marcados para una serie
function slotsLlenos(
  mediciones: MedicionTemp[],
  tipo: 'equipo' | 'producto',
): number[] {
  const arr: number[] = []
  mediciones.forEach((m, i) => {
    const man = tipo === 'equipo' ? m.manianaEquipo : m.manianaProducto
    const tar = tipo === 'equipo' ? m.tardeEquipo : m.tardeProducto
    if (man != null) arr.push(i * 2)
    if (tar != null) arr.push(i * 2 + 1)
  })
  return arr
}

function pathSuave(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

function svgTemperatura(mediciones: MedicionTemp[], conCurva = true): string {
  const partes: string[] = []

  // Bandas de color por casilla de grado
  for (let t = TMAX; t >= TMIN; t--) {
    partes.push(
      `<rect x="${LEFT_PAD}" y="${yTop(t)}" width="${COLS * COL_W}" height="${DEG_PX}" fill="${colorBanda(t)}" />`,
    )
  }

  // Lineas horizontales (bordes de casillas) + etiquetas centradas en la casilla
  for (let t = TMAX; t >= TMIN; t--) {
    partes.push(
      `<line x1="${LEFT_PAD}" y1="${yTop(t)}" x2="${LEFT_PAD + COLS * COL_W}" y2="${yTop(t)}" stroke="#e57373" stroke-width="0.5" />`,
    )
    partes.push(
      `<text x="${LEFT_PAD - 6}" y="${cy(t) + 3}" font-size="8" text-anchor="end" fill="#333">${t.toFixed(1)}</text>`,
    )
  }
  // Linea inferior de la ultima casilla
  partes.push(
    `<line x1="${LEFT_PAD}" y1="${yTop(TMIN) + DEG_PX}" x2="${LEFT_PAD + COLS * COL_W}" y2="${yTop(TMIN) + DEG_PX}" stroke="#e57373" stroke-width="0.5" />`,
  )

  // Lineas verticales de turno (M/T) dentro del area de la grafica
  for (let c = 0; c <= COLS; c++) {
    if (c % 2 === 0) continue
    const x = LEFT_PAD + c * COL_W
    partes.push(
      `<line x1="${x}" y1="${TOP_PAD}" x2="${x}" y2="${TOP_PAD + INNER_H}" stroke="#5b6ee0" stroke-width="0.7" />`,
    )
  }

  // Encabezado: numero de dia y turno M/T
  for (let d = 0; d < DIAS; d++) {
    const xIni = LEFT_PAD + d * 2 * COL_W
    partes.push(
      `<rect x="${xIni}" y="${TOP_PAD - 30}" width="${COL_W * 2}" height="16" fill="#f1f1f1" stroke="#bbb" stroke-width="0.4" />`,
      `<text x="${xIni + COL_W}" y="${TOP_PAD - 19}" font-size="8" text-anchor="middle" fill="#111">${d + 1}</text>`,
      `<rect x="${xIni}" y="${TOP_PAD - 14}" width="${COL_W}" height="14" fill="#dcdcdc" stroke="#bbb" stroke-width="0.4" />`,
      `<rect x="${xIni + COL_W}" y="${TOP_PAD - 14}" width="${COL_W}" height="14" fill="#ffffff" stroke="#bbb" stroke-width="0.4" />`,
      `<text x="${xIni + COL_W / 2}" y="${TOP_PAD - 3}" font-size="7" text-anchor="middle" fill="#111">M</text>`,
      `<text x="${xIni + COL_W + COL_W / 2}" y="${TOP_PAD - 3}" font-size="7" text-anchor="middle" fill="#111">T</text>`,
    )
  }

  // Separadores de dia (azules) recorriendo toda la tabla, encima del encabezado
  for (let c = 0; c <= COLS; c += 2) {
    const x = LEFT_PAD + c * COL_W
    partes.push(
      `<line x1="${x}" y1="${TOP_PAD - 30}" x2="${x}" y2="${TOP_PAD + INNER_H}" stroke="#5b6ee0" stroke-width="1" />`,
    )
  }

  // Curvas
  const ptsEquipo = puntosSerie(mediciones, 'equipo')
  const ptsProducto = puntosSerie(mediciones, 'producto')
  if (conCurva) {
    segmentosContiguos(ptsEquipo).forEach((seg) => {
      partes.push(
        `<path d="${pathSuave(seg)}" fill="none" stroke="#1f3a93" stroke-width="1.4" />`,
      )
    })
    segmentosContiguos(ptsProducto).forEach((seg) => {
      partes.push(
        `<path d="${pathSuave(seg)}" fill="none" stroke="#444" stroke-width="1.1" stroke-dasharray="3 2" />`,
      )
    })
  }

  // Puntos: equipo = punto azul, producto = punto negro (ambos circulos)
  ptsEquipo.forEach((p) => {
    partes.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.6" fill="#0000ff" stroke="#ffffff" stroke-width="0.7" />`,
    )
  })
  ptsProducto.forEach((p) => {
    partes.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.6" fill="#000000" stroke="#ffffff" stroke-width="0.7" />`,
    )
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="${TOTAL_H}" viewBox="0 0 ${TOTAL_W} ${TOTAL_H}" font-family="Arial, sans-serif">${partes.join('')}</svg>`
}

export function MonitoreoTemperatura() {
  const { esAdmin, disponibles, activo } = usePuntoVenta()
  const pdvActivoNombre = useMemo(
    () => disponibles.find((p) => Number(p.id) === activo)?.pdv ?? '',
    [disponibles, activo],
  )
  const [registros, setRegistros] = useState<MonitoreoTemperatura[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
  const [cuartos, setCuartos] = useState<CuartoFrio[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormTemp>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [curvaAuto, setCurvaAuto] = useState(false)
  const [lapiz, setLapiz] = useState<'equipo' | 'producto'>('equipo')

  const [aEliminar, setAEliminar] = useState<MonitoreoTemperatura | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [datos, pdv] = await Promise.all([
        api.getMonitoreoTemperatura(),
        api.getPuntosVenta(),
      ])
      setRegistros(datos)
      setPuntosVenta(pdv)
      try {
        setCuartos(await api.getCuartosFrios())
      } catch {
        setCuartos([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar registros')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  // Los usuarios no administradores trabajan siempre sobre el PDV de su sesion.
  useEffect(() => {
    if (esAdmin || !pdvActivoNombre) return
    setForm((prev) =>
      prev.puntoVenta === pdvActivoNombre
        ? prev
        : { ...prev, puntoVenta: pdvActivoNombre },
    )
  }, [esAdmin, pdvActivoNombre])

  const formValido = useMemo(() => form.puntoVenta.trim() !== '', [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.puntoVenta ?? '').toLowerCase().includes(t) ||
        (r.ubicacion ?? '').toLowerCase().includes(t) ||
        (r.mes ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormTemp>(campo: K, valor: FormTemp[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Marca una casilla al hacer clic en la grafica (segun el modo Equipo/Producto)
  function marcarEnGrafica(e: React.MouseEvent<HTMLDivElement>) {
    const svg = e.currentTarget.querySelector('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (
      x < LEFT_PAD ||
      x > LEFT_PAD + COLS * COL_W ||
      y < TOP_PAD ||
      y > TOP_PAD + INNER_H
    )
      return
    const slot = slotDesdeX(x)
    if (slot < 0 || slot >= COLS) return
    const t = tempDesdeY(y)
    const dia = Math.floor(slot / 2)
    const esManana = slot % 2 === 0
    const campo: keyof MedicionTemp =
      lapiz === 'equipo'
        ? esManana
          ? 'manianaEquipo'
          : 'tardeEquipo'
        : esManana
          ? 'manianaProducto'
          : 'tardeProducto'
    const valActual = form.mediciones[dia][campo]
    const llenos = slotsLlenos(form.mediciones, lapiz)
    const quitar = valActual != null && valActual === t
    if (llenos.length > 0) {
      const min = Math.min(...llenos)
      const max = Math.max(...llenos)
      if (quitar) {
        // Solo se pueden quitar los puntos de los extremos (no dejar huecos)
        if (slot !== min && slot !== max) {
          setErrorForm('No puedes dejar espacios en blanco: quita primero los puntos del extremo.')
          return
        }
      } else if (valActual == null) {
        // Solo se puede agregar pegado al bloque (sin saltar cuadros)
        if (slot < min - 1 || slot > max + 1) {
          setErrorForm('No puedes saltar cuadros: marca en la casilla siguiente sin dejar espacios.')
          return
        }
      }
    }
    setErrorForm(null)
    setForm((prev) => {
      const mediciones = prev.mediciones.map((m, i) =>
        i === dia
          ? { ...m, [campo]: m[campo] === t ? null : t }
          : m,
      )
      return { ...prev, mediciones }
    })
  }

  // Borra todos los puntos de una serie (equipo = azul, producto = negro)
  function borrarPuntos(tipo: 'equipo' | 'producto') {
    setForm((prev) => {
      const mediciones = prev.mediciones.map((m) =>
        tipo === 'equipo'
          ? { ...m, manianaEquipo: null, tardeEquipo: null }
          : { ...m, manianaProducto: null, tardeProducto: null },
      )
      return { ...prev, mediciones }
    })
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm({ ...formVacio(), puntoVenta: esAdmin ? '' : pdvActivoNombre })
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: MonitoreoTemperatura) {
    setEditandoId(r.id)
    const mediciones = medicionesVacias()
    ;(r.mediciones ?? []).slice(0, DIAS).forEach((m, i) => {
      mediciones[i] = {
        manianaEquipo: m.manianaEquipo ?? null,
        manianaProducto: m.manianaProducto ?? null,
        tardeEquipo: m.tardeEquipo ?? null,
        tardeProducto: m.tardeProducto ?? null,
      }
    })
    setForm({
      puntoVenta: r.puntoVenta ?? '',
      ubicacion: r.ubicacion ?? '',
      cuartoFrioId: r.cuartoFrioId ?? null,
      serial: r.serial ?? '',
      mes: r.mes ?? '',
      anio: r.anio != null ? String(r.anio) : '',
      funcionarios: r.funcionarios ?? '',
      observaciones: r.observaciones ?? '',
      mediciones,
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
      const datos: NuevoMonitoreoTemperatura = {
        puntoVenta: form.puntoVenta.trim(),
        ubicacion: form.ubicacion.trim() || undefined,
        cuartoFrioId: form.cuartoFrioId ?? undefined,
        serial: form.serial.trim() || undefined,
        mes: form.mes.trim() || undefined,
        anio: form.anio.trim() ? Number(form.anio) : undefined,
        funcionarios: form.funcionarios.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined,
        mediciones: form.mediciones,
      }
      if (editandoId) {
        const actualizado = await api.actualizarMonitoreoTemperatura(
          editandoId,
          datos,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearMonitoreoTemperatura(datos)
        setRegistros((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el registro',
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
      await api.eliminarMonitoreoTemperatura(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el registro',
      )
    } finally {
      setEliminando(false)
    }
  }

  function imprimir(r: MonitoreoTemperatura) {
    const win = window.open('', '_blank', 'width=1200,height=800')
    if (!win) return
    const svg = svgTemperatura(r.mediciones ?? medicionesVacias())
    const cel = (v?: string | number | null) =>
      v == null || v === '' ? '&nbsp;' : String(v)
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Monitoreo de Temperatura</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#111}
        table.cab{border-collapse:collapse;width:100%;font-size:11px;margin-bottom:8px}
        table.cab td{border:1px solid #333;padding:4px 6px;vertical-align:middle}
        .logo{width:120px;text-align:center}
        .logo img{max-height:60px;max-width:110px;display:block;margin:0 auto}
        .tit{text-align:center;font-weight:bold;font-size:13px}
        .sub{text-align:center;font-weight:bold;font-size:11px;background:#dfeef7}
        .cod{font-weight:bold;font-size:10px;text-align:left;width:150px}
        .info td{border:1px solid #333;padding:3px 6px;font-size:10px}
        .info .lbl{background:#dfeef7;font-weight:bold}
        .grafica{margin-top:8px}
        @media print{@page{size:landscape;margin:6mm}}
      </style></head><body>
      <table class="cab">
        <tr>
          <td class="logo" rowspan="2"><img src="/logo.jpg" alt="Carnes Santacruz"></td>
          <td class="tit">FORMATO DE MONITOREO DE TEMPERATURA REFRIGERACION (EQUIPOS Y PRODUCTOS)</td>
          <td class="cod">CODIGO: FOR-CIA-007<br>VERSION: 1</td>
        </tr>
        <tr>
          <td class="sub">PROGRAMA DE TRAZABILIDAD DE PRODUCTOS</td>
          <td class="cod">FECHA: 03/06/2022</td>
        </tr>
      </table>
      <table class="cab info">
        <tr>
          <td class="lbl">Punto de venta</td><td>${cel(r.puntoVenta)}</td>
          <td class="lbl">Ubicacion o uso del equipo</td><td>${cel(r.ubicacion)}</td>
          <td class="lbl">Serial o activo del termometro</td><td>${cel(r.serial)}</td>
        </tr>
        <tr>
          <td class="lbl">Mes</td><td>${cel(r.mes)}</td>
          <td class="lbl">Año</td><td>${cel(r.anio)}</td>
          <td class="lbl">Responsable(s) del punto</td><td>${cel(r.funcionarios)}</td>
        </tr>
      </table>
      <div style="font-size:9px;margin:4px 0">Equipo: linea azul (•) &nbsp;&nbsp; Producto: linea punteada (*)</div>
      <div class="grafica">${svg}</div>
      <div style="font-size:10px;margin-top:8px"><b>Observaciones:</b> ${cel(r.observaciones)}</div>
      </body></html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    win.setTimeout(() => win.print(), 400)
  }

  const svgActual = useMemo(
    () => svgTemperatura(form.mediciones, curvaAuto),
    [form.mediciones, curvaAuto],
  )

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Monitoreo de Temperatura
          </h2>
          <p className="text-slate-500">
            Refrigeracion de equipos y productos - curva automatica (FOR-CIA-007)
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar registro' : 'Nuevo registro'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Punto de venta *">
              {esAdmin ? (
                <SelectorBuscable
                  opciones={puntosVenta.map((p) => p.pdv)}
                  value={form.puntoVenta}
                  onChange={(v) => actualizar('puntoVenta', v)}
                  placeholder="Selecciona el punto de venta"
                  buscarPlaceholder="Buscar punto de venta..."
                  permitirLibre
                />
              ) : (
                <input
                  value={form.puntoVenta || pdvActivoNombre}
                  readOnly
                  disabled
                  className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                />
              )}
            </Campo>

            <Campo label="Cuarto frio / equipo">
              <SelectorBuscable
                opciones={cuartos.map((c) => c.nombre)}
                value={form.ubicacion}
                onChange={(v) => {
                  const cuarto = cuartos.find((c) => c.nombre === v)
                  setForm((prev) => ({
                    ...prev,
                    ubicacion: v,
                    cuartoFrioId: cuarto ? Number(cuarto.id) : null,
                  }))
                }}
                placeholder="Selecciona el cuarto frio del punto de venta"
                buscarPlaceholder="Buscar cuarto frio..."
                permitirLibre
              />
            </Campo>

            <Campo label="Serial o activo del termometro">
              <input
                value={form.serial}
                onChange={(e) => actualizar('serial', e.target.value)}
                placeholder="Serial del termometro"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Mes">
              <select
                value={form.mes}
                onChange={(e) => actualizar('mes', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Selecciona</option>
                {MESES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Año">
              <input
                type="number"
                value={form.anio}
                onChange={(e) => actualizar('anio', e.target.value)}
                placeholder="2026"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Responsable(s) del punto">
              <input
                value={form.funcionarios}
                onChange={(e) => actualizar('funcionarios', e.target.value)}
                placeholder="Nombre completo del/los funcionario(s)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-slate-700">
                Elige el lápiz (azul o negro) y haz clic en la casilla del
                día/turno a la altura de la temperatura.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLapiz('equipo')}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
                    lapiz === 'equipo'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-blue-500 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  ✏️ Lápiz azul (Equipo)
                </button>
                <button
                  type="button"
                  onClick={() => setLapiz('producto')}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
                    lapiz === 'producto'
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-700 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  ✏️ Lápiz negro (Producto)
                </button>
                <button
                  type="button"
                  onClick={() => setCurvaAuto((v) => !v)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                    curvaAuto
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-emerald-500 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {curvaAuto ? 'Ocultar curva' : 'Autocompletar'}
                </button>
                <button
                  type="button"
                  onClick={() => borrarPuntos('equipo')}
                  className="rounded-md border border-blue-500 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  Borrar puntos azules
                </button>
                <button
                  type="button"
                  onClick={() => borrarPuntos('producto')}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Borrar puntos negros
                </button>
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-500">
              Lápiz activo:{' '}
              <span className="font-semibold">
                {lapiz === 'equipo' ? 'Azul (Equipo)' : 'Negro (Producto)'}
              </span>
              . Vuelve a hacer clic en la misma marca para quitarla. Puedes
              marcar los dos (azul y negro) en el mismo M o T. Usa{' '}
              <span className="font-semibold">Autocompletar</span> para unir los
              puntos con la curva.
            </p>
            <div
              onClick={marcarEnGrafica}
              className="cursor-crosshair overflow-auto rounded-md border border-slate-200 bg-white p-2"
              style={{ maxHeight: '85vh', maxWidth: '100%' }}
              dangerouslySetInnerHTML={{ __html: svgActual }}
            />
          </div>

          <Campo label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={(e) => actualizar('observaciones', e.target.value)}
              rows={2}
              placeholder="Observaciones"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="flex items-center justify-end gap-3">
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
                  : 'Crear registro'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por punto de venta, ubicacion o mes..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Punto de venta</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Mes</th>
              <th className="px-4 py-3 font-medium">Año</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrosFiltrados.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.puntoVenta ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.ubicacion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.serial ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.mes ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.anio ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => imprimir(r)}
                      className="text-slate-600 hover:underline"
                    >
                      Imprimir
                    </button>
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
                </td>
              </tr>
            ))}
            {registrosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando registros...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin registros de temperatura.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar registro"
          descripcion={`Vas a eliminar el registro de "${aEliminar.puntoVenta ?? ''}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
