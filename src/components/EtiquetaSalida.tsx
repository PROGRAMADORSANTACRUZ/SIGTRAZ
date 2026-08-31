import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type { Salida, Producto } from '../types/trazabilidad'

interface Props {
  registro: Salida
  producto?: Producto
  // Fechas obtenidas del lote (entradas / acondicionamiento).
  fechaSacrificio?: string
  fechaEmpaque?: string
  fechaVencimiento?: string
  onCerrar: () => void
}

// Datos fijos de la empresa (aparecen igual en todas las etiquetas)
const EMPRESA = {
  nombre: 'AGROPECUARIA SANTACRUZ LTDA.',
  direccion: 'Km 3 vía Oriental MALAMBO / ATLÁNTICO.',
  planta: '072PD',
  tel: 'Tel. 3766701',
  web: 'carnessantacruz.co',
}

function fmtFecha(valor?: string): string {
  if (!valor) return '--/--/----'
  const soloFecha = valor.slice(0, 10)
  const [a, m, d] = soloFecha.split('-')
  if (!a || !m || !d) return valor
  return `${d}/${m}/${a}`
}

function imprimirEtiqueta() {
  const style = document.createElement('style')
  style.id = 'estilo-etiqueta-print'
  style.textContent = `
    @media print {
      @page { margin: 8mm; }
      body * { visibility: hidden !important; }
      #etiqueta-imprimible, #etiqueta-imprimible * { visibility: visible !important; }
      #etiqueta-imprimible {
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
    const el = document.getElementById('estilo-etiqueta-print')
    if (el) el.remove()
  }, 500)
}

export function EtiquetaSalida({
  registro,
  producto,
  fechaEmpaque,
  fechaVencimiento,
  onCerrar,
}: Props) {
  const nombre = (registro.producto || 'PRODUCTO').toUpperCase()
  const cliente = (producto?.categoria ?? 'PRODUCTO TERMINADO').toUpperCase()
  const referencia = producto?.sku ?? 'N/A'
  const origen = (producto?.categoria ?? 'N/A').toUpperCase()
  const neto = Number(registro.cantidad ?? 0).toFixed(2)
  const lote = registro.lote?.trim() || 'SIN LOTE'
  const loteInterno = registro.loteInterno?.trim() || 'SIN LOTE INTERNO'
  const conservacion = 'REFRIGERADO 0°C A 4°C'
  const instrucciones = 'Cocinar completamente antes de consumir.'
  const empresa = 'CARNES SANTACRUZ'

  // Contenido del QR: URL publica a la trazabilidad de la salida.
  // Usa VITE_PUBLIC_URL (dominio/IP accesible desde el celular) o, si no esta
  // definida, el origen actual del navegador.
  const baseUrl = (
    (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim() ||
    window.location.origin
  ).replace(/\/$/, '')
  const qrTexto = `${baseUrl}/ts/${registro.id}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-transparent print:p-0"
      onClick={onCerrar}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Etiqueta imprimible */}
        <div
          id="etiqueta-imprimible"
          className="bg-white font-sans text-black shadow-2xl ring-1 ring-slate-200 print:shadow-none print:ring-0"
        >
          {/* Encabezado: logo + cliente + producto */}
          <div className="flex items-center gap-2 px-3 pt-3">
            <img
              src="/logo.jpg"
              alt="Santacruz"
              className="h-16 w-auto object-contain"
            />
            <div className="flex-1 text-center leading-none">
              <p className="text-lg font-bold uppercase tracking-wide">
                {cliente}
              </p>
              <h2 className="mt-0.5 text-3xl font-extrabold uppercase leading-none">
                {nombre}
              </h2>
            </div>
          </div>

          {/* Línea azul */}
          <div className="mx-3 mt-2 h-[3px] bg-blue-600" />

          {/* Lote interno de la salida */}
          <div className="mx-3 mt-2 flex items-center justify-between border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold">
            <span>LOTE INTERNO</span>
            <span className="tracking-wider">{loteInterno}</span>
          </div>

          {/* Cuerpo con bordes */}
          <div className="m-3 border border-black text-[11px] leading-tight">
            <div className="flex">
              {/* Columna izquierda: datos + fechas */}
              <div className="flex-1">
                {/* LOTE / REF / ORIGEN / PIEZA */}
                <div className="grid grid-cols-4 border-b border-black text-center">
                  <Celda titulo="LOTE" valor={lote} borde />
                  <Celda titulo="REF." valor={referencia} borde />
                  <Celda titulo="ORIGEN" valor={origen} borde />
                  <Celda titulo="PIEZA" valor="1" />
                </div>

                {/* Fechas: empaque y vencimiento. La fecha de sacrificio no se
                    muestra en la etiqueta de salida (solo visual, para el cliente). */}
                <FilaFecha
                  etiqueta="FECHA DE EMPAQUE"
                  valor={fmtFecha(fechaEmpaque)}
                />
                <FilaFecha
                  etiqueta="FECHA DE VENCIMIENTO"
                  valor={fmtFecha(fechaVencimiento)}
                  sinBorde
                />
              </div>

              {/* Columna derecha: NETO */}
              <div className="flex w-24 flex-col items-center justify-center border-l border-black">
                <p className="text-[9px] font-semibold">NETO(kg)</p>
                <p className="text-3xl font-extrabold leading-none">{neto}</p>
              </div>
            </div>

            {/* Conservación / instrucciones / empresa */}
            <div className="space-y-0.5 border-t border-black px-1 py-1">
              <p>
                <span className="font-bold">CONSERVACIÓN</span> {conservacion}
              </p>
              <p>
                <span className="font-semibold">Instrucciones de uso:</span>{' '}
                {instrucciones}
              </p>
              <p>
                <span className="font-semibold">Procesado y empacado por:</span>{' '}
                <span className="font-bold">{empresa}</span>
              </p>
              <p>{EMPRESA.direccion}</p>
            </div>

            {/* Planta / teléfono / web */}
            <div className="flex items-stretch border-t border-black">
              <div className="flex items-center border-r border-black px-1 py-0.5 text-center text-[8px] font-bold leading-none">
                CARNES
                <br />
                SANTACRUZ
              </div>
              <div className="flex items-center border-r border-black px-2 text-2xl font-extrabold">
                {EMPRESA.planta}
              </div>
              <div className="flex flex-1 items-center justify-between px-2 text-[10px]">
                <span>{EMPRESA.tel}</span>
                <span className="border-l border-black pl-2">{EMPRESA.web}</span>
              </div>
            </div>

            {/* Código de barras / QR / responsable */}
            <div className="flex items-stretch border-t border-black">
              <div className="flex flex-col justify-center border-r border-black px-1 py-1 text-center text-[8px] font-bold leading-tight">
                <span>BARCODE</span>
                <span>{lote}</span>
                <span>21043</span>
                <span>0001</span>
              </div>
              <div className="flex items-center border-r border-black px-1">
                <Barras valor={`${lote}210430001`} />
              </div>
              <div className="flex items-center justify-center border-r border-black px-2">
                <Qr valor={qrTexto} />
              </div>
              <div className="flex flex-1 flex-col justify-center px-2 text-[10px] leading-tight">
                <span>Responsable:</span>
                <span className="font-semibold">
                  {registro.responsable || '-'}
                </span>
              </div>
            </div>
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
            onClick={imprimirEtiqueta}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Imprimir etiqueta
          </button>
        </div>
      </div>
    </div>
  )
}

