import { useState } from 'react'
import { Link } from 'react-router-dom'
import { lotes, getProducto } from '../data/mockData'
import { EstadoBadge } from '../components/EstadoBadge'

export function Lotes() {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = lotes.filter((lote) => {
    const producto = getProducto(lote.productoId)
    const texto = `${lote.codigo} ${producto?.nombre ?? ''}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lotes</h2>
          <p className="text-slate-500">Consulta la trazabilidad por lote</p>
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por codigo o producto..."
          className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </header>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Codigo</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Vencimiento</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((lote) => {
              const producto = getProducto(lote.productoId)
              return (
                <tr key={lote.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {lote.codigo}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {producto?.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lote.cantidad} {producto?.unidad}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lote.fechaVencimiento}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={lote.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/lotes/${lote.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No se encontraron lotes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
