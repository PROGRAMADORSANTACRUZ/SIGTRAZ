// Acta de despacho para clientes institucionales. Genera una ventana de
// impresion (lista para guardar como PDF) con un diseno de membrete comun a los
// modulos de Acondicionamiento y Salida.

export interface ActaItem {
  producto: string
  lote?: string
  cantidad?: number
  unidad?: string
  // Datos para el certificado de calidad (segunda pagina).
  codigo?: string
  fechaBeneficio?: string
  fechaEmpaque?: string
  fechaVencimiento?: string
}

export interface ActaDespachoDatos {
  titulo?: string
  cliente?: string
  destino?: string
  fecha?: string
  documento?: string
  responsable?: string
  observaciones?: string
  items: ActaItem[]
  // Certificado de calidad (segunda pagina) — todos opcionales.
  certificado?: boolean
  puntoVenta?: string
  placaVehiculo?: string
  temperaturaVehiculo?: string
  condicionesTransporte?: string
  temperaturaProducto?: string
  olor?: string
  color?: string
  aspecto?: string
}

function fmtFechaHora(valor?: string): string {
  if (!valor) return ''
  const d = new Date(valor)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const [a, m, dia] = valor.slice(0, 10).split('-')
  return a && m && dia ? `${dia}/${m}/${a}` : valor
}

