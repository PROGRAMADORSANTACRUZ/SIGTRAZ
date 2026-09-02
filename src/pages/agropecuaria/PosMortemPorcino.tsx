import { useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs'
import { Campo, inputClase } from '../../components/ui'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { agregarMovimiento } from './movimientosStore'
import { useCatalogo } from './catalogosStore'
import { organosSeed, patologiasSeed } from './datosCatalogos'
import {
  actualizarCertificado,
  agregarCertificado,
  buscarCertificadoPorLote,
  construirContenido,
  formatoConsecutivo,
  mesDe,
  siguienteConsecutivo,
} from './certificadosPorcinoStore'

const STORAGE_KEY = 'agro_posmortem_porcino'
const ANTEMORTEM_KEY = 'agro_antemortem_porcino'

const DICTAMENES = [
  'DECOMISO',
  'DECOMISO PARCIAL',
  'APTO PARA CONSUMO',
  'RETENIDO',
]

const OBSERVACIONES_OPC = ['SIN OBSERVACIONES', 'BUFALOS', 'SACRIFICIO DE EMERGENCIA']

interface RegistroPosMortem {
  id: string
  fecha: string
  horaLlegada: string
  horaSacrificio: string
  tiempoReposo: string
  cliente: string
  loteSacrificio: string
  organo: string
  cantidad: string
  gancho: string
  granja: string
  patologia: string
  dictamen: string
  origen: string
  observacion: string
  firma: string
}

const formVacio = (): Omit<RegistroPosMortem, 'id'> => ({
  fecha: '',
  horaLlegada: '',
  horaSacrificio: '',
  tiempoReposo: '',
  cliente: '',
  loteSacrificio: '',
  organo: '',
  cantidad: '',
  gancho: '',
  granja: '',
  patologia: '',
  dictamen: '',
  origen: '',
  observacion: '',
  firma: '',
})

const ETIQUETAS: Record<keyof Omit<RegistroPosMortem, 'id'>, string> = {
  fecha: 'Fecha de sacrificio',
  horaLlegada: 'Hora llegada',
  horaSacrificio: 'Hora de sacrificio',
  tiempoReposo: 'Tiempo de reposo',
  cliente: 'Cliente',
  loteSacrificio: 'Lote',
  organo: 'Organo',
  cantidad: 'Cantidad',
  gancho: 'Gancho',
  granja: 'Granja',
  patologia: 'Patologia',
  dictamen: 'Dictamen',
  origen: 'Origen',
  observacion: 'Observacion',
  firma: 'Firma',
}

export function PosMortemPorcino() {
  const [registros, setRegistros] = useState<RegistroPosMortem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(formVacio)
  const [lineas, setLineas] = useState<RegistroPosMortem[]>([])
  const [editandoGrupo, setEditandoGrupo] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [certificadoItems, setCertificadoItems] = useState<
    RegistroPosMortem[] | null
  >(null)
  const [avisoCert, setAvisoCert] = useState<string | null>(null)
  // Por defecto se muestra el mes actual; Desde/Hasta vacios para ver todo el mes.
  const [filtroMes, setFiltroMes] = useState(() =>
    new Date().toLocaleDateString('en-CA').slice(0, 7),
  )
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { usuario } = useAuth()
  const organos = useCatalogo('Organos', organosSeed)
  const patologias = useCatalogo('Patologias', patologiasSeed)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
  }, [registros])

  // El aviso del certificado desaparece solo tras unos segundos.
  useEffect(() => {
    if (!avisoCert) return
    const t = setTimeout(() => setAvisoCert(null), 4000)
    return () => clearTimeout(t)
  }, [avisoCert])

  // Una fila por lote/dia. Cada grupo agrupa todos sus organos/hallazgos.
  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const map = new Map<string, RegistroPosMortem[]>()
    registros.forEach((r) => {
      const f = r.fecha // YYYY-MM-DD
      if (filtroMes && !f.startsWith(filtroMes)) return
      if (filtroDesde && f < filtroDesde) return
      if (filtroHasta && f > filtroHasta) return
      const k = `${r.fecha}||${r.loteSacrificio}`
      const arr = map.get(k) ?? []
      arr.push(r)
      map.set(k, arr)
    })
    let lista = [...map.entries()].map(([clave, items]) => ({
      clave,
      fecha: items[0].fecha,
      loteSacrificio: items[0].loteSacrificio,
      cliente: items[0].cliente,
      items,
    }))
    if (texto) {
      lista = lista.filter(
        (g) =>
          [g.fecha, g.loteSacrificio, g.cliente].some((v) =>
            (v || '').toLowerCase().includes(texto),
          ) ||
          g.items.some((i) =>
            [i.organo, i.patologia, i.dictamen].some((v) =>
              (v || '').toLowerCase().includes(texto),
            ),
          ),
      )
    }
    return lista
  }, [registros, filtroMes, filtroDesde, filtroHasta, busqueda])

  // Consecutivo visual PMP-N por orden de creacion del lote (fecha||lote).
  const consecutivoPorClave = useMemo(() => {
    const orden: string[] = []
    const visto = new Set<string>()
    for (let i = registros.length - 1; i >= 0; i--) {
      const k = `${registros[i].fecha}||${registros[i].loteSacrificio}`
      if (!visto.has(k)) {
        visto.add(k)
        orden.push(k)
      }
    }
    const m = new Map<string, number>()
    orden.forEach((k, i) => m.set(k, i + 1))
    return m
  }, [registros])

  // Registros de Ante Mortem para autocompletar y filtrar por dia.
  const anteRegistros = useMemo<Record<string, string>[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(ANTEMORTEM_KEY) || '[]')
    } catch {
      return []
    }
  }, [mostrarForm])

  // Clientes (firmadores) de Ante Mortem, solo del dia seleccionado.
  const firmadores = useMemo(
    () => [
      ...new Set(
        anteRegistros
          .filter((r) => (r.fechaIngreso || '') === form.fecha)
          .map((r) => (r.firmador || '').trim())
          .filter((v) => v !== ''),
      ),
    ],
    [anteRegistros, form.fecha],
  )

  // Lotes del cliente seleccionado, solo de ese dia. Se excluyen los lotes que
  // ya tienen documento creado (salvo el que se esta editando en el formulario).
  const lotes = useMemo(() => {
    const usados = new Set(
      registros
        .filter((r) => (r.fecha || '') === form.fecha)
        .map((r) => (r.loteSacrificio || '').trim())
        .filter(Boolean),
    )
    const actual = (form.loteSacrificio || '').trim()
    return [
      ...new Set(
        anteRegistros
          .filter(
            (r) =>
              (r.fechaIngreso || '') === form.fecha &&
              (!form.cliente || (r.firmador || '').trim() === form.cliente),
          )
          .map((r) => (r.loteSacrificio || '').trim())
          .filter((v) => v !== '' && (v === actual || !usados.has(v))),
      ),
    ]
  }, [anteRegistros, form.fecha, form.cliente, form.loteSacrificio, registros])

  function actualizar<K extends keyof Omit<RegistroPosMortem, 'id'>>(
    campo: K,
    valor: Omit<RegistroPosMortem, 'id'>[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir el lote se traen los datos de cabecera desde Ante Mortem.
  function elegirLote(lote: string) {
    const l = lote.trim()
    const ante =
      anteRegistros.find(
        (r) =>
          (r.loteSacrificio || '').trim() === l &&
          (r.fechaIngreso || '') === form.fecha,
      ) || anteRegistros.find((r) => (r.loteSacrificio || '').trim() === l)
    setForm((prev) => {
      if (!ante) return { ...prev, loteSacrificio: lote }
      const origen = [ante.municipio, ante.departamento]
        .map((v) => (v || '').trim())
        .filter(Boolean)
        .join('-')
      return {
        ...prev,
        loteSacrificio: lote,
        horaLlegada: ante.horaIngreso || prev.horaLlegada,
        horaSacrificio: ante.horaBeneficio || prev.horaSacrificio,
        tiempoReposo: ante.tiempoDescanso || prev.tiempoReposo,
        granja: ante.predio || prev.granja,
        origen: origen || prev.origen,
      }
    })
  }

  function camposFaltantes() {
    const faltan: string[] = []
    if (!form.fecha.trim()) faltan.push(ETIQUETAS.fecha)
    if (!form.loteSacrificio.trim()) faltan.push(ETIQUETAS.loteSacrificio)
    if (!form.organo.trim()) faltan.push(ETIQUETAS.organo)
    return faltan
  }

  // Registra la linea actual abajo y prepara la siguiente conservando
  // los datos de cabecera del lote.
  function agregarLinea() {
    const faltan = camposFaltantes()
    if (faltan.length > 0) {
      setError(`Faltan campos: ${faltan.join(', ')}`)
      return
    }
    setLineas((prev) => [...prev, { ...form, id: crypto.randomUUID() }])
    setForm((prev) => ({
      ...formVacio(),
      fecha: prev.fecha,
      horaLlegada: prev.horaLlegada,
      horaSacrificio: prev.horaSacrificio,
      tiempoReposo: prev.tiempoReposo,
      cliente: prev.cliente,
      loteSacrificio: prev.loteSacrificio,
      granja: prev.granja,
      origen: prev.origen,
      firma: prev.firma,
    }))
    setError('')
  }

  function quitarLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id))
  }

  function abrirNuevo() {
    const hoy = new Date().toLocaleDateString('en-CA')
    setForm({ ...formVacio(), fecha: hoy })
    setLineas([])
    setEditandoGrupo(null)
    setError('')
    setMostrarForm(true)
  }

  // Edita el lote completo: carga todos sus organos como lineas.
  function editarGrupo(clave: string) {
    const items = registros.filter(
      (r) => `${r.fecha}||${r.loteSacrificio}` === clave,
    )
    if (items.length === 0) return
    setLineas(items)
    const base = items[0]
    setForm({
      ...formVacio(),
      fecha: base.fecha,
      horaLlegada: base.horaLlegada,
      horaSacrificio: base.horaSacrificio,
      tiempoReposo: base.tiempoReposo,
      cliente: base.cliente,
      loteSacrificio: base.loteSacrificio,
      granja: base.granja,
      origen: base.origen,
      firma: base.firma,
    })
    setEditandoGrupo(clave)
    setError('')
    setMostrarForm(true)
  }

  function registrarMovimiento(
    accion: 'CREÓ' | 'EDITÓ' | 'ELIMINÓ',
    referencia: string,
  ) {
    agregarMovimiento({
      modulo: 'POS MORTEM PORCINO',
      accion,
      referencia,
      usuario: usuario?.nombre || usuario?.email || 'DESCONOCIDO',
    })
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    // Reune las lineas del lote + la linea actual (si tiene organo).
    const pendientes = [...lineas]
    if (form.organo.trim()) {
      const faltan = camposFaltantes()
      if (faltan.length > 0) {
        setError(`Faltan campos: ${faltan.join(', ')}`)
        return
      }
      pendientes.push({ ...form, id: crypto.randomUUID() })
    }
    if (pendientes.length === 0) {
      setError('Agrega al menos una linea.')
      return
    }
    const refLote = pendientes[0].loteSacrificio || 'SIN LOTE'
    const referencia = `${refLote} · ${pendientes.length} ORGANO(S)`

    if (editandoGrupo) {
      // Reinserta el lote en su posicion original para conservar el mismo
      // consecutivo (no moverlo al frente lo trataria como recien creado).
      setRegistros((prev) => {
        const esGrupo = (r: RegistroPosMortem) =>
          `${r.fecha}||${r.loteSacrificio}` === editandoGrupo
        const idx = prev.findIndex(esGrupo)
        const resto = prev.filter((r) => !esGrupo(r))
        const pos = idx === -1 ? 0 : idx
        return [...resto.slice(0, pos), ...pendientes, ...resto.slice(pos)]
      })
      registrarMovimiento('EDITÓ', referencia)
    } else {
      setRegistros((prev) => [...pendientes, ...prev])
      registrarMovimiento('CREÓ', referencia)
    }
    setMostrarForm(false)
    setEditandoGrupo(null)
    setForm(formVacio())
    setLineas([])
    // Si hubo decomiso o decomiso parcial se ofrece el certificado.
    const decomisos = pendientes.filter((p) =>
      p.dictamen.trim().toUpperCase().startsWith('DECOMISO'),
    )
    if (decomisos.length > 0) setCertificadoItems(decomisos)
  }

  function alternarSeleccion(clave: string) {
    setSeleccionados((prev) => {
      const s = new Set(prev)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })
  }

  function alternarTodos() {
    setSeleccionados((prev) =>
      prev.size === grupos.length ? new Set() : new Set(grupos.map((g) => g.clave)),
    )
  }

  // Elimina los lotes seleccionados validando la contrasena del administrador.
  async function eliminarSeleccionados(password: string) {
    if (seleccionados.size === 0 || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.verificarPassword(password)
      const claves = new Set(seleccionados)
      const referencias = grupos
        .filter((g) => claves.has(g.clave))
        .map((g) => `${g.loteSacrificio || 'SIN LOTE'} (${g.fecha})`)
      setRegistros((prev) =>
        prev.filter((r) => !claves.has(`${r.fecha}||${r.loteSacrificio}`)),
      )
      referencias.forEach((ref) => registrarMovimiento('ELIMINÓ', ref))
      setSeleccionados(new Set())
      setMostrarEliminar(false)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  // Aplana los organos de los grupos seleccionados.
  function registrosExportar() {
    const fuente = grupos.filter((g) => seleccionados.has(g.clave))
    return fuente.flatMap((g) =>
      g.items.map((r) => ({
        'FECHA DE SACRIFICIO': r.fecha,
        MES: mesDe(r.fecha),
        'HORA LLEGADA': r.horaLlegada,
        'HORA DE SACRIFICIO': r.horaSacrificio,
        'TIEMPO DE REPOSO': r.tiempoReposo,
        CLIENTE: r.cliente,
        LOTE: r.loteSacrificio,
        ORGANO: r.organo,
        CANTIDAD: r.cantidad,
        GANCHO: r.gancho,
        GRANJA: r.granja,
        PATOLOGIA: r.patologia,
        DICTAMEN: r.dictamen,
        ORIGEN: r.origen,
        OBSERVACION: r.observacion,
        FIRMA: r.firma,
      })),
    )
  }

  async function exportarExcel() {
    const datos = registrosExportar()
    if (datos.length === 0) return
    const columnas = Object.keys(datos[0])
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Pos Mortem Porcino')
    const borde = {
      top: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
      left: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
      right: { style: 'thin' as const, color: { argb: 'FF94A3B8' } },
    }
    const filaTitulo = ws.addRow(['INSPECCION POST MORTEM PORCINOS'])
    ws.mergeCells(1, 1, 1, columnas.length)
    filaTitulo.getCell(1).font = { bold: true, size: 14 }
    filaTitulo.getCell(1).alignment = { horizontal: 'center' }
    const filaEnc = ws.addRow(columnas)
    filaEnc.eachCell((celda) => {
      celda.font = { bold: true, color: { argb: 'FF1E293B' } }
      celda.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      }
      celda.border = borde
      celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
    datos.forEach((fila) => {
      const r = ws.addRow(columnas.map((c) => (fila as Record<string, unknown>)[c]))
      r.eachCell((celda) => {
        celda.border = borde
        celda.alignment = { vertical: 'middle' }
      })
    })
    columnas.forEach((c, i) => {
      const largo = Math.max(
        c.length,
        ...datos.map((f) => String((f as Record<string, unknown>)[c] ?? '').length),
      )
      ws.getColumn(i + 1).width = Math.min(Math.max(largo + 2, 10), 40)
    })
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = 'pos-mortem-porcino.xlsx'
    enlace.click()
    URL.revokeObjectURL(enlace.href)
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
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Pos Mortem Porcino</title><style>body{font-family:Arial,sans-serif;padding:16px;}h1{font-size:16px;}table{border-collapse:collapse;width:100%;font-size:9px;}th,td{border:1px solid #94a3b8;padding:4px;text-align:left;}th{background:#e2e8f0;}</style></head><body><h1>INSPECCION POST MORTEM PORCINOS</h1><table><thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table><script>window.onload=function(){window.print();}</script></body></html>`,
    )
    win.document.close()
  }

  // Genera el certificado de decomiso (PDF via impresion) con los hallazgos.
  function generarCertificado(items: RegistroPosMortem[]) {
    if (items.length === 0) return
    const base = items[0]
    const loteBase = (base.loteSacrificio || '').trim()
    const ante =
      anteRegistros.find(
        (r) =>
          (r.loteSacrificio || '').trim() === loteBase &&
          (r.fechaIngreso || '') === base.fecha,
      ) || anteRegistros.find((r) => (r.loteSacrificio || '').trim() === loteBase)
    const num = (v: unknown) => Number(v) || 0
    const total = ante
      ? num(ante.marranas) + num(ante.machos) + num(ante.hembras)
      : 0
    const tipo = 'PORCINOS'
    // Fecha de emision del certificado (dia en que se genera).
    const hoy = new Date().toLocaleDateString('en-CA')
    const hallazgos = items.map((r) => ({
      organo: r.organo,
      patologia: r.patologia,
      dictamen: r.dictamen,
      cantidad: r.cantidad,
      gancho: r.gancho,
    }))

    // Si ya existe un certificado para este lote/fecha, se actualiza conservando
    // el mismo consecutivo (CDP-N) en lugar de crear otro.
    const existente = buscarCertificadoPorLote(base.loteSacrificio, base.fecha)
    if (existente) {
      return actualizarCertificado(existente.id, {
        fechaCertificado: existente.fechaCertificado,
        fechaSacrificio: base.fecha,
        cliente: base.cliente,
        lote: base.loteSacrificio,
        totalAnimales: total,
        tipoAnimales: tipo,
        hallazgos,
        imagenes: existente.imagenes,
      })
    }

    const consecutivo = siguienteConsecutivo()
    const contenido = construirContenido({
      consecutivo,
      fechaCertificado: hoy,
      fechaSacrificio: base.fecha,
      cliente: base.cliente,
      lote: base.loteSacrificio,
      totalAnimales: total,
      tipoAnimales: tipo,
      hallazgos,
    })

    // Registra el certificado con su consecutivo en el modulo Certificado Decomiso.
    const creado = agregarCertificado({
      fechaCertificado: hoy,
      fechaSacrificio: base.fecha,
      cliente: base.cliente,
      lote: base.loteSacrificio,
      totalAnimales: total,
      tipoAnimales: tipo,
      hallazgos,
      imagenes: [],
      contenido,
      usuario: usuario?.nombre || usuario?.email || 'DESCONOCIDO',
    })
    return creado
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Pos Mortem Porcino
          </h2>
          <p className="text-slate-500">
            Inspeccion post mortem de bovinos por lote de sacrificio.
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
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <Campo label="Fecha de sacrificio">
              <input
                type="date"
                className={inputClase}
                value={form.fecha}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fecha: e.target.value,
                    cliente: '',
                    loteSacrificio: '',
                  }))
                }
              />
            </Campo>
            <Campo label="Hora llegada">
              <input
                type="time"
                className={inputClase}
                value={form.horaLlegada}
                onChange={(e) => actualizar('horaLlegada', e.target.value)}
              />
            </Campo>
            <Campo label="Hora de sacrificio">
              <input
                type="time"
                className={inputClase}
                value={form.horaSacrificio}
                onChange={(e) => actualizar('horaSacrificio', e.target.value)}
              />
            </Campo>
            <Campo label="Tiempo de reposo">
              <input
                className={`${inputClase} bg-slate-50`}
                value={form.tiempoReposo}
                readOnly
              />
            </Campo>
            <Campo label="Cliente">
              <SelectorBuscable
                opciones={firmadores}
                value={form.cliente}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    cliente: v,
                    loteSacrificio: '',
                  }))
                }
                permitirLibre
                placeholder="Selecciona cliente"
              />
            </Campo>
            <Campo label="Lote de sacrificio">
              <SelectorBuscable
                opciones={lotes}
                value={form.loteSacrificio}
                onChange={elegirLote}
                permitirLibre
                placeholder="Selecciona lote"
              />
            </Campo>
            <Campo label="Granja">
              <input
                className={inputClase}
                value={form.granja}
                onChange={(e) => actualizar('granja', e.target.value)}
              />
            </Campo>
            <Campo label="Origen">
              <input
                className={inputClase}
                value={form.origen}
                onChange={(e) => actualizar('origen', e.target.value)}
              />
            </Campo>
            <Campo label="Organo">
              <SelectorBuscable
                opciones={organos}
                value={form.organo}
                onChange={(v) => actualizar('organo', v)}
                permitirLibre
                placeholder="Selecciona organo"
              />
            </Campo>
            <Campo label="Cantidad">
              <input
                type="number"
                min={0}
                className={inputClase}
                value={form.cantidad}
                onChange={(e) => actualizar('cantidad', e.target.value)}
              />
            </Campo>
            <Campo label="Gancho">
              <input
                className={inputClase}
                value={form.gancho}
                onChange={(e) => actualizar('gancho', e.target.value)}
              />
            </Campo>
            <Campo label="Patologia">
              <SelectorBuscable
                opciones={patologias}
                value={form.patologia}
                onChange={(v) => actualizar('patologia', v)}
                permitirLibre
                placeholder="Selecciona patologia"
              />
            </Campo>
            <Campo label="Dictamen">
              <SelectorBuscable
                opciones={DICTAMENES}
                value={form.dictamen}
                onChange={(v) => actualizar('dictamen', v)}
                permitirLibre
                placeholder="Selecciona dictamen"
              />
            </Campo>
            <Campo label="Observacion">
              <SelectorBuscable
                opciones={OBSERVACIONES_OPC}
                value={form.observacion}
                onChange={(v) => actualizar('observacion', v)}
                permitirLibre
                placeholder="Observacion"
              />
            </Campo>
            <Campo label="Firma">
              <input
                className={inputClase}
                value={form.firma}
                onChange={(e) => actualizar('firma', e.target.value)}
              />
            </Campo>
            <div className="flex items-end">
              <button
                type="button"
                onClick={agregarLinea}
                className="w-full rounded-md border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                + Agregar linea
              </button>
            </div>
          </div>

          {lineas.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Lote</th>
                    <th className="px-3 py-2">Organo</th>
                    <th className="px-3 py-2">Cantidad</th>
                    <th className="px-3 py-2">Gancho</th>
                    <th className="px-3 py-2">Patologia</th>
                    <th className="px-3 py-2">Dictamen</th>
                    <th className="px-3 py-2">Observacion</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineas.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.loteSacrificio}</td>
                      <td className="px-3 py-2">{l.organo}</td>
                      <td className="px-3 py-2">{l.cantidad}</td>
                      <td className="px-3 py-2">{l.gancho}</td>
                      <td className="px-3 py-2">{l.patologia}</td>
                      <td className="px-3 py-2">{l.dictamen}</td>
                      <td className="px-3 py-2">{l.observacion}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => quitarLinea(l.id)}
                          className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false)
                setEditandoGrupo(null)
                setForm(formVacio())
                setLineas([])
                setError('')
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {editandoGrupo ? 'Guardar cambios' : 'Guardar'}
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
                placeholder="Lote, cliente, organo o patologia"
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {seleccionados.size > 0
                ? `${seleccionados.size} seleccionado(s)`
                : `${grupos.length} lote(s)`}
            </span>
            <div className="flex flex-wrap gap-2">
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
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={
                        grupos.length > 0 && seleccionados.size === grupos.length
                      }
                      onChange={alternarTodos}
                    />
                  </th>
                  <th className="px-4 py-3">Consecutivo</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Organos</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grupos.map((g) => (
                  <tr key={g.clave}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={seleccionados.has(g.clave)}
                        onChange={() => alternarSeleccion(g.clave)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      PMP-{consecutivoPorClave.get(g.clave) ?? '?'}
                    </td>
                    <td className="px-4 py-3">{g.fecha}</td>
                    <td className="px-4 py-3">{g.loteSacrificio}</td>
                    <td className="px-4 py-3">{g.cliente}</td>
                    <td className="px-4 py-3">{g.items.length}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => editarGrupo(g.clave)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {grupos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No hay registros. Usa "+ Nuevo" para crear el primero.
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
          descripcion={`Vas a eliminar ${seleccionados.size} lote(s) de pos mortem.`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setMostrarEliminar(false)}
          onConfirmar={eliminarSeleccionados}
        />
      )}

      {certificadoItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Certificado de decomiso
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Se registraron {certificadoItems.length} hallazgo(s) con decomiso.
              ¿Desea generar el certificado de decomiso?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCertificadoItems(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                No
              </button>
              <button
                onClick={() => {
                  const items = certificadoItems
                  setCertificadoItems(null)
                  const creado = generarCertificado(items)
                  if (creado)
                    setAvisoCert(
                      `Certificado ${formatoConsecutivo(
                        creado.consecutivo,
                      )} generado.`,
                    )
                }}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Sí, generar
              </button>
            </div>
          </div>
        </div>
      )}

      {avisoCert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          <span>{avisoCert}</span>
          <button
            onClick={() => setAvisoCert(null)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
