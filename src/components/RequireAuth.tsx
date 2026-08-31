import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import type { EmpresaUsuario } from '../types/trazabilidad'

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

// Restringe el acceso a los modulos de una empresa. El Administrador puede
// entrar a todas; el resto de usuarios solo a la empresa que tiene asignada.
export function RequireEmpresa({ empresa }: { empresa: EmpresaUsuario }) {
  const { usuario } = useAuth()

  if (usuario?.rol === 'Administrador' || usuario?.empresa === empresa) {
    return <Outlet />
  }

  return <Navigate to="/empresas" replace />
}

// Restringe el acceso a la administracion solo a los Administradores.
export function RequireAdmin() {
  const { usuario } = useAuth()

  if (usuario?.rol === 'Administrador') {
    return <Outlet />
  }

  return <Navigate to="/empresas" replace />
}