function fmtFecha(valor?: string): string {
  if (!valor) return ''
  const d = new Date(valor)
  if (!Number.isNaN(d.getTime()) && valor.length > 10) {
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  const [a, m, dia] = valor.slice(0, 10).split('-')
  return a && m && dia ? `${dia}/${m}/${a}` : valor
}

function escape(v?: string | number | null): string {
  if (v == null || v === '') return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function imprimirActaDespacho(datos: ActaDespachoDatos): void {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return

  const titulo = datos.titulo ?? 'ACTA DE DESPACHO'
  const consecutivo = datos.documento?.trim() || 'S/N'

  const totalCantidad = datos.items.reduce(
    (acc, it) => acc + (typeof it.cantidad === 'number' ? it.cantidad : 0),
    0,
  )
  const unidadTotal = datos.items.find((it) => it.unidad)?.unidad ?? ''

  const filas = datos.items
    .map(
      (it, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${escape(it.producto)}</td>
          <td class="c">${escape(it.lote) || '&mdash;'}</td>
          <td class="c num">${it.cantidad != null ? escape(it.cantidad) : '&mdash;'}</td>
          <td class="c">${escape(it.unidad) || '&mdash;'}</td>
        </tr>`,
    )
    .join('')

  // Segunda pagina (certificado de calidad). Se muestra salvo certificado=false.
  const mostrarCertificado = datos.certificado !== false
  const clienteCert = escape(datos.cliente) || escape(datos.destino) || '&mdash;'
  const puntoVenta = escape(datos.puntoVenta) || '&mdash;'
  const placaVehiculo = escape(datos.placaVehiculo) || '&mdash;'
  const tempVehiculo = datos.temperaturaVehiculo?.trim()
    ? `${escape(datos.temperaturaVehiculo)} °C`
    : '&mdash;'
  const condTransporte = escape(datos.condicionesTransporte) || 'Aceptable'
  const tempProducto = datos.temperaturaProducto?.trim()
    ? `${escape(datos.temperaturaProducto)} °C`
    : '&mdash;'
  const olorCert = escape(datos.olor) || 'Característico del producto'
  const colorCert = escape(datos.color) || 'Característico del producto'
  const aspectoCert = escape(datos.aspecto) || 'Consistente y firme al tacto'

  const filasCert = datos.items
    .map(
      (it) => `
        <tr>
          <td class="c">${escape(it.codigo) || '&mdash;'}</td>
          <td>${escape(it.producto)}</td>
          <td class="c">${escape(it.lote) || '&mdash;'}</td>
          <td class="c">${fmtFecha(it.fechaBeneficio) || '&mdash;'}</td>
          <td class="c">${fmtFecha(it.fechaEmpaque) || '&mdash;'}</td>
          <td class="c">${fmtFecha(it.fechaVencimiento) || '&mdash;'}</td>
        </tr>`,
    )
    .join('')

  const certificadoHtml = mostrarCertificado
    ? `
    <div class="acta pagina2">
      <div class="cert-head">
        <div class="cert-logo"><img src="/logos/carnes-santacruz.png" alt="Carnes Santacruz" /></div>
        <div class="cert-title">CERTIFICADO DE CALIDAD</div>
      </div>

      <div class="cert-body">
        <div class="cert-datos">
          <p><b>FECHA DE EMISIÓN:</b> ${fmtFecha(datos.fecha) || '&mdash;'}</p>
          <p><b>PUNTO DE VENTA:</b> ${puntoVenta}</p>
          <p><b>CLIENTE:</b> ${clienteCert}</p>
          <p><b>PLACA DE VEHÍCULO:</b> ${placaVehiculo}</p>
          <p><b>TEMPERATURA DEL VEHÍCULO:</b> ${tempVehiculo}</p>
          <p><b>CONDICIONES HIGIÉNICO SANITARIAS DEL TRANSPORTE:</b> ${condTransporte}</p>
        </div>

        <h2 class="cert-sub">INFORMACIÓN DEL PRODUCTO</h2>
        <p class="cert-parrafo">
          <b>EL DEPARTAMENTO DE CALIDAD DE CARNES SANTACRUZ</b> certifica que las
          referencias y cantidades relacionadas en la factura adjunta cumplen con las
          características sensoriales de acuerdo con la ficha técnica.
        </p>

        <table class="cert-tabla">
          <thead>
            <tr>
              <th style="width:70px">CÓDIGO</th>
              <th>REFERENCIA</th>
              <th style="width:70px">LOTE</th>
              <th style="width:90px">FECHA DE BENEFICIO</th>
              <th style="width:90px">FECHA DE EMPAQUE</th>
              <th style="width:90px">FECHA DE VENCIMIENTO</th>
            </tr>
          </thead>
          <tbody>${filasCert}</tbody>
        </table>

        <div class="cert-sensorial">
          <p><b>TEMPERATURA DEL PRODUCTO:</b> ${tempProducto}</p>
          <p><b>OLOR:</b> ${olorCert}</p>
          <p><b>COLOR:</b> ${colorCert}</p>
          <p><b>ASPECTO Y/O TEXTURA:</b> ${aspectoCert}</p>
        </div>

        <h2 class="cert-sub center">CARACTERÍSTICAS DE ALMACENAMIENTO</h2>
        <p class="cert-parrafo">
          La conservación del producto refrigerado debe ser a temperaturas de 4ºC o
          menos. Y para producto congelado de -18ºC. El sitio de almacenamiento debe
          permanecer en condiciones sanitarias óptimas.
        </p>

        <div class="cert-firma">
          ${
            datos.firmaCalidad?.trim()
              ? `<div class="nombre">${escape(datos.firmaCalidad)}</div>`
              : ''
          }
          <div class="linea">Firma líder de calidad.</div>
        </div>

        <p class="cert-pie">Divulgación, uso o reproducción solo para las personas involucradas.</p>
      </div>
    </div>`
    : ''

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escape(titulo)} ${escape(consecutivo)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1f2937;
    padding: 32px 40px;
    background: #f1f5f9;
  }
  .acta {
    position: relative;
    isolation: isolate;
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    overflow: hidden;
  }
  .acta::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: url('/logos/carnes-santacruz.png') center 46% / 62% no-repeat;
    opacity: 0.06;
    pointer-events: none;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .cabecera {
    display: flex;
    align-items: stretch;
    border: 1px solid #94a3b8;
    margin: 24px 28px 0;
  }
  .cab-logo {
    width: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #94a3b8;
    padding: 10px;
  }
  .cab-logo img { max-height: 64px; max-width: 110px; object-fit: contain; }
  .cab-title {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8px;
  }
  .cab-h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #64748b;
  }
  .cab-sub { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .doc-box {
    min-width: 170px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: right;
    font-size: 11px;
    color: #64748b;
    border-left: 1px solid #94a3b8;
    padding: 10px 14px;
  }
  .doc-box .doc-lbl {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    font-weight: 700;
  }
  .doc-box strong {
    color: #1f2937;
    font-size: 18px;
    letter-spacing: 0.5px;
    display: block;
    margin: 2px 0;
  }
  .cuerpo { padding: 26px 28px 30px; }
  .datos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 18px;
    margin-bottom: 24px;
  }
  .datos .campo {
    background: transparent;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #334155;
    border-radius: 8px;
    padding: 8px 12px;
  }
  .datos .etq {
    display: block;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    font-weight: 700;
    margin-bottom: 3px;
  }
  .datos .val {
    font-size: 13.5px;
    font-weight: 600;
    color: #1f2937;
    min-height: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead th {
    background: transparent;
    color: #1f2937;
    border: 1px solid #64748b;
    padding: 8px 10px;
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  tbody td { border: 1px solid #64748b; padding: 8px 10px; }
  td.c { text-align: center; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  tfoot td {
    padding: 8px 10px;
    font-weight: 700;
    background: transparent;
    color: #1e293b;
    border: 1px solid #64748b;
  }
  tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .obs {
    margin-top: 20px;
    font-size: 12px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    min-height: 54px;
  }
  .obs .etq {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    font-weight: 700;
    display: block;
    margin-bottom: 6px;
  }
  .firmas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 70px;
  }
  .firma { text-align: center; }
  .firma .linea { border-top: 1.5px solid #475569; padding-top: 8px; }
  .firma .rol { font-weight: 700; font-size: 12px; color: #1f2937; }
  .firma .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .pie {
    margin-top: 34px;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    border-top: 1px solid #eef2f7;
    padding-top: 10px;
  }
  /* Segunda pagina: certificado de calidad */
  .pagina2 { margin-top: 26px; page-break-before: always; }
  .cert-head {
    display: flex;
    align-items: stretch;
    border: 1px solid #94a3b8;
    margin: 24px 28px 0;
  }
  .cert-logo {
    width: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #94a3b8;
    padding: 10px;
  }
  .cert-logo img { max-height: 64px; max-width: 110px; object-fit: contain; }
  .cert-title {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #64748b;
  }
  .cert-body { padding: 18px 28px 22px; color: #1f2937; }
  .cert-datos p { margin: 8px 0; font-size: 12px; }
  .cert-datos b { font-weight: 700; }
  .cert-sub {
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    margin: 16px 0 8px;
    letter-spacing: .5px;
  }
  .cert-sub.center { margin-top: 24px; }
  .cert-parrafo { font-size: 12px; line-height: 1.5; margin: 6px 0; text-align: justify; }
  .cert-tabla {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 11px;
  }
  .cert-tabla th, .cert-tabla td {
    border: 1px solid #64748b;
    padding: 5px 6px;
    vertical-align: middle;
  }
  .cert-tabla th {
    text-align: center;
    font-weight: 700;
    background: transparent;
    color: #1f2937;
    text-transform: none;
    letter-spacing: 0;
    line-height: 1.2;
  }
  .cert-tabla td.c { text-align: center; }
  .cert-tabla tr.vacia td { height: 20px; }
  .cert-sensorial p { margin: 8px 0; font-size: 12px; }
  .cert-sensorial b { font-weight: 700; }
  .cert-firma {
    margin-top: 56px;
    text-align: center;
  }
  .cert-firma .linea {
    display: inline-block;
    min-width: 320px;
    border-top: 1px solid #334155;
    padding-top: 6px;
    font-size: 11px;
    color: #334155;
  }
  .cert-firma .nombre {
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 700;
    color: #1f2937;
    text-transform: uppercase;
  }
  .cert-pie {
    margin-top: 40px;
    text-align: center;
    font-size: 10px;
    font-style: italic;
    color: #64748b;
  }
  @media print {
    body { padding: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .acta { box-shadow: none; border-radius: 0; }
    .acta::before { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="acta">
    <div class="cabecera">
      <div class="cab-logo">
        <img src="/logos/carnes-santacruz.png" alt="Carnes Santacruz" />
      </div>
      <div class="cab-title">
        <div class="cab-h1">${escape(titulo)}</div>
        <div class="cab-sub">Carnes Santacruz &middot; Programa de Trazabilidad</div>
      </div>
      <div class="doc-box">
        <span class="doc-lbl">N&deg; Documento</span>
        <strong>${escape(consecutivo)}</strong>
        <div>${fmtFechaHora(datos.fecha)}</div>
      </div>
    </div>

    <div class="cuerpo">
      <div class="datos">
        <div class="campo">
          <span class="etq">Cliente institucional</span>
          <span class="val">${escape(datos.cliente) || '&mdash;'}</span>
        </div>
        <div class="campo">
          <span class="etq">Destino</span>
          <span class="val">${escape(datos.destino) || '&mdash;'}</span>
        </div>
        <div class="campo">
          <span class="etq">Responsable de entrega</span>
          <span class="val">${escape(datos.responsable) || '&mdash;'}</span>
        </div>
        <div class="campo">
          <span class="etq">Fecha y hora</span>
          <span class="val">${fmtFechaHora(datos.fecha) || '&mdash;'}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Producto</th>
            <th style="width:140px">Lote</th>
            <th style="width:90px">Cantidad</th>
            <th style="width:80px">Unidad</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">Total (${datos.items.length} ítem${datos.items.length === 1 ? '' : 's'})</td>
            <td class="num">${escape(totalCantidad)}</td>
            <td class="c">${escape(unidadTotal) || '&mdash;'}</td>
          </tr>
        </tfoot>
      </table>

      <div class="obs">
        <span class="etq">Observaciones</span>
        ${escape(datos.observaciones) || '&mdash;'}
      </div>

      <div class="firmas">
        <div class="firma">
          <div class="linea">
            <div class="rol">Entrega</div>
            <div class="sub">Carnes Santacruz</div>
          </div>
        </div>
        <div class="firma">
          <div class="linea">
            <div class="rol">Recibe conforme</div>
            <div class="sub">Cliente / C.C.</div>
          </div>
        </div>
      </div>

      <div class="pie">
        Documento generado por SIGTRAZ &middot; ${fmtFechaHora(new Date().toISOString())}
      </div>
    </div>
  </div>
  ${certificadoHtml}
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body>
</html>`)
  win.document.close()
}
