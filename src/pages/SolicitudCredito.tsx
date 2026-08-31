import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevaSolicitudCredito } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { SolicitudCredito } from '../types/trazabilidad'

// --------------------------------------------------------------------------
// Modelo del formulario FOR-FIN-007 (multi-seccion). Todo el detalle se
// guarda en el campo `datos` (JSONB); los campos resumen (cliente, documento,
// monto, etc.) se derivan de aqui para el listado.
// --------------------------------------------------------------------------

interface Accionista {
  nombre: string
  tipoDocumento: string
  numero: string
}
interface Referencia {
  nombre: string
  direccion: string
  ciudad: string
  telefono: string
}

interface FormDatos {
  tipoSolicitud: string
  tipoCredito: string
  tipoPersona: string
  fecha: string
  ciudad: string
  montoSolicitado: string
  plazoSolicitado: string
  // 1. Informacion general
  nombreRazonSocial: string
  nombreRepLegal: string
  fechaNacimiento: string
  tipoIdentificacion: string
  numeroIdentificacion: string
  edad: string
  nacionalidad: string
  direccion: string
  fechaExpedicion: string
  lugarExpedicion: string
  ciudadContacto: string
  telefono: string
  celular: string
  email: string
  // 2. Accionistas
  accionistas: Accionista[]
  // 3. Informacion tributaria
  tipoActividad: string
  codigoCIIU: string
  ciiuPrincipal: string
  ciiuSecundaria: string
  descripcionActividad: string
  codigoICA: string
  icaPrincipal: string
  icaSecundaria: string
  regimen: string
  granContribuyente: string
  granContribResolucion: string
  granContribFecha: string
  autorretenedor: string
  autorretResolucion: string
  autorretFecha: string
  exentoRetencion: string
  exentoResolucion: string
  exentoFecha: string
  retenedorICA: string
  retICAResolucion: string
  retICAFecha: string
  // 4. Facturacion electronica
  emailFE: string
  responsableFE: string
  telefonoFE: string
  // 5. Informacion para pagos
  pagosNombre: string
  pagosCelular: string
  pagosCargo: string
  pagosTelefono: string
  // 6. Referencias
  referenciasComerciales: Referencia[]
  referenciasPersonales: Referencia[]
  // 7. Informacion financiera
  activos: string
  ingresosMensuales: string
  conceptoIngresos: string
  pasivos: string
  costosGastos: string
  patrimonio: string
  otrosIngresos: string
  conceptoOtrosIngresos: string
  // Autorizaciones
  autorizaDatos: boolean
  autorizaCentrales: boolean
  declaraVeracidad: boolean
}

const TIPOS_SOLICITUD = [
  'Contado',
  'Credito',
  'Actualizacion Datos',
  'Ampliacion de Cupo',
]
const TIPOS_CREDITO = [
  'Express - 1 SMMLV - hasta 3 dias',
  'Santacruz - 2 a 10 SMMLV - hasta 8 dias',
]
const TIPOS_PERSONA = ['Persona Natural', 'Persona Juridica']
const TIPOS_DOC = ['CC', 'CE', 'NIT', 'TI']
const TIPOS_ACTIVIDAD = ['Comercial', 'Servicios', 'Industrial']
const REGIMENES = [
  'Responsable de IVA',
  'No Responsable de IVA',
  'Regimen Simple de Tributacion',
]
const SI_NO = ['Si', 'No']
const ESTADOS = ['Pendiente', 'Aprobado', 'Rechazado']

const refVacia = (): Referencia => ({
  nombre: '',
  direccion: '',
  ciudad: '',
  telefono: '',
})

function hoy(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10)
}

