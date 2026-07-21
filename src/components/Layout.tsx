import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/entradas', label: 'Entradas' },
  { to: '/lotes', label: 'Lotes' },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/productos', label: 'Productos' },
  { to: '/usuarios', label: 'Usuarios' },
]

export function Layout() {
  const { usuario, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-100">
        <div className="px-5 py-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">SIGTRAZ</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestion de Trazabilidad
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {usuario && (
          <div className="border-t border-slate-700 p-4">
            <p className="text-sm font-medium text-white">{usuario.nombre}</p>
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

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
