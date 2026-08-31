import { useEffect, useRef, useState } from 'react'

interface FirmaCanvasProps {
  value: string
  onChange: (dataUrl: string) => void
}

export function FirmaCanvas({ value, onChange }: FirmaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(!value)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = value
      setVacio(false)
    }
  }, [])

  function posicion(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    dibujando.current = true
    const { x, y } = posicion(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = posicion(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setVacio(false)
  }

  function terminar() {
    if (!dibujando.current) return
    dibujando.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }

  function limpiar() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setVacio(true)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="relative w-full max-w-xs">
        <canvas
          ref={canvasRef}
          width={320}
          height={140}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerLeave={terminar}
          className="w-full touch-none rounded-md border border-slate-300 bg-white"
        />
        {vacio && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            Firma aquí con el mouse o el dedo
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={limpiar}
        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Limpiar
      </button>
    </div>
  )
}
