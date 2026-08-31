import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// Tipos minimos de la Web Serial API (no incluidos en el DOM lib por defecto).
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}
interface SerialLike {
  requestPort(): Promise<SerialPortLike>
}

function obtenerSerial(): SerialLike | undefined {
  return (navigator as unknown as { serial?: SerialLike }).serial
}

const BAUD_KEY = 'sigtraz_bascula_baud'

interface BasculaContextValue {
  soportado: boolean
  conectado: boolean
  peso: number | null
  estable: boolean
  error: string | null
  baudRate: number
  setBaudRate: (n: number) => void
  conectar: () => Promise<void>
  desconectar: () => Promise<void>
}

const BasculaContext = createContext<BasculaContextValue | undefined>(undefined)

export function BasculaProvider({ children }: { children: ReactNode }) {
  const soportado = typeof navigator !== 'undefined' && !!obtenerSerial()

  const [conectado, setConectado] = useState(false)
  const [peso, setPeso] = useState<number | null>(null)
  const [estable, setEstable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [baudRate, setBaudRateState] = useState<number>(() => {
    const g = Number(localStorage.getItem(BAUD_KEY))
    return Number.isFinite(g) && g > 0 ? g : 9600
  })

  const portRef = useRef<SerialPortLike | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const leyendoRef = useRef(false)
  const bufferRef = useRef('')

  function setBaudRate(n: number) {
    localStorage.setItem(BAUD_KEY, String(n))
    setBaudRateState(n)
  }

  // Extrae el peso de una linea de texto de la bascula.
  const procesarLinea = useCallback((linea: string) => {
    const limpio = linea.replace(/[^\x20-\x7E]/g, ' ').trim()
    if (!limpio) return
    const matches = limpio.match(/-?\d+(?:[.,]\d+)?/g)
    if (!matches) return
    const val = parseFloat(matches[matches.length - 1].replace(',', '.'))
    if (Number.isNaN(val)) return
    setPeso(val)
    setEstable(!/\bUS\b|MOV|MOTION|MOVIM/i.test(limpio))
  }, [])

  const procesar = useCallback(
    (texto: string) => {
      bufferRef.current += texto
      const partes = bufferRef.current.split(/[\r\n]+/)
      bufferRef.current = partes.pop() ?? ''
      for (const p of partes) procesarLinea(p)
    },
    [procesarLinea],
  )

  const desconectar = useCallback(async () => {
    leyendoRef.current = false
    try {
      await readerRef.current?.cancel()
    } catch {
      /* ignore */
    }
    try {
      readerRef.current?.releaseLock()
    } catch {
      /* ignore */
    }
    readerRef.current = null
    try {
      await portRef.current?.close()
    } catch {
      /* ignore */
    }
    portRef.current = null
    bufferRef.current = ''
    setConectado(false)
    setPeso(null)
  }, [])

  const conectar = useCallback(async () => {
    const serial = obtenerSerial()
    if (!serial) {
      setError('Este navegador no soporta lectura de bascula. Usa Chrome o Edge.')
      return
    }
    setError(null)
    try {
      const port = await serial.requestPort()
      await port.open({ baudRate })
      portRef.current = port
      leyendoRef.current = true
      setConectado(true)

      const decoder = new TextDecoder()
      void (async () => {
        while (leyendoRef.current && portRef.current?.readable) {
          const reader = portRef.current.readable.getReader()
          readerRef.current = reader
          try {
            while (leyendoRef.current) {
              const { value, done } = await reader.read()
              if (done) break
              if (value) procesar(decoder.decode(value, { stream: true }))
            }
          } catch {
            /* lectura interrumpida */
          } finally {
            try {
              reader.releaseLock()
            } catch {
              /* ignore */
            }
          }
        }
      })()
    } catch (err) {
      // El usuario cancelo el selector de puerto o fallo la apertura.
      const msg = err instanceof Error ? err.message : String(err)
      if (!/no port selected|cancel/i.test(msg)) {
        setError('No se pudo conectar con la bascula: ' + msg)
      }
      await desconectar()
    }
  }, [baudRate, procesar, desconectar])

  useEffect(() => {
    return () => {
      leyendoRef.current = false
      void portRef.current?.close().catch(() => undefined)
    }
  }, [])

  const value: BasculaContextValue = {
    soportado,
    conectado,
    peso,
    estable,
    error,
    baudRate,
    setBaudRate,
    conectar,
    desconectar,
  }

  return (
    <BasculaContext.Provider value={value}>{children}</BasculaContext.Provider>
  )
}

export function useBascula(): BasculaContextValue {
  const ctx = useContext(BasculaContext)
  if (!ctx) throw new Error('useBascula debe usarse dentro de BasculaProvider')
  return ctx
}
