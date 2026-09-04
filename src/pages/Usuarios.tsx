import { useEffect, useMemo, useState, Fragment, type ReactNode } from 'react'
import {
  api,
  type ActualizarUsuario,
  type NuevoUsuario,
} from '../services/api'
import {
  ROLES,
  EMPRESAS_USUARIO,
  ROLES_POR_EMPRESA,
  type EmpresaUsuario,
  type RolUsuario,
  type Usuario,
  type PuntoVenta,
} from '../types/trazabilidad'
import { useAuth } from '../store/AuthContext'
import {
  carnesNavGroups,
  agropecuariaNavGroups,
  type NavGroup,
} from '../components/Layout'

// Menu de modulos por empresa (para asignar accesos al crear/editar usuarios).
const NAV_POR_EMPRESA: Record<EmpresaUsuario, NavGroup[]> = {
  'CARNES SANTACRUZ': carnesNavGroups,
  'AGROPECUARIA SANTACRUZ': agropecuariaNavGroups,
  'INVERSIONES SERRANO MILLAN': [],
}

// Grupos de modulos seleccionables (se excluye el Dashboard/home end:true).
function gruposDeModulos(empresa?: EmpresaUsuario): NavGroup[] {
  if (!empresa) return []
  return (NAV_POR_EMPRESA[empresa] ?? [])
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.end) }))
    .filter((g) => g.items.length > 0)
}

// Todas las rutas de modulos seleccionables de una empresa.
function todosLosModulos(empresa?: EmpresaUsuario): string[] {
  return gruposDeModulos(empresa).flatMap((g) => g.items.map((it) => it.to))
}

const rolEstilos: Record<RolUsuario, string> = {
  Administrador: 'bg-purple-100 text-purple-800',
  Calidad: 'bg-green-100 text-green-800',
  'Auxiliar de calidad PDV': 'bg-blue-100 text-blue-800',
  'Auxiliar de calidad Planta': 'bg-teal-100 text-teal-800',
  'Medico Veterinario Bovino': 'bg-amber-100 text-amber-800',
  'Medico Veterinario Porcino': 'bg-pink-100 text-pink-800',
  Consultor: 'bg-slate-200 text-slate-700',
}

const formVacio = (): NuevoUsuario => ({
  nombre: '',
  apellido: '',
  email: '@sigtraz.com',
  rol: 'Administrador',
  empresa: undefined,
  cargo: '',
  activo: true,
  password: '',
  puntosVenta: [],
  modulos: [],
})

