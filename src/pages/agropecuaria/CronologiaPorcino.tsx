import { useEffect, useMemo, useState } from 'react'
import { Campo, inputClase } from '../../components/ui'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import { useAuth } from '../../store/AuthContext'
import { agregarMovimiento } from './movimientosStore'
import { generarCronologiaDocx } from './cronologiaDocx'
import { documentoCronologia } from './cronologiaDoc'

const STORAGE_KEY = 'agro_cronologia_porcino'
const ANTEMORTEM_KEY = 'agro_antemortem_porcino'

// Tabla de cronologia dentaria bovina: gancho -> dientes / edad.
const TABLA_GANCHOS = [
  { gancho: '1', dientes: 2, edadMes: '18-22', edadAnio: '1.5-2.0' },
  { gancho: '2', dientes: 4, edadMes: '24-27', edadAnio: '2-2.5' },
  { gancho: '3', dientes: 6, edadMes: '30-38', edadAnio: '2.5-3' },
  { gancho: '4', dientes: 8, edadMes: '48', edadAnio: '>4' },
]

interface RegistroCronologia {
  id: string
  fecha: string
  firmador: string
  numeroGuia: string
  loteSacrificio: string
  gancho: string
  dientes: string
  edadMes: string
  edadAnio: string
  observaciones: string
}

const formVacio = (): Omit<RegistroCronologia, 'id'> => ({
  fecha: '',
  firmador: '',
  numeroGuia: '',
  loteSacrificio: '',
  gancho: '',
  dientes: '',
  edadMes: '',
  edadAnio: '',
  observaciones: '',
})

const ETIQUETAS: Record<keyof Omit<RegistroCronologia, 'id'>, string> = {
  fecha: 'Fecha',
  firmador: 'Firmador',
  numeroGuia: 'Numero de guia',
  loteSacrificio: 'Lote de sacrificio',
  gancho: 'Gancho',
  dientes: 'N dientes',
  edadMes: 'Edad mes',
  edadAnio: 'Edad aprox año',
  observaciones: 'Observaciones',
}

