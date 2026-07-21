import type { Entrada, Producto } from '../types/trazabilidad'

interface Props {
  entrada: Entrada
  producto?: Producto
  onCerrar: () => void
}

function fmtFecha(valor?: string): string {
  if (!valor) return '--/--/--'
  // valor puede venir como 'YYYY-MM-DD' (fechas de etiqueta) o ISO completo.
  const soloFecha = valor.slice(0, 10)
  const [a, m, d] = soloFecha.split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a.slice(2)}`
}

export function EtiquetaEntrada({ entrada, producto, onCerrar }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-transparent print:p-0"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Etiqueta imprimible */}
        <div
          id="etiqueta-imprimible"
          className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0"
        >
          {/* Encabezado con acento de marca */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 text-center text-white">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
              {producto?.categoria ?? 'Producto trazable'}
            </p>
            <h2 className="mt-1 text-xl font-extrabold uppercase leading-tight tracking-wide">
              {producto?.nombre ?? 'Producto'}
            </h2>
          </div>

          <div className="space-y-4 px-6 py-5">
            {/* Lote y cantidad destacados */}
            <div className="flex items-stretch gap-3">
              <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Lote
                </p>
                <p className="font-mono text-sm font-bold text-slate-800">
                  {entrada.loteCodigo}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Cantidad
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {entrada.cantidad} {producto?.unidad ?? ''}
                </p>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <FechaBox label="Vencimiento" valor={fmtFecha(entrada.fechaVencimiento)} destacado />
              <FechaBox label="Beneficio" valor={fmtFecha(entrada.fechaBeneficio)} />
              <FechaBox label="Empaque" valor={fmtFecha(entrada.fechaEmpaque)} />
            </div>

            {/* Conservacion */}
            {entrada.conservacion && (
              <Bloque titulo="Condiciones de conservacion">
                {entrada.conservacion}
              </Bloque>
            )}

            {/* Instrucciones */}
            {entrada.instrucciones && (
              <Bloque titulo="Instrucciones de uso">
                {entrada.instrucciones}
              </Bloque>
            )}

            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500">
              <span>SKU: {producto?.sku ?? '-'}</span>
              <span>{new Date(entrada.fecha).toLocaleDateString('es')}</span>
            </div>
          </div>

          {/* Pie: empresa */}
          <div className="bg-slate-800 px-6 py-3 text-center text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              Fraccionado y empacado por
            </p>
            <p className="text-sm font-bold">
              {entrada.empresa ?? entrada.proveedor}
            </p>
          </div>
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
            onClick={() => window.print()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Imprimir etiqueta
          </button>
        </div>
      </div>
    </div>
  )
}

function FechaBox({
  label,
  valor,
  destacado = false,
}: {
  label: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 ${
        destacado
          ? 'border-red-200 bg-red-50'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`text-sm font-bold ${
          destacado ? 'text-red-600' : 'text-slate-800'
        }`}
      >
        {valor}
      </p>
    </div>
  )
}

function Bloque({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p className="mt-0.5 text-sm text-slate-700">{children}</p>
    </div>
  )
}
