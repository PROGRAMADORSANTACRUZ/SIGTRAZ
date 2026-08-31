import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ExcelJS from 'exceljs'
import { api, type NuevoMonitoreoAgua } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { MonitoreoAgua } from '../types/trazabilidad'

interface FormAgua {
  fecha: string
  lugar: string
  cloroResidual: string
  ph: string
  accionesCorrectivas: string
  responsable: string
  observaciones: string
}

const formVacio = (): FormAgua => ({
  fecha: new Date().toISOString().slice(0, 10),
  lugar: '',
  cloroResidual: '',
  ph: '',
  accionesCorrectivas: '',
  responsable: '',
  observaciones: '',
})

export function MonitoreoAguaPotable() {
  const [registros, setRegistros] = useState<MonitoreoAgua[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormAgua>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<MonitoreoAgua | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const datos = await api.getMonitoreoAgua()
      setRegistros(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar registros')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.lugar.trim() !== '', [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.lugar ?? '').toLowerCase().includes(t) ||
        (r.responsable ?? '').toLowerCase().includes(t) ||
        (r.observaciones ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormAgua>(campo: K, valor: FormAgua[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: MonitoreoAgua) {
    setEditandoId(r.id)
    setForm({
      fecha: r.fecha ?? '',
      lugar: r.lugar ?? '',
      cloroResidual: r.cloroResidual ?? '',
      ph: r.ph ?? '',
      accionesCorrectivas: r.accionesCorrectivas ?? '',
      responsable: r.responsable ?? '',
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
      const datos: NuevoMonitoreoAgua = {
        fecha: form.fecha || undefined,
        lugar: form.lugar.trim(),
        cloroResidual: form.cloroResidual.trim() || undefined,
        ph: form.ph.trim() || undefined,
        accionesCorrectivas: form.accionesCorrectivas.trim() || undefined,
        responsable: form.responsable.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarMonitoreoAgua(editandoId, datos)
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearMonitoreoAgua(datos)
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
      await api.eliminarMonitoreoAgua(aEliminar.id, password)
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

  function fmtFecha(v?: string): string {
    if (!v) return ''
    const [a, m, d] = v.slice(0, 10).split('-')
    return a && m && d ? `${d}/${m}/${a}` : v
  }

  function imprimir(filas: MonitoreoAgua[]) {
    if (filas.length === 0) return
    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) return
    const cel = (v?: string | number | null) =>
      v == null || v === '' ? '&nbsp;' : String(v)
    const filasHtml = filas
      .map(
        (r) => `
          <tr>
            <td>${cel(fmtFecha(r.fecha))}</td>
            <td>${cel(r.lugar)}</td>
            <td>${cel(r.cloroResidual)}</td>
            <td>${cel(r.ph)}</td>
            <td>${cel(r.accionesCorrectivas)}</td>
            <td>${cel(r.responsable)}</td>
            <td>${cel(r.observaciones)}</td>
          </tr>`,
      )
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Monitoreo y Control de Agua Potable</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
        table{border-collapse:collapse;width:100%;font-size:11px}
        th,td{border:1px solid #333;padding:4px 6px;text-align:center}
        th{background:#f2b979;color:#6b3f18}
        .cab td{border:1px solid #333;padding:6px;vertical-align:middle}
        .cab .logo{width:130px;text-align:center;vertical-align:middle}
        .cab .logo img{max-height:64px;max-width:120px;display:block;margin:0 auto}
        .cab .tit{text-align:center;font-weight:bold;font-size:13px}
        .cab .sub{text-align:center;font-weight:bold;font-size:11px}
        .cab .cod{font-weight:bold;font-size:10px;text-align:left;width:150px}
        @media print{@page{size:landscape;margin:8mm}}
      </style></head><body>
      <table class="cab">
        <tr>
          <td class="logo" rowspan="2"><img src="/logo.jpg" alt="Carnes Santacruz"></td>
          <td class="tit">FORMATO DE MONITOREO Y CONTROL DE AGUA POTABLE</td>
          <td class="cod">CODIGO: FOR-CIA-014<br>VERSION: 2</td>
        </tr>
        <tr>
          <td class="sub">PROGRAMA DE CALIDAD DEL AGUA</td>
          <td class="cod">FECHA: 18/07/2025</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>FECHA</th>
            <th>LUGAR DE TOMA<br>DE MUESTRA</th>
            <th>RESULTADOS CLORO<br>RESIDUAL (mg/L)*</th>
            <th>RESULTADOS pH</th>
            <th>ACCIONES CORRECTIVAS</th>
            <th>RESPONSABLE<br>DEL MUESTREO</th>
            <th>OBSERVACIONES</th>
          </tr>
        </thead>
        <tbody>${filasHtml}</tbody>
      </table>
      </body></html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    win.setTimeout(() => win.print(), 300)
  }

  async function exportarExcel(filas: MonitoreoAgua[]) {
    if (filas.length === 0) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Agua Potable', {
      views: [{ showGridLines: false }],
    })

    const anchos = [14, 30, 20, 14, 32, 24, 32]
    anchos.forEach((w, i) => {
      ws.getColumn(i + 1).width = w
    })
    ;[24, 18, 18, 30].forEach((h, i) => {
      ws.getRow(i + 1).height = h
    })

    // --- Encabezado corporativo (filas 1-3) ---
    ws.mergeCells('A1:B3')
    ws.mergeCells('C1:E2')
    ws.mergeCells('C3:E3')
    ws.mergeCells('F1:G1')
    ws.mergeCells('F2:G2')
    ws.mergeCells('F3:G3')
    ws.getCell('C1').value = 'FORMATO DE MONITOREO Y CONTROL DE AGUA POTABLE'
    ws.getCell('C3').value = 'PROGRAMA DE CALIDAD DEL AGUA'
    ws.getCell('F1').value = 'CODIGO: FOR-CIA-014'
    ws.getCell('F2').value = 'VERSION: 2'
    ws.getCell('F3').value = 'FECHA: 18/07/2025'

    // --- Encabezado de la tabla (fila 4) ---
    ws.getCell('A4').value = 'FECHA'
    ws.getCell('B4').value = 'LUGAR DE TOMA DE MUESTRA'
    ws.getCell('C4').value = 'RESULTADOS CLORO RESIDUAL (mg/L)*'
    ws.getCell('D4').value = 'RESULTADOS pH'
    ws.getCell('E4').value = 'ACCIONES CORRECTIVAS'
    ws.getCell('F4').value = 'RESPONSABLE DEL MUESTREO'
    ws.getCell('G4').value = 'OBSERVACIONES'

    filas.forEach((r, idx) => {
      const fila = ws.getRow(5 + idx)
      fila.height = 28
      const datos: (string | number)[] = [
        fmtFecha(r.fecha),
        r.lugar ?? '',
        r.cloroResidual ?? '',
        r.ph ?? '',
        r.accionesCorrectivas ?? '',
        r.responsable ?? '',
        r.observaciones ?? '',
      ]
      datos.forEach((v, i) => {
        fila.getCell(i + 1).value = v
      })
    })

    const naranja = 'FFF2B979'
    const gris = 'FFEFE7E0'
    const linea = { style: 'thin' as const, color: { argb: 'FF888888' } }
    const bordes = { top: linea, bottom: linea, left: linea, right: linea }
    const centro = {
      horizontal: 'center' as const,
      vertical: 'middle' as const,
      wrapText: true,
    }
    const izquierda = {
      horizontal: 'left' as const,
      vertical: 'middle' as const,
      wrapText: true,
    }

    // Estilo del encabezado corporativo (filas 1-3)
    for (let rr = 1; rr <= 3; rr++) {
      for (let c = 1; c <= 7; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        if (c <= 2) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          }
          cell.alignment = centro
        } else if (c >= 6) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: gris },
          }
          cell.font = { bold: true, size: 9 }
          cell.alignment = izquierda
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          }
          cell.font = { bold: true, size: rr === 1 ? 11 : 9 }
          cell.alignment = centro
        }
      }
    }

    // Estilo de la tabla (fila 4 encabezado, 5+ datos)
    const ultimaFila = 4 + filas.length
    for (let rr = 4; rr <= ultimaFila; rr++) {
      for (let c = 1; c <= 7; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        cell.alignment = centro
        if (rr === 4) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: naranja },
          }
          cell.font = { bold: true, size: 9, color: { argb: 'FF6B3F18' } }
        } else {
          cell.font = { size: 10 }
        }
      }
    }

    // Logo centrado sobre la celda A1:B3
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
      const pxA = colPx(14)
      const pxB = colPx(30)
      const alturas = [24, 18, 18]
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
      ws.getCell('A1').value = 'CARNES SANTACRUZ'
    }

    const buffer = await wb.xlsx.writeBuffer()
    const salida = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(salida)
    const enlace = document.createElement('a')
    enlace.download =
      filas.length === 1
        ? `agua-potable-${filas[0].lugar || filas[0].id}.xlsx`
        : `agua-potable-${filas.length}.xlsx`
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            M.C. Agua Potable
          </h2>
          <p className="text-slate-500">
            Monitoreo y control de agua potable - Programa de calidad del agua
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
        <Kpi label="Total registros" value={registros.length} />
        <Kpi
          label="Puntos de muestreo"
          value={new Set(registros.map((r) => r.lugar).filter(Boolean)).size}
        />
        <Kpi label="Seleccionados" value={seleccionadosLista.length} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-3">
            {editandoId ? 'Editar registro' : 'Nuevo registro'}
          </h3>

          <div className="md:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Campo label="Fecha">
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => actualizar('fecha', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Lugar de toma de muestra *">
              <input
                value={form.lugar}
                onChange={(e) => actualizar('lugar', e.target.value)}
                placeholder="Ej. Grifo cocina, tanque..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Resultados Cloro Residual (mg/L)*">
              <input
                value={form.cloroResidual}
                onChange={(e) => actualizar('cloroResidual', e.target.value)}
                placeholder="Ej. 0.5"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Resultados pH">
              <input
                value={form.ph}
                onChange={(e) => actualizar('ph', e.target.value)}
                placeholder="Ej. 7.2"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <Campo label="Acciones correctivas">
            <input
              value={form.accionesCorrectivas}
              onChange={(e) =>
                actualizar('accionesCorrectivas', e.target.value)
              }
              placeholder="Accion correctiva aplicada"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Responsable del muestreo">
            <input
              value={form.responsable}
              onChange={(e) => actualizar('responsable', e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={(e) => actualizar('observaciones', e.target.value)}
              rows={2}
              placeholder="Observaciones"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 md:col-span-3"
            />
          </Campo>

          <div className="flex items-center justify-end gap-3 md:col-span-3">
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
          placeholder="Buscar por lugar, responsable u observaciones..."
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
          Imprimir
          {seleccionadosLista.length > 0 && ` (${seleccionadosLista.length})`}
        </button>
        <button
          type="button"
          disabled={seleccionadosLista.length === 0}
          onClick={() => void exportarExcel(seleccionadosLista)}
          className="rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Descargar Excel
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
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Lugar de toma</th>
              <th className="px-4 py-3 font-medium">Cloro (mg/L)</th>
              <th className="px-4 py-3 font-medium">pH</th>
              <th className="px-4 py-3 font-medium">Acciones correctivas</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
              <th className="px-4 py-3 font-medium">Observaciones</th>
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
                <td className="px-4 py-3 text-slate-600">
                  {fmtFecha(r.fecha) || '-'}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.lugar ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.cloroResidual ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.ph ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.accionesCorrectivas ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.responsable ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.observaciones ?? '-'}
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
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando registros...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin registros de agua potable.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar registro"
          descripcion={`Vas a eliminar el registro de "${aEliminar.lugar ?? ''}".`}
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
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
