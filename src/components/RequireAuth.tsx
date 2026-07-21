import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export function RequireAuth() {
  const { autenticado, inicializando } = useAuth()
  const location = useLocation()

  if (inicializando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Cargando...
      </div>
    )
  }

  if (!autenticado) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    )
  }

  return <Outlet />
}
