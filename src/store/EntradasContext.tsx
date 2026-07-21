import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, type NuevaEntrada } from '../services/api'
import type { Entrada } from '../types/trazabilidad'

interface EntradasContextValue {
  entradas: Entrada[]
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  agregarEntrada: (entrada: NuevaEntrada) => Promise<Entrada>
}

const EntradasContext = createContext<EntradasContextValue | undefined>(
  undefined,
)

export function EntradasProvider({ children }: { children: ReactNode }) {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const datos = await api.getEntradas()
      setEntradas(datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar entradas')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  const agregarEntrada = useCallback(async (entrada: NuevaEntrada) => {
    const creada = await api.crearEntrada(entrada)
    setEntradas((prev) => [creada, ...prev])
    return creada
  }, [])

  const value = useMemo(
    () => ({ entradas, cargando, error, recargar, agregarEntrada }),
    [entradas, cargando, error, recargar, agregarEntrada],
  )

  return (
    <EntradasContext.Provider value={value}>
      {children}
    </EntradasContext.Provider>
  )
}

export function useEntradas(): EntradasContextValue {
  const ctx = useContext(EntradasContext)
  if (!ctx) {
    throw new Error('useEntradas debe usarse dentro de <EntradasProvider>')
  }
  return ctx
}
