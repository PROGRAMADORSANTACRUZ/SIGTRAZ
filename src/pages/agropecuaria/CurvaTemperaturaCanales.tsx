import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { agregarMovimiento } from './movimientosStore'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import { cuartosFriosSeed } from './datosCatalogos'
import { useCatalogo } from './catalogosStore'

const STORAGE_KEY = 'agro_curva_canales'
const ANTEMORTEM_KEY = 'agro_antemortem'

interface AnteMortemLite {
  fechaIngreso: string
  propietario: string
  proveedor: string
  firmador: string
  loteSacrificio: string
  numeroGuia: string
}

function cargarAnteMortem(): AnteMortemLite[] {
  try {
    const raw = localStorage.getItem(ANTEMORTEM_KEY)
    if (raw) return JSON.parse(raw) as AnteMortemLite[]
  } catch {
    // sin registros
  }
  return []
}

// Estructura antigua (una fila por medicion). Se conserva para migrar datos.
interface Medicion {
  id: string
  caliente: string
  fecha: string
  hora: string
  canal: string
  tcCanal: string
  tcCuarto: string
  hp: string
  verificado: string
}

// Cada lectura es una toma de temperatura del mismo canal en un momento dado.
interface Lectura {
  id: string
  fecha: string
  hora: string
  tcCanal: string
  tcCuarto: string
  hp: string
}

interface Canal {
  id: string
  numero: string
  verificado: string
  lecturas: Lectura[]
}

interface Orden {
  id: string
  consecutivo: string
  fecha: string
  propietario: string
  proveedor: string
  firmador: string
  lote: string
  cliente: string
  numeroGuia: string
  cuartoFrio: string
  canales: Canal[]
  // Estructura antigua; puede venir en registros guardados previamente.
  mediciones?: Medicion[]
  // El lote solo sale de la lista de disponibles cuando se finaliza.
  finalizado?: boolean
}

const lecturaVacia = (): Lectura => ({
  id: crypto.randomUUID(),
  fecha: new Date().toLocaleDateString('en-CA'),
  hora: new Date().toTimeString().slice(0, 5),
  tcCanal: '',
  tcCuarto: '',
  hp: '',
})

const canalVacio = (verificado = ''): Canal => ({
  id: crypto.randomUUID(),
  numero: '',
  verificado,
  lecturas: [lecturaVacia()],
})

// Convierte registros con la estructura antigua (mediciones) a canales.
function migrarOrden(o: Orden): Orden {
  if (Array.isArray(o.canales) && o.canales.length) return o
  const meds = Array.isArray(o.mediciones) ? o.mediciones : []
  const porNumero = new Map<string, Canal>()
  const canales: Canal[] = []
  for (const m of meds) {
    const clave = (m.canal || '').trim() || `__${canales.length}`
    let c = porNumero.get(clave)
    if (!c) {
      c = {
        id: crypto.randomUUID(),
        numero: m.canal || '',
        verificado: m.verificado || '',
        lecturas: [],
      }
      porNumero.set(clave, c)
      canales.push(c)
    }
    c.lecturas.push({
      id: m.id || crypto.randomUUID(),
      fecha: m.fecha || o.fecha || '',
      hora: m.hora || '',
      tcCanal: m.tcCanal || '',
      tcCuarto: m.tcCuarto || '',
      hp: m.hp || '',
    })
  }
  return { ...o, canales: canales.length ? canales : [canalVacio()] }
}

const formVacio = (verificado = ''): Omit<Orden, 'id'> => ({
  consecutivo: '',
  fecha: '',
  propietario: '',
  proveedor: '',
  firmador: '',
  lote: '',
  cliente: '',
  numeroGuia: '',
  cuartoFrio: '',
  canales: [canalVacio(verificado)],
  finalizado: false,
})

function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || ''
}

// Deja solo numeros y un unico punto decimal (acepta coma y la convierte).
function soloDecimal(v: string): string {
  const limpio = v.replace(',', '.').replace(/[^0-9.]/g, '')
  const i = limpio.indexOf('.')
  return i === -1
    ? limpio
    : limpio.slice(0, i + 1) + limpio.slice(i + 1).replace(/\./g, '')
}

