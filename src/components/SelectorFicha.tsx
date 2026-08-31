import { useEffect, useMemo, useRef, useState } from 'react'
import type { FichaTecnica } from '../types/trazabilidad'

interface Props {
  fichas: FichaTecnica[]
  value: string
  onChange: (fichaId: string) => void
  invalido?: boolean
}

export function SelectorFicha({ fichas, value, onChange, invalido }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resaltado, setResaltado] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionada = useMemo(
    () => fichas.find((f) => f.id === value) ?? null,
    [fichas, value],
  )

  const filtradas = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return fichas
    return fichas.filter((f) => f.nombre.toLowerCase().includes(t))
  }, [fichas, busqueda])

  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setAbierto(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [])

  function elegir(ficha: FichaTecnica) {
    onChange(ficha.id)
    setAbierto(false)
    setBusqueda('')
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setAbierto(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setResaltado((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtradas[resaltado]
      if (item) elegir(item)
    } else if (e.key === 'Escape') {
      setAbierto(false)
      setBusqueda('')
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-left text-sm focus:outline-none focus:ring-1 ${
          invalido
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
        }`}
      >
        <span className={seleccionada ? 'text-slate-800' : 'text-slate-400'}>
          {seleccionada ? (
            <>
              {seleccionada.nombre}
              {seleccionada.diasVencimiento != null && (
                <span className="text-red-600">
                  {' '}
                  ({seleccionada.diasVencimiento} dias)
                </span>
              )}
            </>
          ) : (
            'Selecciona una ficha tecnica'
          )}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {abierto && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setResaltado(0)
              }}
              onKeyDown={alTeclear}
              placeholder="Buscar ficha tecnica..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto pb-1">
            {filtradas.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">
                Sin coincidencias
              </li>
            )}
            {filtradas.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(f)}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                    i === resaltado ? 'bg-brand-50' : 'hover:bg-slate-50'
                  } ${f.id === value ? 'font-medium text-brand-700' : 'text-slate-700'}`}
                >
                  <span className="truncate">{f.nombre}</span>
                  {f.diasVencimiento != null && (
                    <span className="ml-1 shrink-0 text-red-600">
                      ({f.diasVencimiento} dias)
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
