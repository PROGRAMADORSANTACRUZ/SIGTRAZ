import { Link } from 'react-router-dom'
import { eventos, lotes, productos, getProducto } from '../data/mockData'
import { EstadoBadge } from '../components/EstadoBadge'

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function Dashboard() {
  const retenidos = lotes.filter((l) => l.estado === 'Retenido').length
  const enTransito = lotes.filter((l) => l.estado === 'En transito').length
  const ultimos = [...lotes].slice(-4).reverse()

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Resumen de la trazabilidad</p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Productos" value={productos.length} />
        <Kpi label="Lotes activos" value={lotes.length} />
        <Kpi label="En transito" value={enTransito} />
        <Kpi label="Retenidos" value={retenidos} />
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-800">
          Lotes recientes
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Codigo</th>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimos.map((lote) => (
                <tr key={lote.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {lote.codigo}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {getProducto(lote.productoId)?.nombre}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={lote.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/lotes/${lote.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      Ver trazabilidad
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-sm text-slate-400">
        {eventos.length} eventos de trazabilidad registrados.
      </p>
    </div>
  )
}
