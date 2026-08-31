import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoCliente } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import { CargaMasivaClientes } from '../components/CargaMasivaClientes'
import type { Cliente, PuntoVenta } from '../types/trazabilidad'

interface FormCliente {
  nit: string
  nombre: string
  apellidos: string
  direccion: string
  referencia: string
  barrio: string
  ciudad: string
  telefono: string
  correo: string
  puntoVentaId: string
  activo: boolean
  horeca: boolean
  diasDespacho: string
  lat: string
  lng: string
}

const formVacio = (): FormCliente => ({
  nit: '',
  nombre: '',
  apellidos: '',
  direccion: '',
  referencia: '',
  barrio: '',
  ciudad: '',
  telefono: '',
  correo: '',
  puntoVentaId: '',
  activo: true,
  horeca: false,
  diasDespacho: '',
  lat: '',
  lng: '',
})

const inputClase =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormCliente>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  const [mostrarImportar, setMostrarImportar] = useState(false)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const [datos, pdv] = await Promise.all([
        api.getClientes(),
        api.getPuntosVenta(),
      ])
      setClientes(datos)
      setPuntosVenta(pdv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const formValido = useMemo(
    () =>
      form.nombre.trim() !== '' &&
      (!form.correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)),
    [form],
  )

  const clientesFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return clientes
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(t) ||
        (c.apellidos ?? '').toLowerCase().includes(t) ||
        (c.nit ?? '').toLowerCase().includes(t) ||
        (c.ciudad ?? '').toLowerCase().includes(t) ||
        (c.telefono ?? '').toLowerCase().includes(t),
    )
  }, [clientes, busqueda])

  function actualizar<K extends keyof FormCliente>(
    campo: K,
    valor: FormCliente[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(c: Cliente) {
    setEditandoId(c.id)
    setForm({
      nit: c.nit ?? '',
      nombre: c.nombre,
      apellidos: c.apellidos ?? '',
      direccion: c.direccion ?? '',
      referencia: c.referencia ?? '',
      barrio: c.barrio ?? '',
      ciudad: c.ciudad ?? '',
      telefono: c.telefono ?? '',
      correo: c.correo ?? '',
      puntoVentaId: c.puntoVentaId != null ? String(c.puntoVentaId) : '',
      activo: c.activo,
      horeca: c.horeca,
      diasDespacho: c.diasDespacho ?? '',
      lat: c.lat != null ? String(c.lat) : '',
      lng: c.lng != null ? String(c.lng) : '',
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
      const lat = form.lat.trim() ? Number(form.lat) : undefined
      const lng = form.lng.trim() ? Number(form.lng) : undefined
      const datos: NuevoCliente = {
        nit: form.nit.trim() || undefined,
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        referencia: form.referencia.trim() || undefined,
        barrio: form.barrio.trim() || undefined,
        ciudad: form.ciudad.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        correo: form.correo.trim() || undefined,
        puntoVentaId: form.puntoVentaId ? Number(form.puntoVentaId) : undefined,
        activo: form.activo,
        horeca: form.horeca,
        diasDespacho: form.diasDespacho.trim() || undefined,
        lat: typeof lat === 'number' && !Number.isNaN(lat) ? lat : undefined,
        lng: typeof lng === 'number' && !Number.isNaN(lng) ? lng : undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarCliente(editandoId, datos)
        setClientes((prev) =>
          prev
            .map((c) => (c.id === editandoId ? actualizado : c))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creado = await api.crearCliente(datos)
        setClientes((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el cliente',
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
      await api.eliminarCliente(aEliminar.id, password)
      setClientes((prev) => prev.filter((c) => c.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el cliente',
      )
    } finally {
      setEliminando(false)
    }
  }

  const activos = clientes.filter((c) => c.activo).length
  const horeca = clientes.filter((c) => c.horeca).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
          <p className="text-slate-500">
            Catalogo de clientes ·{' '}
            <span className="font-semibold text-slate-700">
              {clientes.length} registrado(s)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMostrarImportar(true)}
            className="rounded-md border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Importar
          </button>
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total clientes" value={clientes.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="Inactivos" value={clientes.length - activos} />
        <Kpi label="HORECA" value={horeca} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-3">
            {editandoId ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>

          <Campo label="NIT / Cedula">
            <input
              value={form.nit}
              onChange={(e) => actualizar('nit', e.target.value)}
              placeholder="900123456-7"
              className={inputClase}
            />
          </Campo>

          <Campo label="Nombre *">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              placeholder="Nombre o razon social"
              className={inputClase}
            />
          </Campo>

          <Campo label="Apellidos">
            <input
              value={form.apellidos}
              onChange={(e) => actualizar('apellidos', e.target.value)}
              placeholder="Apellidos"
              className={inputClase}
            />
          </Campo>

          <Campo label="Direccion">
            <input
              value={form.direccion}
              onChange={(e) => actualizar('direccion', e.target.value)}
              placeholder="Calle 123 # 45-67"
              className={inputClase}
            />
          </Campo>

          <Campo label="Referencia">
            <input
              value={form.referencia}
              onChange={(e) => actualizar('referencia', e.target.value)}
              placeholder="Cerca de..."
              className={inputClase}
            />
          </Campo>

          <Campo label="Barrio">
            <input
              value={form.barrio}
              onChange={(e) => actualizar('barrio', e.target.value)}
              className={inputClase}
            />
          </Campo>

          <Campo label="Ciudad">
            <input
              value={form.ciudad}
              onChange={(e) => actualizar('ciudad', e.target.value)}
              className={inputClase}
            />
          </Campo>

          <Campo label="Telefono">
            <input
              value={form.telefono}
              onChange={(e) => actualizar('telefono', e.target.value)}
              placeholder="300 000 0000"
              className={inputClase}
            />
          </Campo>

          <Campo label="Correo">
            <input
              type="email"
              value={form.correo}
              onChange={(e) => actualizar('correo', e.target.value)}
              placeholder="cliente@correo.com"
              className={inputClase}
            />
          </Campo>

          <Campo label="Punto de venta">
            <select
              value={form.puntoVentaId}
              onChange={(e) => actualizar('puntoVentaId', e.target.value)}
              className={inputClase}
            >
              <option value="">Selecciona un punto de venta</option>
              {puntosVenta.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pdv}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Dias de despacho">
            <input
              value={form.diasDespacho}
              onChange={(e) => actualizar('diasDespacho', e.target.value)}
              placeholder="Ej. Lunes, Miercoles, Viernes"
              className={inputClase}
            />
          </Campo>

          <Campo label="Latitud">
            <input
              value={form.lat}
              onChange={(e) => actualizar('lat', e.target.value)}
              placeholder="4.60971"
              className={inputClase}
            />
          </Campo>

          <Campo label="Longitud">
            <input
              value={form.lng}
              onChange={(e) => actualizar('lng', e.target.value)}
              placeholder="-74.08175"
              className={inputClase}
            />
          </Campo>

          <Campo label="Estado">
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => actualizar('activo', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Cliente activo
            </label>
          </Campo>

          <Campo label="HORECA">
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.horeca}
                onChange={(e) => actualizar('horeca', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Hotel / Restaurante / Cafeteria
            </label>
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
                  : 'Crear cliente'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, NIT, ciudad o telefono..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-sm"
        />
      </div>

      <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">NIT/Cedula</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Apellidos</th>
              <th className="px-4 py-3 font-medium">Direccion</th>
              <th className="px-4 py-3 font-medium">Referencia</th>
              <th className="px-4 py-3 font-medium">Barrio</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Punto venta</th>
              <th className="px-4 py-3 font-medium">Activo</th>
              <th className="px-4 py-3 font-medium">HORECA</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientesFiltrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{c.nit ?? '-'}</td>
                <td className="px-4 py-3 font-medium uppercase text-slate-800">
                  {c.nombre}
                </td>
                <td className="px-4 py-3 uppercase text-slate-600">
                  {c.apellidos ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.direccion ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.referencia ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.barrio ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{c.ciudad ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.telefono ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.correo ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.puntoVenta ?? '-'}
                </td>
                <td className="px-4 py-3">
                  {c.activo ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.horeca ? (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Si
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(c)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(c)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando clientes...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin clientes registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar cliente"
          descripcion={`Vas a eliminar el cliente "${aEliminar.nombre}".`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setAEliminar(null)}
          onConfirmar={eliminar}
        />
      )}

      {mostrarImportar && (
        <CargaMasivaClientes
          onCerrar={() => setMostrarImportar(false)}
          onCargado={cargar}
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
