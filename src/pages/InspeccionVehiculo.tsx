import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ExcelJS from 'exceljs'
import { api, type NuevaInspeccionVehiculo } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorProducto } from '../components/SelectorProducto'
import type { InspeccionVehiculo, Producto } from '../types/trazabilidad'

interface FormIV {
  fecha: string
  tipoVehiculo: string
  placa: string
  cliente: string
  numeroFactura: string
  producto: string
  lote: string
  estadoUnidad: string
  limpiezaInterior: string
  limpiezaExterior: string
  ausenciaPlagas: string
  temperaturaVehiculo: string
  temperaturaProducto: string
  observaciones: string
  firmaResponsable: string
  verificadoPor: string
}

const formVacio = (): FormIV => ({
  fecha: new Date().toISOString().slice(0, 10),
  tipoVehiculo: '',
  placa: '',
  cliente: '',
  numeroFactura: '',
  producto: '',
  lote: '',
  estadoUnidad: 'C',
  limpiezaInterior: 'C',
  limpiezaExterior: 'C',
  ausenciaPlagas: 'C',
  temperaturaVehiculo: '',
  temperaturaProducto: '',
  observaciones: '',
  firmaResponsable: '',
  verificadoPor: '',
})

const OPCIONES_CN = ['C', 'NC']

