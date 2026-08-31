import type { Entrada, Producto } from '../types/trazabilidad'

interface Props {
  entradas: Entrada[]
  productoPorId: Map<string, Producto>
  onCerrar: () => void
}

function fmtFecha(valor?: string): string {
  if (!valor) return ''
  const soloFecha = valor.slice(0, 10)
  const [a, m, d] = soloFecha.split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

function imprimirFormato() {
  const style = document.createElement('style')
  style.id = 'estilo-formato-print'
  style.textContent = `
    @media print {
      @page { size: A4 landscape; margin: 6mm; }
      body * { visibility: hidden !important; }
      #formato-imprimible, #formato-imprimible * { visibility: visible !important; }
      #formato-imprimible {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
      }
    }
  `
  document.head.appendChild(style)
  window.print()
  window.setTimeout(() => {
    const el = document.getElementById('estilo-formato-print')
    if (el) el.remove()
  }, 500)
}

export function FormatoRecepcion({ entradas, productoPorId, onCerrar }: Props) {
  const td = 'border border-slate-500 px-1 py-3 text-center text-[10px] align-middle break-words'
  const th =
    'border border-slate-500 px-1 py-1 text-center text-[10px] font-bold align-middle break-words'

  // Datos compartidos de la recepcion (misma cabecera para todos los productos).
  const cab = entradas[0]
  if (!cab) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/60 p-4 print:static print:block print:bg-transparent print:p-0"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-6xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="formato-imprimible"
          className="bg-white p-4 shadow-2xl ring-1 ring-slate-200 print:p-0 print:shadow-none print:ring-0"
        >
          {/* Encabezado */}
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td
                  rowSpan={3}
                  className="w-40 border border-slate-500 p-2 text-center align-middle"
                >
                  <img
                    src="/logo.jpg"
                    alt="Carnes Santacruz"
                    className="mx-auto h-20 w-auto object-contain"
                  />
                </td>
                <td className="border border-slate-500 px-3 py-2 text-center text-base font-bold">
                  FORMATO DE RECEPCION DE MATERIA PRIMA
                </td>
                <td className="w-52 border border-slate-500 px-3 py-1 text-sm font-bold">
                  CODIGO: FOR-CIA-023
                </td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-2 text-center text-sm font-bold">
                  PROGRAMA DE TRAZABILIDAD DE PRODUCTOS
                </td>
                <td className="border border-slate-500 px-3 py-1 text-sm font-bold">
                  VERSION: 2
                </td>
              </tr>
              <tr>
                <td className="border border-slate-500 px-3 py-2"></td>
                <td className="border border-slate-500 px-3 py-1 text-sm font-bold">
                  FECHA: 20/10/2025
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tabla de datos */}
          <table className="mt-1 w-full table-fixed border-collapse">
            <thead>
              <tr>
                <th rowSpan={3} className={th}>
                  Fecha
                </th>
                <th rowSpan={3} className={th}>
                  Proveedor
                </th>
                <th rowSpan={3} className={th}>
                  Producto
                </th>
                <th rowSpan={3} className={th}>
                  Fecha sacrificio
                </th>
                <th rowSpan={3} className={th}>
                  Fecha empaque
                </th>
                <th rowSpan={3} className={th}>
                  Fecha vencimiento
                </th>
                <th rowSpan={3} className={th}>
                  Lote Externo (Proveedor)
                </th>
                <th rowSpan={3} className={th}>
                  Lote interno (Si aplica)
                </th>
                <th colSpan={6} className={th}>
                  C: cumple&nbsp;&nbsp;NC: No cumple&nbsp;&nbsp;No aplica: N.A
                </th>
                <th colSpan={2} className={th}>
                  Temperatura
                </th>
                <th rowSpan={3} className={th}>
                  Placa
                </th>
                <th rowSpan={3} className={th}>
                  Observaciones
                </th>
                <th rowSpan={3} className={th}>
                  Responsable
                </th>
              </tr>
              <tr>
                <th colSpan={4} className={th}>
                  Condiciones sanitarias del vehiculo
                  <br />
                  Cumple: C / No Cumple: NC
                </th>
                <th colSpan={2} className={th}>
                  Condiciones Organolepticas del producto
                </th>
                <th rowSpan={2} className={th}>
                  Producto
                </th>
                <th rowSpan={2} className={th}>
                  Vehiculo
                </th>
              </tr>
              <tr>
                <th className={th}>Pisos</th>
                <th className={th}>Paredes</th>
                <th className={th}>Techos</th>
                <th className={th}>Cortinas</th>
                <th className={th}>C</th>
                <th className={th}>N.C</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((entrada) => (
                <tr key={entrada.id}>
                  <td className={td}>{fmtFecha(entrada.fecha)}</td>
                  <td className={td}>{entrada.proveedor}</td>
                  <td className={td}>
                    {productoPorId.get(entrada.productoId)?.nombre ?? ''}
                  </td>
                  <td className={td}>{fmtFecha(entrada.fechaBeneficio)}</td>
                  <td className={td}>{fmtFecha(entrada.fechaEmpaque)}</td>
                  <td className={td}>{fmtFecha(entrada.fechaVencimiento)}</td>
                  <td className={td}>{entrada.loteExterno ?? ''}</td>
                  <td className={td}>
                    {entrada.loteInterno ?? entrada.loteCodigo}
                  </td>
                  <td className={td}>{entrada.vehPisos ?? ''}</td>
                  <td className={td}>{entrada.vehParedes ?? ''}</td>
                  <td className={td}>{entrada.vehTechos ?? ''}</td>
                  <td className={td}>{entrada.vehCortinas ?? ''}</td>
                  <td className={td}>
                    {entrada.organolepticas === 'C' ? 'X' : ''}
                  </td>
                  <td className={td}>
                    {entrada.organolepticas === 'NC' ? 'X' : ''}
                  </td>
                  <td className={td}>
                    {entrada.tempProducto != null
                      ? `${entrada.tempProducto} C`
                      : ''}
                  </td>
                  <td className={td}>
                    {entrada.tempVehiculo != null
                      ? `${entrada.tempVehiculo} C`
                      : ''}
                  </td>
                  <td className={td}>{entrada.placa ?? ''}</td>
                  <td className={td}>{entrada.notas ?? ''}</td>
                  <td className={td}>{entrada.responsable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Acciones (no se imprimen) */}
        <div className="mt-4 flex justify-end gap-3 print:hidden">
          <button
            onClick={onCerrar}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            onClick={imprimirFormato}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Imprimir formato
          </button>
        </div>
      </div>
    </div>
  )
}
