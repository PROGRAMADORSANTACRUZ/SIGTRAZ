import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ExcelJS from 'exceljs'
import { api, type NuevaVerificacionLyd } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorBuscable } from '../components/SelectorBuscable'
import type {
  VerificacionLyd,
  CatalogoLyd,
  PuntoVenta,
} from '../types/trazabilidad'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)
const SIMBOLO: Record<string, string> = { C: '✓', NC: '✗', NA: 'N/A' }
// Ciclo al hacer clic en una celda de dia.
const SIGUIENTE: Record<string, string> = { '': 'C', C: 'NC', NC: 'NA', NA: '' }

interface FormLyd {
  superficie: string
  frecuencia: string
  restaurante: string
  mes: string
  anio: string
  dias: string[]
  responsable: string
  verifica: string
  observaciones: string
}

const formVacio = (): FormLyd => ({
  superficie: '',
  frecuencia: '',
  restaurante: '',
  mes: MESES[new Date().getMonth()],
  anio: String(new Date().getFullYear()),
  dias: Array.from({ length: 31 }, () => ''),
  responsable: '',
  verifica: '',
  observaciones: '',
})

export function VerificacionLyd() {
  const [registros, setRegistros] = useState<VerificacionLyd[]>([])
  const [catalogos, setCatalogos] = useState<CatalogoLyd[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormLyd>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<VerificacionLyd | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [datos, catalogosDatos, pdvDatos] = await Promise.all([
        api.getVerificacionesLyd(),
        api.getCatalogosLyd(),
        api.getPuntosVenta(),
      ])
      setRegistros(datos)
      setCatalogos(catalogosDatos)
      setPuntosVenta(pdvDatos)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar verificaciones',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const opciones = useMemo(
    () => ({
      superficie: catalogos
        .filter((c) => c.tipo === 'superficie')
        .map((c) => c.nombre),
      frecuencia: catalogos
        .filter((c) => c.tipo === 'frecuencia')
        .map((c) => c.nombre),
    }),
    [catalogos],
  )

  const formValido = useMemo(() => form.superficie.trim() !== '', [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.superficie ?? '').toLowerCase().includes(t) ||
        (r.frecuencia ?? '').toLowerCase().includes(t) ||
        (r.responsable ?? '').toLowerCase().includes(t) ||
        (r.mes ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormLyd>(campo: K, valor: FormLyd[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function ciclarDia(indice: number) {
    setForm((prev) => {
      const dias = [...prev.dias]
      dias[indice] = SIGUIENTE[dias[indice] ?? ''] ?? ''
      return { ...prev, dias }
    })
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: VerificacionLyd) {
    setEditandoId(r.id)
    const dias = Array.from({ length: 31 }, (_, i) => r.dias?.[i] ?? '')
    setForm({
      superficie: r.superficie ?? '',
      frecuencia: r.frecuencia ?? '',
      restaurante: r.restaurante ?? '',
      mes: r.mes ?? MESES[new Date().getMonth()],
      anio: r.anio ?? String(new Date().getFullYear()),
      dias,
      responsable: r.responsable ?? '',
      verifica: r.verifica ?? '',
      observaciones: r.observaciones ?? '',
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
      const datos: NuevaVerificacionLyd = {
        superficie: form.superficie.trim(),
        frecuencia: form.frecuencia.trim() || undefined,
        restaurante: form.restaurante.trim() || undefined,
        mes: form.mes || undefined,
        anio: form.anio.trim() || undefined,
        dias: form.dias,
        responsable: form.responsable.trim() || undefined,
        verifica: form.verifica.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarVerificacionLyd(
          editandoId,
          datos,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearVerificacionLyd(datos)
        setRegistros((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la verificacion',
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
      await api.eliminarVerificacionLyd(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la verificacion',
      )
    } finally {
      setEliminando(false)
    }
  }

  const seleccionadosLista = useMemo(
    () => registrosFiltrados.filter((r) => seleccionados.has(r.id)),
    [registrosFiltrados, seleccionados],
  )

  const todosMarcados =
    registrosFiltrados.length > 0 &&
    registrosFiltrados.every((r) => seleccionados.has(r.id))

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
      todosMarcados ? new Set() : new Set(registrosFiltrados.map((r) => r.id)),
    )
  }

  function contar(dias: string[] | undefined, valor: string): number {
    return (dias ?? []).filter((d) => d === valor).length
  }

  function imprimir(filas: VerificacionLyd[]) {
    if (filas.length === 0) return
    const win = window.open('', '_blank', 'width=1200,height=800')
    if (!win) return
    const cel = (v?: string | null) => (v == null || v === '' ? '&nbsp;' : v)
    const cab = filas[0]
    const diasTh = DIAS.map((d) => `<th>${d}</th>`).join('')
    // Plantilla: TODAS las superficies del catalogo. Solo se marcan los dias
    // de las que fueron registradas (match por nombre).
    const porSuperficie = new Map<string, VerificacionLyd>()
    filas.forEach((f) => {
      if (f.superficie) porSuperficie.set(f.superficie.trim().toUpperCase(), f)
    })
    const nombres = [...opciones.superficie]
    filas.forEach((f) => {
      const s = (f.superficie ?? '').trim()
      if (s && !nombres.some((n) => n.toUpperCase() === s.toUpperCase()))
        nombres.push(s)
    })
    const filasPlantilla: VerificacionLyd[] = nombres.map(
      (nombre) =>
        porSuperficie.get(nombre.trim().toUpperCase()) ??
        ({ id: '', superficie: nombre, fechaCreacion: '' } as VerificacionLyd),
    )
    const filasHtml = filasPlantilla
      .map((r) => {
        const celdasDia = DIAS.map((_, i) => {
          const v = r.dias?.[i] ?? ''
          const clase = v === 'C' ? 'ok' : v === 'NC' ? 'no' : v === 'NA' ? 'na' : ''
          return `<td class="${clase}">${SIMBOLO[v] ?? ''}</td>`
        }).join('')
        return `<tr>
            <td class="izq">${cel(r.superficie)}</td>
            <td>${cel(r.frecuencia)}</td>
            ${celdasDia}
            <td>${cel(r.responsable)}</td>
            <td>${cel(r.verifica)}</td>
            <td class="izq">${cel(r.observaciones)}</td>
          </tr>`
      })
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Verificacion LYD</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#111}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #333;padding:2px 3px;text-align:center;font-size:9px}
        thead th{background:#f2b979;color:#6b3f18}
        td.izq{text-align:left}
        td.ok{color:#15803d;font-weight:bold}
        td.no{color:#b91c1c;font-weight:bold}
        td.na{color:#64748b}
        .cab td{border:1px solid #333;padding:5px;vertical-align:middle;font-size:11px}
        .cab .logo{width:120px;text-align:center}
        .cab .logo img{max-height:60px;max-width:110px;display:block;margin:0 auto}
        .cab .tit{text-align:center;font-weight:bold;font-size:12px}
        .cab .sub{text-align:center;font-weight:bold}
        .cab .cod{font-weight:bold;font-size:10px;text-align:left;width:150px}
        .meta td{border:1px solid #333;padding:4px;font-weight:bold;font-size:10px}
        .leg{font-size:10px}
        @media print{@page{size:landscape;margin:6mm}}
      </style></head><body>
      <table class="cab">
        <tr>
          <td class="logo" rowspan="3"><img src="/logo.jpg" alt="Carnes Santacruz"></td>
          <td class="tit" rowspan="2">FORMATO DE VERIFICACION DE LIMPIEZA Y DESINFECCION DE AREAS, SUPERFICIES, EQUIPOS Y UTENSILIOS</td>
          <td class="cod">CODIGO: FOR-CIA-034</td>
        </tr>
        <tr><td class="cod">VERSION: 1</td></tr>
        <tr>
          <td class="sub">PROGRAMA DE LIMPIEZA Y DESINFECCION</td>
          <td class="cod">FECHA: 16/10/2025</td>
        </tr>
      </table>
      <table class="meta">
        <tr>
          <td style="width:50%">RESTAURANTE/PUNTO DE VENTA: ${cel(cab.restaurante)}</td>
          <td>MES: ${cel(cab.mes)}</td>
          <td>AÑO: ${cel(cab.anio)}</td>
        </tr>
        <tr><td colspan="3" class="leg">Cumple: ✓ &nbsp;&nbsp; No Cumple: ✗ &nbsp;&nbsp; No Aplica: N/A</td></tr>
      </table>
      <table>
        <thead>
          <tr>
            <th rowspan="2">Superficies, utensilios y equipos a limpiar</th>
            <th rowspan="2">Frecuencia</th>
            <th colspan="31">DIA</th>
            <th rowspan="2">Responsable</th>
            <th rowspan="2">Verifica</th>
            <th rowspan="2">Observaciones</th>
          </tr>
          <tr>${diasTh}</tr>
        </thead>
        <tbody>${filasHtml}</tbody>
      </table>
      </body></html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    win.setTimeout(() => win.print(), 300)
  }

  async function exportarExcel(filas: VerificacionLyd[]) {
    if (filas.length === 0) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('LYD', { views: [{ showGridLines: false }] })
    const cab = filas[0]

    // Anchos: superficie, frecuencia, 31 dias, responsable, verifica, obs.
    ws.getColumn(1).width = 30
    ws.getColumn(2).width = 12
    for (let c = 3; c <= 33; c++) ws.getColumn(c).width = 3.5
    ws.getColumn(34).width = 16
    ws.getColumn(35).width = 16
    ws.getColumn(36).width = 26
    ;[22, 16, 16, 20, 18, 14, 26].forEach((h, i) => {
      ws.getRow(i + 1).height = h
    })

    const set = (r: number, c: number, v: string | number) => {
      ws.getRow(r).getCell(c).value = v
    }

    // Encabezado corporativo
    ws.mergeCells(1, 1, 3, 2)
    ws.mergeCells(1, 3, 2, 33)
    ws.mergeCells(3, 3, 3, 33)
    ws.mergeCells(1, 34, 1, 36)
    ws.mergeCells(2, 34, 2, 36)
    ws.mergeCells(3, 34, 3, 36)
    set(1, 3, 'FORMATO DE VERIFICACION DE LIMPIEZA Y DESINFECCION DE AREAS, SUPERFICIES, EQUIPOS Y UTENSILIOS')
    set(3, 3, 'PROGRAMA DE LIMPIEZA Y DESINFECCION')
    set(1, 34, 'CODIGO: FOR-CIA-034')
    set(2, 34, 'VERSION: 1')
    set(3, 34, 'FECHA: 16/10/2025')

    // Fila 4: restaurante / mes / anio
    ws.mergeCells(4, 1, 4, 24)
    ws.mergeCells(4, 25, 4, 30)
    ws.mergeCells(4, 31, 4, 36)
    set(4, 1, `RESTAURANTE/PUNTO DE VENTA: ${cab.restaurante ?? ''}`)
    set(4, 25, `MES: ${cab.mes ?? ''}`)
    set(4, 31, `AÑO: ${cab.anio ?? ''}`)

    // Fila 5: leyenda
    ws.mergeCells(5, 1, 5, 36)
    set(5, 1, 'Cumple: ✓     No Cumple: ✗     No Aplica: N/A')

    // Encabezado de la tabla (filas 6-7)
    ws.mergeCells(6, 1, 7, 1)
    ws.mergeCells(6, 2, 7, 2)
    ws.mergeCells(6, 3, 6, 33)
    ws.mergeCells(6, 34, 7, 34)
    ws.mergeCells(6, 35, 7, 35)
    ws.mergeCells(6, 36, 7, 36)
    set(6, 1, 'Superficies, utensilios y equipos a limpiar')
    set(6, 2, 'Frecuencia')
    set(6, 3, 'DIA')
    set(6, 34, 'Responsable')
    set(6, 35, 'Verifica')
    set(6, 36, 'Observaciones')
    DIAS.forEach((d, i) => set(7, 3 + i, d))

    // Plantilla: TODAS las superficies del catalogo. Solo se marcan los dias
    // de las que fueron registradas en "Nueva verificacion" (match por nombre).
    const porSuperficie = new Map<string, VerificacionLyd>()
    filas.forEach((f) => {
      if (f.superficie)
        porSuperficie.set(f.superficie.trim().toUpperCase(), f)
    })
    const nombres = [...opciones.superficie]
    filas.forEach((f) => {
      const s = (f.superficie ?? '').trim()
      if (s && !nombres.some((n) => n.toUpperCase() === s.toUpperCase()))
        nombres.push(s)
    })
    const filasExcel: VerificacionLyd[] = nombres.map(
      (nombre) =>
        porSuperficie.get(nombre.trim().toUpperCase()) ??
        ({ id: '', superficie: nombre, fechaCreacion: '' } as VerificacionLyd),
    )

    // Datos (fila 8+)
    filasExcel.forEach((r, idx) => {
      const fila = 8 + idx
      ws.getRow(fila).height = 18
      set(fila, 1, r.superficie ?? '')
      set(fila, 2, r.frecuencia ?? '')
      DIAS.forEach((_, i) => {
        const v = r.dias?.[i] ?? ''
        set(fila, 3 + i, SIMBOLO[v] ?? '')
      })
      set(fila, 34, r.responsable ?? '')
      set(fila, 35, r.verifica ?? '')
      set(fila, 36, r.observaciones ?? '')
    })

    const naranja = 'FFF2B979'
    const verde = 'FFD9F0DE'
    const rojo = 'FFF6D6D6'
    const grisNa = 'FFE7E7E7'
    const linea = { style: 'thin' as const, color: { argb: 'FF888888' } }
    const bordes = { top: linea, bottom: linea, left: linea, right: linea }
    const centro = {
      horizontal: 'center' as const,
      vertical: 'middle' as const,
      wrapText: true,
    }
    const izq = {
      horizontal: 'left' as const,
      vertical: 'middle' as const,
      wrapText: true,
    }

    const ultimaFila = 7 + filasExcel.length
    for (let rr = 1; rr <= ultimaFila; rr++) {
      for (let c = 1; c <= 36; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        if (rr <= 5) {
          // Encabezado corporativo
          cell.alignment = c <= 2 ? centro : rr >= 4 ? izq : centro
          cell.font = { bold: true, size: rr === 1 ? 10 : 9 }
        } else if (rr <= 7) {
          // Encabezado de tabla
          cell.alignment = centro
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: naranja },
          }
          cell.font = { bold: true, size: 8, color: { argb: 'FF6B3F18' } }
        } else {
          // Datos
          const valor = ws.getRow(rr).getCell(c).value
          cell.alignment = c === 1 || c === 36 ? izq : centro
          cell.font = { size: 9 }
          if (c >= 3 && c <= 33) {
            const t =
              valor === '✓'
                ? verde
                : valor === '✗'
                  ? rojo
                  : valor === 'N/A'
                    ? grisNa
                    : null
            if (t)
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: t },
              }
          }
        }
      }
    }

    // Logo centrado sobre A1:B3
    try {
      const resp = await fetch('/logo.jpg')
      const blob = await resp.blob()
      const dataUrl: string = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onloadend = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })
      const img = new Image()
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = rej
        img.src = dataUrl
      })
      const natW = img.naturalWidth || 200
      const natH = img.naturalHeight || 200
      const h = 52
      const w = Math.round((natW / natH) * h)
      const colPx = (ancho: number) => Math.round(ancho * 7 + 5)
      const pxA = colPx(30)
      const pxB = colPx(12)
      const alturas = [22, 16, 16]
      const totalW = pxA + pxB
      const totalH = alturas.reduce((a, b) => a + b, 0)
      const leftPx = Math.max(0, (totalW - w) / 2)
      let topPx = Math.max(0, (totalH - h) / 2)
      const col = leftPx <= pxA ? leftPx / pxA : 1 + (leftPx - pxA) / pxB
      let fila = 0
      while (fila < alturas.length - 1 && topPx > alturas[fila]) {
        topPx -= alturas[fila]
        fila += 1
      }
      const row = fila + topPx / alturas[fila]
      const logoId = wb.addImage({ base64: dataUrl, extension: 'jpeg' })
      ws.addImage(logoId, {
        tl: { col, row },
        ext: { width: w, height: h },
        editAs: 'oneCell',
      })
    } catch {
      set(1, 1, 'CARNES SANTACRUZ')
    }

    const buffer = await wb.xlsx.writeBuffer()
    const salida = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(salida)
    const enlace = document.createElement('a')
    enlace.download =
      filas.length === 1
        ? `verificacion-lyd-${filas[0].superficie || filas[0].id}.xlsx`
        : `verificaciones-lyd-${filas.length}.xlsx`
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Verificacion LYD
          </h2>
          <p className="text-slate-500">
            Limpieza y desinfeccion de areas, superficies, equipos y utensilios
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
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-800">
            {editandoId ? 'Editar verificacion' : 'Nueva verificacion'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.2fr)_7rem_5rem_minmax(0,1.2fr)_minmax(0,1fr)]">
            <Campo label="Restaurante / Punto de venta">
              <SelectorBuscable
                opciones={puntosVenta.map((p) => p.pdv)}
                value={form.restaurante}
                onChange={(v) => actualizar('restaurante', v)}
                placeholder="Selecciona un PDV"
                buscarPlaceholder="Buscar punto de venta..."
                permitirLibre
              />
            </Campo>
            <Campo label="Mes">
              <select
                value={form.mes}
                onChange={(e) => actualizar('mes', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Año">
              <input
                value={form.anio}
                onChange={(e) => actualizar('anio', e.target.value)}
                placeholder="2026"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Superficies, utensilios y equipos *">
              <SelectorBuscable
                opciones={opciones.superficie}
                value={form.superficie}
                onChange={(v) => actualizar('superficie', v)}
                placeholder="Ej. BARRILES"
                buscarPlaceholder="Buscar superficie..."
                permitirLibre
              />
            </Campo>
            <Campo label="Frecuencia">
              <SelectorBuscable
                opciones={opciones.frecuencia}
                value={form.frecuencia}
                onChange={(v) => actualizar('frecuencia', v)}
                placeholder="Diario, Semanal..."
                buscarPlaceholder="Buscar frecuencia..."
                permitirLibre
              />
            </Campo>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <p className="text-sm font-semibold text-slate-700">
                Marca por dia (clic para cambiar)
              </p>
              <span className="text-xs text-slate-500">
                <b className="text-emerald-600">✓</b> Cumple &nbsp;
                <b className="text-red-600">✗</b> No cumple &nbsp;
                <b className="text-slate-500">N/A</b> No aplica
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {DIAS.map((d, i) => {
                const v = form.dias[i] ?? ''
                const clase =
                  v === 'C'
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : v === 'NC'
                      ? 'border-red-500 bg-red-500 text-white'
                      : v === 'NA'
                        ? 'border-slate-400 bg-slate-400 text-white'
                        : 'border-slate-300 bg-white text-slate-400 hover:bg-slate-100'
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => ciclarDia(i)}
                    title={`Dia ${d}`}
                    className={`flex h-11 w-10 flex-col items-center justify-center rounded border text-xs font-medium ${clase}`}
                  >
                    <span className="text-[10px] opacity-70">{d}</span>
                    <span className="text-sm leading-none">
                      {SIMBOLO[v] ?? ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Campo label="Responsable">
              <input
                value={form.responsable}
                onChange={(e) => actualizar('responsable', e.target.value)}
                placeholder="Nombre del responsable"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Verifica">
              <input
                value={form.verifica}
                onChange={(e) => actualizar('verifica', e.target.value)}
                placeholder="Nombre de quien verifica"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Observaciones">
              <input
                value={form.observaciones}
                onChange={(e) => actualizar('observaciones', e.target.value)}
                placeholder="Observaciones"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

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
                  : 'Crear verificacion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por superficie, frecuencia, responsable o mes..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
        />
        <button
          type="button"
          disabled={registrosFiltrados.length === 0}
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
          Imprimir{seleccionadosLista.length > 0 && ` (${seleccionadosLista.length})`}
        </button>
        <button
          type="button"
          disabled={seleccionadosLista.length === 0}
          onClick={() => void exportarExcel(seleccionadosLista)}
          className="rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Descargar Excel{seleccionadosLista.length > 0 && ` (${seleccionadosLista.length})`}
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
              <th className="px-4 py-3 font-medium">Superficie/equipo</th>
              <th className="px-4 py-3 font-medium">Frecuencia</th>
              <th className="px-4 py-3 font-medium">Mes/Año</th>
              <th className="px-4 py-3 font-medium">Resumen</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrosFiltrados.map((r) => (
              <tr
                key={r.id}
                onClick={() => alternarSeleccion(r.id)}
                className={`cursor-pointer hover:bg-slate-50 ${
                  seleccionados.has(r.id) ? 'bg-brand-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => alternarSeleccion(r.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.superficie ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.frecuencia ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.mes ?? '-'} {r.anio ?? ''}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className="mr-2 text-emerald-600">
                    ✓ {contar(r.dias, 'C')}
                  </span>
                  <span className="mr-2 text-red-600">
                    ✗ {contar(r.dias, 'NC')}
                  </span>
                  <span className="text-slate-500">
                    N/A {contar(r.dias, 'NA')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.responsable ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        abrirEdicion(r)
                      }}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
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
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando verificaciones...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin verificaciones registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar verificacion"
          descripcion={`Vas a eliminar la verificacion de "${aEliminar.superficie ?? ''}".`}
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