export function InspeccionVehiculo() {
  const [registros, setRegistros] = useState<InspeccionVehiculo[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormIV>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<InspeccionVehiculo | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [insp, prods] = await Promise.all([
        api.getInspeccionesVehiculo(),
        api.getProductos(),
      ])
      setRegistros(insp)
      setProductos(prods)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar inspecciones',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(() => form.placa.trim() !== '', [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.placa ?? '').toLowerCase().includes(t) ||
        (r.cliente ?? '').toLowerCase().includes(t) ||
        (r.producto ?? '').toLowerCase().includes(t) ||
        (r.lote ?? '').toLowerCase().includes(t) ||
        (r.numeroFactura ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormIV>(campo: K, valor: FormIV[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: InspeccionVehiculo) {
    setEditandoId(r.id)
    setForm({
      fecha: r.fecha ?? '',
      tipoVehiculo: r.tipoVehiculo ?? '',
      placa: r.placa ?? '',
      cliente: r.cliente ?? '',
      numeroFactura: r.numeroFactura ?? '',
      producto: r.producto ?? '',
      lote: r.lote ?? '',
      estadoUnidad: r.estadoUnidad ?? '',
      limpiezaInterior: r.limpiezaInterior ?? '',
      limpiezaExterior: r.limpiezaExterior ?? '',
      ausenciaPlagas: r.ausenciaPlagas ?? '',
      temperaturaVehiculo:
        r.temperaturaVehiculo != null ? String(r.temperaturaVehiculo) : '',
      temperaturaProducto:
        r.temperaturaProducto != null ? String(r.temperaturaProducto) : '',
      observaciones: r.observaciones ?? '',
      firmaResponsable: r.firmaResponsable ?? '',
      verificadoPor: r.verificadoPor ?? '',
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
      const datos: NuevaInspeccionVehiculo = {
        fecha: form.fecha || undefined,
        tipoVehiculo: form.tipoVehiculo || undefined,
        placa: form.placa.trim(),
        cliente: form.cliente.trim() || undefined,
        numeroFactura: form.numeroFactura.trim() || undefined,
        producto: form.producto.trim() || undefined,
        lote: form.lote.trim() || undefined,
        estadoUnidad: form.estadoUnidad || undefined,
        limpiezaInterior: form.limpiezaInterior || undefined,
        limpiezaExterior: form.limpiezaExterior || undefined,
        ausenciaPlagas: form.ausenciaPlagas || undefined,
        temperaturaVehiculo:
          form.temperaturaVehiculo.trim() !== ''
            ? Number(form.temperaturaVehiculo)
            : undefined,
        temperaturaProducto:
          form.temperaturaProducto.trim() !== ''
            ? Number(form.temperaturaProducto)
            : undefined,
        observaciones: form.observaciones.trim() || undefined,
        firmaResponsable: form.firmaResponsable.trim() || undefined,
        verificadoPor: form.verificadoPor.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarInspeccionVehiculo(
          editandoId,
          datos,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearInspeccionVehiculo(datos)
        setRegistros((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la inspeccion',
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
      await api.eliminarInspeccionVehiculo(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar la inspeccion',
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

  function imprimir(filas: InspeccionVehiculo[]) {
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
            <td>${x(r.tipoVehiculo, 'Camion')}</td>
            <td>${x(r.tipoVehiculo, 'Moto')}</td>
            <td>${cel(r.placa)}</td>
            <td>${cel(r.cliente)}</td>
            <td>${cel(r.numeroFactura)}</td>
            <td>${cel(r.producto)}</td>
            <td>${cel(r.lote)}</td>
            <td>${x(r.estadoUnidad, 'C')}</td>
            <td>${x(r.estadoUnidad, 'NC')}</td>
            <td>${x(r.limpiezaInterior, 'C')}</td>
            <td>${x(r.limpiezaInterior, 'NC')}</td>
            <td>${x(r.limpiezaExterior, 'C')}</td>
            <td>${x(r.limpiezaExterior, 'NC')}</td>
            <td>${x(r.ausenciaPlagas, 'C')}</td>
            <td>${x(r.ausenciaPlagas, 'NC')}</td>
            <td>${cel(r.temperaturaVehiculo)}</td>
            <td>${cel(r.temperaturaProducto)}</td>
            <td>${cel(r.observaciones)}</td>
            <td>${cel(r.firmaResponsable)}</td>
            <td>${cel(r.verificadoPor)}</td>
          </tr>`,
      )
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Inspeccion de Vehiculo</title>
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
        .pv{font-weight:bold;font-size:11px;text-align:left;padding:6px}
        @media print{@page{size:landscape;margin:8mm}}
      </style></head><body>
      <table class="cab">
        <tr>
          <td class="logo" rowspan="2"><img src="/logo.jpg" alt="Carnes Santacruz"></td>
          <td class="tit">FORMATO DE VERIFICACION DE CONDICIONES SANITARIAS DE VEHICULOS TRANSPORTADORES</td>
          <td class="cod">CODIGO: FOR-CIA-012</td>
        </tr>
        <tr>
          <td class="sub">PROCEDIMIENTO DE VERIFICACION DE LAS CONDICIONES SANITARIAS DE TRANSPORTE</td>
          <td class="cod">VERSION: 2<br>FECHA: 20/10/2025</td>
        </tr>
        <tr><td class="pv" colspan="3">PUNTO DE VENTA:</td></tr>
      </table>
      <table>
        <thead>
          <tr>
            <th rowspan="3">FECHA</th>
            <th colspan="2">TIPO DE VEHICULO<br>(MARQUE CON X)</th>
            <th rowspan="3">PLACA DEL<br>VEHICULO</th>
            <th rowspan="3">CLIENTE</th>
            <th rowspan="3">NUMERO DE<br>FACTURA</th>
            <th rowspan="3">PRODUCTO</th>
            <th rowspan="3">LOTE</th>
            <th colspan="8">CONDICIONES SANITARIAS</th>
            <th colspan="2">TEMPERATURA (°C)</th>
            <th rowspan="3">OBSERVACIONES</th>
            <th rowspan="3">FIRMA<br>RESPONSABLE</th>
            <th rowspan="3">VERIFICADO<br>POR</th>
          </tr>
          <tr>
            <th rowspan="2">CAMION</th>
            <th rowspan="2">MOTO</th>
            <th colspan="2">ESTADO DE LA<br>UNIDAD DE<br>TRANSPORTE</th>
            <th colspan="2">LIMPIEZA<br>INTERIOR DE LA<br>UNIDAD</th>
            <th colspan="2">LIMPIEZA<br>EXTERIOR DEL<br>VEHICULO</th>
            <th colspan="2">AUSENCIA DE<br>PLAGAS Y/O<br>MATERIAL EXTRAÑO</th>
            <th rowspan="2">VEHICULO</th>
            <th rowspan="2">PRODUCTO</th>
          </tr>
          <tr>
            <th>C</th><th>NC</th><th>C</th><th>NC</th>
            <th>C</th><th>NC</th><th>C</th><th>NC</th>
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

  async function exportarExcel(filas: InspeccionVehiculo[]) {
    if (filas.length === 0) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Inspeccion', {
      views: [{ showGridLines: false }],
    })

    const anchos = [
      12, 8, 8, 14, 20, 14, 22, 14, 6, 6, 6, 6, 6, 6, 6, 6, 10, 10, 24, 18, 18,
    ]
    anchos.forEach((w, i) => {
      ws.getColumn(i + 1).width = w
    })
    ;[24, 18, 18, 20, 30, 16, 40].forEach((h, i) => {
      ws.getRow(i + 1).height = h
    })

    // --- Encabezado corporativo (filas 1-4) ---
    ws.mergeCells('A1:B3')
    ws.mergeCells('C1:S1')
    ws.mergeCells('C2:S2')
    ws.mergeCells('C3:S3')
    ws.mergeCells('T1:U1')
    ws.mergeCells('T2:U2')
    ws.mergeCells('T3:U3')
    ws.mergeCells('A4:U4')
    ws.getCell('C1').value =
      'FORMATO DE VERIFICACION DE CONDICIONES SANITARIAS DE VEHICULOS TRANSPORTADORES'
    ws.getCell('C2').value =
      'PROCEDIMIENTO DE VERIFICACION DE LAS CONDICIONES SANITARIAS DE TRANSPORTE'
    ws.getCell('T1').value = 'CODIGO: FOR-CIA-012'
    ws.getCell('T2').value = 'VERSION: 2'
    ws.getCell('T3').value = 'FECHA: 20/10/2025'
    ws.getCell('A4').value = 'PUNTO DE VENTA:'

    const merges = [
      'A5:A7', 'B5:C5', 'B6:B7', 'C6:C7', 'D5:D7', 'E5:E7', 'F5:F7', 'G5:G7',
      'H5:H7', 'I5:P5', 'I6:J6', 'K6:L6', 'M6:N6', 'O6:P6', 'Q5:R5', 'Q6:Q7',
      'R6:R7', 'S5:S7', 'T5:T7', 'U5:U7',
    ]
    merges.forEach((m) => ws.mergeCells(m))

    ws.getCell('A5').value = 'FECHA'
    ws.getCell('B5').value = 'TIPO DE VEHICULO (MARQUE CON X)'
    ws.getCell('B6').value = 'CAMION'
    ws.getCell('C6').value = 'MOTO'
    ws.getCell('D5').value = 'PLACA DEL VEHICULO'
    ws.getCell('E5').value = 'CLIENTE'
    ws.getCell('F5').value = 'NUMERO DE FACTURA'
    ws.getCell('G5').value = 'PRODUCTO'
    ws.getCell('H5').value = 'LOTE'
    ws.getCell('I5').value = 'CONDICIONES SANITARIAS'
    ws.getCell('I6').value = 'ESTADO DE LA UNIDAD DE TRANSPORTE'
    ws.getCell('K6').value = 'LIMPIEZA INTERIOR DE LA UNIDAD'
    ws.getCell('M6').value = 'LIMPIEZA EXTERIOR DEL VEHICULO'
    ws.getCell('O6').value = 'AUSENCIA DE PLAGAS Y/O MATERIAL EXTRAÑO'
    ws.getCell('I7').value = 'C'
    ws.getCell('J7').value = 'NC'
    ws.getCell('K7').value = 'C'
    ws.getCell('L7').value = 'NC'
    ws.getCell('M7').value = 'C'
    ws.getCell('N7').value = 'NC'
    ws.getCell('O7').value = 'C'
    ws.getCell('P7').value = 'NC'
    ws.getCell('Q5').value = 'TEMPERATURA (°C)'
    ws.getCell('Q6').value = 'VEHICULO'
    ws.getCell('R6').value = 'PRODUCTO'
    ws.getCell('S5').value = 'OBSERVACIONES'
    ws.getCell('T5').value = 'FIRMA RESPONSABLE'
    ws.getCell('U5').value = 'VERIFICADO POR'

    const marca = (v?: string, op?: string) => (v === op ? 'X' : '')
    filas.forEach((r, idx) => {
      const fila = ws.getRow(8 + idx)
      fila.height = 30
      const datos: (string | number)[] = [
        fmtFecha(r.fecha),
        marca(r.tipoVehiculo, 'Camion'),
        marca(r.tipoVehiculo, 'Moto'),
        r.placa ?? '',
        r.cliente ?? '',
        r.numeroFactura ?? '',
        r.producto ?? '',
        r.lote ?? '',
        marca(r.estadoUnidad, 'C'),
        marca(r.estadoUnidad, 'NC'),
        marca(r.limpiezaInterior, 'C'),
        marca(r.limpiezaInterior, 'NC'),
        marca(r.limpiezaExterior, 'C'),
        marca(r.limpiezaExterior, 'NC'),
        marca(r.ausenciaPlagas, 'C'),
        marca(r.ausenciaPlagas, 'NC'),
        r.temperaturaVehiculo != null ? r.temperaturaVehiculo : '',
        r.temperaturaProducto != null ? r.temperaturaProducto : '',
        r.observaciones ?? '',
        r.firmaResponsable ?? '',
        r.verificadoPor ?? '',
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

    // Estilo del encabezado corporativo (filas 1-4)
    for (let rr = 1; rr <= 4; rr++) {
      for (let c = 1; c <= 21; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        if (rr === 4) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          }
          cell.font = { bold: true, size: 10 }
          cell.alignment = izquierda
        } else if (c <= 2) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          }
          cell.alignment = centro
        } else if (c >= 20) {
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
          cell.font = { bold: true, size: c >= 3 && rr === 1 ? 11 : 9 }
          cell.alignment = centro
        }
      }
    }

    // Estilo de la tabla (filas 5-7 encabezado, 8+ datos)
    const ultimaFila = 7 + filas.length
    for (let rr = 5; rr <= ultimaFila; rr++) {
      for (let c = 1; c <= 21; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        cell.alignment = centro
        if (rr <= 7) {
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

    // Logo sobre la celda A1:B3
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
      // Centra el logo dentro de la celda combinada A1:B3.
      const colPx = (ancho: number) => Math.round(ancho * 7 + 5)
      const pxA = colPx(12)
      const pxB = colPx(8)
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
        ? `inspeccion-vehiculo-${filas[0].placa || filas[0].id}.xlsx`
        : `inspecciones-vehiculo-${filas.length}.xlsx`
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  const conformes = registros.filter(
    (r) =>
      r.estadoUnidad === 'C' &&
      r.limpiezaInterior === 'C' &&
      r.limpiezaExterior === 'C' &&
      r.ausenciaPlagas === 'C',
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Inspeccion de Vehiculo
          </h2>
          <p className="text-slate-500">
            Control de condiciones sanitarias de transporte
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
        <Kpi label="Total inspecciones" value={registros.length} />
        <Kpi label="Conformes" value={conformes} />
        <Kpi label="Con hallazgos" value={registros.length - conformes} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-3">
            {editandoId ? 'Editar inspeccion' : 'Nueva inspeccion'}
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

            <Campo label="Tipo de vehiculo">
              <select
                value={form.tipoVehiculo}
                onChange={(e) => actualizar('tipoVehiculo', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Seleccionar...</option>
                <option value="Camion">Camion</option>
                <option value="Moto">Moto</option>
              </select>
            </Campo>

            <Campo label="Placa del vehiculo *">
              <input
                value={form.placa}
                onChange={(e) => actualizar('placa', e.target.value)}
                placeholder="ABC123"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Cliente">
              <input
                value={form.cliente}
                onChange={(e) => actualizar('cliente', e.target.value)}
                placeholder="Nombre del cliente"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <div className="md:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Campo label="Numero de factura">
              <input
                value={form.numeroFactura}
                onChange={(e) => actualizar('numeroFactura', e.target.value)}
                placeholder="F-0001"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Lote">
              <input
                value={form.lote}
                onChange={(e) => actualizar('lote', e.target.value)}
                placeholder="Lote"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Producto">
              <SelectorProducto
                productos={productos}
                value={
                  productos.find((p) => p.nombre === form.producto)?.id ?? ''
                }
                onChange={(id) =>
                  actualizar(
                    'producto',
                    productos.find((p) => p.id === id)?.nombre ?? '',
                  )
                }
              />
            </Campo>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 md:col-span-3">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Condiciones sanitarias (C = Conforme / NC = No conforme)
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <CampoCN
                label="Estado de la unidad de transporte"
                valor={form.estadoUnidad}
                onChange={(v) => actualizar('estadoUnidad', v)}
              />
              <CampoCN
                label="Limpieza interior de la unidad"
                valor={form.limpiezaInterior}
                onChange={(v) => actualizar('limpiezaInterior', v)}
              />
              <CampoCN
                label="Limpieza exterior del vehiculo"
                valor={form.limpiezaExterior}
                onChange={(v) => actualizar('limpiezaExterior', v)}
              />
              <CampoCN
                label="Ausencia de plagas / material extraño"
                valor={form.ausenciaPlagas}
                onChange={(v) => actualizar('ausenciaPlagas', v)}
              />
            </div>
          </div>

          <div className="md:col-span-3 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Campo label="Temperatura vehiculo (°C)">
              <input
                type="number"
                step="0.1"
                value={form.temperaturaVehiculo}
                onChange={(e) =>
                  actualizar('temperaturaVehiculo', e.target.value)
                }
                placeholder="0.0"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Temperatura producto (°C)">
              <input
                type="number"
                step="0.1"
                value={form.temperaturaProducto}
                onChange={(e) =>
                  actualizar('temperaturaProducto', e.target.value)
                }
                placeholder="0.0"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Firma responsable">
              <input
                value={form.firmaResponsable}
                onChange={(e) => actualizar('firmaResponsable', e.target.value)}
                placeholder="Nombre del responsable"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>

            <Campo label="Verificado por">
              <input
                value={form.verificadoPor}
                onChange={(e) => actualizar('verificadoPor', e.target.value)}
                placeholder="Nombre del verificador"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

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
                  : 'Crear inspeccion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por placa, cliente, producto, lote o factura..."
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
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Vehiculo</th>
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Condiciones</th>
              <th className="px-4 py-3 font-medium">Temp. (V/P)</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrosFiltrados.map((r, indice) => {
              const todoConforme =
                r.estadoUnidad === 'C' &&
                r.limpiezaInterior === 'C' &&
                r.limpiezaExterior === 'C' &&
                r.ausenciaPlagas === 'C'
              return (
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
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {indice + 1}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.fecha ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.tipoVehiculo ?? '-'}
                  </td>
                  <td className="px-4 py-3 font-medium uppercase text-slate-800">
                    {r.placa ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.cliente ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.producto ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.lote ?? '-'}</td>
                  <td className="px-4 py-3">
                    {todoConforme ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Conforme
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Con hallazgos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.temperaturaVehiculo != null
                      ? `${r.temperaturaVehiculo}°`
                      : '-'}
                    {' / '}
                    {r.temperaturaProducto != null
                      ? `${r.temperaturaProducto}°`
                      : '-'}
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
              )
            })}
            {registrosFiltrados.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando inspecciones...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin inspecciones registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar inspeccion"
          descripcion={`Vas a eliminar la inspeccion del vehiculo "${aEliminar.placa ?? ''}".`}
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
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition focus:outline-none focus:ring-1 ${
              valor === op
                ? op === 'C'
                  ? 'border-green-600 bg-green-600 text-white focus:ring-green-500'
                  : 'border-red-600 bg-red-600 text-white focus:ring-red-500'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus:ring-green-500'
            }`}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  )
}
