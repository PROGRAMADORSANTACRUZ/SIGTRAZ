import { useEffect, useState } from 'react'
import { useBascula } from '../store/BasculaContext'

interface PesoInputProps {
  value: number | undefined
  onChange: (v: number | undefined) => void
  className?: string
  step?: string
  min?: number
}

// Input de peso con captura desde bascula real (Web Serial) + entrada manual.
export function PesoInput({
  value,
  onChange,
  className,
  step = '0.01',
  min = 0,
}: PesoInputProps) {
  const { soportado, conectado, peso, estable, error, conectar } = useBascula()
  const [auto, setAuto] = useState(false)

  // En modo automatico, el peso de la bascula llena el campo en vivo.
  useEffect(() => {
    if (auto && conectado && peso != null) onChange(peso)
  }, [auto, conectado, peso, onChange])

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          type="number"
          step={step}
          min={min}
          value={value ?? ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
          data-no-upper
          className={className ?? 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'}
        />
        {soportado &&
          (conectado ? (
            <button
              type="button"
              onClick={() => peso != null && onChange(peso)}
              title="Capturar el peso actual de la bascula"
              className="shrink-0 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Capturar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void conectar()}
              title="Conectar la bascula por USB/serial"
              className="shrink-0 rounded-md border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              B
            </button>
          ))}
      </div>

      {conectado && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span
              className={`h-2 w-2 rounded-full ${estable ? 'bg-green-500' : 'bg-amber-400'}`}
            />
            Bascula: {peso != null ? peso.toLocaleString('es-CO') : '--'}{' '}
            {estable ? 'estable' : 'midiendo...'}
          </span>
          <label className="inline-flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Automatico
          </label>
        </div>
      )}

      {!soportado && (
        <p className="text-xs text-amber-600">
          Este navegador no lee bascula. Usa Chrome o Edge de escritorio.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

interface BotonBasculaProps {
  onCapturar: (peso: number) => void
}

// Boton compacto para capturar el peso de la bascula (o conectarla si falta).
export function BotonBascula({ onCapturar }: BotonBasculaProps) {
  const { soportado, conectado, peso, conectar } = useBascula()
  if (!soportado) return null
  return (
    <button
      type="button"
      onClick={() => {
        if (!conectado) void conectar()
        else if (peso != null) onCapturar(peso)
      }}
      title={
        conectado
          ? 'Capturar el peso actual de la bascula'
          : 'Conectar la bascula por USB/serial'
      }
      className="shrink-0 rounded-md border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
    >
      {conectado ? 'Pesar' : 'Bascula'}
    </button>
  )
}
