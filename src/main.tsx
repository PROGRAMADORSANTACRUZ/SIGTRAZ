import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './store/AuthContext'
import { EntradasProvider } from './store/EntradasContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EntradasProvider>
        <RouterProvider router={router} />
      </EntradasProvider>
    </AuthProvider>
  </StrictMode>,
)
