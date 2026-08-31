import { useEffect, useMemo, useRef, useState } from 'react'
import type { Producto } from '../types/trazabilidad'

interface Props {
  productos: Producto[]
  value: string
  onChange: (productoId: string) => void
  invalido?: boolean
}

export function SelectorProducto({ productos, value, onChange, invalido }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resaltado, setResaltado] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionado = useMemo(
    () => productos.find((p) => p.id === value) ?? null,
    [productos, value],
  )

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return productos
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(t) ||
        p.sku.toLowerCase().includes(t) ||
        p.id.toLowerCase().includes(t),
    )
  }, [productos, busqueda])

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

  function elegir(producto: Producto) {
    onChange(producto.id)
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
      setResaltado((i) => Math.min(i + 1, filtrados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtrados[resaltado]
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
        <span className={seleccionado ? 'text-slate-800' : 'text-slate-400'}>
          {seleccionado
            ? `${seleccionado.sku} - ${seleccionado.nombre}`
            : 'Selecciona un producto'}
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
              placeholder="Buscar por Item, Referencia o Desc. Item..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto pb-1">
            {filtrados.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">
                Sin coincidencias
              </li>
            )}
            {filtrados.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(p)}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                    i === resaltado ? 'bg-brand-50' : 'hover:bg-slate-50'
                  } ${p.id === value ? 'font-medium text-brand-700' : 'text-slate-700'}`}
                >
                  <span className="truncate">{p.nombre}</span>
                  <span className="text-xs text-slate-400">
                    {p.sku} &middot; {p.id}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