export function Usuarios() {
  const { usuario: usuarioActual } = useAuth()
  const soloLectura = usuarioActual?.rol === 'Consultor'

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [puntosVenta, setPuntosVenta] = useState<PuntoVenta[]>([])
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
      const [us, pdv] = await Promise.all([
        api.getUsuarios(),
        api.getPuntosVenta(),
      ])
      setUsuarios(us)
      setPuntosVenta(pdv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const rolesDisponibles = useMemo<RolUsuario[]>(
    () => (form.empresa ? ROLES_POR_EMPRESA[form.empresa] : ROLES),
    [form.empresa],
  )

  const formValido = useMemo(
    () =>
      form.nombre.trim() !== '' &&
      (form.apellido ?? '').trim() !== '' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      !!form.empresa &&
      ROLES.includes(form.rol) &&
      rolesDisponibles.includes(form.rol) &&
      // password requerida al crear; opcional al editar (min 6 si se escribe)
      (editandoId
        ? !form.password || form.password.length >= 6
        : (form.password ?? '').length >= 6),
    [form, editandoId, rolesDisponibles],
  )

  function actualizar<K extends keyof NuevoUsuario>(
    campo: K,
    valor: NuevoUsuario[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al cambiar de empresa se ajusta el rol si el actual no aplica a la nueva.
  function cambiarEmpresa(empresa: EmpresaUsuario) {
    setForm((prev) => {
      const roles = ROLES_POR_EMPRESA[empresa]
      const rol = roles.includes(prev.rol) ? prev.rol : roles[0]
      const puntosVenta =
        empresa === 'CARNES SANTACRUZ' ? (prev.puntosVenta ?? []) : []
      // Por defecto se otorgan todos los modulos de la empresa (se pueden quitar).
      const modulos =
        rol === 'Administrador' ? [] : todosLosModulos(empresa)
      return { ...prev, empresa, rol, puntosVenta, modulos }
    })
  }

  // Ajusta los modulos por defecto al cambiar de rol dentro de la empresa.
  function cambiarRol(rol: RolUsuario) {
    setForm((prev) => {
      const modulos =
        rol === 'Administrador' ? [] : todosLosModulos(prev.empresa)
      return { ...prev, rol, modulos }
    })
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
      apellido: usuario.apellido ?? '',
      email: usuario.email,
      rol: usuario.rol,
      empresa: usuario.empresa,
      cargo: usuario.cargo ?? '',
      activo: usuario.activo,
      password: '',
      puntosVenta: usuario.puntosVenta ?? [],
      modulos: usuario.modulos ?? [],
    })
    setErrorForm(null)
    setMostrarForm(true)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setEditandoId(null)
  }

  function alternarPuntoVenta(id: number) {
    setForm((prev) => {
      const actuales = prev.puntosVenta ?? []
      const nuevos = actuales.includes(id)
        ? actuales.filter((n) => n !== id)
        : [...actuales, id]
      return { ...prev, puntosVenta: nuevos }
    })
  }

  function alternarModulo(ruta: string) {
    setForm((prev) => {
      const actuales = prev.modulos ?? []
      const nuevos = actuales.includes(ruta)
        ? actuales.filter((r) => r !== ruta)
        : [...actuales, ruta]
      return { ...prev, modulos: nuevos }
    })
  }

  // Marca o desmarca todos los modulos de un grupo.
  function alternarGrupoModulos(rutas: string[], marcar: boolean) {
    setForm((prev) => {
      const actuales = new Set(prev.modulos ?? [])
      if (marcar) rutas.forEach((r) => actuales.add(r))
      else rutas.forEach((r) => actuales.delete(r))
      return { ...prev, modulos: Array.from(actuales) }
    })
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido || guardando) return
    setGuardando(true)
    setErrorForm(null)
    try {
      const datos: ActualizarUsuario = {
        nombre: form.nombre.trim(),
        apellido: (form.apellido ?? '').trim(),
        email: form.email.trim(),
        rol: form.rol,
        empresa: form.empresa,
        cargo: (form.cargo ?? '').trim(),
        activo: form.activo,
        password: form.password?.trim() || undefined,
        // Solo Carnes Santacruz asigna puntos de venta; el Administrador ve todos.
        puntosVenta:
          form.empresa === 'CARNES SANTACRUZ' && form.rol !== 'Administrador'
            ? (form.puntosVenta ?? [])
            : [],
        // El Administrador ve todos los modulos; el resto solo los asignados.
        modulos:
          form.empresa && form.rol !== 'Administrador'
            ? (form.modulos ?? [])
            : [],
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

  const nombrePdv = useMemo(
    () => new Map(puntosVenta.map((p) => [Number(p.id), p.pdv])),
    [puntosVenta],
  )

  // Agrupa usuarios por empresa manteniendo el orden definido y deja al final
  // los que no tienen empresa asignada.
  const usuariosAgrupados = useMemo(() => {
    const orden: Array<EmpresaUsuario | 'SIN EMPRESA'> = [
      ...EMPRESAS_USUARIO,
      'SIN EMPRESA',
    ]
    return orden
      .map((empresa) => ({
        empresa,
        usuarios: usuarios.filter(
          (u) => (u.empresa ?? 'SIN EMPRESA') === empresa,
        ),
      }))
      .filter((g) => g.usuarios.length > 0)
  }, [usuarios])

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Usuarios</h2>
          <p className="text-slate-500">Gestion de usuarios y roles</p>
        </div>
        {!soloLectura && (
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo
          </button>
        )}
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

          <Campo label="Empresa">
            <select
              value={form.empresa ?? ''}
              onChange={(e) =>
                cambiarEmpresa(e.target.value as EmpresaUsuario)
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="" disabled>
                Selecciona una empresa
              </option>
              {EMPRESAS_USUARIO.map((empresa) => (
                <option key={empresa} value={empresa}>
                  {empresa}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Rol">
            <select
              value={form.rol}
              onChange={(e) => cambiarRol(e.target.value as RolUsuario)}
              disabled={!form.empresa}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {rolesDisponibles.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Nombre">
            <input
              value={form.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Apellido">
            <input
              value={form.apellido ?? ''}
              onChange={(e) => actualizar('apellido', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Cargo">
            <input
              value={form.cargo ?? ''}
              onChange={(e) => actualizar('cargo', e.target.value)}
              placeholder="Ej: Medico Veterinario"
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

          <div className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Puntos de venta asignados
            </span>
            {form.empresa !== 'CARNES SANTACRUZ' ? (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Los puntos de venta solo aplican a Carnes Santacruz.
              </p>
            ) : form.rol === 'Administrador' ? (
              <p className="rounded-md bg-purple-50 px-3 py-2 text-sm text-purple-700">
                Los administradores ven todos los puntos de venta.
              </p>
            ) : puntosVenta.length === 0 ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                No hay puntos de venta creados todavia.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-2 md:grid-cols-3">
                {puntosVenta.map((p) => {
                  const marcado = (form.puntosVenta ?? []).includes(Number(p.id))
                  return (
                    <label
                      key={p.id}
                      className="inline-flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternarPuntoVenta(Number(p.id))}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {p.pdv}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Modulos permitidos
            </span>
            {!form.empresa ? (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Selecciona una empresa para asignar modulos.
              </p>
            ) : form.rol === 'Administrador' ? (
              <p className="rounded-md bg-purple-50 px-3 py-2 text-sm text-purple-700">
                Los administradores ven todos los modulos.
              </p>
            ) : gruposDeModulos(form.empresa).length === 0 ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Esta empresa no tiene modulos configurados.
              </p>
            ) : (
              <div className="space-y-4 rounded-md border border-slate-200 p-3">
                {gruposDeModulos(form.empresa).map((grupo) => {
                  const rutas = grupo.items.map((it) => it.to)
                  const seleccionados = rutas.filter((r) =>
                    (form.modulos ?? []).includes(r),
                  ).length
                  const todos = seleccionados === rutas.length
                  return (
                    <div key={grupo.titulo}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {grupo.titulo}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            alternarGrupoModulos(rutas, !todos)
                          }
                          className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          {todos ? 'Quitar todos' : 'Marcar todos'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {grupo.items.map((item) => (
                          <label
                            key={item.to}
                            className="inline-flex items-center gap-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={(form.modulos ?? []).includes(item.to)}
                              onChange={() => alternarModulo(item.to)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            {item.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

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
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Puntos de venta</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              {!soloLectura && (
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuariosAgrupados.map((grupo) => (
              <Fragment key={grupo.empresa}>
                <tr className="bg-slate-100">
                  <td
                    colSpan={soloLectura ? 6 : 7}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {grupo.empresa} ({grupo.usuarios.length})
                  </td>
                </tr>
                {grupo.usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {[usuario.nombre, usuario.apellido].filter(Boolean).join(' ')}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {usuario.empresa ?? (
                    <span className="text-xs italic text-slate-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rolEstilos[usuario.rol]}`}
                  >
                    {usuario.rol}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {usuario.rol === 'Administrador' ? (
                    <span className="text-xs italic text-slate-400">Todos</span>
                  ) : (usuario.puntosVenta ?? []).length === 0 ? (
                    <span className="text-xs italic text-amber-600">
                      Sin asignar
                    </span>
                  ) : (
                    <span className="text-xs">
                      {(usuario.puntosVenta ?? [])
                        .map((id) => nombrePdv.get(Number(id)) ?? id)
                        .join(', ')}
                    </span>
                  )}
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
                {!soloLectura && (
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
                )}
              </tr>
                ))}
              </Fragment>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
