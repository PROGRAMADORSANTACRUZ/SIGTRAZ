import { useEffect, useMemo, useState, type ReactNode } from 'react'
import ExcelJS from 'exceljs'
import { api, type NuevaInspeccionHigiene } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { SelectorBuscable } from '../components/SelectorBuscable'
import type { InspeccionHigiene, Personal } from '../types/trazabilidad'

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

const SEMANAS = [1, 2, 3, 4]
// Ciclo al hacer clic en una celda de semana.
const SIGUIENTE: Record<string, string> = { '': '1', '1': '0', '0': '' }

// Criterios de evaluacion del manual de inocuidad (FOR-CIA-020).
const CRITERIOS = [
  'GORRO',
  'UNIFORME COMPLETO',
  'TAPABOCAS',
  'DELANTAL',
  'AUSENCIA DE JOYAS',
  'BOTAS',
  'UÑAS CORTAS Y LIMPIAS',
  'AUSENCIA BARBA Y BIGOTE',
  'AUSENCIA DE ENFERMEDADES',
  'AUSENCIA DE HERIDAS',
]

interface FormHigiene {
  operario: string
  mes: string
  anio: string
  // criterio -> [semana1, semana2, semana3, semana4]
  criterios: Record<string, string[]>
  observacion: string
  firma: string
}

const criteriosVacios = (): Record<string, string[]> => {
  const m: Record<string, string[]> = {}
  CRITERIOS.forEach((c) => {
    m[c] = ['', '', '', '']
  })
  return m
}

const formVacio = (): FormHigiene => ({
  operario: '',
  mes: MESES[new Date().getMonth()],
  anio: String(new Date().getFullYear()),
  criterios: criteriosVacios(),
  observacion: '',
  firma: '',
})