const datosVacio = (): FormDatos => ({
  tipoSolicitud: 'Credito',
  tipoCredito: '',
  tipoPersona: 'Persona Natural',
  fecha: hoy(),
  ciudad: '',
  montoSolicitado: '',
  plazoSolicitado: '',
  nombreRazonSocial: '',
  nombreRepLegal: '',
  fechaNacimiento: '',
  tipoIdentificacion: 'CC',
  numeroIdentificacion: '',
  edad: '',
  nacionalidad: '',
  direccion: '',
  fechaExpedicion: '',
  lugarExpedicion: '',
  ciudadContacto: '',
  telefono: '',
  celular: '',
  email: '',
  accionistas: [],
  tipoActividad: '',
  codigoCIIU: '',
  ciiuPrincipal: '',
  ciiuSecundaria: '',
  descripcionActividad: '',
  codigoICA: '',
  icaPrincipal: '',
  icaSecundaria: '',
  regimen: '',
  granContribuyente: '',
  granContribResolucion: '',
  granContribFecha: '',
  autorretenedor: '',
  autorretResolucion: '',
  autorretFecha: '',
  exentoRetencion: '',
  exentoResolucion: '',
  exentoFecha: '',
  retenedorICA: '',
  retICAResolucion: '',
  retICAFecha: '',
  emailFE: '',
  responsableFE: '',
  telefonoFE: '',
  pagosNombre: '',
  pagosCelular: '',
  pagosCargo: '',
  pagosTelefono: '',
  referenciasComerciales: [refVacia()],
  referenciasPersonales: [refVacia()],
  activos: '',
  ingresosMensuales: '',
  conceptoIngresos: '',
  pasivos: '',
  costosGastos: '',
  patrimonio: '',
  otrosIngresos: '',
  conceptoOtrosIngresos: '',
  autorizaDatos: false,
  autorizaCentrales: false,
  declaraVeracidad: false,
})

