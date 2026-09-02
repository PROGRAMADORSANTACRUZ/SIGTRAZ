import { useEffect, useMemo, useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import { Campo, inputClase } from '../../components/ui'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { FirmaCanvas } from '../../components/FirmaCanvas'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { agregarMovimiento } from './movimientosStore'

const FIRMA_DEFECTO = 'CLAUDIA DE LOS REYES'
const STORAGE_KEY = 'agro_antemortem'
import {
  propietariosSeed,
  proveedoresSeed,
  firmadoresSeed,
  prediosSeed,
  municipiosSeed,
  departamentosSeed,
  municipioDepartamento,
  corralesSeed,
  dictamenSeed,
  beneficioEmergenciaSeed,
  beneficioCondicionesEspecialesSeed,
  hallazgosSeed,
  dictamen2Seed,
} from './datosCatalogos'
import { agregarACatalogo, useCatalogo } from './catalogosStore'

interface RegistroAnteMortem {
  id: string
  fechaIngreso: string
  fechaBeneficio: string
  propietario: string
  proveedor: string
  firmador: string
  horaIngreso: string
  horaBeneficio: string
  tiempoDescanso: string
  corral: string
  loteSacrificio: string
  numeroGuia: string
  predio: string
  municipio: string
  departamento: string
  novillo: number
  vaca: number
  toro: number
  bufalo: number
  dictamen: string
  beneficioDirecto: string
  beneficioEspecial: string
  numeroAnimales: number
  hallazgos: string
  dictamen2: string
  observaciones: string
  horaFinal: string
  firma: string
}

const formVacio = (): Omit<RegistroAnteMortem, 'id'> => ({
  fechaIngreso: '',
  fechaBeneficio: '',
  propietario: '',
  proveedor: '',
  firmador: '',
  horaIngreso: '',
  horaBeneficio: '',
  tiempoDescanso: '',
  corral: '',
  loteSacrificio: '',
  numeroGuia: '26-B-',
  predio: '',
  municipio: '',
  departamento: '',
  novillo: 0,
  vaca: 0,
  toro: 0,
  bufalo: 0,
  dictamen: 'N/A',
  beneficioDirecto: 'N/A',
  beneficioEspecial: 'N/A',
  numeroAnimales: 0,
  hallazgos: 'N/A',
  dictamen2: 'N/A',
  observaciones: '',
  horaFinal: '',
  firma: FIRMA_DEFECTO,
})

const ETIQUETAS: Record<keyof Omit<RegistroAnteMortem, 'id'>, string> = {
  fechaIngreso: 'Fecha ingreso',
  fechaBeneficio: 'Fecha beneficio',
  propietario: 'Propietario',
  proveedor: 'Proveedor',
  firmador: 'Firmador',
  horaIngreso: 'Hora ingreso',
  horaBeneficio: 'Hora beneficio',
  tiempoDescanso: 'Tiempo de reposo',
  corral: 'Corral',
  loteSacrificio: 'Lote de sacrificio',
  numeroGuia: 'Numero de guia',
  predio: 'Predio',
  municipio: 'Municipio',
  departamento: 'Departamento',
  novillo: 'Novillo',
  vaca: 'Vaca',
  toro: 'Toro',
  bufalo: 'Bufalo',
  dictamen: 'Dictamen',
  beneficioDirecto: 'Beneficio de emergencia',
  beneficioEspecial: 'Beneficio bajo condiciones especiales',
  numeroAnimales: 'Animales caidos',
  hallazgos: 'Hallazgos',
  dictamen2: 'Dictamen 2',
  observaciones: 'Observaciones',
  horaFinal: 'Hora final',
  firma: 'Firma',
}

function valorMostrar(v: unknown): string {
  if (typeof v === 'string' && v.startsWith('data:')) return 'FIRMA MANUAL'
  return String(v ?? '')
}

// Normaliza una guia dejando solo los numeros que van despues de la "B"
// (en SIGTRAZ la guia es "26-B-2367..." y en el Excel es "26B2367...").
function normalizarGuia(g: string): string {
  const limpio = g.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const desdeB = limpio.replace(/^.*B/, '')
  return /\d/.test(desdeB) ? desdeB : ''
}

// Lee el archivo de beneficio (Excel real .xlsx o .xls basado en tabla HTML) y
// devuelve un mapa: numeros-de-guia -> numero de lote. Columna G = guia,
// columna H = lote.
async function leerMapaGuiaLote(file: File): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  const texto = await file.text()
  if (/<t(able|r)\b/i.test(texto)) {
    const doc = new DOMParser().parseFromString(texto, 'text/html')
    doc.querySelectorAll('tr').forEach((tr) => {
      const celdas = tr.querySelectorAll('td')
      if (celdas.length < 8) return
      const guia = celdas[6].textContent?.trim() ?? ''
      const lote = celdas[7].textContent?.trim() ?? ''
      const clave = normalizarGuia(guia)
      if (clave && lote) mapa.set(clave, lote)
    })
  } else {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
    const ws = wb.worksheets[0]
    ws?.eachRow((row) => {
      const guia = String(row.getCell(7).value ?? '').trim()
      const lote = String(row.getCell(8).value ?? '').trim()
      const clave = normalizarGuia(guia)
      if (clave && lote) mapa.set(clave, lote)
    })
  }
  return mapa
}

