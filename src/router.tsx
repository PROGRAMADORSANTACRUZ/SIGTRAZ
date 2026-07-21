import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { Dashboard } from './pages/Dashboard'
import { Entradas } from './pages/Entradas'
import { Login } from './pages/Login'
import { Lotes } from './pages/Lotes'
import { LoteDetalle } from './pages/LoteDetalle'
import { Movimientos } from './pages/Movimientos'
import { Productos } from './pages/Productos'
import { Usuarios } from './pages/Usuarios'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'entradas', element: <Entradas /> },
          { path: 'lotes', element: <Lotes /> },
          { path: 'lotes/:id', element: <LoteDetalle /> },
          { path: 'movimientos', element: <Movimientos /> },
          { path: 'productos', element: <Productos /> },
          { path: 'usuarios', element: <Usuarios /> },
        ],
      },
    ],
  },
])
