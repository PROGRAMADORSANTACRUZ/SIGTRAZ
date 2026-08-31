import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { usePuntoVenta } from '../store/PuntoVentaContext'
import { aplicarTema, temaGuardado, type Tema } from '../utils/tema'

interface NavItem {
  to: string
  label: string
  end?: boolean
}
interface NavGroup {
  titulo: string
  items: NavItem[]
}

export type { NavItem, NavGroup }

export const carnesNavGroups: NavGroup[] = [
  {
    titulo: 'General',
    items: [{ to: '/', label: 'Dashboard', end: true }],
  },
  {
    titulo: 'Trazabilidad',
    items: [
      { to: '/entradas', label: 'Entradas' },
      { to: '/acondicionamiento', label: 'Acondicionamiento' },
      { to: '/salida', label: 'Salida' },
      { to: '/inspeccion-vehiculo', label: 'Inspeccion de Vehiculo' },
      { to: '/devolucion', label: 'Devolucion' },
      { to: '/ediciones-log', label: 'Log de ediciones' },
      { to: '/movimientos', label: 'Movimientos' },
      { to: '/productos', label: 'Productos' },
      { to: '/proveedores', label: 'Proveedores' },
      { to: '/clientes', label: 'Clientes' },
      { to: '/fichas-tecnicas', label: 'Fichas tecnicas' },
      { to: '/cuartos-frios', label: 'Cuartos frios' },
      { to: '/colaboradores', label: 'Colaboradores' },
    ],
  },
  {
    titulo: 'Gestion documental',
    items: [
      { to: '/verificacion-poes', label: 'Verificacion de POES' },
      { to: '/verificacion-lyd', label: 'Verificacion LYD' },
      { to: '/higiene-personal', label: 'Higiene Personal' },
      { to: '/monitoreo-agua', label: 'M.C. Agua Potable' },
      { to: '/monitoreo-temperatura', label: 'Monitoreo de Temperatura' },
      { to: '/residuos-solidos', label: 'Residuos Solidos' },
      { to: '/residuos-reciclables', label: 'Residuos Reciclables' },
      { to: '/tipos-suesdr', label: 'Tipos V.POES' },
      { to: '/tipos-lyd', label: 'Tipos LYD' },
      { to: '/puntos-venta', label: 'Puntos de venta' },
      { to: '/personal', label: 'Personal' },
    ],
  },
  {
    titulo: 'Herramientas',
    items: [{ to: '/asistente', label: 'Asistente de IA' }],
  },
]

export const agropecuariaNavGroups: NavGroup[] = [
  {
    titulo: 'General',
    items: [{ to: '/agropecuaria', label: 'Dashboard', end: true }],
  },
  {
    titulo: 'Proceso',
    items: [
      { to: '/agropecuaria/sacrificio', label: 'Ante Mortem Bovino' },
      { to: '/agropecuaria/sacrificio-porcino', label: 'Ante Mortem Porcino' },
      { to: '/agropecuaria/cronologia', label: 'Cronologia' },
      { to: '/agropecuaria/pos-mortem', label: 'Pos Mortem' },
      { to: '/agropecuaria/certificado-decomiso', label: 'Certificado Decomiso' },
      {
        to: '/agropecuaria/curva-canales',
        label: 'Curva de temperatura de canales',
      },
      { to: '/agropecuaria/certificado', label: 'Certificado Calidad' },
    ],
  },
  {
    titulo: 'Movimientos',
    items: [
      { to: '/agropecuaria/informes', label: 'Informes' },
      { to: '/agropecuaria/datos', label: 'Datos' },
      { to: '/agropecuaria/clientes', label: 'Clientes' },
      { to: '/agropecuaria/sucursales', label: 'Sucursales' },
      { to: '/agropecuaria/firmantes', label: 'Firmantes' },
      { to: '/agropecuaria/log', label: 'Log' },
    ],
  },
]

export const adminNavGroups: NavGroup[] = [
  {
    titulo: 'Administracion',
    items: [{ to: '/admin/usuarios', label: 'Usuarios' }],
  },
]

interface LayoutProps {
  groups?: NavGroup[]
  titulo?: string
  subtitulo?: string
  mostrarPuntoVenta?: boolean
}

