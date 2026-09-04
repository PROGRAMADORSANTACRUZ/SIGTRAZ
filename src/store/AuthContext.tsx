import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken, setPuntoVentaActivo } from '../services/api'
import { precargarAgro } from '../services/agroSync'
import type { Usuario } from '../types/trazabilidad'

interface AuthContextValue {
  usuario: Usuario | null
  autenticado: boolean
  inicializando: boolean
  login: (email: string, password: string) => Promise<Usuario>
  loginConSso: (ticket: string) => Promise<Usuario>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [inicializando, setInicializando] = useState(true)

  useEffect(() => {
    // Rehidrata la sesion si hay token guardado.
    if (!getToken()) {
      setInicializando(false)
      return
    }
    api
      .getMe()
      .then((u) => setUsuario(u))
      .catch(() => {
        setToken(null)
        setUsuario(null)
      })
      .finally(() => setInicializando(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, usuario } = await api.login(email, password)
    setToken(token)
    // Descarga los datos de Agropecuaria del servidor antes de navegar, para
    // que las paginas los muestren ya sincronizados entre dispositivos.
    await precargarAgro()
    setUsuario(usuario)
    return usuario
  }, [])

  const loginConSso = useCallback(async (ticket: string) => {
    const { token, usuario } = await api.ssoLogin(ticket)
    setToken(token)
    await precargarAgro()
    setUsuario(usuario)
    return usuario
  }, [])

  const logout = useCallback(() => {
    // Avisa al servidor para cerrar la sesion en la base de datos (no bloquea).
    void api.logout()
    setToken(null)
    setPuntoVentaActivo(null)
    setUsuario(null)
  }, [])

  // Latido: cada 15 s comprueba si la sesion sigue viva en el servidor. Si un
  // administrador la cerro, expulsa al usuario al instante sin esperar a que
  // haga otra accion.
  useEffect(() => {
    if (!usuario) return
    const id = window.setInterval(() => {
      api.estadoSesion().catch(() => logout())
    }, 15000)
    return () => window.clearInterval(id)
  }, [usuario, logout])

  const value = useMemo(
    () => ({
      usuario,
      autenticado: usuario !== null,
      inicializando,
      login,
      loginConSso,
      logout,
    }),
    [usuario, inicializando, login, loginConSso, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
