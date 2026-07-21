import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../services/api'
import type { Usuario } from '../types/trazabilidad'

interface AuthContextValue {
  usuario: Usuario | null
  autenticado: boolean
  inicializando: boolean
  login: (email: string, password: string) => Promise<void>
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
    setUsuario(usuario)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUsuario(null)
  }, [])

  const value = useMemo(
    () => ({
      usuario,
      autenticado: usuario !== null,
      inicializando,
      login,
      logout,
    }),
    [usuario, inicializando, login, logout],
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
