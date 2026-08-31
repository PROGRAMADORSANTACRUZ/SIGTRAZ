import { Link } from 'react-router-dom'
import { eventos, getLote } from '../data/mockData'

export function Movimientos() {
  const ordenados = [...eventos].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  )

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Movimientos</h2>
        <p className="text-slate-500">
          Todos los eventos de trazabilidad registrados
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Ubicacion</th>
              <th className="px-4 py-3 font-medium">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ordenados.map((evento, indice) => {
              const lote = getLote(evento.loteId)
              return (
                <tr key={evento.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {indice + 1}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(evento.fecha).toLocaleString('es')}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {evento.tipo}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/lotes/${evento.loteId}`}
                      className="text-brand-600 hover:underline"
                    >
                      {lote?.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {evento.ubicacion}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {evento.responsable}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