function Celda({
  titulo,
  valor,
  borde = false,
}: {
  titulo: string
  valor: string
  borde?: boolean
}) {
  return (
    <div className={`px-1 py-0.5 ${borde ? 'border-r border-black' : ''}`}>
      <p className="font-semibold">{titulo}</p>
      <p className="font-mono">{valor}</p>
    </div>
  )
}

function FilaFecha({
  etiqueta,
  valor,
  sinBorde = false,
}: {
  etiqueta: string
  valor: string
  sinBorde?: boolean
}) {
  return (
    <div
      className={`flex justify-between px-1 py-0.5 ${
        sinBorde ? '' : 'border-b border-black'
      }`}
    >
      <span className="font-semibold">{etiqueta}:</span>
      <span className="font-mono">{valor}</span>
    </div>
  )
}

// Código de barras real (CODE128) generado con JsBarcode
function Barras({ valor }: { valor: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, valor || '0', {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 34,
        width: 1.4,
      })
    } catch {
      // valor no válido para el formato
    }
  }, [valor])
  return <svg ref={ref} className="h-9" />
}

// QR real generado con qrcode
function Qr({ valor }: { valor: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, valor || ' ', {
      margin: 0,
      width: 60,
    }).catch(() => {
      // no se pudo generar
    })
  }, [valor])
  return <canvas ref={ref} className="h-[60px] w-[60px]" />
}
