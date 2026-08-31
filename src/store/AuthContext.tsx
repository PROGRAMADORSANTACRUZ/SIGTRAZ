import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken, setPuntoVentaActivo } from '../services/api'
import { precargarAgro } from '../services/agroSync'
import type { Usuario } from '../types/trazabilidad'

/** Minutos de inactividad tras los que se cierra la sesion automaticamente. */
const INACTIVIDAD_MS = 5 * 60 * 1000

interface AuthContextValue {
  usuario: Usuario | null
  autenticado: boolean
  inicializando: boolean
  login: (email: string, password: string) => Promise<Usuario>
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

  const logout = useCallback(() => {
    // Avisa al servidor para cerrar la sesion en la base de datos (no bloquea).
    void api.logout()
    setToken(null)
    setPuntoVentaActivo(null)
    setUsuario(null)
  }, [])

  // Cierre automatico por inactividad: cualquier actividad del usuario reinicia
  // el temporizador de 5 minutos; si se agota, se cierra la sesion.
  const temporizador = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!usuario) return

    const reiniciar = () => {
      if (temporizador.current) window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => {
        logout()
      }, INACTIVIDAD_MS)
    }

    const eventos: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ]
    eventos.forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }))
    reiniciar()

    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current)
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciar))
    }
  }, [usuario, logout])

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
