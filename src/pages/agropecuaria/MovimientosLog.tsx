import { useMemo, useState } from 'react'
import { useMovimientos } from './movimientosStore'

export function MovimientosLog() {
  const movimientos = useMovimientos()
  const [buscar, setBuscar] = useState('')

  const filtrados = useMemo(() => {
    const q = buscar.trim().toUpperCase()
    if (!q) return movimientos
    return movimientos.filter((m) =>
      [m.modulo, m.accion, m.referencia, m.usuario, m.fecha]
        .join(' ')
        .toUpperCase()
        .includes(q),
    )
  }, [movimientos, buscar])

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">Log</h2>
        <p className="text-slate-500">
          Registro de quien crea, edita o elimina cualquier movimiento.
        </p>
      </header>

      <input
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="Buscar por usuario, modulo, accion o registro..."
        className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {filtrados.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
          Aun no hay movimientos registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Modulo</th>
                <th className="px-4 py-3">Accion</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3">Cambios (antes → ahora)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-slate-500">{m.fecha}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {m.usuario}
                  </td>
                  <td className="px-4 py-3">{m.modulo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.accion === 'CREÓ'
                          ? 'bg-emerald-100 text-emerald-700'
                          : m.accion === 'EDITÓ'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {m.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.referencia}</td>
                  <td className="px-4 py-3">
                    {m.cambios && m.cambios.length > 0 ? (
                      <ul className="space-y-1">
                        {m.cambios.map((c, i) => (
                          <li key={i} className="text-xs">
                            <span className="font-medium text-slate-700">
                              {c.campo}:
                            </span>{' '}
                            <span className="text-rose-600 line-through">
                              {c.antes || '—'}
                            </span>{' '}
                            <span className="text-slate-400">→</span>{' '}
                            <span className="text-emerald-700">
                              {c.ahora || '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