function siguienteConsecutivo(ordenes: Orden[]): string {
  const max = ordenes.reduce((m, o) => {
    const n = parseInt((o.consecutivo || '').replace(/\D/g, ''), 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `CTB-${max + 1}`
}

export function CurvaTemperaturaCanales() {
  const cuartosFrios = useCatalogo('Cuartos fríos', cuartosFriosSeed)
  const [ordenes, setOrdenes] = useState<Orden[]>(() => {
    try {
      const guardadas = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]',
      ) as Orden[]
      return Array.isArray(guardadas) ? guardadas.map(migrarOrden) : []
    } catch {
      return []
    }
  })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(formVacio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [anteMortem, setAnteMortem] = useState<AnteMortemLite[]>(cargarAnteMortem)
  // Por defecto se muestra el mes actual; Desde/Hasta vacios para ver todo el mes.
  const [filtroMes, setFiltroMes] = useState(() =>
    new Date().toLocaleDateString('en-CA').slice(0, 7),
  )
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [eliminarId, setEliminarId] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'Administrador'
  const firmaUsuario =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() ||
    usuario?.email ||
    ''

  const ordenesFiltradas = ordenes.filter((o) => {
    const f = o.fecha // YYYY-MM-DD
    if (filtroMes && !f.startsWith(filtroMes)) return false
    if (filtroDesde && f < filtroDesde) return false
    if (filtroHasta && f > filtroHasta) return false
    const texto = busqueda.trim().toLowerCase()
    if (
      texto &&
      ![o.consecutivo, o.propietario, o.proveedor, o.cliente, o.numeroGuia].some(
        (v) => (v || '').toLowerCase().includes(texto),
      )
    )
      return false
    return true
  })

  // Firmadores registrados en Ante Mortem (la fecha es irrelevante).
  const firmadoresDelDia = Array.from(
    new Set(
      anteMortem
        .map((r) => r.firmador)
        .filter(Boolean),
    ),
  )
  // Lotes del firmador elegido (sin importar la fecha). Solo se excluyen los
  // lotes cuya curva ya fue FINALIZADA (salvo el que se esta editando).
  const lotesDelDia = form.firmador
    ? (() => {
        const usados = new Set(
          ordenes
            .filter((o) => o.finalizado)
            .map((o) => (o.lote || '').trim())
            .filter(Boolean),
        )
        const actual = (form.lote || '').trim()
        return Array.from(
          new Set(
            anteMortem
              .filter((r) => r.firmador === form.firmador)
              .map((r) => (r.loteSacrificio || '').trim())
              .filter((v) => v !== '' && (v === actual || !usados.has(v))),
          ),
        )
      })()
    : []
  const seleccionCompleta = Boolean(form.firmador && form.lote)
  const guiasAsociadas = seleccionCompleta
    ? Array.from(
        new Set(
          anteMortem
            .filter(
              (r) =>
                r.firmador === form.firmador &&
                r.loteSacrificio === form.lote,
            )
            .map((r) => r.numeroGuia)
            .filter(Boolean),
        ),
      )
    : []

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ordenes))
  }, [ordenes])

  function actualizar<K extends keyof Omit<Orden, 'id' | 'canales' | 'mediciones'>>(
    campo: K,
    valor: Omit<Orden, 'id'>[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al elegir el lote se autocompleta la guia asociada en Ante Mortem.
  function elegirLote(v: string) {
    const guias = Array.from(
      new Set(
        anteMortem
          .filter((r) => r.firmador === form.firmador && r.loteSacrificio === v)
          .map((r) => r.numeroGuia)
          .filter(Boolean),
      ),
    )
    setForm((prev) => ({
      ...prev,
      lote: v,
      numeroGuia: guias.length ? guias[0] : '',
    }))
  }

  function actualizarCanal<K extends keyof Omit<Canal, 'id' | 'lecturas'>>(
    idCanal: string,
    campo: K,
    valor: Canal[K],
  ) {
    setForm((prev) => ({
      ...prev,
      canales: prev.canales.map((c) =>
        c.id === idCanal ? { ...c, [campo]: valor } : c,
      ),
    }))
  }

  function actualizarLectura<K extends keyof Omit<Lectura, 'id'>>(
    idCanal: string,
    idLectura: string,
    campo: K,
    valor: Lectura[K],
  ) {
    setForm((prev) => ({
      ...prev,
      canales: prev.canales.map((c) =>
        c.id === idCanal
          ? {
              ...c,
              lecturas: c.lecturas.map((l) =>
                l.id === idLectura ? { ...l, [campo]: valor } : l,
              ),
            }
          : c,
      ),
    }))
  }

  function agregarCanal() {
    setForm((prev) => ({
      ...prev,
      canales: [...prev.canales, canalVacio(firmaUsuario)],
    }))
  }

  function quitarCanal(idCanal: string) {
    setForm((prev) => ({
      ...prev,
      canales:
        prev.canales.length > 1
          ? prev.canales.filter((c) => c.id !== idCanal)
          : prev.canales,
    }))
  }

  function agregarLectura(idCanal: string) {
    setForm((prev) => ({
      ...prev,
      canales: prev.canales.map((c) =>
        c.id === idCanal
          ? { ...c, lecturas: [...c.lecturas, lecturaVacia()] }
          : c,
      ),
    }))
  }

  function quitarLectura(idCanal: string, idLectura: string) {
    setForm((prev) => ({
      ...prev,
      canales: prev.canales.map((c) =>
        c.id === idCanal && c.lecturas.length > 1
          ? { ...c, lecturas: c.lecturas.filter((l) => l.id !== idLectura) }
          : c,
      ),
    }))
  }

  function abrirNuevo() {
    const ahora = new Date()
    setAnteMortem(cargarAnteMortem())
    setError('')
    setForm({
      ...formVacio(firmaUsuario),
      consecutivo: siguienteConsecutivo(ordenes),
      fecha: ahora.toLocaleDateString('en-CA'),
    })
    setEditandoId(null)
    setMostrarForm(true)
  }

  function editar(o: Orden) {
    setAnteMortem(cargarAnteMortem())
    setError('')
    const { id: _id, ...datos } = migrarOrden(o)
    setForm({
      ...formVacio(firmaUsuario),
      ...datos,
      canales: datos.canales?.length ? datos.canales : [canalVacio(firmaUsuario)],
    })
    setEditandoId(o.id)
    setMostrarForm(true)
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    guardarOrden(false)
  }

  // Finaliza la curva: la guarda y saca el lote de la lista de disponibles.
  function finalizar() {
    guardarOrden(true)
  }

  // Todos los datos son obligatorios; devuelve el primer faltante.
  function validar(): string {
    if (!form.firmador.trim()) return 'Selecciona el firmador.'
    if (!form.lote.trim()) return 'Selecciona el lote.'
    if (!form.numeroGuia.trim()) return 'Ingresa el número de guía.'
    if (!form.cuartoFrio.trim()) return 'Selecciona el cuarto frío.'
    for (let i = 0; i < form.canales.length; i++) {
      const c = form.canales[i]
      const n = i + 1
      if (!c.numero.trim()) return `Canal #${n}: ingresa el número de canal.`
      if (!c.verificado.trim()) return `Canal #${n}: ingresa Verificado por.`
      for (let j = 0; j < c.lecturas.length; j++) {
        const l = c.lecturas[j]
        const etq = `Canal ${c.numero || n}, lectura #${j + 1}`
        if (!(l.fecha || '').trim()) return `${etq}: ingresa la fecha.`
        if (!l.hora.trim()) return `${etq}: ingresa la hora.`
        if (!l.tcCanal.trim()) return `${etq}: ingresa T°C canal.`
        if (!l.tcCuarto.trim()) return `${etq}: ingresa T°C cuarto.`
      }
    }
    return ''
  }

  function guardarOrden(finalizado: boolean) {
    const faltante = validar()
    if (faltante) {
      setError(faltante)
      return
    }
    setError('')
    const datos = { ...form, finalizado: finalizado || Boolean(form.finalizado) }
    if (editandoId) {
      setOrdenes((prev) =>
        prev.map((o) => (o.id === editandoId ? { ...datos, id: editandoId } : o)),
      )
      registrar('EDITÓ')
    } else {
      setOrdenes((prev) => [{ ...datos, id: crypto.randomUUID() }, ...prev])
      registrar('CREÓ')
    }
    setMostrarForm(false)
    setEditandoId(null)
    setForm(formVacio())
  }

  async function confirmarEliminar(password: string) {
    if (!eliminarId || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.verificarPassword(password)
      setOrdenes((prev) => prev.filter((o) => o.id !== eliminarId))
      registrar('ELIMINÓ')
      setEliminarId(null)
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  function registrar(accion: 'CREÓ' | 'EDITÓ' | 'ELIMINÓ') {
    agregarMovimiento({
      modulo: 'CURVA CANALES',
      accion,
      referencia: `${form.consecutivo} - ${fechaCorta(form.fecha)}`,
      usuario: usuario?.nombre || usuario?.email || 'DESCONOCIDO',
    })
  }

  const inputBase =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const inputRO =
    'w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none'

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Curva de temperatura de canales Bovino
          </h2>
          <p className="text-slate-500">
            Registro de la curva de temperatura de canales.
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

      {mostrarForm ? (        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-[7rem_7rem_minmax(0,1fr)_7rem_minmax(0,1fr)_8rem]">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Consecutivo <span className="text-rose-500">*</span>
              </span>
              <input readOnly data-no-upper className={inputRO} value={form.consecutivo} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Fecha <span className="text-rose-500">*</span>
              </span>
              <input type="date" readOnly data-no-upper className={inputRO} value={form.fecha} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Firmador <span className="text-rose-500">*</span>
              </span>
              <SelectorBuscable
                opciones={firmadoresDelDia}
                value={form.firmador}
                onChange={(v) => actualizar('firmador', v)}
                placeholder="Selecciona firmador"
                buscarPlaceholder="Buscar firmador..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Lote <span className="text-rose-500">*</span>
              </span>
              <SelectorBuscable
                opciones={lotesDelDia}
                value={form.lote}
                onChange={elegirLote}
                placeholder={
                  form.firmador ? 'Selecciona lote' : 'Elige firmador'
                }
                buscarPlaceholder="Buscar lote..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Número de guía <span className="text-rose-500">*</span>
              </span>
              <SelectorBuscable
                opciones={guiasAsociadas}
                value={form.numeroGuia}
                onChange={(v) => actualizar('numeroGuia', v)}
                permitirLibre
                placeholder={
                  seleccionCompleta ? 'Selecciona guía' : 'Elige lote'
                }
                buscarPlaceholder="Buscar guía..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                C.Frío <span className="text-rose-500">*</span>
              </span>
              <SelectorBuscable
                opciones={cuartosFrios}
                value={form.cuartoFrio}
                onChange={(v) => actualizar('cuartoFrio', v)}
                placeholder="Selecciona cuarto frío"
                buscarPlaceholder="Buscar cuarto frío..."
              />
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Canales ({form.canales.length})
              </h3>
            </div>
            <div className="space-y-4">
              {form.canales.map((c) => (
                <div
                  key={c.id}
                  className="space-y-3 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-white">
                      <span className="text-sm font-bold">Canal</span>
                      <input
                        inputMode="numeric"
                        data-no-upper
                        className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-sm font-bold text-slate-800 focus:outline-none"
                        value={c.numero}
                        onChange={(e) =>
                          actualizarCanal(
                            c.id,
                            'numero',
                            e.target.value.replace(/[^0-9]/g, ''),
                          )
                        }
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      Al escribir el número de canal se crea la 1ª lectura con la
                      fecha y hora actuales.
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarCanal(c.id)}
                      disabled={form.canales.length === 1}
                      title="Quitar canal"
                      className="ml-auto h-9 shrink-0 rounded-md border border-rose-300 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Quitar canal
                    </button>
                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    {c.lecturas.map((l, li) => {
                      const caliente = li === 0
                      const bloqueado = !c.numero.trim()
                      return (
                        <div
                          key={l.id}
                          className="w-44 overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          <div
                            className={`px-2 py-1.5 text-center text-white ${
                              caliente ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                          >
                            <div className="text-xs font-bold">
                              {caliente ? 'CALIENTE' : 'FRÍO'}
                            </div>
                            {esAdmin ? (
                              <div className="mt-1 flex flex-col gap-1">
                                <input
                                  type="date"
                                  data-no-upper
                                  className="rounded px-1 py-0.5 text-[11px] text-slate-700"
                                  value={l.fecha || ''}
                                  onChange={(e) =>
                                    actualizarLectura(c.id, l.id, 'fecha', e.target.value)
                                  }
                                />
                                <input
                                  type="time"
                                  data-no-upper
                                  className="rounded px-1 py-0.5 text-[11px] text-slate-700"
                                  value={l.hora}
                                  onChange={(e) =>
                                    actualizarLectura(c.id, l.id, 'hora', e.target.value)
                                  }
                                />
                              </div>
                            ) : (
                              <div className="text-[11px] font-medium">
                                {`${fechaCorta(l.fecha)} · ${l.hora}`}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2 p-2">
                            <label className="flex items-center gap-2">
                              <span className="w-[4.5rem] shrink-0 text-xs font-medium text-slate-500">
                                T°C canal
                              </span>
                              <input
                                inputMode="decimal"
                                data-no-upper
                                disabled={bloqueado}
                                title={bloqueado ? 'Ingresa el número de canal' : undefined}
                                className={`${inputBase} min-w-0 flex-1 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100`}
                                value={l.tcCanal}
                                onChange={(e) =>
                                  actualizarLectura(c.id, l.id, 'tcCanal', soloDecimal(e.target.value))
                                }
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="w-[4.5rem] shrink-0 text-xs font-medium text-slate-500">
                                T°C cuarto
                              </span>
                              <input
                                inputMode="decimal"
                                data-no-upper
                                disabled={bloqueado}
                                title={bloqueado ? 'Ingresa el número de canal' : undefined}
                                className={`${inputBase} min-w-0 flex-1 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100`}
                                value={l.tcCuarto}
                                onChange={(e) =>
                                  actualizarLectura(c.id, l.id, 'tcCuarto', soloDecimal(e.target.value))
                                }
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="w-[4.5rem] shrink-0 text-xs font-medium text-slate-500">
                                pH
                              </span>
                              <input
                                inputMode="decimal"
                                data-no-upper
                                disabled={bloqueado}
                                title={bloqueado ? 'Ingresa el número de canal' : undefined}
                                className={`${inputBase} min-w-0 flex-1 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100`}
                                value={l.hp}
                                onChange={(e) =>
                                  actualizarLectura(c.id, l.id, 'hp', soloDecimal(e.target.value))
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => quitarLectura(c.id, l.id)}
                              disabled={c.lecturas.length === 1}
                              className="w-full rounded-md border border-rose-200 bg-rose-50 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => agregarLectura(c.id)}
                      className="h-9 self-center rounded-md border border-dashed border-brand-500 px-3 text-sm font-medium text-brand-600 hover:bg-brand-50"
                    >
                      + Lectura
                    </button>
                  </div>
                  <label className="block max-w-xs">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Verificado por <span className="text-rose-500">*</span>
                    </span>
                    <input
                      className={inputBase}
                      value={c.verificado}
                      onChange={(e) => actualizarCanal(c.id, 'verificado', e.target.value)}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarCanal}
                className="rounded-md border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                + Canal
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false)
                setEditandoId(null)
                setError('')
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={finalizar}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Finalizar
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
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
                type="button"
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
                placeholder="Consecutivo, propietario, proveedor o guia"
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Consecutivo</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Propietario</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Firmador</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">N° guía</th>
                  <th className="px-4 py-3">Cuarto frío</th>
                  <th className="px-4 py-3">Canales</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No hay registros para la fecha seleccionada.
                    </td>
                  </tr>
                ) : (
                  ordenesFiltradas.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 font-medium text-slate-700">{o.consecutivo}</td>
                      <td className="px-4 py-3">{fechaCorta(o.fecha)}</td>
                      <td className="px-4 py-3">{o.propietario}</td>
                      <td className="px-4 py-3">{o.proveedor}</td>
                      <td className="px-4 py-3">{o.firmador}</td>
                      <td className="px-4 py-3">{o.cliente}</td>
                      <td className="px-4 py-3">{o.numeroGuia}</td>
                      <td className="px-4 py-3">{o.cuartoFrio}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                          {o.canales?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => editar(o)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setErrorEliminar(null)
                              setEliminarId(o.id)
                            }}
                            className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {eliminarId && (
        <ModalEliminar
          titulo="Eliminar registro"
          descripcion="Vas a eliminar este registro de curva de temperatura."
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setEliminarId(null)}
          onConfirmar={confirmarEliminar}
        />
      )}
    </div>
  )
}