export function CronologiaPorcino() {
  const [registros, setRegistros] = useState<RegistroCronologia[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(formVacio)
  const [lineas, setLineas] = useState<RegistroCronologia[]>([])
  const [editandoGrupo, setEditandoGrupo] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [error, setError] = useState('')
  // Por defecto se muestra el mes actual; Desde/Hasta vacios para ver todo el mes.
  const [filtroMes, setFiltroMes] = useState(() =>
    new Date().toLocaleDateString('en-CA').slice(0, 7),
  )
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const { usuario } = useAuth()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
  }, [registros])

  // Una fila por lote/dia. Cada grupo agrupa todos sus ganchos.
  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const map = new Map<string, RegistroCronologia[]>()
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
      items: [...items].sort((a, b) => Number(a.gancho) - Number(b.gancho)),
    }))
    if (texto) {
      lista = lista.filter(
        (g) =>
          [g.fecha, g.loteSacrificio].some((v) =>
            (v || '').toLowerCase().includes(texto),
          ) ||
          g.items.some((i) =>
            [i.gancho, i.observaciones].some((v) =>
              (v || '').toLowerCase().includes(texto),
            ),
          ),
      )
    }
    return lista
  }, [registros, filtroMes, filtroDesde, filtroHasta, busqueda])

  // Consecutivo visual CRP-N por orden de creacion del lote (fecha||lote).
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
  const firmadores = useMemo(() => {
    try {
      const ante: { fechaIngreso?: string; firmador?: string }[] = JSON.parse(
        localStorage.getItem(ANTEMORTEM_KEY) || '[]',
      )
      return [
        ...new Set(
          ante
            .filter((r) => (r.fechaIngreso || '') === form.fecha)
            .map((r) => (r.firmador || '').trim())
            .filter((v) => v !== ''),
        ),
      ]
    } catch {
      return []
    }
  }, [form.fecha, mostrarForm])

  // Lotes de Ante Mortem del firmador seleccionado, solo de ese dia. Se excluyen
  // los lotes que ya tienen documento creado (salvo el que se esta editando).
  const lotes = useMemo(() => {
    try {
      const ante: {
        fechaIngreso?: string
        firmador?: string
        loteSacrificio?: string
      }[] = JSON.parse(localStorage.getItem(ANTEMORTEM_KEY) || '[]')
      const usados = new Set(
        registros
          .filter((r) => (r.fecha || '') === form.fecha)
          .map((r) => (r.loteSacrificio || '').trim())
          .filter(Boolean),
      )
      const actual = (form.loteSacrificio || '').trim()
      return [
        ...new Set(
          ante
            .filter(
              (r) =>
                (r.fechaIngreso || '') === form.fecha &&
                (!form.firmador ||
                  (r.firmador || '').trim() === form.firmador),
            )
            .map((r) => (r.loteSacrificio || '').trim())
            .filter((v) => v !== '' && (v === actual || !usados.has(v))),
        ),
      ]
    } catch {
      return []
    }
  }, [form.fecha, form.firmador, form.loteSacrificio, mostrarForm, registros])

  // Guias de Ante Mortem del dia (y firmador si esta elegido). Cada guia trae su lote.
  const guiasAnte = useMemo(() => {
    const map = new Map<string, { lote: string; firmador: string }>()
    try {
      const ante: {
        fechaIngreso?: string
        firmador?: string
        loteSacrificio?: string
        numeroGuia?: string
      }[] = JSON.parse(localStorage.getItem(ANTEMORTEM_KEY) || '[]')
      ante
        .filter(
          (r) =>
            (r.fechaIngreso || '') === form.fecha &&
            (!form.firmador || (r.firmador || '').trim() === form.firmador),
        )
        .forEach((r) => {
          const g = (r.numeroGuia || '').trim()
          if (g && !map.has(g))
            map.set(g, {
              lote: (r.loteSacrificio || '').trim(),
              firmador: (r.firmador || '').trim(),
            })
        })
    } catch {
      /* sin datos */
    }
    return map
  }, [form.fecha, form.firmador, mostrarForm])
  const guias = useMemo(() => [...guiasAnte.keys()], [guiasAnte])

  // Al elegir una guia trae automaticamente su lote (y firmador si falta).
  function elegirGuia(g: string) {
    const info = guiasAnte.get(g)
    setForm((prev) => ({
      ...prev,
      numeroGuia: g,
      loteSacrificio: info ? info.lote : prev.loteSacrificio,
      firmador: prev.firmador || (info ? info.firmador : prev.firmador),
      gancho: prev.gancho.trim()
        ? prev.gancho
        : siguienteGanchoGlobal(prev.fecha),
    }))
  }

  function actualizar<K extends keyof Omit<RegistroCronologia, 'id'>>(
    campo: K,
    valor: Omit<RegistroCronologia, 'id'>[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir N dientes autocompleta edad.
  function elegirDientes(d: string) {
    const fila = TABLA_GANCHOS.find((f) => String(f.dientes) === d)
    setForm((prev) => ({
      ...prev,
      dientes: d,
      edadMes: fila ? fila.edadMes : '',
      edadAnio: fila ? fila.edadAnio : '',
    }))
  }

  function camposFaltantes() {
    const faltan: string[] = []
    if (!form.fecha.trim()) faltan.push(ETIQUETAS.fecha)
    if (!form.loteSacrificio.trim()) faltan.push(ETIQUETAS.loteSacrificio)
    if (!form.gancho.trim()) faltan.push(ETIQUETAS.gancho)
    if (!form.dientes.trim()) faltan.push(ETIQUETAS.dientes)
    return faltan
  }

  // Un gancho no se puede repetir en el mismo lote/dia.
  function ganchoRepetido(gancho: string, fecha: string, lote: string) {
    const g = gancho.trim()
    if (!g) return false
    const enLineas = lineas.some((l) => l.gancho.trim() === g)
    const enRegistros = registros.some(
      (r) =>
        r.fecha === fecha &&
        r.loteSacrificio === lote &&
        r.gancho.trim() === g &&
        `${r.fecha}||${r.loteSacrificio}` !== editandoGrupo,
    )
    return enLineas || enRegistros
  }

  // El gancho es un consecutivo continuo del dia, sin importar el lote.
  function siguienteGanchoGlobal(
    fecha: string,
    lins: RegistroCronologia[] = lineas,
  ) {
    const nums = [...registros.filter((r) => r.fecha === fecha), ...lins]
      .map((r) => Number(r.gancho))
      .filter((n) => Number.isFinite(n))
    const max = nums.length ? Math.max(...nums) : 0
    return String(max + 1)
  }

  // Registra la linea actual abajo y prepara la siguiente conservando
  // fecha y lote, con el gancho consecutivo.
  function agregarLinea() {
    const faltan = camposFaltantes()
    if (faltan.length > 0) {
      setError(`Faltan campos: ${faltan.join(', ')}`)
      return
    }
    if (ganchoRepetido(form.gancho, form.fecha, form.loteSacrificio)) {
      setError(`El gancho ${form.gancho} ya existe para ese lote/dia.`)
      return
    }
    setLineas((prev) => [...prev, { ...form, id: crypto.randomUUID() }])
    const n = Number(form.gancho)
    const siguienteGancho = Number.isFinite(n) && form.gancho.trim() !== ''
      ? String(n + 1)
      : ''
    setForm((prev) => ({
      ...formVacio(),
      fecha: prev.fecha,
      firmador: prev.firmador,
      numeroGuia: prev.numeroGuia,
      loteSacrificio: prev.loteSacrificio,
      gancho: siguienteGancho,
    }))
    setError('')
  }

  function quitarLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id))
  }

  function abrirNuevo() {
    const hoy = new Date().toLocaleDateString('en-CA')
    setForm({
      ...formVacio(),
      fecha: hoy,
      gancho: siguienteGanchoGlobal(hoy, []),
    })
    setLineas([])
    setEditandoGrupo(null)
    setError('')
    setMostrarForm(true)
  }

  // Edita el lote completo: carga todos sus ganchos como lineas.
  function editarGrupo(clave: string) {
    const items = registros.filter(
      (r) => `${r.fecha}||${r.loteSacrificio}` === clave,
    )
    if (items.length === 0) return
    const ordenados = [...items].sort(
      (a, b) => Number(a.gancho) - Number(b.gancho),
    )
    setLineas(ordenados)
    const ultimo = ordenados[ordenados.length - 1]
    const n = Number(ultimo.gancho)
    const siguiente =
      Number.isFinite(n) && ultimo.gancho.trim() !== '' ? String(n + 1) : ''
    setForm({
      ...formVacio(),
      fecha: ordenados[0].fecha,
      firmador: ordenados[0].firmador || '',
      numeroGuia: ordenados[0].numeroGuia || '',
      loteSacrificio: ordenados[0].loteSacrificio,
      gancho: siguiente,
    })
    setEditandoGrupo(clave)
    setError('')
    setMostrarForm(true)
  }

  function registrarMovimiento(
    accion: 'CREÓ' | 'EDITÓ' | 'ELIMINÓ',
    referencia: string,
    cambios?: { campo: string; antes: string; ahora: string }[],
  ) {
    agregarMovimiento({
      modulo: 'CRONOLOGIA PORCINO',
      accion,
      referencia,
      usuario: usuario?.nombre || usuario?.email || 'DESCONOCIDO',
      cambios: cambios && cambios.length > 0 ? cambios : undefined,
    })
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    // Reune las lineas del lote + la linea actual (si tiene datos).
    const pendientes = [...lineas]
    if (form.dientes.trim()) {
      const faltan = camposFaltantes()
      if (faltan.length > 0) {
        setError(`Faltan campos: ${faltan.join(', ')}`)
        return
      }
      if (ganchoRepetido(form.gancho, form.fecha, form.loteSacrificio)) {
        setError(`El gancho ${form.gancho} ya existe para ese lote/dia.`)
        return
      }
      pendientes.push({ ...form, id: crypto.randomUUID() })
    }
    if (pendientes.length === 0) {
      setError('Agrega al menos una linea.')
      return
    }
    const refLote = pendientes[0].loteSacrificio || 'SIN LOTE'
    const referencia = `${refLote} · ${pendientes.length} GANCHO(S)`

    if (editandoGrupo) {
      // Reemplaza todo el grupo (lote/dia) por las lineas actuales.
      setRegistros((prev) => [
        ...pendientes,
        ...prev.filter(
          (r) => `${r.fecha}||${r.loteSacrificio}` !== editandoGrupo,
        ),
      ])
      registrarMovimiento('EDITÓ', referencia)
    } else {
      setRegistros((prev) => [...pendientes, ...prev])
      registrarMovimiento('CREÓ', referencia)
    }
    setMostrarForm(false)
    setEditandoGrupo(null)
    setForm(formVacio())
    setLineas([])
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
        prev.filter(
          (r) => !claves.has(`${r.fecha}||${r.loteSacrificio}`),
        ),
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

  // Aplana los ganchos de los grupos seleccionados.
  function registrosExportar() {
    const fuente = grupos.filter((g) => seleccionados.has(g.clave))
    return fuente.flatMap((g) =>
      g.items.map((r) => ({
        FECHA: r.fecha,
        'NUMERO DE GUIA': r.numeroGuia,
        'LOTE DE SACRIFICIO': r.loteSacrificio,
        GANCHO: r.gancho,
        'N DIENTES': r.dientes,
        'EDAD MES': r.edadMes,
        'EDAD APROX AÑO': r.edadAnio,
        OBSERVACIONES: r.observaciones,
      })),
    )
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
    win.document.write(documentoCronologia(encabezado, cuerpo, usuario, 'PORCINA'))
    win.document.close()
  }

  async function exportarWord() {
    const gruposSel = grupos.filter((g) => seleccionados.has(g.clave))
    if (gruposSel.length === 0) return
    const data = gruposSel.map((g) => ({
      lote: g.loteSacrificio,
      items: g.items.map((r) => ({
        fecha: r.fecha,
        numeroGuia: r.numeroGuia,
        loteSacrificio: r.loteSacrificio,
        gancho: r.gancho,
        dientes: r.dientes,
        edadMes: r.edadMes,
        edadAnio: r.edadAnio,
        observaciones: r.observaciones,
      })),
    }))
    const blob = await generarCronologiaDocx(data, usuario, 'PORCINA')
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = 'cronologia-porcino.docx'
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Cronologia Porcino
          </h2>
          <p className="text-slate-500">
            Determinacion de edad por cronologia dentaria.
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Campo label="Fecha">
              <input
                type="date"
                data-no-upper
                className={inputClase}
                value={form.fecha}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fecha: e.target.value,
                    firmador: '',
                    numeroGuia: '',
                    loteSacrificio: '',
                  }))
                }
              />
            </Campo>
            <Campo label="Firmador">
              <SelectorBuscable
                opciones={firmadores}
                value={form.firmador}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    firmador: v,
                    numeroGuia: '',
                    loteSacrificio: '',
                  }))
                }
                permitirLibre
                placeholder="Selecciona firmador"
              />
            </Campo>
            <Campo label="Numero de guia">
              <SelectorBuscable
                opciones={guias}
                value={form.numeroGuia}
                onChange={elegirGuia}
                permitirLibre
                placeholder="Selecciona guia"
              />
            </Campo>
            <Campo label="Lote de sacrificio">
              <SelectorBuscable
                opciones={lotes}
                value={form.loteSacrificio}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    loteSacrificio: v,
                    gancho: prev.gancho.trim()
                      ? prev.gancho
                      : siguienteGanchoGlobal(prev.fecha),
                  }))
                }
                permitirLibre
                placeholder="Selecciona lote"
              />
            </Campo>
            <Campo label="Gancho">
              <input
                className={inputClase}
                value={form.gancho}
                onChange={(e) => actualizar('gancho', e.target.value)}
              />
            </Campo>
            <Campo label="N dientes">
              <select
                data-no-upper
                className={inputClase}
                value={form.dientes}
                onChange={(e) => elegirDientes(e.target.value)}
              >
                <option value="">Selecciona</option>
                {TABLA_GANCHOS.map((f) => (
                  <option key={f.dientes} value={f.dientes}>
                    {f.dientes}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Edad mes">
              <input
                readOnly
                data-no-upper
                className={`${inputClase} bg-slate-100`}
                value={form.edadMes}
              />
            </Campo>
            <Campo label="Edad aprox año">
              <input
                readOnly
                data-no-upper
                className={`${inputClase} bg-slate-100`}
                value={form.edadAnio}
              />
            </Campo>
            <Campo label="Observaciones">
              <input
                className={inputClase}
                value={form.observaciones}
                onChange={(e) => actualizar('observaciones', e.target.value)}
              />
            </Campo>
            <div className="flex items-end">
              <button
                type="button"
                onClick={agregarLinea}
                className="rounded-md border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
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
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Lote</th>
                    <th className="px-3 py-2">Gancho</th>
                    <th className="px-3 py-2">N dientes</th>
                    <th className="px-3 py-2">Edad mes</th>
                    <th className="px-3 py-2">Edad aprox año</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineas.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.fecha}</td>
                      <td className="px-3 py-2">{l.loteSacrificio}</td>
                      <td className="px-3 py-2">{l.gancho}</td>
                      <td className="px-3 py-2">{l.dientes}</td>
                      <td className="px-3 py-2">{l.edadMes}</td>
                      <td className="px-3 py-2">{l.edadAnio}</td>
                      <td className="px-3 py-2 text-right">
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
                placeholder="Lote, gancho u observaciones"
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
                onClick={exportarWord}
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Word
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
                  <th className="px-4 py-3">Ganchos</th>
                  <th className="px-4 py-3">Registros</th>
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
                      CRP-{consecutivoPorClave.get(g.clave) ?? '?'}
                    </td>
                    <td className="px-4 py-3">{g.fecha}</td>
                    <td className="px-4 py-3">{g.loteSacrificio}</td>
                    <td className="px-4 py-3">
                      {g.items.map((i) => i.gancho).join(', ')}
                    </td>
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
          descripcion={`Vas a eliminar ${seleccionados.size} lote(s) de cronologia.`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setMostrarEliminar(false)}
          onConfirmar={eliminarSeleccionados}
        />
      )}
    </div>
  )
}