function fmtFecha(valor?: string): string {
  if (!valor) return '-'
  const [a, m, d] = valor.slice(0, 10).split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

function fmtMonto(valor?: number): string {
  if (valor == null) return '-'
  return valor.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function colorEstado(estado?: string): string {
  switch (estado) {
    case 'Aprobado':
      return 'bg-green-100 text-green-700'
    case 'Rechazado':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

const inputClase =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function SolicitudCredito() {
  const [registros, setRegistros] = useState<SolicitudCredito[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [datos, setDatos] = useState<FormDatos>(datosVacio)
  const [estado, setEstado] = useState('Pendiente')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [aEliminar, setAEliminar] = useState<SolicitudCredito | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setRegistros(await api.getSolicitudesCredito())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar las solicitudes',
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(
    () => datos.nombreRazonSocial.trim() !== '',
    [datos],
  )

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return registros.filter((r) => {
      if (filtroEstado && (r.estado ?? '') !== filtroEstado) return false
      if (!t) return true
      return (
        r.cliente.toLowerCase().includes(t) ||
        (r.documento ?? '').toLowerCase().includes(t) ||
        (r.telefono ?? '').toLowerCase().includes(t) ||
        (r.consecutivo ?? '').toLowerCase().includes(t)
      )
    })
  }, [registros, busqueda, filtroEstado])

  const kpis = useMemo(() => {
    let pendientes = 0
    let aprobados = 0
    let montoAprobado = 0
    registros.forEach((r) => {
      if (r.estado === 'Aprobado') {
        aprobados += 1
        montoAprobado += r.monto ?? 0
      } else if (r.estado !== 'Rechazado') {
        pendientes += 1
      }
    })
    return { total: registros.length, pendientes, aprobados, montoAprobado }
  }, [registros])

  function set<K extends keyof FormDatos>(campo: K, valor: FormDatos[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
  }

  // Helpers para arrays (accionistas / referencias)
  function setAccionista(i: number, campo: keyof Accionista, valor: string) {
    setDatos((prev) => {
      const arr = prev.accionistas.slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, accionistas: arr }
    })
  }
  function addAccionista() {
    setDatos((prev) => ({
      ...prev,
      accionistas: [
        ...prev.accionistas,
        { nombre: '', tipoDocumento: 'CC', numero: '' },
      ],
    }))
  }
  function delAccionista(i: number) {
    setDatos((prev) => ({
      ...prev,
      accionistas: prev.accionistas.filter((_, j) => j !== i),
    }))
  }

  function setRef(
    lista: 'referenciasComerciales' | 'referenciasPersonales',
    i: number,
    campo: keyof Referencia,
    valor: string,
  ) {
    setDatos((prev) => {
      const arr = prev[lista].slice()
      arr[i] = { ...arr[i], [campo]: valor }
      return { ...prev, [lista]: arr }
    })
  }
  function addRef(lista: 'referenciasComerciales' | 'referenciasPersonales') {
    setDatos((prev) => ({ ...prev, [lista]: [...prev[lista], refVacia()] }))
  }
  function delRef(
    lista: 'referenciasComerciales' | 'referenciasPersonales',
    i: number,
  ) {
    setDatos((prev) => ({
      ...prev,
      [lista]: prev[lista].filter((_, j) => j !== i),
    }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setDatos(datosVacio())
    setEstado('Pendiente')
    setErrorForm(null)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function abrirEdicion(r: SolicitudCredito) {
    setEditandoId(r.id)
    const base = datosVacio()
    const d = (r.datos ?? {}) as Partial<FormDatos>
    setDatos({
      ...base,
      ...d,
      accionistas: d.accionistas ?? base.accionistas,
      referenciasComerciales:
        d.referenciasComerciales ?? base.referenciasComerciales,
      referenciasPersonales:
        d.referenciasPersonales ?? base.referenciasPersonales,
      fecha: r.fecha ?? base.fecha,
      nombreRazonSocial: r.cliente ?? d.nombreRazonSocial ?? '',
      numeroIdentificacion:
        r.documento ?? d.numeroIdentificacion ?? '',
      montoSolicitado:
        r.monto != null ? String(r.monto) : (d.montoSolicitado ?? ''),
      plazoSolicitado: r.plazo ?? d.plazoSolicitado ?? '',
    })
    setEstado(r.estado ?? 'Pendiente')
    setErrorForm(null)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      const montoNum = parseFloat(datos.montoSolicitado.replace(/[.,\s]/g, ''))
      const payload: NuevaSolicitudCredito = {
        fecha: datos.fecha || undefined,
        cliente: datos.nombreRazonSocial.trim(),
        documento: datos.numeroIdentificacion.trim() || undefined,
        telefono:
          datos.telefono.trim() || datos.celular.trim() || undefined,
        direccion: datos.direccion.trim() || undefined,
        monto: Number.isFinite(montoNum) ? montoNum : undefined,
        plazo: datos.plazoSolicitado.trim() || undefined,
        estado,
        observaciones: undefined,
        datos: datos as unknown as Record<string, unknown>,
      }
      if (editandoId) {
        const actualizado = await api.actualizarSolicitudCredito(
          editandoId,
          payload,
        )
        setRegistros((prev) =>
          prev.map((r) => (r.id === editandoId ? actualizado : r)),
        )
      } else {
        const creado = await api.crearSolicitudCredito(payload)
        setRegistros((prev) => [creado, ...prev])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar la solicitud',
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
      await api.eliminarSolicitudCredito(aEliminar.id, password)
      setRegistros((prev) => prev.filter((r) => r.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar la solicitud',
      )
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Solicitud de credito
          </h2>
          <p className="text-slate-500">
            Formato FOR-FIN-007 &mdash; Carnes Santacruz S.A.S.
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

      {!mostrarForm && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi titulo="Solicitudes" valor={kpis.total} />
          <Kpi titulo="Pendientes" valor={kpis.pendientes} />
          <Kpi titulo="Aprobadas" valor={kpis.aprobados} />
          <Kpi titulo="Monto aprobado" valor={fmtMonto(kpis.montoAprobado)} />
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="space-y-6">
          {/* Encabezado del formulario */}
          <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-brand-100 bg-brand-50 px-6 py-4">
              <img
                src="/logo.jpg"
                alt="Carnes Santacruz"
                className="h-12 w-auto rounded"
              />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editandoId ? 'Editar solicitud' : 'Nueva solicitud'} de
                  credito
                </h3>
                <p className="text-xs text-slate-500">
                  FOR-FIN-007 &middot; Version 01
                </p>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <Campo label="Tipo de solicitud">
                <Pills
                  opciones={TIPOS_SOLICITUD}
                  value={datos.tipoSolicitud}
                  onChange={(v) => set('tipoSolicitud', v)}
                />
              </Campo>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Campo label="Tipo de credito solicitado">
                  <Pills
                    opciones={TIPOS_CREDITO}
                    value={datos.tipoCredito}
                    onChange={(v) => set('tipoCredito', v)}
                  />
                </Campo>
                <Campo label="Tipo de persona">
                  <Pills
                    opciones={TIPOS_PERSONA}
                    value={datos.tipoPersona}
                    onChange={(v) => set('tipoPersona', v)}
                  />
                </Campo>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Campo label="Fecha">
                  <input
                    type="date"
                    value={datos.fecha}
                    onChange={(e) => set('fecha', e.target.value)}
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Ciudad">
                  <input
                    value={datos.ciudad}
                    onChange={(e) => set('ciudad', e.target.value)}
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Monto solicitado">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={datos.montoSolicitado}
                    onChange={(e) => set('montoSolicitado', e.target.value)}
                    placeholder="0"
                    data-no-upper
                    className={inputClase}
                  />
                </Campo>
                <Campo label="Plazo solicitado">
                  <input
                    value={datos.plazoSolicitado}
                    onChange={(e) => set('plazoSolicitado', e.target.value)}
                    placeholder="Ej: 30 dias"
                    className={inputClase}
                  />
                </Campo>
              </div>
            </div>
          </div>

          {/* 1. Informacion general */}
          <Seccion numero={1} titulo="Informacion general">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo label="Nombre completo o razon social *">
                <input
                  value={datos.nombreRazonSocial}
                  onChange={(e) => set('nombreRazonSocial', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Nombre representante legal">
                <input
                  value={datos.nombreRepLegal}
                  onChange={(e) => set('nombreRepLegal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Fecha de nacimiento">
                <input
                  type="date"
                  value={datos.fechaNacimiento}
                  onChange={(e) => set('fechaNacimiento', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Tipo de identificacion">
                <select
                  value={datos.tipoIdentificacion}
                  onChange={(e) => set('tipoIdentificacion', e.target.value)}
                  className={inputClase}
                >
                  {TIPOS_DOC.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Numero de identificacion">
                <input
                  value={datos.numeroIdentificacion}
                  onChange={(e) => set('numeroIdentificacion', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Edad">
                <input
                  type="number"
                  min="0"
                  value={datos.edad}
                  onChange={(e) => set('edad', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Nacionalidad">
                <input
                  value={datos.nacionalidad}
                  onChange={(e) => set('nacionalidad', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Direccion" className="md:col-span-2">
                <input
                  value={datos.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Fecha expedicion CC">
                <input
                  type="date"
                  value={datos.fechaExpedicion}
                  onChange={(e) => set('fechaExpedicion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Lugar de expedicion CC">
                <input
                  value={datos.lugarExpedicion}
                  onChange={(e) => set('lugarExpedicion', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Ciudad">
                <input
                  value={datos.ciudadContacto}
                  onChange={(e) => set('ciudadContacto', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono">
                <input
                  value={datos.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Celular">
                <input
                  value={datos.celular}
                  onChange={(e) => set('celular', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="E-mail">
              <input
                type="email"
                value={datos.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClase}
              />
            </Campo>
          </Seccion>

          {/* 2. Accionistas */}
          <Seccion
            numero={2}
            titulo="Accionistas o asociados (mas del 5% de participacion)"
          >
            <div className="space-y-3">
              {datos.accionistas.length === 0 && (
                <p className="text-sm text-slate-400">
                  Sin accionistas registrados.
                </p>
              )}
              {datos.accionistas.map((a, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_140px_1fr_auto]"
                >
                  <input
                    value={a.nombre}
                    onChange={(e) => setAccionista(i, 'nombre', e.target.value)}
                    placeholder="Nombre y/o razon social"
                    className={inputClase}
                  />
                  <select
                    value={a.tipoDocumento}
                    onChange={(e) =>
                      setAccionista(i, 'tipoDocumento', e.target.value)
                    }
                    className={inputClase}
                  >
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={a.numero}
                    onChange={(e) => setAccionista(i, 'numero', e.target.value)}
                    placeholder="Numero"
                    data-no-upper
                    className={inputClase}
                  />
                  <button
                    type="button"
                    onClick={() => delAccionista(i)}
                    className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAccionista}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                + Agregar accionista
              </button>
            </div>
          </Seccion>

          {/* 3. Informacion tributaria */}
          <Seccion numero={3} titulo="Informacion tributaria">
            <Campo label="Tipo de actividad">
              <Pills
                opciones={TIPOS_ACTIVIDAD}
                value={datos.tipoActividad}
                onChange={(v) => set('tipoActividad', v)}
              />
            </Campo>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Codigo CIIU">
                <input
                  value={datos.codigoCIIU}
                  onChange={(e) => set('codigoCIIU', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad principal (CIIU)">
                <input
                  value={datos.ciiuPrincipal}
                  onChange={(e) => set('ciiuPrincipal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad secundaria (CIIU)">
                <input
                  value={datos.ciiuSecundaria}
                  onChange={(e) => set('ciiuSecundaria', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Descripcion detallada de la actividad">
              <textarea
                value={datos.descripcionActividad}
                onChange={(e) => set('descripcionActividad', e.target.value)}
                rows={2}
                className={inputClase}
              />
            </Campo>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Codigo ICA">
                <input
                  value={datos.codigoICA}
                  onChange={(e) => set('codigoICA', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad principal (ICA)">
                <input
                  value={datos.icaPrincipal}
                  onChange={(e) => set('icaPrincipal', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Actividad secundaria (ICA)">
                <input
                  value={datos.icaSecundaria}
                  onChange={(e) => set('icaSecundaria', e.target.value)}
                  className={inputClase}
                />
              </Campo>
            </div>
            <Campo label="Regimen al que pertenece">
              <Pills
                opciones={REGIMENES}
                value={datos.regimen}
                onChange={(v) => set('regimen', v)}
              />
            </Campo>
            <div className="space-y-3">
              <FilaTributaria
                label="Es gran contribuyente?"
                valor={datos.granContribuyente}
                onValor={(v) => set('granContribuyente', v)}
                resolucion={datos.granContribResolucion}
                onResolucion={(v) => set('granContribResolucion', v)}
                fecha={datos.granContribFecha}
                onFecha={(v) => set('granContribFecha', v)}
              />
              <FilaTributaria
                label="Es autorretenedor?"
                valor={datos.autorretenedor}
                onValor={(v) => set('autorretenedor', v)}
                resolucion={datos.autorretResolucion}
                onResolucion={(v) => set('autorretResolucion', v)}
                fecha={datos.autorretFecha}
                onFecha={(v) => set('autorretFecha', v)}
              />
              <FilaTributaria
                label="Esta exento de retencion en la fuente?"
                valor={datos.exentoRetencion}
                onValor={(v) => set('exentoRetencion', v)}
                resolucion={datos.exentoResolucion}
                onResolucion={(v) => set('exentoResolucion', v)}
                fecha={datos.exentoFecha}
                onFecha={(v) => set('exentoFecha', v)}
              />
              <FilaTributaria
                label="Es retenedor de ICA?"
                valor={datos.retenedorICA}
                onValor={(v) => set('retenedorICA', v)}
                resolucion={datos.retICAResolucion}
                onResolucion={(v) => set('retICAResolucion', v)}
                fecha={datos.retICAFecha}
                onFecha={(v) => set('retICAFecha', v)}
              />
            </div>
          </Seccion>

          {/* 4. Facturacion electronica */}
          <Seccion numero={4} titulo="Informacion para facturacion electronica">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="E-mail para factura electronica">
                <input
                  type="email"
                  value={datos.emailFE}
                  onChange={(e) => set('emailFE', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Responsable de facturacion">
                <input
                  value={datos.responsableFE}
                  onChange={(e) => set('responsableFE', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono de contacto">
                <input
                  value={datos.telefonoFE}
                  onChange={(e) => set('telefonoFE', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 5. Informacion para pagos */}
          <Seccion numero={5} titulo="Informacion para pagos">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Campo label="Persona encargada de pagos">
                <input
                  value={datos.pagosNombre}
                  onChange={(e) => set('pagosNombre', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Cargo">
                <input
                  value={datos.pagosCargo}
                  onChange={(e) => set('pagosCargo', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Celular">
                <input
                  value={datos.pagosCelular}
                  onChange={(e) => set('pagosCelular', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Telefono / Ext.">
                <input
                  value={datos.pagosTelefono}
                  onChange={(e) => set('pagosTelefono', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* 6. Referencias */}
          <Seccion numero={6} titulo="Referencias">
            <ListaReferencias
              titulo="Comerciales"
              refs={datos.referenciasComerciales}
              onSet={(i, c, v) => setRef('referenciasComerciales', i, c, v)}
              onAdd={() => addRef('referenciasComerciales')}
              onDel={(i) => delRef('referenciasComerciales', i)}
            />
            <ListaReferencias
              titulo="Personales"
              refs={datos.referenciasPersonales}
              onSet={(i, c, v) => setRef('referenciasPersonales', i, c, v)}
              onAdd={() => addRef('referenciasPersonales')}
              onDel={(i) => delRef('referenciasPersonales', i)}
            />
          </Seccion>

          {/* 7. Informacion financiera */}
          <Seccion numero={7} titulo="Informacion financiera">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Campo label="Activos $">
                <input
                  type="number"
                  min="0"
                  value={datos.activos}
                  onChange={(e) => set('activos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Ingresos mensuales $">
                <input
                  type="number"
                  min="0"
                  value={datos.ingresosMensuales}
                  onChange={(e) => set('ingresosMensuales', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Concepto de ingresos mensuales">
                <input
                  value={datos.conceptoIngresos}
                  onChange={(e) => set('conceptoIngresos', e.target.value)}
                  className={inputClase}
                />
              </Campo>
              <Campo label="Pasivos $">
                <input
                  type="number"
                  min="0"
                  value={datos.pasivos}
                  onChange={(e) => set('pasivos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Costos y gastos mensuales $">
                <input
                  type="number"
                  min="0"
                  value={datos.costosGastos}
                  onChange={(e) => set('costosGastos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Patrimonio $">
                <input
                  type="number"
                  min="0"
                  value={datos.patrimonio}
                  onChange={(e) => set('patrimonio', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo label="Otros ingresos mensuales $">
                <input
                  type="number"
                  min="0"
                  value={datos.otrosIngresos}
                  onChange={(e) => set('otrosIngresos', e.target.value)}
                  data-no-upper
                  className={inputClase}
                />
              </Campo>
              <Campo
                label="Concepto de otros ingresos"
                className="md:col-span-2"
              >
                <input
                  value={datos.conceptoOtrosIngresos}
                  onChange={(e) =>
                    set('conceptoOtrosIngresos', e.target.value)
                  }
                  className={inputClase}
                />
              </Campo>
            </div>
          </Seccion>

          {/* Autorizaciones */}
          <Seccion numero={8} titulo="Autorizaciones y declaraciones">
            <div className="space-y-3">
              <Check
                checked={datos.autorizaDatos}
                onChange={(v) => set('autorizaDatos', v)}
                texto="Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012."
              />
              <Check
                checked={datos.autorizaCentrales}
                onChange={(v) => set('autorizaCentrales', v)}
                texto="Autorizo consultar, reportar y compartir mi informacion en las centrales de riesgo (Ley 1266 de 2008)."
              />
              <Check
                checked={datos.declaraVeracidad}
                onChange={(v) => set('declaraVeracidad', v)}
                texto="Declaro que la informacion suministrada es veraz, completa y verificable."
              />
            </div>
          </Seccion>

          {/* Estado (uso interno) + acciones */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <Campo label="Estado de la solicitud">
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={inputClase}
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="ml-auto flex items-center gap-3">
                {errorForm && (
                  <span className="text-sm text-red-600">{errorForm}</span>
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
                  className="rounded-md bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardando
                    ? 'Guardando...'
                    : editandoId
                      ? 'Guardar cambios'
                      : 'Crear solicitud'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!mostrarForm && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, documento o consecutivo..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-md"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-medium">Consecutivo</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="px-4 py-3 font-medium">Telefono</th>
                  <th className="px-4 py-3 font-medium text-right">Monto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-brand-700">
                      {r.consecutivo ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtFecha(r.fecha)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.cliente}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.documento ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.telefono ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {fmtMonto(r.monto)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${colorEstado(
                          r.estado,
                        )}`}
                      >
                        {r.estado ?? 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => abrirEdicion(r)}
                          className="text-brand-600 hover:underline"
                        >
                          Ver / Editar
                        </button>
                        <button
                          onClick={() => {
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
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      {cargando
                        ? 'Cargando solicitudes...'
                        : error
                          ? `Error: ${error}`
                          : busqueda || filtroEstado
                            ? 'Sin resultados para la busqueda.'
                            : 'Sin solicitudes registradas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar solicitud"
          descripcion={`Vas a eliminar la solicitud de "${aEliminar.cliente}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}
    </div>
  )
}

// --------------------------- Subcomponentes ---------------------------

function Seccion({
  numero,
  titulo,
  children,
}: {
  numero: number
  titulo: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {numero}
        </span>
        <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </section>
  )
}

function Campo({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function Pills({
  opciones,
  value,
  onChange,
}: {
  opciones: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => {
        const activo = value === op
        return (
          <button
            key={op}
            type="button"
            onClick={() => onChange(activo ? '' : op)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              activo
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600'
            }`}
          >
            {op}
          </button>
        )
      })}
    </div>
  )
}

function FilaTributaria({
  label,
  valor,
  onValor,
  resolucion,
  onResolucion,
  fecha,
  onFecha,
}: {
  label: string
  valor: string
  onValor: (v: string) => void
  resolucion: string
  onResolucion: (v: string) => void
  fecha: string
  onFecha: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto_1fr_1fr]">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex gap-2">
        {SI_NO.map((op) => {
          const activo = valor === op
          return (
            <button
              key={op}
              type="button"
              onClick={() => onValor(activo ? '' : op)}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition ${
                activo
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-400'
              }`}
            >
              {op}
            </button>
          )
        })}
      </div>
      <input
        value={resolucion}
        onChange={(e) => onResolucion(e.target.value)}
        placeholder="Resolucion No."
        data-no-upper
        className={inputClase}
      />
      <input
        type="date"
        value={fecha}
        onChange={(e) => onFecha(e.target.value)}
        className={inputClase}
      />
    </div>
  )
}

function ListaReferencias({
  titulo,
  refs,
  onSet,
  onAdd,
  onDel,
}: {
  titulo: string
  refs: Referencia[]
  onSet: (i: number, campo: keyof Referencia, valor: string) => void
  onAdd: () => void
  onDel: (i: number) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      {refs.map((r, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
        >
          <input
            value={r.nombre}
            onChange={(e) => onSet(i, 'nombre', e.target.value)}
            placeholder="Nombre"
            className={inputClase}
          />
          <input
            value={r.direccion}
            onChange={(e) => onSet(i, 'direccion', e.target.value)}
            placeholder="Direccion"
            className={inputClase}
          />
          <input
            value={r.ciudad}
            onChange={(e) => onSet(i, 'ciudad', e.target.value)}
            placeholder="Ciudad"
            className={inputClase}
          />
          <input
            value={r.telefono}
            onChange={(e) => onSet(i, 'telefono', e.target.value)}
            placeholder="Telefono"
            data-no-upper
            className={inputClase}
          />
          <button
            type="button"
            onClick={() => onDel(i)}
            className="rounded-md border border-slate-300 px-3 text-sm text-red-600 hover:bg-red-50"
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        + Agregar referencia {titulo.toLowerCase()}
      </button>
    </div>
  )
}

function Check({
  checked,
  onChange,
  texto,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  texto: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-slate-600">{texto}</span>
    </label>
  )
}

function Kpi({ titulo, valor }: { titulo: string; valor: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900">{valor}</p>
    </div>
  )
}
