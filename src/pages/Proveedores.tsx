import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type NuevoProveedor } from '../services/api'
import { ModalEliminar } from '../components/ModalEliminar'
import type { Proveedor } from '../types/trazabilidad'

const formVacio = (): NuevoProveedor => ({
  nombre: '',
  nit: '',
  contacto: '',
  telefono: '',
  email: '',
  direccion: '',
  activo: true,
})

export function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoProveedor>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const [aEliminar, setAEliminar] = useState<Proveedor | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setProveedores(await api.getProveedores())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar proveedores',
      )
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
      (!form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)),
    [form],
  )

  const proveedoresFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return proveedores
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(t) ||
        (p.nit ?? '').toLowerCase().includes(t) ||
        (p.contacto ?? '').toLowerCase().includes(t),
    )
  }, [proveedores, busqueda])

  function actualizar<K extends keyof NuevoProveedor>(
    campo: K,
    valor: NuevoProveedor[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(proveedor: Proveedor) {
    setEditandoId(proveedor.id)
    setForm({
      nombre: proveedor.nombre,
      nit: proveedor.nit ?? '',
      contacto: proveedor.contacto ?? '',
      telefono: proveedor.telefono ?? '',
      email: proveedor.email ?? '',
      direccion: proveedor.direccion ?? '',
      activo: proveedor.activo,
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
      const datos: NuevoProveedor = {
        nombre: form.nombre.trim(),
        nit: form.nit?.trim() || undefined,
        contacto: form.contacto?.trim() || undefined,
        telefono: form.telefono?.trim() || undefined,
        email: form.email?.trim() || undefined,
        direccion: form.direccion?.trim() || undefined,
        activo: form.activo,
      }
      if (editandoId) {
        const actualizado = await api.actualizarProveedor(editandoId, datos)
        setProveedores((prev) =>
          prev
            .map((p) => (p.id === editandoId ? actualizado : p))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      } else {
        const creado = await api.crearProveedor(datos)
        setProveedores((prev) =>
          [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        )
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el proveedor',
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
      await api.eliminarProveedor(aEliminar.id, password)
      setProveedores((prev) => prev.filter((p) => p.id !== aEliminar.id))
      setAEliminar(null)
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar el proveedor',
      )
    } finally {
      setEliminando(false)
    }
  }

  const activos = proveedores.filter((p) => p.activo).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Proveedores</h2>
          <p className="text-slate-500">Catalogo de proveedores</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total proveedores" value={proveedores.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="Inactivos" value={proveedores.length - activos} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h3>

          <Campo label="Nombre / Razon social">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              placeholder="Distribuidora XYZ S.A.S"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="NIT / Documento">
            <input
              value={form.nit ?? ''}
              onChange={(e) => actualizar('nit', e.target.value)}
              placeholder="900123456-7"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Contacto">
            <input
              value={form.contacto ?? ''}
              onChange={(e) => actualizar('contacto', e.target.value)}
              placeholder="Nombre del contacto"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Telefono">
            <input
              value={form.telefono ?? ''}
              onChange={(e) => actualizar('telefono', e.target.value)}
              placeholder="300 000 0000"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Email">
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => actualizar('email', e.target.value)}
              placeholder="contacto@proveedor.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Direccion">
            <input
              value={form.direccion ?? ''}
              onChange={(e) => actualizar('direccion', e.target.value)}
              placeholder="Calle 123 # 45-67"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
              Proveedor activo
            </label>
          </Campo>

          <div className="flex items-center justify-end gap-3 md:col-span-2">
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
                  : 'Crear proveedor'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, NIT o contacto..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-sm"
        />
      </div>

      <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-500 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">NIT</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proveedoresFiltrados.map((proveedor) => (
              <tr key={proveedor.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {proveedor.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {proveedor.nit ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {proveedor.contacto ?? '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {proveedor.telefono ?? '-'}
                </td>
                <td className="px-4 py-3">
                  {proveedor.activo ? (
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
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(proveedor)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        setErrorEliminar(null)
                        setAEliminar(proveedor)
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {proveedoresFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando proveedores...'
                    : error
                      ? `Error: ${error}`
                      : busqueda
                        ? `Sin resultados para "${busqueda}".`
                        : 'Sin proveedores registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {aEliminar && (
        <ModalEliminar
          titulo="Eliminar proveedor"
          descripcion={`Vas a eliminar el proveedor "${aEliminar.nombre}".`}
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