export function HigienePersonal() {
  const [registros, setRegistros] = useState<InspeccionHigiene[]>([])
  const [personal, setPersonal] = useState<Personal[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormHigiene>(formVacio)
  // criterio -> id de registro existente (al editar un grupo)
  const [idsCriterio, setIdsCriterio] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<InspeccionHigiene | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [datos, listaPersonal] = await Promise.all([
        api.getInspeccionesHigiene(),
        api.getPersonal(),
      ])
      setRegistros(datos)
      setPersonal(listaPersonal)
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

  const formValido = useMemo(() => {
    if (form.operario.trim() === '') return false
    return Object.values(form.criterios).some((sem) =>
      sem.some((v) => v === '1' || v === '0'),
    )
  }, [form])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return registros
    return registros.filter(
      (r) =>
        (r.operario ?? '').toLowerCase().includes(t) ||
        (r.evaluacion ?? '').toLowerCase().includes(t) ||
        (r.mes ?? '').toLowerCase().includes(t),
    )
  }, [registros, busqueda])

  function actualizar<K extends keyof FormHigiene>(
    campo: K,
    valor: FormHigiene[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function ciclarSemana(criterio: string, indice: number) {
    setForm((prev) => {
      const actual = prev.criterios[criterio] ?? ['', '', '', '']
      const semanas = [...actual]
      semanas[indice] = SIGUIENTE[semanas[indice] ?? ''] ?? ''
      return {
        ...prev,
        criterios: { ...prev.criterios, [criterio]: semanas },
      }
    })
  }

  function abrirNuevo() {
    setEditandoId(null)
    setIdsCriterio({})
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(r: InspeccionHigiene) {
    // Editamos todo el grupo (mismo operario + mes + año).
    const grupo = registros.filter(
      (x) =>
        (x.operario ?? '') === (r.operario ?? '') &&
        (x.mes ?? '') === (r.mes ?? '') &&
        (x.anio ?? '') === (r.anio ?? ''),
    )
    const criterios = criteriosVacios()
    const ids: Record<string, string> = {}
    let observacion = r.observacion ?? ''
    let firma = r.firma ?? ''
    grupo.forEach((g) => {
      const clave = (g.evaluacion ?? '').trim()
      if (!clave) return
      const nombre =
        CRITERIOS.find((c) => c.toUpperCase() === clave.toUpperCase()) ?? clave
      criterios[nombre] = Array.from({ length: 4 }, (_, i) => g.semanas?.[i] ?? '')
      ids[nombre] = g.id
      if (g.observacion) observacion = g.observacion
      if (g.firma) firma = g.firma
    })
    setEditandoId(r.id)
    setIdsCriterio(ids)
    setForm({
      operario: r.operario ?? '',
      mes: r.mes ?? MESES[new Date().getMonth()],
      anio: r.anio ?? String(new Date().getFullYear()),
      criterios,
      observacion,
      firma,
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
      // Criterios a guardar: los que tienen marcas + los que ya existian
      // (para actualizarlos aunque se hayan limpiado).
      const claves = new Set<string>()
      Object.entries(form.criterios).forEach(([c, sem]) => {
        if (sem.some((v) => v === '1' || v === '0')) claves.add(c)
      })
      Object.keys(idsCriterio).forEach((c) => claves.add(c))

      const resultados: InspeccionHigiene[] = []
      for (const criterio of claves) {
        const semanas = form.criterios[criterio] ?? ['', '', '', '']
        const datos: NuevaInspeccionHigiene = {
          operario: form.operario.trim(),
          evaluacion: criterio,
          mes: form.mes || undefined,
          anio: form.anio.trim() || undefined,
          semanas,
          observacion: form.observacion.trim() || undefined,
          firma: form.firma.trim() || undefined,
        }
        const idExistente = idsCriterio[criterio]
        if (idExistente) {
          resultados.push(
            await api.actualizarInspeccionHigiene(idExistente, datos),
          )
        } else {
          resultados.push(await api.crearInspeccionHigiene(datos))
        }
      }

      const idsPrevios = new Set(Object.values(idsCriterio))
      const idsNuevos = new Set(resultados.map((r) => r.id))
      setRegistros((prev) => [
        ...resultados,
        ...prev.filter((r) => !idsPrevios.has(r.id) && !idsNuevos.has(r.id)),
      ])
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la inspeccion',
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
      await api.eliminarInspeccionHigiene(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la inspeccion',
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

  function textoSemana(v: string): string {
    return v === '1' ? '1' : v === '0' ? '0' : ''
  }

  function imprimir(filas: InspeccionHigiene[]) {
    if (filas.length === 0) return
    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) return
    const cel = (v?: string | null) => (v == null || v === '' ? '&nbsp;' : v)
    const cab = filas[0]
    // Plantilla con todos los criterios; solo marca los registrados.
    const porCriterio = new Map<string, InspeccionHigiene>()
    filas.forEach((f) => {
      if (f.evaluacion) porCriterio.set(f.evaluacion.trim().toUpperCase(), f)
    })
    const criterios = [...CRITERIOS]
    filas.forEach((f) => {
      const e = (f.evaluacion ?? '').trim()
      if (e && !criterios.some((c) => c.toUpperCase() === e.toUpperCase()))
        criterios.push(e)
    })
    const filasPlantilla: InspeccionHigiene[] = criterios.map(
      (nombre) =>
        porCriterio.get(nombre.trim().toUpperCase()) ??
        ({
          id: '',
          evaluacion: nombre,
          fechaCreacion: '',
        } as InspeccionHigiene),
    )
    const filasHtml = filasPlantilla
      .map((r) => {
        const celdasSem = SEMANAS.map((_, i) => {
          const v = r.semanas?.[i] ?? ''
          const clase = v === '1' ? 'ok' : v === '0' ? 'no' : ''
          return `<td class="${clase}">${textoSemana(v)}</td>`
        }).join('')
        return `<tr>
            <td class="izq">${cel(r.operario)}</td>
            <td class="izq">${cel(r.evaluacion)}</td>
            ${celdasSem}
            <td class="izq">${cel(r.observacion)}</td>
            <td>${cel(r.firma)}</td>
          </tr>`
      })
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <title>Inspeccion de Higiene Personal</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#111}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #333;padding:4px 6px;text-align:center;font-size:11px}
        thead th{background:#f2b979;color:#6b3f18}
        td.izq{text-align:left}
        td.ok{color:#15803d;font-weight:bold}
        td.no{color:#b91c1c;font-weight:bold}
        .cab td{border:1px solid #333;padding:6px;vertical-align:middle;font-size:12px}
        .cab .logo{width:130px;text-align:center}
        .cab .logo img{max-height:64px;max-width:120px;display:block;margin:0 auto}
        .cab .tit{text-align:center;font-weight:bold;font-size:14px}
        .cab .sub{text-align:center;font-weight:bold}
        .cab .cod{font-weight:bold;font-size:11px;text-align:left;width:170px}
        .meta td{border:1px solid #333;padding:6px;font-weight:bold;font-size:11px}
        @media print{@page{size:landscape;margin:8mm}}
      </style></head><body>
      <table class="cab">
        <tr>
          <td class="logo" rowspan="3"><img src="/logo.jpg" alt="Carnes Santacruz"></td>
          <td class="tit" rowspan="2">INSPECCION DE HIGIENE PERSONAL MANIPULADOR</td>
          <td class="cod">CODIGO: FOR-CIA-020</td>
        </tr>
        <tr><td class="cod">VERSION: 2</td></tr>
        <tr>
          <td class="sub">MANUAL DE INOCUIDAD</td>
          <td class="cod">FECHA: 20/12/2025</td>
        </tr>
      </table>
      <table class="meta">
        <tr>
          <td style="width:50%">MES: ${cel(cab.mes)} ${cel(cab.anio)}</td>
          <td>0. NO CUMPLE &nbsp;&nbsp;&nbsp; 1. CUMPLE</td>
        </tr>
      </table>
      <table>
        <thead>
          <tr>
            <th>OPERARIO</th>
            <th>EVALUACION</th>
            <th>SEMANA 1</th>
            <th>SEMANA 2</th>
            <th>SEMANA 3</th>
            <th>SEMANA 4</th>
            <th>OBSERVACION</th>
            <th>FIRMA EMPLEADO</th>
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

  async function exportarExcel(filas: InspeccionHigiene[]) {
    if (filas.length === 0) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Higiene', { views: [{ showGridLines: false }] })
    const cab = filas[0]

    // Anchos: operario, evaluacion, 4 semanas, observacion, firma.
    ws.getColumn(1).width = 24
    ws.getColumn(2).width = 28
    for (let c = 3; c <= 6; c++) ws.getColumn(c).width = 12
    ws.getColumn(7).width = 28
    ws.getColumn(8).width = 20
    ;[24, 16, 16, 20, 20].forEach((h, i) => {
      ws.getRow(i + 1).height = h
    })

    const set = (r: number, c: number, v: string | number) => {
      ws.getRow(r).getCell(c).value = v
    }

    // Encabezado corporativo (logo col1 filas 1-3)
    ws.mergeCells(1, 1, 3, 1)
    ws.mergeCells(1, 2, 2, 6)
    ws.mergeCells(3, 2, 3, 6)
    ws.mergeCells(1, 7, 1, 8)
    ws.mergeCells(2, 7, 2, 8)
    ws.mergeCells(3, 7, 3, 8)
    set(1, 2, 'INSPECCION DE HIGIENE PERSONAL MANIPULADOR')
    set(3, 2, 'MANUAL DE INOCUIDAD')
    set(1, 7, 'CODIGO: FOR-CIA-020')
    set(2, 7, 'VERSION: 2')
    set(3, 7, 'FECHA: 20/12/2025')

    // Fila 4: MES + leyenda
    ws.mergeCells(4, 1, 4, 4)
    ws.mergeCells(4, 5, 4, 8)
    set(4, 1, `MES: ${cab.mes ?? ''} ${cab.anio ?? ''}`)
    set(4, 5, '0. NO CUMPLE      1. CUMPLE')

    // Encabezado de la tabla (fila 5)
    set(5, 1, 'OPERARIO')
    set(5, 2, 'EVALUACION')
    set(5, 3, 'SEMANA 1')
    set(5, 4, 'SEMANA 2')
    set(5, 5, 'SEMANA 3')
    set(5, 6, 'SEMANA 4')
    set(5, 7, 'OBSERVACION')
    set(5, 8, 'FIRMA EMPLEADO')

    // Plantilla: TODOS los criterios de evaluacion (FOR-CIA-020). Solo se
    // marcan las semanas de los criterios registrados (match por evaluacion).
    const porCriterio = new Map<string, InspeccionHigiene>()
    filas.forEach((f) => {
      if (f.evaluacion)
        porCriterio.set(f.evaluacion.trim().toUpperCase(), f)
    })
    const criterios = [...CRITERIOS]
    filas.forEach((f) => {
      const e = (f.evaluacion ?? '').trim()
      if (e && !criterios.some((c) => c.toUpperCase() === e.toUpperCase()))
        criterios.push(e)
    })
    const filasExcel: InspeccionHigiene[] = criterios.map(
      (nombre) =>
        porCriterio.get(nombre.trim().toUpperCase()) ??
        ({
          id: '',
          evaluacion: nombre,
          fechaCreacion: '',
        } as InspeccionHigiene),
    )

    // Datos (fila 6+)
    filasExcel.forEach((r, idx) => {
      const fila = 6 + idx
      ws.getRow(fila).height = 20
      set(fila, 1, r.operario ?? '')
      set(fila, 2, r.evaluacion ?? '')
      SEMANAS.forEach((_, i) => {
        const v = r.semanas?.[i] ?? ''
        set(fila, 3 + i, v === '1' || v === '0' ? v : '')
      })
      set(fila, 7, r.observacion ?? '')
      set(fila, 8, r.firma ?? '')
    })

    const naranja = 'FFF2B979'
    const verde = 'FFD9F0DE'
    const rojo = 'FFF6D6D6'
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

    const ultimaFila = 5 + filasExcel.length
    for (let rr = 1; rr <= ultimaFila; rr++) {
      for (let c = 1; c <= 8; c++) {
        const cell = ws.getRow(rr).getCell(c)
        cell.border = bordes
        if (rr <= 3) {
          cell.alignment = centro
          cell.font = { bold: true, size: rr === 1 ? 12 : 10 }
        } else if (rr === 4) {
          cell.alignment = izq
          cell.font = { bold: true, size: 10 }
        } else if (rr === 5) {
          cell.alignment = centro
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: naranja },
          }
          cell.font = { bold: true, size: 10, color: { argb: 'FF6B3F18' } }
        } else {
          const valor = ws.getRow(rr).getCell(c).value
          cell.alignment = c === 1 || c === 2 || c === 7 ? izq : centro
          cell.font = { size: 10 }
          if (c >= 3 && c <= 6) {
            const t = valor === '1' ? verde : valor === '0' ? rojo : null
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

    // Logo centrado sobre la celda A1:A3
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
      const h = 56
      const w = Math.round((natW / natH) * h)
      const colPx = (ancho: number) => Math.round(ancho * 7 + 5)
      const pxA = colPx(24)
      const alturas = [24, 16, 16]
      const totalH = alturas.reduce((a, b) => a + b, 0)
      const leftPx = Math.max(0, (pxA - w) / 2)
      let topPx = Math.max(0, (totalH - h) / 2)
      const col = leftPx / pxA
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
        ? `higiene-personal-${filas[0].operario || filas[0].id}.xlsx`
        : `higiene-personal-${filas.length}.xlsx`
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Higiene Personal
          </h2>
          <p className="text-slate-500">
            Inspeccion de higiene personal del manipulador (FOR-CIA-020)
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
            {editandoId ? 'Editar inspeccion' : 'Nueva inspeccion'}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.6fr)_7rem_5rem]">
            <Campo label="Operario *">
              <SelectorBuscable
                opciones={personal.map((p) => p.nombres ?? '').filter(Boolean)}
                value={form.operario}
                onChange={(v) => actualizar('operario', v)}
                placeholder="Selecciona el operario"
                buscarPlaceholder="Buscar operario..."
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
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <p className="text-sm font-semibold text-slate-700">
                Evaluacion por criterio y semana (clic para cambiar)
              </p>
              <span className="text-xs text-slate-500">
                <b className="text-emerald-600">1</b> Cumple &nbsp;
                <b className="text-red-600">0</b> No cumple
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-1 text-left">Evaluacion</th>
                    {SEMANAS.map((s) => (
                      <th key={s} className="px-2 py-1 text-center">
                        Semana {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CRITERIOS.map((c) => (
                    <tr key={c} className="border-t border-slate-200">
                      <td className="px-2 py-1 font-medium text-slate-700">
                        {c}
                      </td>
                      {SEMANAS.map((s, i) => {
                        const v = form.criterios[c]?.[i] ?? ''
                        const clase =
                          v === '1'
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : v === '0'
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-slate-300 bg-white text-slate-400 hover:bg-slate-100'
                        return (
                          <td key={s} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => ciclarSemana(c, i)}
                              className={`h-9 w-16 rounded border text-sm font-semibold ${clase}`}
                            >
                              {textoSemana(v)}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Observacion">
              <input
                value={form.observacion}
                onChange={(e) => actualizar('observacion', e.target.value)}
                placeholder="Observaciones"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
            <Campo label="Firma empleado">
              <input
                value={form.firma}
                onChange={(e) => actualizar('firma', e.target.value)}
                placeholder="Nombre / firma del empleado"
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
                  : 'Crear inspeccion'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por operario, evaluacion o mes..."
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
              <th className="px-4 py-3 font-medium">Operario</th>
              <th className="px-4 py-3 font-medium">Evaluacion</th>
              <th className="px-4 py-3 font-medium">Mes/Año</th>
              <th className="px-4 py-3 font-medium">Semanas</th>
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
                  {r.operario ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.evaluacion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {r.mes ?? '-'} {r.anio ?? ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {SEMANAS.map((s, i) => {
                      const v = r.semanas?.[i] ?? ''
                      const clase =
                        v === '1'
                          ? 'bg-emerald-100 text-emerald-700'
                          : v === '0'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-400'
                      return (
                        <span
                          key={s}
                          className={`flex h-6 w-6 items-center justify-center rounded text-xs font-semibold ${clase}`}
                          title={`Semana ${s}`}
                        >
                          {v || '-'}
                        </span>
                      )
                    })}
                  </div>
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
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
          descripcion={`Vas a eliminar la inspeccion de "${aEliminar.operario ?? ''}".`}
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