export function Layout({
  groups = carnesNavGroups,
  titulo = 'SIGTRAZ',
  subtitulo = 'Gestion de Trazabilidad',
  mostrarPuntoVenta = true,
}: LayoutProps) {
  const { usuario, logout } = useAuth()
  const location = useLocation()

  // Administrador ve todo; el resto solo los modulos asignados. El Dashboard
  // (item.end) siempre queda disponible como pagina de aterrizaje.
  const esAdmin = usuario?.rol === 'Administrador'
  const puedeVer = (item: NavItem) =>
    esAdmin || item.end || (usuario?.modulos ?? []).includes(item.to)

  const gruposVisibles = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, items: g.items.filter(puedeVer) }))
        .filter((g) => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, usuario],
  )

  // Bloquea el acceso directo por URL a un modulo no permitido.
  const rutaHome = groups[0]?.items[0]?.to ?? '/'
  const itemActual = groups
    .flatMap((g) => g.items)
    .filter((it) =>
      it.end
        ? location.pathname === it.to
        : location.pathname.startsWith(it.to),
    )
    .sort((a, b) => b.to.length - a.to.length)[0]
  const accesoDenegado = itemActual && !puedeVer(itemActual)

  // Determina que grupo contiene la ruta activa para abrirlo por defecto.
  const grupoActivo = gruposVisibles.find((g) =>
    g.items.some((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    ),
  )?.titulo

  const [abiertos, setAbiertos] = useState<Record<string, boolean>>(() =>
    grupoActivo ? { [grupoActivo]: true } : { [gruposVisibles[0]?.titulo]: true },
  )

  // Cajon lateral para moviles/tablets.
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Cierra el menu al navegar a otra ruta.
  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  const alternar = (titulo: string) =>
    setAbiertos((prev) => ({ ...prev, [titulo]: !prev[titulo] }))

  return (
    <div className="flex min-h-screen">
      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 transform flex-col bg-slate-900 text-slate-100 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6 border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{titulo}</h1>
              <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>
            </div>
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menu"
              className="-mr-1 rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Link
            to="/empresas"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Cambiar empresa
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {gruposVisibles.map((grupo) => {
            const abierto = Boolean(abiertos[grupo.titulo])
            return (
              <div key={grupo.titulo} className="mb-2">
                <button
                  type="button"
                  onClick={() => alternar(grupo.titulo)}
                  aria-expanded={abierto}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <span>{grupo.titulo}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      abierto ? 'rotate-90' : ''
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {abierto && (
                  <div className="mt-1 space-y-1">
                    {grupo.items.map((item, indice) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-3 py-2 pl-5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-brand-600 text-white'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`
                        }
                      >
                        <span className="w-5 shrink-0 text-xs tabular-nums text-slate-400">
                          {indice + 1}.
                        </span>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-slate-700 px-3 py-2">
          <BotonTema
            conTexto
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          />
        </div>

        {usuario && (
          <div className="border-t border-slate-700 p-4">
            <p className="text-sm font-medium text-white">
              {[usuario.nombre, usuario.apellido].filter(Boolean).join(' ')}
            </p>
            <p className="text-xs text-slate-400">{usuario.rol}</p>
            <button
              onClick={logout}
              className="mt-3 w-full rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cerrar sesion
            </button>
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h18" />
              <path d="M3 6h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <span className="font-bold text-slate-900">{titulo}</span>
          <BotonTema className="ml-auto rounded-md p-1.5 text-slate-600 hover:bg-slate-100" />
        </div>
        {mostrarPuntoVenta && <SelectorPuntoVenta />}
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {accesoDenegado ? <Navigate to={rutaHome} replace /> : <Outlet />}
        </div>
      </main>
    </div>
  )
}

// Interruptor de tema claro/oscuro.
function BotonTema({
  className = '',
  conTexto = false,
}: {
  className?: string
  conTexto?: boolean
}) {
  const [tema, setTema] = useState<Tema>(temaGuardado)
  const cambiar = () => {
    const nuevo: Tema = tema === 'oscuro' ? 'claro' : 'oscuro'
    aplicarTema(nuevo)
    setTema(nuevo)
  }
  return (
    <button
      type="button"
      onClick={cambiar}
      aria-label={tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
      className={className}
    >
      {tema === 'oscuro' ? (
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {conTexto && (
        <span>{tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}</span>
      )}
    </button>
  )
}

// Barra superior con el selector del punto de venta activo.
function SelectorPuntoVenta() {
  const { disponibles, activo, esAdmin, cargando, cambiar } = usePuntoVenta()

  if (cargando) return null

  const sinAcceso = !esAdmin && disponibles.length === 0

  return (
    <div className="z-10 flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 md:sticky md:top-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Punto de venta
      </span>
      {sinAcceso ? (
        <span className="rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">
          Sin puntos de venta asignados
        </span>
      ) : (
        <select
          data-no-upper
          value={activo ?? ''}
          onChange={(e) =>
            cambiar(e.target.value === '' ? null : Number(e.target.value))
          }
          className="min-w-[14rem] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {esAdmin && <option value="">Todos los puntos de venta</option>}
          {disponibles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pdv}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
