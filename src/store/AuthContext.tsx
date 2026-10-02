import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, marcarAutenticado, setPuntoVentaActivo } from '../services/api'
import { cargarDatos, esperarGuardados, limpiarDatos } from '../services/almacenamientoDatos'
import { EstadoGuardado } from '../components/EstadoGuardado'
import { corregirGrafiaPrincipal } from '../pages/agropecuaria/sucursalesStore'
import { aplicarTemaInicial } from '../utils/tema'
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
  const [errorCarga, setErrorCarga] = useState('')

  const inicializar = useCallback(async () => {
    setInicializando(true)
    setErrorCarga('')
    const sesion = await api.getMe().catch(() => null)
    if (!sesion) {
      marcarAutenticado(false)
      setUsuario(null)
      limpiarDatos()
      setInicializando(false)
      return
    }
    try {
      marcarAutenticado(true)
      await cargarDatos()
      corregirGrafiaPrincipal()
      aplicarTemaInicial()
      setUsuario(sesion)
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : 'No se pudo cargar la base de datos')
    } finally {
      setInicializando(false)
    }
  }, [])

  useEffect(() => { void inicializar() }, [inicializar])

  const login = useCallback(async (email: string, password: string) => {
    const { usuario } = await api.login(email, password)
    marcarAutenticado(true)
    // Descarga los datos de Agropecuaria del servidor antes de navegar, para
    // que las paginas los muestren ya sincronizados entre dispositivos.
    await cargarDatos()
    corregirGrafiaPrincipal()
    aplicarTemaInicial()
    setUsuario(usuario)
    return usuario
  }, [])

  const loginConSso = useCallback(async (ticket: string) => {
    const { usuario } = await api.ssoLogin(ticket)
    marcarAutenticado(true)
    await cargarDatos()
    corregirGrafiaPrincipal()
    aplicarTemaInicial()
    setUsuario(usuario)
    return usuario
  }, [])

  const logout = useCallback(async () => {
    try {
      await esperarGuardados()
      setPuntoVentaActivo(null)
      await esperarGuardados()
      await api.logout()
      marcarAutenticado(false)
      limpiarDatos()
      setUsuario(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo cerrar la sesion')
    }
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

  return (
    <AuthContext.Provider value={value}>
      <EstadoGuardado />
      {inicializando ? (
        <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando base de datos...</div>
      ) : errorCarga ? (
        <div role="alert" className="mx-auto max-w-xl space-y-4 px-4 py-12">
          <p>No se pudieron cargar los datos. {errorCarga}</p>
          <button type="button" onClick={() => void inicializar()} className="rounded border border-slate-400 px-4 py-2">Reintentar conexion</button>
        </div>
      ) : <Fragment key={usuario?.id ?? 'sin-sesion'}>{children}</Fragment>}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
