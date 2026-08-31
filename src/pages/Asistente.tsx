import { useEffect, useRef, useState } from 'react'
import { api, type RespuestaAsistente } from '../services/api'

interface Mensaje {
  autor: 'usuario' | 'asistente'
  texto: string
  datos?: RespuestaAsistente['datos']
}

const SUGERENCIAS = [
  'Resumen general',
  'Acciones pendientes',
  'Inspecciones',
  'Activos en mantenimiento',
  'Formaciones programadas',
  'Programas proximos',
  'Inventario',
]

export function Asistente() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      autor: 'asistente',
      texto:
        'Hola, soy tu asistente de SIGTRAZ. Preguntame por acciones, inspecciones, activos, formaciones, programas o pide un resumen general.',
    },
  ])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function preguntar(pregunta: string) {
    const limpio = pregunta.trim()
    if (!limpio || enviando) return
    setMensajes((prev) => [...prev, { autor: 'usuario', texto: limpio }])
    setTexto('')
    setEnviando(true)
    try {
      const respuesta = await api.consultarAsistente(limpio)
      setMensajes((prev) => [
        ...prev,
        {
          autor: 'asistente',
          texto: respuesta.texto,
          datos: respuesta.datos,
        },
      ])
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        {
          autor: 'asistente',
          texto:
            err instanceof Error
              ? `Error: ${err.message}`
              : 'No pude procesar tu pregunta.',
        },
      ])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Asistente de IA</h2>
        <p className="text-slate-500">
          Consulta el estado de tu sistema en lenguaje natural
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            onClick={() => preguntar(s)}
            disabled={enviando}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.autor === 'usuario'
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-800'
              }`}
            >
              <p>{m.texto}</p>
              {m.datos && m.datos.length > 0 && (
                <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                  {m.datos.map((d, j) => (
                    <div key={j} className="flex justify-between gap-4">
                      <dt className="text-slate-500">{d.etiqueta}</dt>
                      <dd className="font-semibold text-slate-800">
                        {d.valor}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400">
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void preguntar(texto)
        }}
        className="flex gap-2"
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe tu pregunta..."
          className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
