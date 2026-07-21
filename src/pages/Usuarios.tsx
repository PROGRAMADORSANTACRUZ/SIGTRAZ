import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  api,
  type ActualizarUsuario,
  type NuevoUsuario,
} from '../services/api'
import { ROLES, type RolUsuario, type Usuario } from '../types/trazabilidad'

const rolEstilos: Record<RolUsuario, string> = {
  Administrador: 'bg-purple-100 text-purple-800',
  Operador: 'bg-blue-100 text-blue-800',
  Consulta: 'bg-slate-200 text-slate-700',
}

const formVacio = (): NuevoUsuario => ({
  nombre: '',
  email: '',
  rol: 'Operador',
  activo: true,
  password: '',
})

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<NuevoUsuario>(formVacio)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setUsuarios(await api.getUsuarios())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
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
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      ROLES.includes(form.rol) &&
      // password requerida al crear; opcional al editar (min 6 si se escribe)
      (editandoId
        ? !form.password || form.password.length >= 6
        : (form.password ?? '').length >= 6),
    [form, editandoId],
  )

  function actualizar<K extends keyof NuevoUsuario>(
    campo: K,
    valor: NuevoUsuario[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirNuevo() {
    setEditandoId(null)
    setForm(formVacio())
    setErrorForm(null)
    setMostrarForm(true)
  }

  function abrirEdicion(usuario: Usuario) {
    setEditandoId(usuario.id)
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      password: '',
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
      const datos: ActualizarUsuario = {
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: form.rol,
        activo: form.activo,
        password: form.password?.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await api.actualizarUsuario(editandoId, datos)
        setUsuarios((prev) =>
          prev.map((u) => (u.id === editandoId ? actualizado : u)),
        )
      } else {
        const creado = await api.crearUsuario(datos)
        setUsuarios((prev) => [...prev, creado])
      }
      cerrarForm()
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo guardar el usuario',
      )
    } finally {
      setGuardando(false)
    }
  }

  async function alternarEstado(usuario: Usuario) {
    try {
      const actualizado = await api.cambiarEstadoUsuario(
        usuario.id,
        !usuario.activo,
      )
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? actualizado : u)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar estado')
    }
  }

  const activos = usuarios.filter((u) => u.activo).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
          <p className="text-slate-500">Gestion de usuarios y roles</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nuevo usuario
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Kpi label="Total usuarios" value={usuarios.length} />
        <Kpi label="Activos" value={activos} />
        <Kpi label="Inactivos" value={usuarios.length - activos} />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold text-slate-800 md:col-span-2">
            {editandoId ? 'Editar usuario' : 'Nuevo usuario'}
          </h3>

          <Campo label="Nombre">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => actualizar('email', e.target.value)}
              placeholder="usuario@sigtraz.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Rol">
            <select
              value={form.rol}
              onChange={(e) => actualizar('rol', e.target.value as RolUsuario)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Estado">
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => actualizar('activo', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Usuario activo
            </label>
          </Campo>

          <Campo
            label={
              editandoId
                ? 'Nueva contrasena (dejar vacio para no cambiar)'
                : 'Contrasena'
            }
          >
            <input
              type="password"
              value={form.password ?? ''}
              onChange={(e) => actualizar('password', e.target.value)}
              autoComplete="new-password"
              placeholder={editandoId ? 'Sin cambios' : 'Minimo 6 caracteres'}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
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
              {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {usuario.nombre}
                </td>
                <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rolEstilos[usuario.rol]}`}
                  >
                    {usuario.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {usuario.activo ? (
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
                      onClick={() => abrirEdicion(usuario)}
                      className="text-brand-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarEstado(usuario)}
                      className="text-slate-500 hover:underline"
                    >
                      {usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando usuarios...'
                    : error
                      ? `Error: ${error}`
                      : 'Sin usuarios registrados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

function Campo({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}
