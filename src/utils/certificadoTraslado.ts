// Certificado de traslado entre puntos de venta. Abre una ventana de impresion
// (lista para guardar como PDF) con los datos del traslado de producto.

export interface CertificadoTrasladoDatos {
  origen: string
  origenDireccion?: string
  origenTelefono?: string
  destino: string
  producto: string
  lote?: string
  cantidad?: number
  unidad?: string
  documento?: string
  responsable?: string
  fecha?: string
}

function fmtFecha(valor?: string): string {
  if (!valor) return '—'
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
  if (v == null || v === '') return '—'
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function imprimirCertificadoTraslado(
  datos: CertificadoTrasladoDatos,
): void {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return

  const cantidad =
    typeof datos.cantidad === 'number'
      ? `${datos.cantidad}${datos.unidad ? ` ${escape(datos.unidad)}` : ''}`
      : '—'

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Certificado de traslado</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      color: #1f2937;
    }
    .acta {
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .cabecera {
      display: flex;
      align-items: center;
      gap: 18px;
      background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
      color: #fff;
      padding: 22px 28px;
    }
    .cabecera img {
      height: 60px;
      object-fit: contain;
      background: #fff;
      border-radius: 10px;
      padding: 6px;
    }
    .cabecera h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: 1.5px;
      font-weight: 700;
    }
    .cabecera p { margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }
    .cuerpo { padding: 26px 28px 30px; }
    .ruta {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }
    .ruta .caja {
      background: #f8fafc;
      border: 1px solid #eef2f7;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .ruta .etq {
      display: block;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .ruta .nombre { font-size: 15px; font-weight: 700; color: #1f2937; }
    .ruta .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .ruta .flecha { font-size: 26px; color: #334155; text-align: center; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 0 1px #e2e8f0;
    }
    thead th {
      background: #334155;
      color: #fff;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    tbody td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; }
    tbody tr:last-child td { border-bottom: none; }
    .datos {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 18px;
      margin-top: 22px;
    }
    .datos .campo {
      background: #f8fafc;
      border: 1px solid #eef2f7;
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
    .datos .val { font-size: 13.5px; font-weight: 600; color: #1f2937; }
    .firma { margin-top: 60px; text-align: center; }
    .firma .linea {
      display: inline-block;
      min-width: 320px;
      border-top: 1px solid #334155;
      padding-top: 6px;
      font-size: 11px;
      color: #334155;
    }
    .pie {
      margin-top: 22px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .acta { box-shadow: none; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="acta">
    <div class="cabecera">
      <img src="/logos/carnes-santacruz.png" alt="Carnes Santacruz" />
      <div>
        <h1>CERTIFICADO DE TRASLADO</h1>
        <p>Carnes Santacruz · Programa de Trazabilidad</p>
      </div>
    </div>
    <div class="cuerpo">
      <div class="ruta">
        <div class="caja">
          <span class="etq">Punto de origen</span>
          <div class="nombre">${escape(datos.origen)}</div>
          ${datos.origenDireccion ? `<div class="sub">${escape(datos.origenDireccion)}</div>` : ''}
          ${datos.origenTelefono ? `<div class="sub">Tel. ${escape(datos.origenTelefono)}</div>` : ''}
        </div>
        <div class="flecha">&rarr;</div>
        <div class="caja">
          <span class="etq">Punto de destino</span>
          <div class="nombre">${escape(datos.destino)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th style="width:120px">Lote</th>
            <th style="width:110px">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escape(datos.producto)}</td>
            <td>${escape(datos.lote)}</td>
            <td>${cantidad}</td>
          </tr>
        </tbody>
      </table>

      <div class="datos">
        <div class="campo">
          <span class="etq">Fecha de traslado</span>
          <span class="val">${fmtFecha(datos.fecha)}</span>
        </div>
        <div class="campo">
          <span class="etq">Documento</span>
          <span class="val">${escape(datos.documento)}</span>
        </div>
        <div class="campo">
          <span class="etq">Responsable</span>
          <span class="val">${escape(datos.responsable)}</span>
        </div>
      </div>

      <div class="firma">
        <div class="linea">Firma responsable de recepción.</div>
      </div>

      <p class="pie">Documento generado por SIGTRAZ</p>
    </div>
  </div>
  <script>window.onload = () => { window.print() }</script>
</body>
</html>`)
  win.document.close()
}
