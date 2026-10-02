import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './store/AuthContext'
import { PuntoVentaProvider } from './store/PuntoVentaContext'
import { EntradasProvider } from './store/EntradasContext'
import { BasculaProvider } from './store/BasculaContext'
import { instalarMayusculasGlobal } from './utils/mayusculas'
import { aplicarTemaInicial } from './utils/tema'
import './index.css'

// Fuerza mayusculas en todos los campos de texto que el usuario digite.
instalarMayusculasGlobal()

// Aplica el tema (claro/oscuro) guardado antes de renderizar para evitar parpadeo.
aplicarTemaInicial()

function montar() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <PuntoVentaProvider>
          <EntradasProvider>
            <BasculaProvider>
              <RouterProvider router={router} />
            </BasculaProvider>
          </EntradasProvider>
        </PuntoVentaProvider>
      </AuthProvider>
    </StrictMode>,
  )
}

montar()
