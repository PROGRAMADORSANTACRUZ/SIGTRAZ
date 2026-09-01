import type { Usuario } from '../../types/trazabilidad'

// Nombre del archivo de firma a partir del nombre del usuario logueado.
function archivoFirma(nombre: string): string {
  const slug = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
  return slug ? `/firmas/${slug}.png` : ''
}

const ESTILOS =
  `@page{size:letter;margin:0;}` +
  `*{box-sizing:border-box;}` +
  `body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;background:#e2e8f0;}` +
  `.barra{position:fixed;top:0;left:0;right:0;background:#1e293b;padding:8px 16px;display:flex;gap:8px;justify-content:flex-end;z-index:10;}` +
  `.barra button{font-family:Arial,sans-serif;font-size:13px;font-weight:600;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;background:#2563eb;color:#fff;}` +
  `.hoja{position:relative;width:816px;min-height:1056px;margin:60px auto;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.2);}` +
  `.fondo{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0;pointer-events:none;}` +
  `.contenido{position:relative;z-index:1;padding:170px 60px 150px;}` +
  `.titulo{text-align:center;font-size:16px;font-weight:bold;color:#2f9e44;letter-spacing:.5px;margin:0 0 20px;}` +
  `table.datos{border-collapse:collapse;width:100%;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.12);}` +
  `table.datos th{background:#4caf50;color:#fff;padding:8px 6px;text-transform:uppercase;font-size:10px;letter-spacing:.3px;border:1px solid #43a047;text-align:center;}` +
  `table.datos td{border:1px solid #c8e6c9;padding:6px 8px;color:#2e7d32;text-align:center;}` +
  `table.datos tbody tr:nth-child(even){background:#f1f8e9;}` +
  `.firma{margin-top:70px;text-align:center;}` +
  `.firma img{width:170px;height:auto;display:block;margin:0 auto -6px;}` +
  `.firma .nombre{font-weight:bold;border-top:1px solid #333;display:inline-block;padding:6px 24px 0;}` +
  `.firma .cargo{margin-top:2px;font-size:12px;}` +
  `@media print{.barra{display:none;}.hoja{margin:0;width:100%;min-height:100vh;box-shadow:none;}}`

// Documento HTML estetico de Cronologia con membrete y firma del usuario logueado.
export function documentoCronologia(
  encabezado: string,
  cuerpo: string,
  usuario: Usuario | null,
  especie: 'BOVINA' | 'PORCINA',
): string {
  const origin = window.location.origin
  const membrete = `${origin}/plantillas/membrete-cronologia.png`
  const nombre =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() ||
    usuario?.email ||
    ''
  const rel = archivoFirma(nombre)
  const firma = rel ? `${origin}${rel}` : ''
  const nombreSeguro = nombre.toUpperCase().replace(/[&<>]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;',
  )
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cronologia</title>` +
    `<style>${ESTILOS}</style></head><body>` +
    `<div class="barra"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>` +
    `<div class="hoja">` +
    `<img class="fondo" src="${membrete}" alt="" onerror="this.style.display='none'"/>` +
    `<div class="contenido">` +
    `<div class="titulo">CRONOLOGIA DENTARIA ${especie}</div>` +
    `<table class="datos"><thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table>` +
    `<div class="firma">` +
    (firma ? `<img src="${firma}" alt="" onerror="this.style.display='none'"/>` : '') +
    `<div class="nombre">${nombreSeguro}</div>` +
    `<div class="cargo">Frigorífico Agropecuaria Santacruz.</div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `</body></html>`
  )
}
