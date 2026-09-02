import { useEffect, useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { agregarMovimiento } from './movimientosStore'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import { cuartosFriosSeed } from './datosCatalogos'
import { useCatalogo } from './catalogosStore'

const STORAGE_KEY = 'agro_curva_canales_porcino'
const ANTEMORTEM_KEY = 'agro_antemortem_porcino'

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

interface Medicion {
  id: string
  caliente: string
  hora: string
  canal: string
  tcCanal: string
  tcCuarto: string
  hp: string
  verificado: string
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
  mediciones: Medicion[]
  // El lote solo sale de la lista de disponibles cuando se finaliza.
  finalizado?: boolean
}

const medicionVacia = (verificado = ''): Medicion => ({
  id: crypto.randomUUID(),
  caliente: 'CALIENTE',
  hora: new Date().toTimeString().slice(0, 5),
  canal: '',
  tcCanal: '',
  tcCuarto: '',
  hp: '',
  verificado,
})

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
  mediciones: [medicionVacia(verificado)],
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
  return `CTP-${max + 1}`
}

export function CurvaTemperaturaCanalesPorcino() {
  const cuartosFrios = useCatalogo('Cuartos fríos', cuartosFriosSeed)
  const [ordenes, setOrdenes] = useState<Orden[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
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

  function actualizar<K extends keyof Omit<Orden, 'id' | 'mediciones'>>(
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

  function actualizarMedicion<K extends keyof Omit<Medicion, 'id'>>(
    idMedicion: string,
    campo: K,
    valor: Medicion[K],
  ) {
    setForm((prev) => ({
      ...prev,
      mediciones: prev.mediciones.map((m) =>
        m.id === idMedicion ? { ...m, [campo]: valor } : m,
      ),
    }))
  }

  function agregarMedicion() {
    setForm((prev) => ({
      ...prev,
      mediciones: [...prev.mediciones, medicionVacia(firmaUsuario)],
    }))
  }

  function quitarMedicion(idMedicion: string) {
    setForm((prev) => ({
      ...prev,
      mediciones:
        prev.mediciones.length > 1
          ? prev.mediciones.filter((m) => m.id !== idMedicion)
          : prev.mediciones,
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
    const { id: _id, ...datos } = o
    setForm({
      ...formVacio(firmaUsuario),
      ...datos,
      mediciones: datos.mediciones?.length ? datos.mediciones : [medicionVacia(firmaUsuario)],
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
    for (let i = 0; i < form.mediciones.length; i++) {
      const m = form.mediciones[i]
      const n = i + 1
      if (!m.caliente.trim()) return `Medición #${n}: ingresa Caliente.`
      if (!m.hora.trim()) return `Medición #${n}: ingresa la hora.`
      if (!m.canal.trim()) return `Medición #${n}: ingresa el canal.`
      if (!m.tcCanal.trim()) return `Medición #${n}: ingresa T°C canal.`
      if (!m.tcCuarto.trim()) return `Medición #${n}: ingresa T°C cuarto.`
      if (!(i === 0 && !editandoId) && !m.hp.trim())
        return `Medición #${n}: ingresa HP.`
      if (!m.verificado.trim()) return `Medición #${n}: ingresa Verificado por.`
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
      modulo: 'CURVA CANALES PORCINO',
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
            Curva de temperatura de canales Porcino
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-12">
            <label className="block lg:col-span-1">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Consecutivo <span className="text-rose-500">*</span>
              </span>
              <input readOnly data-no-upper className={inputRO} value={form.consecutivo} />
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Fecha <span className="text-rose-500">*</span>
              </span>
              <input type="date" readOnly data-no-upper className={inputRO} value={form.fecha} />
            </label>
            <label className="block lg:col-span-3">
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
            <label className="block lg:col-span-1">
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
            <label className="block lg:col-span-3">
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
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Cuarto frío <span className="text-rose-500">*</span>
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
                Mediciones ({form.mediciones.length})
              </h3>
              <button
                type="button"
                onClick={agregarMedicion}
                className="rounded-md border border-brand-500 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                + Medición
              </button>
            </div>
            <div className="space-y-3">
              {form.mediciones.map((m, i) => (
                <div
                  key={m.id}
                  className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[auto_7rem_auto_4.5rem_5.5rem_5.5rem_5.5rem_1fr_auto] md:items-end"
                >
                  <div className="flex h-9 items-center text-sm font-semibold text-slate-400">
                    #{i + 1}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Estado <span className="text-rose-500">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        actualizarMedicion(
                          m.id,
                          'caliente',
                          m.caliente === 'FRIO' ? 'CALIENTE' : 'FRIO',
                        )
                      }
                      className={`h-9 w-full rounded-md text-sm font-bold text-white shadow-sm transition ${
                        m.caliente === 'FRIO'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {m.caliente === 'FRIO' ? 'FRIO' : 'CALIENTE'}
                    </button>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Hora <span className="text-rose-500">*</span>
                    </span>
                    <input
                      type="time"
                      readOnly
                      data-no-upper
                      className={inputRO}
                      value={m.hora}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Canal <span className="text-rose-500">*</span>
                    </span>
                    <input
                      inputMode="numeric"
                      data-no-upper
                      className={inputBase}
                      value={m.canal}
                      onChange={(e) =>
                        actualizarMedicion(m.id, 'canal', e.target.value.replace(/[^0-9]/g, ''))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      T°C canal <span className="text-rose-500">*</span>
                    </span>
                    <input
                      inputMode="decimal"
                      data-no-upper
                      className={inputBase}
                      value={m.tcCanal}
                      onChange={(e) =>
                        actualizarMedicion(m.id, 'tcCanal', soloDecimal(e.target.value))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      T°C cuarto <span className="text-rose-500">*</span>
                    </span>
                    <input
                      inputMode="decimal"
                      data-no-upper
                      className={inputBase}
                      value={m.tcCuarto}
                      onChange={(e) =>
                        actualizarMedicion(m.id, 'tcCuarto', soloDecimal(e.target.value))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      HP <span className="text-rose-500">*</span>
                    </span>
                    <input
                      inputMode="decimal"
                      data-no-upper
                      disabled={i === 0 && !editandoId}
                      title={i === 0 && !editandoId ? 'Se habilita despues de agregar una medicion' : undefined}
                      className={`${inputBase} disabled:cursor-not-allowed disabled:bg-slate-100`}
                      value={m.hp}
                      onChange={(e) =>
                        actualizarMedicion(m.id, 'hp', soloDecimal(e.target.value))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Verificado por <span className="text-rose-500">*</span>
                    </span>
                    <input
                      className={inputBase}
                      value={m.verificado}
                      onChange={(e) => actualizarMedicion(m.id, 'verificado', e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => quitarMedicion(m.id)}
                    disabled={form.mediciones.length === 1}
                    title="Quitar medición"
                    className="h-9 shrink-0 rounded-md border border-rose-300 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
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
                  <th className="px-4 py-3">Mediciones</th>
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
                          {o.mediciones?.length || 0}
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