function calcularCambios(
  antes: RegistroAnteMortem,
  ahora: Omit<RegistroAnteMortem, 'id'>,
) {
  const cambios: { campo: string; antes: string; ahora: string }[] = []
  ;(Object.keys(ahora) as (keyof Omit<RegistroAnteMortem, 'id'>)[]).forEach(
    (k) => {
      const a = valorMostrar(antes[k])
      const b = valorMostrar(ahora[k])
      if (a !== b) {
        cambios.push({ campo: ETIQUETAS[k] || k, antes: a, ahora: b })
      }
    },
  )
  return cambios
}

export function AnteMortem() {
  const propietarios = useCatalogo('Propietarios', propietariosSeed)
  const proveedores = useCatalogo('Proveedores', proveedoresSeed)
  const firmadores = useCatalogo('Firmadores', firmadoresSeed)
  const predios = useCatalogo('Predios', prediosSeed)
  const municipios = useCatalogo('Municipios', municipiosSeed)
  const departamentos = useCatalogo('Departamentos', departamentosSeed)
  const corrales = useCatalogo('Corrales', corralesSeed)
  const dictamenes = useCatalogo('Dictamen', dictamenSeed)
  const beneficiosEmergencia = useCatalogo(
    'Beneficio de emergencia',
    beneficioEmergenciaSeed,
  )
  const beneficiosCondiciones = useCatalogo(
    'Beneficio bajo condiciones especiales',
    beneficioCondicionesEspecialesSeed,
  )
  const hallazgos = useCatalogo('Hallazgos', hallazgosSeed)
  const dictamenes2 = useCatalogo('Dictamen 2', dictamen2Seed)
  const [registros, setRegistros] = useState<RegistroAnteMortem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(formVacio)
  const [firmaModo, setFirmaModo] = useState<'auto' | 'manual'>('auto')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const inputLoteRef = useRef<HTMLInputElement>(null)
  const [msgLote, setMsgLote] = useState<string | null>(null)
  // Por defecto se muestra el mes actual y el rango Desde/Hasta en la fecha de
  // hoy, para ver de una vez las inspecciones del dia.
  const [filtroMes, setFiltroMes] = useState(() =>
    new Date().toLocaleDateString('en-CA').slice(0, 7),
  )
  const [filtroDesde, setFiltroDesde] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [filtroHasta, setFiltroHasta] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [busqueda, setBusqueda] = useState('')
  const { usuario } = useAuth()
  // Firma automatica = nombre y apellido del usuario logueado.
  const firmaUsuario =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() ||
    usuario?.email ||
    FIRMA_DEFECTO

  // Persiste en localStorage; agroSync refleja estos datos en el servidor para
  // compartirlos entre dispositivos (PC <-> celular).
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      const f = r.fechaIngreso // YYYY-MM-DD
      if (filtroMes && !f.startsWith(filtroMes)) return false
      if (filtroDesde && f < filtroDesde) return false
      if (filtroHasta && f > filtroHasta) return false
      if (
        texto &&
        ![r.loteSacrificio, r.propietario, r.proveedor, r.firmador].some((v) =>
          (v || '').toLowerCase().includes(texto),
        )
      )
        return false
      return true
    })
  }, [registros, filtroMes, filtroDesde, filtroHasta, busqueda])

  // Consecutivo visual ATMB-N por orden de creacion (los registros se guardan al inicio).
  const consecutivoPorId = useMemo(() => {
    const m = new Map<string, number>()
    const total = registros.length
    registros.forEach((r, i) => m.set(r.id, total - i))
    return m
  }, [registros])

  const total = useMemo(
    () => form.novillo + form.vaca + form.toro + form.bufalo,
    [form.novillo, form.vaca, form.toro, form.bufalo],
  )

  // Tiempo de reposo = diferencia entre hora de ingreso y hora de beneficio.
  const tiempoReposo = useMemo(() => {
    const m = /^(\d{1,2}):(\d{2})$/
    const ing = m.exec(form.horaIngreso)
    const ben = m.exec(form.horaBeneficio)
    if (!ing || !ben) return ''
    const min1 = Number(ing[1]) * 60 + Number(ing[2])
    let min2 = Number(ben[1]) * 60 + Number(ben[2])
    if (min2 < min1) min2 += 24 * 60 // beneficio al dia siguiente
    const diff = min2 - min1
    const hh = Math.floor(diff / 60)
    const mm = diff % 60
    const ap = hh >= 12 ? 'PM' : 'AM'
    let h12 = hh % 12
    if (h12 === 0) h12 = 12
    return `${h12}:${String(mm).padStart(2, '0')} ${ap}`
  }, [form.horaIngreso, form.horaBeneficio])

  useEffect(() => {
    setForm((prev) =>
      prev.tiempoDescanso === tiempoReposo
        ? prev
        : { ...prev, tiempoDescanso: tiempoReposo },
    )
  }, [tiempoReposo])

  function actualizar<K extends keyof Omit<RegistroAnteMortem, 'id'>>(
    campo: K,
    valor: Omit<RegistroAnteMortem, 'id'>[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir municipio, rellena el departamento correspondiente si se conoce.
  function seleccionarMunicipio(municipio: string) {
    const dep = municipioDepartamento[municipio.trim().toUpperCase()]
    setForm((prev) => ({
      ...prev,
      municipio,
      departamento: dep || prev.departamento,
    }))
  }

  // Todos los campos son obligatorios excepto Observaciones.
  function camposFaltantes() {
    const requeridosTexto: (keyof Omit<RegistroAnteMortem, 'id'>)[] = [
      'fechaIngreso',
      'fechaBeneficio',
      'propietario',
      'proveedor',
      'firmador',
      'horaIngreso',
      'horaBeneficio',
      'tiempoDescanso',
      'corral',
      'numeroGuia',
      'predio',
      'municipio',
      'departamento',
      'dictamen',
      'beneficioDirecto',
      'beneficioEspecial',
      'hallazgos',
      'dictamen2',
      'horaFinal',
      'firma',
    ]
    const faltan: string[] = []
    requeridosTexto.forEach((k) => {
      if (!String(form[k]).trim()) faltan.push(ETIQUETAS[k])
    })
    if (total <= 0) faltan.push('Cantidad de animales (Novillo/Vaca/Toro/Bufalo)')
    return faltan
  }

  function abrirNuevo() {
    const ahora = new Date()
    const hoy = ahora.toLocaleDateString('en-CA') // YYYY-MM-DD local
    const hhmm = (d: Date) =>
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const hora = hhmm(ahora) // HH:MM local
    const finalDate = new Date(ahora.getTime() + 90 * 60 * 1000) // +1h30m
    setForm({
      ...formVacio(),
      fechaIngreso: hoy,
      fechaBeneficio: hoy,
      horaIngreso: hora,
      horaBeneficio: hora,
      horaFinal: hhmm(finalDate),
      firma: firmaUsuario,
    })
    setFirmaModo('auto')
    setEditandoId(null)
    setError('')
    setMostrarForm(true)
  }

  function editarRegistro(r: RegistroAnteMortem) {
    const { id: _id, ...datos } = r
    setForm(datos)
    setFirmaModo(r.firma.startsWith('data:') ? 'manual' : 'auto')
    setEditandoId(r.id)
    setError('')
    setMostrarForm(true)
  }

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function alternarTodos() {
    setSeleccionados((prev) =>
      prev.size === registrosFiltrados.length
        ? new Set()
        : new Set(registrosFiltrados.map((r) => r.id)),
    )
  }

  async function confirmarEliminar(password: string) {
    if (seleccionados.size === 0 || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.verificarPassword(password)
      setRegistros((prev) => prev.filter((r) => !seleccionados.has(r.id)))
      setSeleccionados(new Set())
      setMostrarEliminar(false)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'Contraseña incorrecta',
      )
    } finally {
      setEliminando(false)
    }
  }

  // Toma el archivo de beneficio y, para cada Ante Mortem seleccionado, busca su
  // guia en el archivo y le asigna el numero de lote (columna H).
  async function cargarLote(file: File | undefined) {
    if (!file) return
    setMsgLote(null)
    try {
      const mapa = await leerMapaGuiaLote(file)
      let actualizados = 0
      const sinCoincidencia: string[] = []
      setRegistros((prev) =>
        prev.map((r) => {
          if (!seleccionados.has(r.id)) return r
          const lote = mapa.get(normalizarGuia(r.numeroGuia))
          if (lote) {
            actualizados++
            return { ...r, loteSacrificio: lote }
          }
          sinCoincidencia.push(`ATMB-${consecutivoPorId.get(r.id) ?? '?'}`)
          return r
        }),
      )
      const partes = [`${actualizados} lote(s) cargado(s)`]
      if (sinCoincidencia.length)
        partes.push(`sin coincidencia: ${sinCoincidencia.join(', ')}`)
      setMsgLote(partes.join('  ·  '))
    } catch {
      setMsgLote(
        'No se pudo leer el archivo. Verifica que sea el Excel de beneficio correcto.',
      )
    }
  }

  function registrosExportar() {
    const filas = registrosFiltrados.filter((r) => seleccionados.has(r.id))
    return filas.map((r) => ({
      'FECHA INGRESO': r.fechaIngreso,
      'FECHA BENEFICIO': r.fechaBeneficio,
      PROPIETARIO: r.propietario,
      PROVEEDOR: r.proveedor,
      FIRMADOR: r.firmador,
      'HORA INGRESO': r.horaIngreso,
      'HORA BENEFICIO': r.horaBeneficio,
      'TIEMPO DE REPOSO': r.tiempoDescanso,
      CORRAL: r.corral,
      'LOTE DE SACRIFICIO': r.loteSacrificio,
      'NUMERO DE GUIA': r.numeroGuia,
      PREDIO: r.predio,
      MUNICIPIO: r.municipio,
      DEPARTAMENTO: r.departamento,
      NOVILLO: r.novillo,
      VACA: r.vaca,
      TORO: r.toro,
      BUFALO: r.bufalo,
      TOTAL: r.novillo + r.vaca + r.toro + r.bufalo,
      DICTAMEN: r.dictamen,
      'BENEFICIO DE EMERGENCIA': r.beneficioDirecto,
      'BENEFICIO BAJO CONDICIONES ESPECIALES': r.beneficioEspecial,
      'ANIMALES CAIDOS': r.numeroAnimales,
      HALLAZGOS: r.hallazgos,
      DICTAMEN2: r.dictamen2,
      OBSERVACIONES: r.observaciones,
      'HORA FINAL': r.horaFinal,
      FIRMA: r.firma.startsWith('data:') ? 'FIRMA MANUAL' : r.firma,
    }))
  }

  async function exportarExcel() {
    const datos = registrosExportar()
    if (datos.length === 0) return
    const columnas = Object.keys(datos[0])
    const nCol = columnas.length

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Ante Mortem', {
      views: [{ showGridLines: false }],
    })

    const borde = {
      top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
      left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
      right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    }

    columnas.forEach((c, i) => {
      ws.getColumn(i + 1).width = Math.max(12, Math.min(28, c.length + 4))
    })

    const verde = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFDCF3D0' },
    }
    const tinta = { argb: 'FF14532D' }

    // Encabezado (3 filas): logo | titulo | codigo/version/fecha | dictamen
    const logoCols = Math.min(3, Math.max(2, Math.floor(nCol / 9)))
    const dictCols = Math.min(6, Math.max(4, Math.floor(nCol / 4)))
    const infoCols = Math.min(5, Math.max(3, Math.floor(nCol / 6)))
    const dictIni = nCol - dictCols + 1
    const infoFin = dictIni - 1
    const infoIni = infoFin - infoCols + 1
    const tituloIni = logoCols + 1
    const tituloFin = infoIni - 1

    ws.getRow(1).height = 26
    ws.getRow(2).height = 26
    ws.getRow(3).height = 30
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= nCol; c++) {
        const cell = ws.getCell(r, c)
        cell.fill = verde
        cell.border = borde
      }
    }

    const ponerBloque = (
      r1: number,
      c1: number,
      r2: number,
      c2: number,
      valor: string,
      opts: { size?: number; bold?: boolean; left?: boolean; wrap?: boolean } = {},
    ) => {
      ws.mergeCells(r1, c1, r2, c2)
      const cell = ws.getCell(r1, c1)
      cell.value = valor
      cell.font = { bold: opts.bold ?? true, size: opts.size ?? 10, color: tinta }
      cell.alignment = {
        horizontal: opts.left ? 'left' : 'center',
        vertical: 'middle',
        wrapText: opts.wrap ?? false,
      }
    }

    // Logo (izquierda) y titulo (centro)
    ws.mergeCells(1, 1, 3, logoCols)
    ponerBloque(1, tituloIni, 3, tituloFin, 'INSPECCION ANTE MORTEM PLANTA BOVINO', {
      size: 18,
      wrap: true,
    })

    // Info (codigo / version / fecha)
    ponerBloque(1, infoIni, 1, infoFin, 'CODIGO: F-CI-030', { size: 10 })
    ponerBloque(2, infoIni, 2, infoFin, 'VERSION 11', { size: 10 })
    ponerBloque(3, infoIni, 3, infoFin, 'FECHA DE VERSION: 5 DICIEMBRE 2025', {
      size: 10,
    })

    // Dictamen (extremo derecho)
    ponerBloque(
      1,
      dictIni,
      3,
      nCol,
      'DICTAMEN INSPECCION ANTE MORTEM:\nI: beneficio sin restricciones\nII: beneficio bajo condiciones especiales\nIII: beneficio de emergencia',
      { size: 8, bold: false, left: true, wrap: true },
    )

    // Fila 4: cabeceras
    const filaHead = ws.getRow(4)
    filaHead.height = 28
    columnas.forEach((c, i) => {
      const cell = filaHead.getCell(i + 1)
      cell.value = c
      cell.font = { bold: true, size: 9 }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      }
      cell.border = borde
    })

    // Datos
    datos.forEach((fila, idx) => {
      const row = ws.getRow(idx + 5)
      columnas.forEach((c, i) => {
        const cell = row.getCell(i + 1)
        cell.value = (fila as Record<string, unknown>)[c] as
          | string
          | number
        cell.font = { size: 9 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = borde
      })
    })

    // Logo de Agropecuaria a la izquierda del banner
    try {
      const resp = await fetch('/logos/agropecuaria-santacruz.png')
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
      const h = 64
      const w = Math.round((img.naturalWidth / img.naturalHeight || 1) * h)
      const logoId = wb.addImage({ base64: dataUrl, extension: 'png' })
      ws.addImage(logoId, {
        tl: { col: 0.2, row: 0.15 },
        ext: { width: w, height: h },
        editAs: 'oneCell',
      })
    } catch {
      const fallback = ws.getCell(1, 1)
      fallback.value = 'AGROPECUARIA SANTACRUZ'
      fallback.font = { bold: true, size: 12, color: tinta }
      fallback.alignment = { horizontal: 'center', vertical: 'middle' }
    }

    const buffer = await wb.xlsx.writeBuffer()
    const salida = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(salida)
    const enlace = document.createElement('a')
    enlace.download = 'ante-mortem.xlsx'
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  function exportarPDF() {
    const datos = registrosExportar()
    if (datos.length === 0) return
    const columnas = Object.keys(datos[0])
    const escapar = (v: unknown) =>
      String(v ?? '').replace(/[&<>]/g, (c) =>
        c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;',
      )
    const encabezado = columnas.map((c) => `<th>${escapar(c)}</th>`).join('')
    const cuerpo = datos
      .map(
        (fila) =>
          `<tr>${columnas
            .map((c) => `<td>${escapar((fila as Record<string, unknown>)[c])}</td>`)
            .join('')}</tr>`,
      )
      .join('')
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ante Mortem</title><style>body{font-family:Arial,sans-serif;padding:16px;}h1{font-size:16px;}table{border-collapse:collapse;width:100%;font-size:9px;}th,td{border:1px solid #94a3b8;padding:4px;text-align:left;}th{background:#e2e8f0;}</style></head><body><h1>ANTE MORTEM</h1><table><thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`)
    win.document.close()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    const faltantes = camposFaltantes()
    if (faltantes.length > 0) {
      setError(`Faltan campos obligatorios: ${faltantes.join(', ')}.`)
      return
    }
    setError('')
    // Si se escribieron a mano, se "crean" en el catalogo para la proxima vez.
    agregarACatalogo('Propietarios', propietariosSeed, form.propietario)
    agregarACatalogo('Proveedores', proveedoresSeed, form.proveedor)
    agregarACatalogo('Firmadores', firmadoresSeed, form.firmador)
    const referencia =
      form.loteSacrificio || form.propietario || 'REGISTRO SIN LOTE'
    if (editandoId) {
      const original = registros.find((r) => r.id === editandoId)
      const cambios = original ? calcularCambios(original, form) : []
      setRegistros((prev) =>
        prev.map((r) => (r.id === editandoId ? { ...form, id: editandoId } : r)),
      )
      registrarMovimiento('EDITÓ', referencia, cambios)
    } else {
      const nuevo: RegistroAnteMortem = { ...form, id: crypto.randomUUID() }
      setRegistros((prev) => [nuevo, ...prev])
      registrarMovimiento('CREÓ', referencia)
    }
    setMostrarForm(false)
    setEditandoId(null)
    setForm(formVacio())
  }

  function registrarMovimiento(
    accion: 'CREÓ' | 'EDITÓ',
    referencia: string,
    cambios?: { campo: string; antes: string; ahora: string }[],
  ) {
    agregarMovimiento({
      modulo: 'ANTE MORTEM',
      accion,
      referencia,
      usuario: usuario?.nombre || usuario?.email || 'DESCONOCIDO',
      cambios: cambios && cambios.length > 0 ? cambios : undefined,
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Ante Mortem Bovino
          </h2>
          <p className="text-slate-500">
            Inspeccion de animales antes del sacrificio.
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo
          </button>
        )}
      </header>

      {mostrarForm ? (
        <form
          onSubmit={guardar}
          className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm [&_input]:uppercase [&_textarea]:uppercase [&_label>span]:uppercase"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Campo label="Fecha de ingreso">
              <input
                type="date"
                className={inputClase}
                value={form.fechaIngreso}
                onChange={(e) => actualizar('fechaIngreso', e.target.value)}
              />
            </Campo>
            <Campo label="Fecha de beneficio">
              <input
                type="date"
                className={inputClase}
                value={form.fechaBeneficio}
                onChange={(e) => actualizar('fechaBeneficio', e.target.value)}
              />
            </Campo>
            <Campo label="Propietario">
              <SelectorBuscable
                opciones={propietarios}
                value={form.propietario}
                onChange={(v) => actualizar('propietario', v)}
                permitirLibre
                placeholder="Selecciona propietario"
              />
            </Campo>
            <Campo label="Proveedor">
              <SelectorBuscable
                opciones={proveedores}
                value={form.proveedor}
                onChange={(v) => actualizar('proveedor', v)}
                permitirLibre
                placeholder="Selecciona proveedor"
              />
            </Campo>
            <Campo label="Firmador">
              <SelectorBuscable
                opciones={firmadores}
                value={form.firmador}
                onChange={(v) => actualizar('firmador', v)}
                permitirLibre
                placeholder="Selecciona firmador"
              />
            </Campo>
            <Campo label="Hora de ingreso">
              <input
                type="time"
                data-no-upper
                className={inputClase}
                value={form.horaIngreso}
                onChange={(e) => actualizar('horaIngreso', e.target.value)}
              />
            </Campo>
            <Campo label="Hora de beneficio">
              <input
                type="time"
                data-no-upper
                className={inputClase}
                value={form.horaBeneficio}
                onChange={(e) => actualizar('horaBeneficio', e.target.value)}
              />
            </Campo>
            <Campo label="Tiempo de reposo">
              <input
                readOnly
                data-no-upper
                placeholder="00:00 AM"
                className={`${inputClase} bg-slate-100`}
                value={form.tiempoDescanso}
              />
            </Campo>
            <Campo label="Corral">
              <SelectorBuscable
                opciones={corrales}
                value={form.corral}
                onChange={(v) => actualizar('corral', v)}
                permitirLibre
                placeholder="Selecciona corral"
              />
            </Campo>
            <Campo label="Lote de sacrificio">
              <input
                className={inputClase}
                value={form.loteSacrificio}
                onChange={(e) => actualizar('loteSacrificio', e.target.value)}
              />
            </Campo>
            <Campo label="Numero de guia">
              <input
                className={inputClase}
                value={form.numeroGuia}
                onChange={(e) => actualizar('numeroGuia', e.target.value)}
              />
            </Campo>
            <Campo label="Predio">
              <SelectorBuscable
                opciones={predios}
                value={form.predio}
                onChange={(v) => actualizar('predio', v)}
                permitirLibre
                placeholder="Selecciona predio"
              />
            </Campo>
            <Campo label="Municipio">
              <SelectorBuscable
                opciones={municipios}
                value={form.municipio}
                onChange={(v) => seleccionarMunicipio(v)}
                permitirLibre
                placeholder="Selecciona municipio"
              />
            </Campo>
            <Campo label="Departamento">
              <SelectorBuscable
                opciones={departamentos}
                value={form.departamento}
                onChange={(v) => actualizar('departamento', v)}
                permitirLibre
                placeholder="Selecciona departamento"
              />
            </Campo>
            <div className="grid grid-cols-2 gap-4 md:col-span-5 md:grid-cols-5">
              <Campo label="Novillo">
                <input
                  type="number"
                  min={0}
                  data-no-upper
                  className={inputClase}
                  value={form.novillo || ''}
                  onChange={(e) =>
                    actualizar('novillo', Number(e.target.value) || 0)
                  }
                />
              </Campo>
              <Campo label="Vaca">
                <input
                  type="number"
                  min={0}
                  data-no-upper
                  className={inputClase}
                  value={form.vaca || ''}
                  onChange={(e) => actualizar('vaca', Number(e.target.value) || 0)}
                />
              </Campo>
              <Campo label="Toro">
                <input
                  type="number"
                  min={0}
                  data-no-upper
                  className={inputClase}
                  value={form.toro || ''}
                  onChange={(e) => actualizar('toro', Number(e.target.value) || 0)}
                />
              </Campo>
              <Campo label="Bufalo">
                <input
                  type="number"
                  min={0}
                  data-no-upper
                  className={inputClase}
                  value={form.bufalo || ''}
                  onChange={(e) =>
                    actualizar('bufalo', Number(e.target.value) || 0)
                  }
                />
              </Campo>
              <Campo label="Total">
                <input
                  type="number"
                  readOnly
                  data-no-upper
                  className={`${inputClase} bg-slate-100`}
                  value={total}
                />
              </Campo>
            </div>
            <Campo label="Dictamen">
              <SelectorBuscable
                opciones={dictamenes}
                value={form.dictamen}
                onChange={(v) => actualizar('dictamen', v)}
                permitirLibre
                placeholder="Selecciona dictamen"
              />
            </Campo>
            <Campo label="Beneficio de emergencia">
              <SelectorBuscable
                opciones={beneficiosEmergencia}
                value={form.beneficioDirecto}
                onChange={(v) => actualizar('beneficioDirecto', v)}
                permitirLibre
                placeholder="Selecciona"
              />
            </Campo>
            <Campo label="Beneficio bajo condiciones especiales">
              <SelectorBuscable
                opciones={beneficiosCondiciones}
                value={form.beneficioEspecial}
                onChange={(v) => actualizar('beneficioEspecial', v)}
                permitirLibre
                placeholder="Selecciona"
              />
            </Campo>
            <Campo label="Animales caidos">
              <input
                type="number"
                min={0}
                data-no-upper
                className={inputClase}
                value={form.numeroAnimales || ''}
                onChange={(e) =>
                  actualizar('numeroAnimales', Number(e.target.value) || 0)
                }
              />
            </Campo>
            <Campo label="Hallazgos">
              <SelectorBuscable
                opciones={hallazgos}
                value={form.hallazgos}
                onChange={(v) => actualizar('hallazgos', v)}
                permitirLibre
                placeholder="Selecciona"
              />
            </Campo>
            <Campo label="Dictamen 2">
              <SelectorBuscable
                opciones={dictamenes2}
                value={form.dictamen2}
                onChange={(v) => actualizar('dictamen2', v)}
                permitirLibre
                placeholder="Selecciona"
              />
            </Campo>
            <Campo label="Observaciones">
              <input
                className={inputClase}
                value={form.observaciones}
                onChange={(e) => actualizar('observaciones', e.target.value)}
              />
            </Campo>
            <Campo label="Hora final">
              <input
                type="time"
                data-no-upper
                className={inputClase}
                value={form.horaFinal}
                onChange={(e) => actualizar('horaFinal', e.target.value)}
              />
            </Campo>
            <div className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Firma
              </span>
              <div className="space-y-2">
                <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                  <button
                    type="button"
                    onClick={() => {
                      setFirmaModo('auto')
                      actualizar('firma', firmaUsuario)
                    }}
                    className={`px-3 py-1 text-xs font-medium ${
                      firmaModo === 'auto'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFirmaModo('manual')
                      actualizar('firma', '')
                    }}
                    className={`px-3 py-1 text-xs font-medium ${
                      firmaModo === 'manual'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Manual
                  </button>
                </div>
                {firmaModo === 'auto' ? (
                  <input
                    className={inputClase}
                    value={form.firma}
                    onChange={(e) => actualizar('firma', e.target.value)}
                  />
                ) : (
                  <FirmaCanvas
                    value={form.firma}
                    onChange={(v) => actualizar('firma', v)}
                  />
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false)
                setError('')
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Guardar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Mes
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-36"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Desde
              <input
                type="date"
                data-no-upper
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Hasta
              <input
                type="date"
                data-no-upper
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            {(filtroMes || filtroDesde || filtroHasta) && (
              <button
                onClick={() => {
                  setFiltroMes(new Date().toLocaleDateString('en-CA').slice(0, 7))
                  setFiltroDesde('')
                  setFiltroHasta('')
                  setBusqueda('')
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Limpiar filtro
              </button>
            )}
            <label className="flex flex-1 flex-col text-xs font-medium text-slate-600 min-w-[220px]">
              Buscar
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Lote, propietario, proveedor o firmador"
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {seleccionados.size > 0
                ? `${seleccionados.size} seleccionado(s)`
                : `${registrosFiltrados.length} de ${registros.length} registro(s)`}
            </span>
            <div className="flex flex-wrap gap-2">
              {seleccionados.size > 0 && (
                <>
                  <input
                    ref={inputLoteRef}
                    type="file"
                    accept=".xls,.xlsx,.htm,.html"
                    className="hidden"
                    data-no-upper
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.currentTarget.value = ''
                      void cargarLote(f)
                    }}
                  />
                  <button
                    onClick={() => inputLoteRef.current?.click()}
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
                  >
                    Cargar lote
                  </button>
                </>
              )}
              <button
                onClick={exportarExcel}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Excel
              </button>
              <button
                onClick={exportarPDF}
                className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                PDF
              </button>
              {seleccionados.size > 0 && (
                <button
                  onClick={() => {
                    setErrorEliminar(null)
                    setMostrarEliminar(true)
                  }}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
          {msgLote && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>{msgLote}</span>
              <button
                onClick={() => setMsgLote(null)}
                className="text-amber-600 hover:text-amber-800"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      data-no-upper
                      className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={
                        registrosFiltrados.length > 0 &&
                        seleccionados.size === registrosFiltrados.length
                      }
                      onChange={alternarTodos}
                    />
                  </th>
                  <th className="px-4 py-3">Consecutivo</th>
                  <th className="px-4 py-3">Fecha ingreso</th>
                  <th className="px-4 py-3">Fecha beneficio</th>
                  <th className="px-4 py-3">Firmador</th>
                  <th className="px-4 py-3">Numero de guia</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Dictamen</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosFiltrados.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        data-no-upper
                        className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={seleccionados.has(r.id)}
                        onChange={() => alternarSeleccion(r.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      ATMB-{consecutivoPorId.get(r.id) ?? '?'}
                    </td>
                    <td className="px-4 py-3">{r.fechaIngreso}</td>
                    <td className="px-4 py-3">{r.fechaBeneficio}</td>
                    <td className="px-4 py-3">{r.firmador}</td>
                    <td className="px-4 py-3">{r.numeroGuia}</td>
                    <td className="px-4 py-3">
                      {r.loteSacrificio ? (
                        r.loteSacrificio
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Pendiente por lote
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.novillo + r.vaca + r.toro + r.bufalo}
                    </td>
                    <td className="px-4 py-3">{r.dictamen}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => editarRegistro(r)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {registrosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No hay registros para el filtro seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarEliminar && (
        <ModalEliminar
          titulo="Eliminar registros"
          descripcion={`Vas a eliminar ${seleccionados.size} registro(s).`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setMostrarEliminar(false)}
          onConfirmar={confirmarEliminar}
        />
      )}
    </div>
  )
}
