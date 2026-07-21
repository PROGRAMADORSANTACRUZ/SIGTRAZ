import { Link, useParams } from 'react-router-dom'
import {
  getEventosDeLote,
  getLote,
  getProducto,
} from '../data/mockData'
import { EstadoBadge } from '../components/EstadoBadge'

export function LoteDetalle() {
  const { id } = useParams<{ id: string }>()
  const lote = id ? getLote(id) : undefined

  if (!lote) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">Lote no encontrado.</p>
        <Link to="/lotes" className="text-brand-600 hover:underline">
          Volver a lotes
        </Link>
      </div>
    )
  }

  const producto = getProducto(lote.productoId)
  const historial = getEventosDeLote(lote.id)

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/lotes"
          className="text-sm text-brand-600 hover:underline"
        >
          &larr; Lotes
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {lote.codigo}
            </h2>
            <p className="text-slate-500">{producto?.nombre}</p>
          </div>
          <EstadoBadge estado={lote.estado} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Dato label="SKU" value={producto?.sku ?? '-'} />
        <Dato
          label="Cantidad"
          value={`${lote.cantidad} ${producto?.unidad ?? ''}`}
        />
        <Dato label="Produccion" value={lote.fechaProduccion} />
        <Dato label="Vencimiento" value={lote.fechaVencimiento} />
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-800">
          Historial de trazabilidad
        </h3>
        <ol className="relative border-l border-slate-200 pl-6">
          {historial.map((evento) => (
            <li key={evento.id} className="mb-6 last:mb-0">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-brand-500" />
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">
                    {evento.tipo}
                  </span>
                  <time className="text-xs text-slate-400">
                    {new Date(evento.fecha).toLocaleString('es')}
                  </time>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {evento.ubicacion} &middot; {evento.responsable}
                </p>
                {evento.notas && (
                  <p className="mt-1 text-sm text-slate-500">{evento.notas}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  )
}
