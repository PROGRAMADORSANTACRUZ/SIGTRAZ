import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ExcelJS from 'exceljs'
import { api, type NuevaVerificacionPoes } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorBuscable } from '../components/SelectorBuscable'
import type {
  VerificacionPoes,
  CatalogoSuesdr,
  TipoCatalogoSuesdr,
} from '../types/trazabilidad'

interface FormPoes {
  fecha: string
  hora: string
  superficie: string
  sustancia: string
  dosificacion: string
  verificacion: string
  realizo: string
  verifico: string
  accionCorrectiva: string
}

const formVacio = (): FormPoes => ({
  fecha: new Date().toISOString().slice(0, 10),
  hora: new Date().toTimeString().slice(0, 5),
  superficie: '',
  sustancia: '',
  dosificacion: '',
  verificacion: 'C',
  realizo: '',
  verifico: '',
  accionCorrectiva: '',
})

const OPCIONES_CN = ['C', 'NC']

export function VerificacionPoes() {
  const [registros, setRegistros] = useState<VerificacionPoes[]>([])
  const [catalogos, setCatalogos] = useState<CatalogoSuesdr[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormPoes>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<VerificacionPoes | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [datos, catalogosDatos] = await Promise.all([
        api.getVerificacionesPoes(),
        api.getCatalogosSuesdr(),
      ])
      setRegistros(datos)
      setCatalogos(catalogosDatos)
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

  const formValido = useMemo(() => form.superficie.trim() !== '', [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.superficie ?? '').toLowerCase().includes(t) ||
        (r.sustancia ?? '').toLowerCase().includes(t) ||
        (r.dosificacion ?? '').toLowerCase().includes(t) ||
        (r.realizo ?? '').toLowerCase().includes(t) ||
        (r.verifico ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormPoes>(campo: K, valor: FormPoes[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: VerificacionPoes) {
    setEditandoId(r.id)
    setForm({
      fecha: r.fecha ?? '',
      hora: r.hora ?? '',
      superficie: r.superficie ?? '',
      sustancia: r.sustancia ?? '',
      dosificacion: r.dosificacion ?? '',
      verificacion: r.verificacion ?? '',
      realizo: r.realizo ?? '',
      verifico: r.verifico ?? '',
      accionCorrectiva: r.accionCorrectiva ?? '',
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  const opciones = useMemo(() => {
    const por = (t: TipoCatalogoSuesdr) =>
      catalogos.filter((c) => c.tipo === t).map((c) => c.nombre)
    return {
      superficie: por('superficie'),
      sustancia: por('sustancia'),
      dosificacion: por('dosificacion'),
      realizado: por('realizado'),
    }
  }, [catalogos])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido || guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: NuevaVerificacionPoes = {
        fecha: form.fecha || undefined,
        hora: form.hora.trim() || undefined,
        superficie: form.superficie.trim(),
        sustancia: form.sustancia.trim() || undefined,
        dosificacion: form.dosificacion.trim() || undefined,
        verificacion: form.verificacion || undefined,
        realizo: form.realizo.trim() || undefined,
        verifico: form.verifico.trim() || undefined,
        accionCorrectiva: form.accionCorrectiva.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarVerificacionPoes(
          editandoId,
          datos,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearVerificacionPoes(datos)
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
      await api.eliminarVerificacionPoes(aEliminar.id, password)
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

  function fmtFecha(v?: string): string {
    if (!v) return ''
    const [a, m, d] = v.slice(0, 10).split('-')
    return a && m && d ? `${d}/${m}/${a}` : v
  }

  function imprimir(filas: VerificacionPoes[]) {
    if (filas.length === 0) return
    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) return
    const x = (valor?: string, op?: string) => (valor === op ? 'X' : '')
    const cel = (v?: string | number | null) =>
      v == null || v === '' ? '&nbsp;' : String(v)
    const filasHtml = filas
      .map(
        (r) => `
          <tr>
            <td>${cel(fmtFecha(r.fecha))}</td>
            <td>${cel(r.hora)}</td>
            <td>${cel(r.superficie)}</td>
            <td>${cel(r.sustancia)}</td>
            <td>${cel(r.dosificacion)}</td>
            <td>${x(r.verificacion, 'C')}</td>
            <td>${x(r.verificacion, 'NC')}</td>
            <td>${cel(r.realizo)}</td>
            <td>${cel(r.verifico)}</td>
            <td>${cel(r.accionCorrectiva)}</td>
          </tr>`,
      )
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Verificacion POES</title>
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
          <td class="tit">FORMATO DE VERIFICACION DE PROCEDIMIENTO OPERATIVO ESTANDARIZADO DE SANEAMIENTO (POES)</td>
          <td class="cod">CODIGO: FOR-CIA-032<br>VERSION: 1</td>
        </tr>
        <tr>
          <td class="sub">PROGRAMA DE PROCEDIMIENTO OPERATIVO ESTANDARIZADO DE SANEAMIENTO (POES)</td>
          <td class="cod">FECHA: 09/01/2026</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th rowspan="2">FECHA</th>
            <th rowspan="2">HORA</th>
            <th rowspan="2">SUPERFICIE, UTENSILIO<br>O EQUIPO</th>
            <th rowspan="2">SUSTANCIA</th>
            <th rowspan="2">DOSIFICACION</th>
            <th colspan="2">VERIFICACION</th>
            <th rowspan="2">REALIZO</th>
            <th rowspan="2">VERIFICO</th>
            <th rowspan="2">ACCION CORRECTIVA</th>
          </tr>
          <tr>
            <th>C</th><th>N.C</th>
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

  async function exportarExcel(filas: VerificacionPoes[]) {
    if (filas.length === 0) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('POES', {
      views: [{ showGridLines: false }],
    })

    const anchos = [12, 10, 28, 18, 14, 6, 6, 18, 18, 30]
    anchos.forEach((w, i) => {
      ws.getColumn(i + 1).width = w
    })
    ;[24, 18, 18, 22, 16, 40].forEach((h, i) => {
      ws.getRow(i + 1).height = h
    })

    // --- Encabezado corporativo (filas 1-3) ---
    ws.mergeCells('A1:B3')
    ws.mergeCells('C1:H2')
    ws.mergeCells('C3:H3')
    ws.mergeCells('I1:J1')
    ws.mergeCells('I2:J2')
    ws.mergeCells('I3:J3')
    ws.getCell('C1').value =
      'FORMATO DE VERIFICACION DE PROCEDIMIENTO OPERATIVO ESTANDARIZADO DE SANEAMIENTO (POES)'
    ws.getCell('C3').value =
      'PROGRAMA DE PROCEDIMIENTO OPERATIVO ESTANDARIZADO DE SANEAMIENTO (POES)'
    ws.getCell('I1').value = 'CODIGO: FOR-CIA-032'
    ws.getCell('I2').value = 'VERSION: 1'
    ws.getCell('I3').value = 'FECHA: 09/01/2026'

    // --- Encabezado de la tabla (filas 4-5) ---
    const merges = [
      'A4:A5', 'B4:B5', 'C4:C5', 'D4:D5', 'E4:E5', 'F4:G4', 'H4:H5', 'I4:I5',
      'J4:J5',
    ]
    merges.forEach((m) => ws.mergeCells(m))

    ws.getCell('A4').value = 'FECHA'
    ws.getCell('B4').value = 'HORA'
    ws.getCell('C4').value = 'SUPERFICIE, UTENSILIO O EQUIPO'
    ws.getCell('D4').value = 'SUSTANCIA'
    ws.getCell('E4').value = 'DOSIFICACION'
    ws.getCell('F4').value = 'VERIFICACION'
    ws.getCell('F5').value = 'C'
    ws.getCell('G5').value = 'N.C'
    ws.getCell('H4').value = 'REALIZO'
    ws.getCell('I4').value = 'VERIFICO'
    ws.getCell('J4').value = 'ACCION CORRECTIVA'

    const marca = (v?: string, op?: string) => (v === op ? 'X' : '')
    filas.forEach((r, idx) => {
      const fila = ws.getRow(6 + idx)
      fila.height = 28
      const datos: (string | number)[] = [
        fmtFecha(r.fecha),
        r.hora ?? '',
        r.superficie ?? '',
        r.sustancia ?? '',
        r.dosificacion ?? '',
        marca(r.verificacion, 'C'),
        marca(r.verificacion, 'NC'),
        r.realizo ?? '',
        r.verifico ?? '',
        r.accionCorrectiva ?? '',
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
      for (let c = 1; c <= 10; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        if (c <= 2) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          }
          cell.alignment = centro
        } else if (c >= 9) {
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

    // Estilo de la tabla (filas 4-5 encabezado, 6+ datos)
    const ultimaFila = 5 + filas.length
    for (let rr = 4; rr <= ultimaFila; rr++) {
      for (let c = 1; c <= 10; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        cell.alignment = centro
        if (rr <= 5) {
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
      const pxA = colPx(12)
      const pxB = colPx(10)
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
        ? `verificacion-poes-${filas[0].superficie || filas[0].id}.xlsx`
        : `verificaciones-poes-${filas.length}.xlsx`
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  const conformes = registros.filter((r) => r.verificacion === 'C').length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Verificacion de POES
          </h2>
          <p className="text-slate-500">
            Procedimiento operativo estandarizado de saneamiento
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
        <Kpi label="Total verificaciones" value={registros.length} />
        <Kpi label="Conformes" value={conformes} />
        <Kpi label="No conformes" value={registros.length - conformes} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-3">
            {editandoId ? 'Editar verificacion' : 'Nueva verificacion'}
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

            <Campo label="Hora">
              <input
                type="time"
                value={form.hora}
                onChange={(e) => actualizar('hora', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Superficie, utensilio o equipo *">
              <SelectorBuscable
                opciones={opciones.superficie}
                value={form.superficie}
                onChange={(v) => actualizar('superficie', v)}
                placeholder="Mesa de corte, cuchillos..."
                buscarPlaceholder="Buscar superficie..."
                permitirLibre
              />
            </Campo>

            <Campo label="Sustancia">
              <SelectorBuscable
                opciones={opciones.sustancia}
                value={form.sustancia}
                onChange={(v) => actualizar('sustancia', v)}
                placeholder="Detergente, desinfectante..."
                buscarPlaceholder="Buscar sustancia..."
                permitirLibre
              />
            </Campo>
          </div>

          <div className="md:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Campo label="Dosificacion">
              <SelectorBuscable
                opciones={opciones.dosificacion}
                value={form.dosificacion}
                onChange={(v) => actualizar('dosificacion', v)}
                placeholder="Ej. 20 ml/L"
                buscarPlaceholder="Buscar dosificacion..."
                permitirLibre
              />
            </Campo>

            <CampoCN
              label="Verificacion (C = Conforme / NC = No conforme)"
              valor={form.verificacion}
              onChange={(v) => actualizar('verificacion', v)}
            />

            <Campo label="Realizo">
              <SelectorBuscable
                opciones={opciones.realizado}
                value={form.realizo}
                onChange={(v) => actualizar('realizo', v)}
                placeholder="Nombre de quien realizo"
                buscarPlaceholder="Buscar..."
                permitirLibre
              />
            </Campo>

            <Campo label="Verifico">
              <input
                value={form.verifico}
                onChange={(e) => actualizar('verifico', e.target.value)}
                placeholder="Nombre de quien verifico"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <Campo label="Accion correctiva">
            <textarea
              value={form.accionCorrectiva}
              onChange={(e) => actualizar('accionCorrectiva', e.target.value)}
              rows={2}
              placeholder="Accion correctiva aplicada"
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
                  : 'Crear verificacion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por superficie, sustancia, dosificacion, realizo o verifico..."
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
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Superficie/utensilio</th>
              <th className="px-4 py-3 font-medium">Sustancia</th>
              <th className="px-4 py-3 font-medium">Dosificacion</th>
              <th className="px-4 py-3 font-medium">Verificacion</th>
              <th className="px-4 py-3 font-medium">Realizo</th>
              <th className="px-4 py-3 font-medium">Verifico</th>
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
                <td className="px-4 py-3 text-slate-600">{r.fecha ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.hora ?? '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.superficie ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.sustancia ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.dosificacion ?? '-'}
                </td>
                <td className="px-4 py-3">
                  {r.verificacion === 'C' ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Conforme
                    </span>
                  ) : r.verificacion === 'NC' ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      No conforme
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.realizo ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.verifico ?? '-'}</td>
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
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
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

function CampoCN({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="flex gap-2">
        {OPCIONES_CN.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => onChange(valor === op ? '' : op)}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              valor === op
                ? op === 'C'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-red-500 bg-red-500 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  )
}
