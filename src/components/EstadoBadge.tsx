import type { EstadoLote } from '../types/trazabilidad'

const estilos: Record<EstadoLote, string> = {
  'En produccion': 'bg-amber-100 text-amber-800',
  Disponible: 'bg-emerald-100 text-emerald-800',
  'En transito': 'bg-blue-100 text-blue-800',
  Entregado: 'bg-slate-200 text-slate-700',
  Retenido: 'bg-red-100 text-red-800',
}

export function EstadoBadge({ estado }: { estado: EstadoLote }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estilos[estado]}`}
    >
      {estado}
    </span>
  )
}
