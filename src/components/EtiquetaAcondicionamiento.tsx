import { Fragment, useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import type {
  Acondicionamiento,
  Cliente,
  FichaTecnica,
  Producto,
} from '../types/trazabilidad'
import { usePuntoVenta } from '../store/PuntoVentaContext'

interface Props {
  registro: Acondicionamiento
  producto?: Producto
  ficha?: FichaTecnica
  clienteDestino?: Cliente
  loteCompuesto?: string
  fechaBeneficio?: string
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
      @page { size: 60mm 60mm; margin: 0; }
      body * { visibility: hidden !important; }
      #etiqueta-imprimible, #etiqueta-imprimible * { visibility: visible !important; }
      #etiqueta-imprimible {
        position: absolute;
        top: 0;
        left: 0;
        width: 60mm;
        height: 60mm;
        overflow: hidden;
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

export function EtiquetaAcondicionamiento({
  registro,
  producto,
  ficha,
  clienteDestino,
  loteCompuesto,
  fechaBeneficio,
  onCerrar,
}: Props) {
  const nombre = (
    registro.productoResultante ||
    registro.producto ||
    'PRODUCTO'
  ).toUpperCase()
  const cliente = (producto?.categoria ?? 'PRODUCTO TERMINADO').toUpperCase()
  const referencia = producto?.sku ?? 'N/A'
  const origen = (producto?.categoria ?? 'N/A').toUpperCase()
  const neto = Number(
    registro.cantidadResultante ?? registro.cantidadEntrada ?? 0,
  ).toFixed(2)
  const lote =
    loteCompuesto?.trim() ||
    registro.loteInterno?.trim() ||
    registro.lote?.trim() ||
    'SIN LOTE'
  const conservacion = registro.conservacion?.trim() || 'REFRIGERADO 0°C A 4°C'
  const instrucciones =
    registro.instrucciones?.trim() || 'Cocinar completamente antes de consumir.'
  const empresa = registro.empresa?.trim() || 'CARNES SANTACRUZ'
  const vidaUtil =
    ficha?.diasVencimiento != null
      ? `${ficha.diasVencimiento} días`
      : ficha?.nombre || '-'

  // Punto de venta donde se genera la etiqueta. Se resuelve segun el registro,
  // no segun la sesion: primero por el nombre guardado, luego por el prefijo
  // del lote interno ({PREFIJO}-{TIPO}{N}); como ultimo recurso, el PDV activo.
  const { disponibles, activo } = usePuntoVenta()
  const puntoActivo = disponibles.find((p) => Number(p.id) === activo)
  const segmentosLote = (registro.loteInterno || lote || '')
    .toUpperCase()
    .split('-')
    .map((s) => s.trim())
  const punto =
    disponibles.find(
      (p) =>
        p.pdv.trim().toUpperCase() ===
        (registro.puntoVenta ?? '').trim().toUpperCase(),
    ) ||
    disponibles.find((p) => {
      const pref = (p.prefijo ?? '').trim().toUpperCase()
      return pref !== '' && segmentosLote.includes(pref)
    }) ||
    puntoActivo
  const puntoNombre = (punto?.pdv || registro.puntoVenta || '')
    .toUpperCase()
    .replace(/^CARNES\s+SANTACRUZ\s*/i, '')
    .trim()
  const puntoDireccion = punto?.direccion?.trim() || ''
  const puntoTelefono = punto?.telefono?.trim() || ''

  // Datos del destinatario segun el cliente seleccionado en "Destino".
  const destinoNombre = (
    clienteDestino
      ? [clienteDestino.nombre, clienteDestino.apellidos]
          .filter(Boolean)
          .join(' ')
      : registro.destino || ''
  ).toUpperCase()
  const destDireccion = clienteDestino?.direccion?.trim() || ''
  const destTelefono = clienteDestino?.telefono?.trim() || ''
  const destBarrio = clienteDestino?.barrio?.trim() || ''
  const destCiudad = clienteDestino?.ciudad?.trim() || ''
  const destCorreo = clienteDestino?.correo?.trim() || ''
  const hayDestino =
    destinoNombre !== '' &&
    (destDireccion || destTelefono || destBarrio || destCiudad || destCorreo)

  // Contenido del QR: URL publica a la trazabilidad del producto terminado.
  // Usa VITE_PUBLIC_URL (dominio/IP accesible desde el celular) o, si no esta
  // definida, el origen actual del navegador.
  const baseUrl = (
    (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim() ||
    window.location.origin
  ).replace(/\/$/, '')
  const qrTexto = `${baseUrl}/ta/${registro.id}`

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
              className="h-20 w-auto object-contain"
            />
            <div className="flex-1 text-center leading-none">
              <p className="text-lg font-bold uppercase tracking-wide">
                {destinoNombre || cliente}
              </p>
              <h2 className="mt-0.5 text-3xl font-extrabold uppercase leading-none">
                {nombre}
              </h2>
            </div>
          </div>

          {/* Línea azul */}
          <div className="mx-3 mt-2 h-[3px] bg-blue-600" />

          {/* Cuerpo con bordes */}
          <div className="m-3 border border-black text-[11px] leading-tight">
            <div className="flex">
              {/* Columna izquierda: datos + fechas */}
              <div className="flex-1">
                {/* LOTE / REF / ORIGEN / PROCESO */}
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] border-b border-black text-center">
                  <Celda titulo="LOTE" valor={lote} borde ajustar />
                  <Celda titulo="REF." valor={referencia} borde />
                  <Celda titulo="ORIGEN" valor={origen} borde />
                  <Celda titulo="PIEZA" valor="1" />
                </div>

                {/* Fechas y vida útil */}
                <FilaFecha
                  etiqueta="FECHA DE BENEFICIO"
                  valor={fmtFecha(fechaBeneficio)}
                />
                <FilaFecha
                  etiqueta="FECHA DE PRODUCCIÓN"
                  valor={fmtFecha(registro.fecha)}
                />
                <FilaFecha etiqueta="VIDA ÚTIL" valor={vidaUtil} />
                <FilaFecha
                  etiqueta="FECHA DE VENCIMIENTO"
                  valor={fmtFecha(registro.fechaVencimiento)}
                  sinBorde
                />
              </div>

              {/* Columna derecha: NETO */}
              <div className="flex w-24 flex-col items-center justify-center border-l border-black">
                <p className="text-[9px] font-semibold">NETO(kg)</p>
                <p className="text-3xl font-extrabold leading-none">{neto}</p>
              </div>
            </div>

            {/* Origen: punto donde se genera la etiqueta */}
            <div className="flex flex-wrap items-center justify-start gap-x-2 gap-y-0.5 border-t border-black px-1 py-1">
              <p className="font-bold uppercase">CARNES SANTACRUZ</p>
              {puntoNombre && (
                <p className="font-bold uppercase">{puntoNombre}</p>
              )}
              {puntoDireccion && <span>{puntoDireccion}</span>}
              {puntoTelefono && <span>Tel. {puntoTelefono}</span>}
            </div>

            {/* Datos del destinatario (cliente seleccionado) */}
            {hayDestino && (
              <div className="space-y-0.5 border-t border-black px-1 py-1">
                <p className="font-bold uppercase">DESTINO: {destinoNombre}</p>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-tight">
                  {[
                    destDireccion && (
                      <span key="dir">
                        <span className="font-semibold">Dirección:</span>{' '}
                        {destDireccion}
                      </span>
                    ),
                    destTelefono && (
                      <span key="tel">
                        <span className="font-semibold">Teléfono:</span>{' '}
                        {destTelefono}
                      </span>
                    ),
                    destBarrio && (
                      <span key="bar">
                        <span className="font-semibold">Barrio:</span>{' '}
                        {destBarrio}
                      </span>
                    ),
                    destCiudad && (
                      <span key="ciu">
                        <span className="font-semibold">Ciudad:</span>{' '}
                        {destCiudad}
                      </span>
                    ),
                    destCorreo && (
                      <span key="cor">
                        <span className="font-semibold">Correo:</span>{' '}
                        {destCorreo}
                      </span>
                    ),
                  ]
                    .filter(Boolean)
                    .map((nodo, i) => (
                      <Fragment key={i}>
                        {i > 0 && (
                          <span className="font-bold text-black">|</span>
                        )}
                        {nodo}
                      </Fragment>
                    ))}
                </div>
              </div>
            )}

            {/* Conservación / instrucciones / empresa + responsable */}
            <div className="flex items-stretch border-t border-black">
              <div className="flex-1 space-y-0.5 px-1 py-1">
                <p>
                  <span className="font-bold">CONSERVACIÓN</span> {conservacion}
                </p>
                <p>
                  <span className="font-semibold">Instrucciones de uso:</span>{' '}
                  {instrucciones}
                </p>
                <p>
                  <span className="font-semibold">
                    Procesado y empacado por:
                  </span>{' '}
                  <span className="font-bold">{empresa}</span>
                </p>
                <p>{EMPRESA.direccion}</p>
              </div>
              <div className="flex w-16 shrink-0 flex-col justify-center border-l border-black px-1 text-[9px] leading-tight">
                <span>Responsable:</span>
                <span className="font-semibold">
                  {registro.responsable || '-'}
                </span>
              </div>
            </div>

            {/* Código de barras al lado del QR */}
            <div className="flex items-stretch border-t border-black">
              <div className="flex min-w-0 flex-1 items-center px-1">
                <Barras valor={`${lote}210430001`} />
              </div>
              <div className="flex w-16 shrink-0 items-center justify-center border-l border-black px-1">
                <Qr valor={qrTexto} />
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
  ajustar = false,
}: {
  titulo: string
  valor: string
  borde?: boolean
  ajustar?: boolean
}) {
  return (
    <div className={`px-1 py-0.5 ${borde ? 'border-r border-black' : ''}`}>
      <p className="font-semibold whitespace-nowrap">{titulo}</p>
      <p
        className={`font-mono ${
          ajustar ? 'text-[9px] leading-tight break-all' : 'whitespace-nowrap'
        }`}
      >
        {valor}
      </p>
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
  return <svg ref={ref} className="h-12 w-full max-w-full" />
}

// QR real generado con qrcode
function Qr({ valor }: { valor: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, valor || ' ', {
      margin: 0,
      width: 56,
    }).catch(() => {
      // no se pudo generar
    })
  }, [valor])
  return <canvas ref={ref} className="h-14 w-14" />
}
