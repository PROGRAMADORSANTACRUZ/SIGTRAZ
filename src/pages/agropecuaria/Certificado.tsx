import { useEffect, useState } from 'react'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { useAuth } from '../../store/AuthContext'
import { agregarMovimiento } from './movimientosStore'
import { clientesSeed, type ClienteAgro } from './clientesSeed'
import { cargarFirmantes, cargarSucursales } from './sucursalesStore'
import { SelectorBuscable } from '../../components/SelectorBuscable'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import {
  prediosSeed,
  municipiosSeed,
  departamentosSeed,
} from './datosCatalogos'
import { useCatalogo } from './catalogosStore'

const STORAGE_KEY = 'agro_certificados'
const CLIENTES_KEY = 'agro_clientes'
const CURVA_KEY = 'agro_curva_canales'
// Plantilla Word (.docx) con la marca de agua real en el encabezado y
// marcadores {numero} {fecha} {dirigido} {cuerpo} {firmante} {cargo}.
const PLANTILLA_WORD = '/plantillas/certificado-plantilla.docx'
const MEMBRETES = [
  '/logos/marca%20de%20agua.png',
  '/logos/membrete.png',
  '/logos/membrete.jpg',
  '/logos/certificado-membrete.png',
  '/plantillas/certificado-membrete.png',
  '/plantillas/certificado-membrete.jpg',
  '/plantillas/membrete.png',
]

interface GuiaTransporte {
  fecha: string
  lote: string
  guiaSanitaria: string
  granja: string
  municipios: string
  departamentos: string
  totalSacrificados: string
}

interface MedicionCurva {
  id: string
  hora: string
  canal: string
  tcCanal: string
  tcCuarto: string
  verificado: string
}

interface OrdenCurva {
  id: string
  consecutivo: string
  fecha: string
  cliente: string
  lote: string
  cuartoFrio: string
  numeroGuia: string
  mediciones: MedicionCurva[]
}

function cargarCurvas(): OrdenCurva[] {
  try {
    const raw = localStorage.getItem(CURVA_KEY)
    if (raw) return JSON.parse(raw) as OrdenCurva[]
  } catch {
    // sin curvas registradas
  }
  return []
}

interface Certificado {
  id: string
  numero: string
  fecha: string
  digitadoPor: string
  dirigidoA: string
  kilos: string
  fechaSacrificio: string
  fechaProduccion: string
  fechaDespacho: string
  tienda: string
  lote: string
  lotes: string[]
  tcProducto: string
  tcAlmacenamiento: string
  color: string
  olor: string
  textura: string
  aspectoGeneral: string
  guias: GuiaTransporte[]
  curvaFecha: string
  curvaHora: string
  curvaCanal: string
  curvaTcCanal: string
  curvaTcCuarto: string
  curvaVerificado: string
  curvaAlmacenImg: string
  cuerpo: string
  firmante: string
  cargo: string
  sucursal: string
}

// Titulos de las secciones 2 a 5 del cuestionario.
const SECCIONES = [
  'Certificado de sacrificio',
  'Guía de transporte',
  'Curva de temperatura de canales',
  'Curva de temperatura de cuarto de almacenamiento',
]

const formVacio = (): Omit<Certificado, 'id'> => ({
  numero: '',
  fecha: '',
  digitadoPor: '',
  dirigidoA: '',
  kilos: '',
  fechaSacrificio: '',
  fechaProduccion: '',
  fechaDespacho: '',
  tienda: '',
  lote: '',
  lotes: [],
  tcProducto: '',
  tcAlmacenamiento: '',
  color: '',
  olor: 'Característico',
  textura: 'Firme Y Elástico A Compresión',
  aspectoGeneral: 'Sin Ningún Tipo De Contaminación',
  guias: [],
  curvaFecha: '',
  curvaHora: '',
  curvaCanal: '',
  curvaTcCanal: '',
  curvaTcCuarto: '',
  curvaVerificado: '',
  curvaAlmacenImg: '',
  cuerpo: '',
  firmante: '',
  cargo: '',
  sucursal: '',
})

// Numero consecutivo por regla: ASC-1, ASC-2, ...
function siguienteNumero(certs: Certificado[]): string {
  let max = 0
  certs.forEach((c) => {
    const m = /ASC-(\d+)/i.exec(c.numero || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return `ASC-${max + 1}`
}

function formatearFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso || ''
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  ]
  const mes = meses[parseInt(m[2], 10) - 1] || ''
  return `${m[3]} DE ${mes} ${m[1]}`
}

function fechaCorta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || ''
}

// Devuelve la fecha (YYYY-MM-DD) del dia siguiente.
function diaSiguiente(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return ''
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA')
}

// Info de la guia (N° guia, predio, municipio, departamento, total) desde Ante
// Mortem para un lote, priorizando el registro de la misma fecha de ingreso.
function infoGuiaAnteMortem(lote: string, fecha: string) {
  const l = lote.trim().toUpperCase()
  if (!l) return null
  let ante: Array<Record<string, unknown>> = []
  try {
    ante = JSON.parse(localStorage.getItem('agro_antemortem') || '[]')
  } catch {
    ante = []
  }
  const reg =
    ante.find(
      (r) =>
        String(r.loteSacrificio || '').trim().toUpperCase() === l &&
        String(r.fechaIngreso || '') === fecha,
    ) ||
    ante.find((r) => String(r.loteSacrificio || '').trim().toUpperCase() === l)
  if (!reg) return null
  const total =
    (Number(reg.novillo) || 0) +
    (Number(reg.vaca) || 0) +
    (Number(reg.toro) || 0) +
    (Number(reg.bufalo) || 0)
  return {
    guiaSanitaria: String(reg.numeroGuia || ''),
    granja: String(reg.predio || ''),
    municipios: String(reg.municipio || ''),
    departamentos: String(reg.departamento || ''),
    totalSacrificados: total ? String(total) : '',
  }
}

function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return iso || ''
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  const mes = meses[parseInt(m[2], 10) - 1] || ''
  return `${m[3]} de ${mes} de ${m[1]}`
}

function fechasSacrificioTexto(valor: string): string {
  return (valor || '')
    .split(' - ')
    .filter(Boolean)
    .map(fechaCorta)
    .join('-')
}

async function cargarMembrete(): Promise<string | null> {
  for (const ruta of MEMBRETES) {
    try {
      const resp = await fetch(ruta)
      if (!resp.ok) continue
      const blob = await resp.blob()
      if (!blob.type.startsWith('image/')) continue
      return await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onloadend = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })
    } catch {
      // intenta la siguiente ruta
    }
  }
  return null
}

async function cargarImagen(ruta: string): Promise<string | null> {
  try {
    const resp = await fetch(ruta)
    if (!resp.ok) return null
    const blob = await resp.blob()
    if (!blob.type.startsWith('image/')) return null
    return await new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onloadend = () => res(reader.result as string)
      reader.onerror = rej
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Normaliza una imagen (dataURL) a PNG y devuelve base64 + dimensiones naturales.
function prepararImagenPng(
  dataUrl: string,
): Promise<{ base64: string; w: number; h: number }> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return rej(new Error('sin contexto'))
      ctx.drawImage(img, 0, 0)
      const png = canvas.toDataURL('image/png')
      res({
        base64: png.split(',')[1] || '',
        w: img.naturalWidth,
        h: img.naturalHeight,
      })
    }
    img.onerror = rej
    img.src = dataUrl
  })
}

// Inserta la imagen de la curva de almacenamiento como una nueva página del .docx.
async function inyectarImagenAlmacen(
  zip: PizZip,
  dataUrl: string,
): Promise<void> {
  const img = await prepararImagenPng(dataUrl)
  zip.file('word/media/imageAlmacen.png', img.base64, { base64: true })

  const ctPath = '[Content_Types].xml'
  const ctFile = zip.file(ctPath)
  if (ctFile) {
    let ct = ctFile.asText()
    if (!/Extension="png"/i.test(ct)) {
      ct = ct.replace(
        '</Types>',
        '<Default Extension="png" ContentType="image/png"/></Types>',
      )
      zip.file(ctPath, ct)
    }
  }

  const relsPath = 'word/_rels/document.xml.rels'
  const relId = 'rIdAlmacenCurva'
  const relsFile = zip.file(relsPath)
  if (relsFile) {
    let rels = relsFile.asText()
    if (!rels.includes(relId)) {
      rels = rels.replace(
        '</Relationships>',
        `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/imageAlmacen.png"/></Relationships>`,
      )
      zip.file(relsPath, rels)
    }
  }

  // Ajusta la imagen a ~16.5 cm de ancho conservando proporción.
  const cx = 5940000
  const cy = Math.max(1, Math.round((cx * img.h) / img.w))

  const encTbl =
    '<w:tbl><w:tblPr><w:tblW w:w="8838" w:type="dxa"/><w:tblBorders>' +
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>' +
    '</w:tblBorders></w:tblPr><w:tblGrid>' +
    '<w:gridCol w:w="2600"/><w:gridCol w:w="4200"/><w:gridCol w:w="2038"/></w:tblGrid>' +
    '<w:tr>' +
    '<w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' +
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing>' +
    '<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="620000" cy="574000"/>' +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="201" name="LogoAlmacen"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="201" name="LogoAlmacen"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="rId10"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="620000" cy="574000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:tc>' +
    '<w:tc><w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' +
    '<w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr>' +
    '<w:t>CURVA DE TEMPERATURA DE CUARTO DE ALMACENAMIENTO</w:t></w:r></w:p></w:tc>' +
    '<w:tc><w:tcPr><w:tcW w:w="2038" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>' +
    '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Fecha de versi&#243;n: 08 de abril de 2019</w:t></w:r></w:p>' +
    '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Codigo: F-TC-41</w:t></w:r></w:p>' +
    '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Versi&#243;n: 08</w:t></w:r></w:p></w:tc>' +
    '</w:tr></w:tbl>'

  const imgP =
    '<w:p><w:pPr><w:spacing w:before="240"/><w:jc w:val="center"/></w:pPr>' +
    '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
    '<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="300" name="CurvaAlmacen"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="300" name="CurvaAlmacen"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="rIdAlmacenCurva"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'

  const breakP = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
  const bloque = breakP + encTbl + imgP

  const docPath = 'word/document.xml'
  const docFile = zip.file(docPath)
  if (docFile) {
    let xml = docFile.asText()
    const idx = xml.lastIndexOf('<w:sectPr')
    if (idx !== -1) {
      xml = xml.slice(0, idx) + bloque + xml.slice(idx)
      zip.file(docPath, xml)
    }
  }
}

function cargarClientes(): ClienteAgro[] {
  try {
    const raw = localStorage.getItem(CLIENTES_KEY)
    if (raw) return JSON.parse(raw) as ClienteAgro[]
  } catch {
    // usa la semilla si no hay datos guardados
  }
  return clientesSeed
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function construirHTML(
  cert: Certificado,
  membrete: string | null,
  logo: string | null,
  curvasCliente: OrdenCurva[] = [],
): string {
  const fondo = membrete
    ? `<img src="${membrete}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;" />`
    : ''
  const logoImg = logo
    ? `<img src="${logo}" style="width:2.8cm;height:auto;" />`
    : ''
  const guiasHTML = (cert.guias || [])
    .map(
      (g) => `<div class="pagina pagina3">${fondo}<div class="contenido">
  <div class="fecha">MALAMBO, ${formatearFecha(cert.fecha)}</div>
  <div class="invima"><b>Código Invima:</b> 072PD</div>
  <p class="suscrito">El suscrito Médico veterinario de Frigorífico Agropecuaria Santacruz Ltda.</p>
  <p class="certifica-t">CERTIFICA</p>
  <p class="parrafo">Que el día ${fechaLarga(g.fecha)} fueron sacrificados ${escaparHtml(g.totalSacrificados)} animales a nombre de ${escaparHtml(cert.dirigidoA || 'CARNES SANTACRUZ')}.</p>
  <table class="tabla-guia">
    <tr><th>N° GUIA SANITARIA</th><th>PREDIOS</th><th>MUNICIPIOS</th><th>DEPARTAMENTOS</th><th>TOTAL SACRIFICADOS</th></tr>
    <tr><td>${escaparHtml(g.guiaSanitaria)}</td><td>${escaparHtml(g.granja)}</td><td>${escaparHtml(g.municipios)}</td><td>${escaparHtml(g.departamentos)}</td><td>${escaparHtml(g.totalSacrificados)}</td></tr>
  </table>
  <p class="parrafo cuerpo-guia">Donde fueron inspeccionadas por el médico veterinario de planta y medico inspector del Invima ante mortem y post mortem, bajo las rutinas aceptadas internacionales y legisladas en nuestro país, no se encontró ningún síntoma ni hallazgo macroscópico de enfermedades contagiosas y de notificación obligatoria en canales y vísceras, por lo que se declaran aptas para el consumo humano sin afectación en la salud pública.</p>
  <div class="firma-guia">
    <div>Juan Camilo Alean</div>
    <div>Médico Veterinario.</div>
    <div>Frigorífico Agropecuaria SantaCruz</div>
  </div>
</div></div>`,
    )
    .join('')
  const curvaHTML = (curvasCliente || [])
    .map((o) => {
      const filas = (o.mediciones || [])
        .map(
          (m) => `<tr>
      <td>${escaparHtml(fechaCorta(o.fecha))}</td>
      <td>${escaparHtml(m.hora)}</td>
      <td>${escaparHtml(m.canal)}</td>
      <td>${escaparHtml(m.tcCanal ? m.tcCanal + '°C' : '')}</td>
      <td>${escaparHtml(m.tcCuarto ? m.tcCuarto + '°C' : '')}</td>
      <td>${escaparHtml(m.verificado)}</td>
    </tr>`,
        )
        .join('')
      return `<div class="pagina pagina4">${fondo}<div class="contenido">
  <table class="enc"><tr>
    <td class="col-logo">${logoImg}</td>
    <td class="col-titulo">MONITOREO DE TEMPERATURAS DE CANAL</td>
    <td class="col-codigo"><table>
      <tr><td>Fecha de versión: 08 de abril de 2019</td></tr>
      <tr><td>Codigo: F-TC-40</td></tr>
      <tr><td>Versión: 08</td></tr>
    </table></td>
  </tr></table>
  <table class="canal-meta">
    <tr>
      <td class="cuarto" rowspan="2">Cuarto N°: ${escaparHtml(o.cuartoFrio || '')}</td>
      <td class="lbl">Cliente:</td><td class="val">${escaparHtml(cert.dirigidoA || '')}</td>
    </tr>
    <tr>
      <td class="lbl">T°C DEL CUARTO FRIO:</td><td class="val"></td>
    </tr>
  </table>
  <table class="tabla-canal">
    <tr><th>Fecha</th><th>Hora</th><th>Canal</th><th>T°C canal</th><th>T°C cuarto</th><th>Verificado por:</th></tr>
    ${filas}
  </table>
  <table class="canal-foot">
    <tr>
      <td class="acc">ACCIONES CORRECTIVAS/OBSERVACIONES:</td>
      <td class="par">
        <div class="par-title">Parametros</div>
        <div>T° cuarto: (-1 a 4°C)</div>
        <div>T° canal: (0 a 4°C) 36 h</div>
        <div>Ph: 5.4 a 5.8</div>
        <div>Nota: Si se evidencia una desviacion por favor informe de inmediato.</div>
      </td>
    </tr>
  </table>
</div></div>`
    })
    .join('')
  const almacenHTML = cert.curvaAlmacenImg
    ? `<div class="pagina pagina5">${fondo}<div class="contenido">
  <table class="enc"><tr>
    <td class="col-logo">${logoImg}</td>
    <td class="col-titulo">CURVA DE TEMPERATURA DE CUARTO DE ALMACENAMIENTO</td>
    <td class="col-codigo"><table>
      <tr><td>Fecha de versión: 08 de abril de 2019</td></tr>
      <tr><td>Codigo: F-TC-41</td></tr>
      <tr><td>Versión: 08</td></tr>
    </table></td>
  </tr></table>
  <div class="almacen-img"><img src="${cert.curvaAlmacenImg}" /></div>
</div></div>`
    : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comunicado</title>
<style>
  @page { size: A4; margin: 0; }
  body { font-family: 'Arial', sans-serif; margin: 0; color: #111; }
  .pagina { position: relative; width: 21cm; min-height: 29.7cm; box-sizing: border-box; padding: 3.5cm 3cm 3cm 3cm; }
  .pagina2 { page-break-before: always; }
  .contenido { position: relative; z-index: 1; font-size: 15px; }
  .fecha { font-weight: bold; margin-bottom: 28px; }
  .senores { font-weight: bold; margin: 0 0 12px; }
  .dest { font-weight: bold; margin: 0 0 28px; }
  .saludo { margin: 0 0 20px; }
  .parrafo { text-align: justify; line-height: 1.6; margin: 0 0 24px; }
  .lista { list-style: none; padding-left: 1.2cm; margin: 0 0 28px; }
  .lista li { margin-bottom: 6px; }
  .lista li::before { content: '\\2713'; margin-right: 12px; }
  .firma { margin-top: 3cm; }
  .firma .linea { border-top: 1px solid #111; width: 7cm; margin-bottom: 4px; }
  .enc { width: 100%; border-collapse: collapse; }
  .enc td { border: 1px solid #000; padding: 6px; text-align: center; vertical-align: middle; }
  .enc .col-logo { width: 28%; }
  .enc .col-titulo { width: 44%; font-weight: bold; font-size: 15px; }
  .enc .col-codigo { width: 28%; font-size: 12px; padding: 0; }
  .enc .col-codigo table { width: 100%; border-collapse: collapse; }
  .enc .col-codigo td { border: none; border-bottom: 1px solid #000; padding: 6px 4px; }
  .enc .col-codigo tr:last-child td { border-bottom: none; }
  .depto { text-align: center; font-weight: bold; margin-top: 14px; line-height: 1.5; }
  .datos { margin-top: 18px; font-size: 14px; line-height: 1.7; }
  .datos b { font-weight: bold; }
  .tabla { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
  .tabla th, .tabla td { border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; }
  .tabla th { background: #7bc043; color: #000; font-weight: bold; }
  .nota { font-weight: bold; font-size: 12px; margin-top: 6px; }
  .parrafo-conf { text-align: justify; line-height: 1.6; margin-top: 22px; font-size: 14px; }
  .firma-conf { margin-top: 26px; font-size: 14px; line-height: 1.5; }
  .firma-conf .linea { border-top: 1px solid #111; width: 6cm; margin-bottom: 4px; }
  .pagina3 { page-break-before: always; }
  .invima { font-weight: bold; margin: 0 0 26px; }
  .invima b { font-weight: bold; }
  .suscrito { margin: 0 0 10px; padding-left: 1.2cm; }
  .certifica-t { text-align: center; font-weight: bold; margin: 0 0 18px; }
  .cuerpo-guia { margin-top: 26px; }
  .tabla-guia { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  .tabla-guia th, .tabla-guia td { border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; }
  .tabla-guia th { font-weight: bold; }
  .firma-guia { margin-top: 2.5cm; font-size: 14px; line-height: 1.4; }
  .pagina4 { page-break-before: always; }
  .canal-meta { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 0; }
  .canal-meta td { border: 1px solid #000; padding: 5px 8px; }
  .canal-meta .cuarto { font-weight: bold; width: 22%; vertical-align: middle; }
  .canal-meta .lbl { font-weight: bold; text-align: left; width: 30%; }
  .tabla-canal { width: 100%; border-collapse: collapse; font-size: 12px; }
  .tabla-canal th, .tabla-canal td { border: 1px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; }
  .tabla-canal th { font-weight: bold; }
  .canal-foot { width: 100%; border-collapse: collapse; font-size: 12px; }
  .canal-foot td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
  .canal-foot .acc { width: 68%; height: 120px; font-weight: bold; }
  .canal-foot .par div { margin-bottom: 4px; }
  .canal-foot .par-title { font-weight: bold; }
  .pagina5 { page-break-before: always; }
  .almacen-img { margin-top: 18px; text-align: center; }
  .almacen-img img { max-width: 100%; max-height: 22cm; height: auto; }
</style></head>
<body><div class="pagina">${fondo}<div class="contenido">
  <div class="fecha">MALAMBO, ${formatearFecha(cert.fecha)}</div>
  <p class="senores">SEÑORES</p>
  <p class="dest">${escaparHtml(cert.dirigidoA || 'CARNES SANTACRUZ')}</p>
  <p class="saludo">Respetados señores:</p>
  <p class="parrafo">Adjunto a la presente estamos enviando la siguiente documentación, relacionada con el despacho de ${escaparHtml(cert.kilos || '8262.48')} canales despostadas.</p>
  <ul class="lista">
    <li>Certificados de calidad</li>
    <li>Certificado de sacrificio</li>
    <li>Guía de transporte</li>
    <li>Curva de temperatura de canales.</li>
    <li>Curva de temperatura de cuarto de almacenamiento.</li>
  </ul>
  <div class="firma">
    <div class="linea"></div>
    <div>Analista de Calidad</div>
    <div>Agropecuaria Santacruz</div>
  </div>
</div></div>
<div class="pagina pagina2">${fondo}<div class="contenido">
  <table class="enc"><tr>
    <td class="col-logo">${logoImg}</td>
    <td class="col-titulo">DECLARACIÓN DE CONFORMIDAD</td>
    <td class="col-codigo"><table>
      <tr><td>Código:<br/>A-CI-001</td></tr>
      <tr><td>Fecha de versión:<br/>21 de agosto de 2025</td></tr>
      <tr><td>Versión:03</td></tr>
    </table></td>
  </tr></table>
  <div class="depto">DEPARTAMENTO DE CONTROL DE CALIDAD E INOCUIDAD<br/>DECLARACIÓN DE CONFORMIDAD</div>
  <div class="datos">
    <div><b>CLIENTE: ${escaparHtml(cert.dirigidoA || 'CARNES SANTACRUZ')}</b></div>
    <div><b>FECHA DE SACRIFICIO:</b> ${escaparHtml(fechasSacrificioTexto(cert.fechaSacrificio))}</div>
    <div><b>FECHA DE PRODUCCIÓN:</b> ${escaparHtml(fechaCorta(cert.fechaProduccion))}</div>
    <div><b>FECHA DESPACHO:</b> ${escaparHtml(fechaCorta(cert.fechaDespacho))}</div>
  </div>
  <table class="tabla">
    <tr><th>TIENDA</th><th>LOTES</th><th>Kg DESPOSTADOS</th></tr>
    <tr><td>${escaparHtml(cert.tienda)}</td><td>${escaparHtml(cert.lote)}</td><td>${escaparHtml(cert.kilos || '')}</td></tr>
  </table>
  <table class="tabla">
    <tr><th>CARACTERISTICA</th><th>PARAMETRO</th><th>RESULTADO</th></tr>
    <tr><td>T°C PRODUCTO</td><td>0 a 4 °C</td><td>${escaparHtml(cert.tcProducto ? cert.tcProducto + '°C' : '')}</td></tr>
    <tr><td>T°C ALMACENAMIENTO</td><td>-1 a 4 °C</td><td>${escaparHtml(cert.tcAlmacenamiento ? cert.tcAlmacenamiento + '°C' : '')}</td></tr>
    <tr><td>COLOR</td><td>Rojo Cereza Brillante</td><td>${escaparHtml(cert.color)}</td></tr>
    <tr><td>OLOR</td><td>Característico</td><td>${escaparHtml(cert.olor)}</td></tr>
    <tr><td>TEXTURA</td><td>Firme Y Elástico A Compresión</td><td>${escaparHtml(cert.textura)}</td></tr>
    <tr><td>ASPECTO GENERAL</td><td>Sin Ningún Tipo De Contaminación</td><td>${escaparHtml(cert.aspectoGeneral)}</td></tr>
  </table>
  <div class="nota">Se Recomienda Mantener La Cadena De Frio En Todas Las Etapas De Distribución</div>
  <p class="parrafo-conf">Los procesos y operaciones de producción fueron realizados dentro de los controles más estrictos que exige la autoridad sanitaria competente con respecto a BPM por parte del personal operativo e implementada en nuestra planta, con sus respectivas inspecciones preoperatorias; y operatorias de cada proceso.</p>
  <div class="firma-conf">
    <div class="linea"></div>
    <div>${escaparHtml(cert.firmante || 'Adriana Martínez C.')}</div>
    <div>${escaparHtml(cert.cargo || 'Directora de Calidad')}</div>
    ${cert.sucursal ? `<div>${escaparHtml(cert.sucursal)}</div>` : ''}
    <div>Agropecuaria Santacruz Ltda</div>
  </div>
</div></div>
${guiasHTML}
${curvaHTML}
${almacenHTML}
</body></html>`
}

export function Certificado() {
  const predios = useCatalogo('Predios', prediosSeed)
  const municipios = useCatalogo('Municipios', municipiosSeed)
  const departamentos = useCatalogo('Departamentos', departamentosSeed)
  const [certificados, setCertificados] = useState<Certificado[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(formVacio)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [clientes] = useState<ClienteAgro[]>(cargarClientes)
  const [firmantes] = useState(cargarFirmantes)
  const [sucursales] = useState(cargarSucursales)
  const [curvas, setCurvas] = useState<OrdenCurva[]>(cargarCurvas)
  // Por defecto se muestra solo el dia de hoy; el usuario filtra para ver mas.
  const [filtroMes, setFiltroMes] = useState(() =>
    new Date().toLocaleDateString('en-CA').slice(0, 7),
  )
  const [filtroDesde, setFiltroDesde] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [filtroHasta, setFiltroHasta] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [errorForm, setErrorForm] = useState('')
  const { usuario } = useAuth()

  const certificadosFiltrados = certificados.filter((c) => {
    const f = c.fecha // YYYY-MM-DD
    if (filtroMes && !f.startsWith(filtroMes)) return false
    if (filtroDesde && f < filtroDesde) return false
    if (filtroHasta && f > filtroHasta) return false
    const texto = busqueda.trim().toLowerCase()
    if (
      texto &&
      ![c.numero, c.dirigidoA, c.firmante, c.lote].some((v) =>
        (v || '').toLowerCase().includes(texto),
      )
    )
      return false
    return true
  })

  // Curvas de temperatura asociadas a cualquiera de los lotes del certificado.
  const curvasCliente = form.lotes.length
    ? curvas.filter((o) => form.lotes.includes(o.lote || ''))
    : []

  // Lotes de Ante Mortem del cliente (firmador) seleccionado, sin importar la
  // fecha. Se excluyen los lotes que ya tienen certificado creado y los que ya
  // se agregaron a este certificado.
  const lotesDelDia = (() => {
    if (!form.dirigidoA) return []
    try {
      const lista = JSON.parse(
        localStorage.getItem('agro_antemortem') || '[]',
      ) as { firmador?: string; loteSacrificio?: string }[]
      const usados = new Set<string>()
      certificados.forEach((c) => {
        const ls =
          c.lotes && c.lotes.length
            ? c.lotes
            : c.lote
              ? c.lote.split(',').map((x) => x.trim())
              : []
        ls.forEach((l) => l && usados.add(l))
      })
      return Array.from(
        new Set(
          lista
            .filter((r) => (r.firmador || '') === form.dirigidoA)
            .map((r) => String(r.loteSacrificio || '').trim())
            .filter(
              (v) =>
                v !== '' && !usados.has(v) && !form.lotes.includes(v),
            ),
        ),
      )
    } catch {
      return []
    }
  })()

  const fechasSacrificio = form.fechaSacrificio
    ? form.fechaSacrificio.split(' - ').filter(Boolean)
    : []

  const seccion1Completa = Boolean(
    form.dirigidoA && form.fecha && form.kilos,
  )
  const seccion2Completa = Boolean(
    form.fechaSacrificio &&
      form.fechaProduccion &&
      form.fechaDespacho &&
      form.tienda &&
      form.lotes.length &&
      form.tcProducto &&
      form.tcAlmacenamiento &&
      form.color &&
      form.olor &&
      form.textura &&
      form.aspectoGeneral,
  )
  const seccion3Completa = Boolean(
    form.guias.length > 0 &&
      form.guias.every(
        (g) =>
          g.guiaSanitaria &&
          g.granja &&
          g.municipios &&
          g.departamentos &&
          g.totalSacrificados,
      ),
  )
  const seccion4Completa = curvasCliente.some(
    (o) => (o.mediciones?.length || 0) > 0,
  )
  const seccion5Completa = Boolean(form.curvaAlmacenImg)
  const seccionesCompletas = [
    seccion2Completa,
    seccion3Completa,
    seccion4Completa,
    seccion5Completa,
  ]

  // Construye las guias (una por lote y fecha de sacrificio) para el conjunto
  // de lotes seleccionados, tomando las fechas de Pos Mortem y la informacion
  // de Ante Mortem. Conserva los datos ya editados de cada guia existente.
  function construirDatosLotes(
    lotes: string[],
    prev: Omit<Certificado, 'id'>,
  ): Pick<
    Certificado,
    'lote' | 'lotes' | 'fechaSacrificio' | 'fechaProduccion' | 'guias'
  > {
    let pos: { fecha?: string; loteSacrificio?: string }[] = []
    try {
      pos = JSON.parse(localStorage.getItem('agro_posmortem') || '[]')
    } catch {
      pos = []
    }
    const guias: GuiaTransporte[] = []
    const fechasSet = new Set<string>()
    lotes.forEach((lote) => {
      const l = lote.trim().toUpperCase()
      const fechas = Array.from(
        new Set(
          pos
            .filter(
              (r) => String(r.loteSacrificio || '').trim().toUpperCase() === l,
            )
            .map((r) => String(r.fecha || '').trim())
            .filter(Boolean),
        ),
      ).sort()
      fechas.forEach((f) => {
        fechasSet.add(f)
        const existente = prev.guias.find(
          (g) => g.lote === lote && g.fecha === f,
        )
        const info = infoGuiaAnteMortem(lote, f)
        guias.push({
          fecha: f,
          lote,
          guiaSanitaria: info?.guiaSanitaria || existente?.guiaSanitaria || '',
          granja: info?.granja || existente?.granja || '',
          municipios: info?.municipios || existente?.municipios || '',
          departamentos:
            info?.departamentos || existente?.departamentos || '',
          totalSacrificados:
            info?.totalSacrificados || existente?.totalSacrificados || '',
        })
      })
    })
    const fechas = Array.from(fechasSet).sort()
    return {
      lote: lotes.join(', '),
      lotes,
      fechaSacrificio: fechas.join(' - '),
      fechaProduccion: fechas.length
        ? diaSiguiente(fechas[0])
        : prev.fechaProduccion,
      guias,
    }
  }

  // Agrega un lote al certificado (paso 1) y regenera fechas y guias.
  function agregarLoteCert(v: string) {
    const lote = v.trim()
    if (!lote) return
    setForm((prev) => {
      if (prev.lotes.includes(lote)) return prev
      return { ...prev, ...construirDatosLotes([...prev.lotes, lote], prev) }
    })
  }

  // Quita un lote del certificado y regenera fechas y guias.
  function quitarLoteCert(v: string) {
    setForm((prev) => ({
      ...prev,
      ...construirDatosLotes(
        prev.lotes.filter((l) => l !== v),
        prev,
      ),
    }))
  }

  function actualizarGuia(
    lote: string,
    fecha: string,
    campo: keyof GuiaTransporte,
    valor: string,
  ) {
    setForm((prev) => ({
      ...prev,
      guias: prev.guias.map((g) =>
        g.lote === lote && g.fecha === fecha ? { ...g, [campo]: valor } : g,
      ),
    }))
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(certificados))
  }, [certificados])

  function actualizar<K extends keyof Omit<Certificado, 'id'>>(
    campo: K,
    valor: Omit<Certificado, 'id'>[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Al digitar el lote, trae la fecha de sacrificio desde Pos Mortem y calcula
  // la fecha de produccion como el dia siguiente al sacrificio. Ademas rellena
  // cada guia del paso 3 con el lote y su informacion desde Ante Mortem.
  function cargarImagenAlmacen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    const lector = new FileReader()
    lector.onload = () =>
      setForm((prev) => ({ ...prev, curvaAlmacenImg: String(lector.result) }))
    lector.readAsDataURL(archivo)
  }

  function abrirNuevo() {
    const ahora = new Date()
    setCurvas(cargarCurvas())
    setForm({
      ...formVacio(),
      numero: siguienteNumero(certificados),
      fecha: ahora.toLocaleDateString('en-CA'),
      digitadoPor: usuario?.nombre || usuario?.email || '',
      curvaFecha: ahora.toLocaleDateString('en-CA'),
      curvaHora: ahora.toTimeString().slice(0, 5),
    })
    setEditandoId(null)
    setMostrarForm(true)
  }

  function editar(c: Certificado) {
    setCurvas(cargarCurvas())
    const { id: _id, ...datos } = c
    // Registros antiguos guardan un solo `lote`; se migra a `lotes`.
    const lotes =
      datos.lotes && datos.lotes.length
        ? datos.lotes
        : datos.lote
          ? datos.lote.split(',').map((l) => l.trim()).filter(Boolean)
          : []
    setForm({ ...formVacio(), ...datos, lotes })
    setEditandoId(c.id)
    setMostrarForm(true)
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!seccion2Completa) {
      setErrorForm(
        'Completa todos los campos del Certificado de sacrificio (paso 2).',
      )
      return
    }
    setErrorForm('')
    const referencia = form.numero || form.dirigidoA || 'CERTIFICADO SIN NUMERO'
    if (editandoId) {
      setCertificados((prev) =>
        prev.map((c) => (c.id === editandoId ? { ...form, id: editandoId } : c)),
      )
      registrar('EDITÓ', referencia)
    } else {
      setCertificados((prev) => [{ ...form, id: crypto.randomUUID() }, ...prev])
      registrar('CREÓ', referencia)
    }
    setMostrarForm(false)
    setEditandoId(null)
    setForm(formVacio())
  }

  function registrar(accion: 'CREÓ' | 'EDITÓ' | 'ELIMINÓ', referencia: string) {
    agregarMovimiento({
      modulo: 'CERTIFICADO',
      accion,
      referencia,
      usuario: usuario?.nombre || usuario?.email || 'DESCONOCIDO',
    })
  }

  function alternarSeleccion(id: string) {
    setSeleccionados((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  function alternarTodos() {
    setSeleccionados((prev) =>
      prev.size === certificadosFiltrados.length
        ? new Set()
        : new Set(certificadosFiltrados.map((c) => c.id)),
    )
  }

  async function exportarWordSeleccionados() {
    const lista = certificadosFiltrados.filter((c) => seleccionados.has(c.id))
    for (const c of lista) await exportarWord(c)
  }

  async function exportarPDFSeleccionados() {
    const lista = certificadosFiltrados.filter((c) => seleccionados.has(c.id))
    for (const c of lista) await exportarPDF(c)
  }

  async function confirmarEliminar(password: string) {
    if (seleccionados.size === 0 || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.verificarPassword(password)
      setCertificados((prev) => prev.filter((c) => !seleccionados.has(c.id)))
      registrar('ELIMINÓ', `${seleccionados.size} certificado(s)`)
      setSeleccionados(new Set())
      setMostrarEliminar(false)
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  async function exportarPDF(cert: Certificado) {
    const membrete = await cargarMembrete()
    const logo = await cargarImagen('/logos/agropecuaria-santacruz.png')
    const lotesCert =
      cert.lotes && cert.lotes.length
        ? cert.lotes
        : cert.lote
          ? cert.lote.split(',').map((s) => s.trim())
          : []
    const curvasCert = cargarCurvas().filter((o) =>
      lotesCert.includes(o.lote || ''),
    )
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(
      construirHTML(cert, membrete, logo, curvasCert) +
        '<script>window.onload=function(){window.print();}</script>',
    )
    win.document.close()
  }

  async function exportarWord(cert: Certificado) {
    const lotesCert =
      cert.lotes && cert.lotes.length
        ? cert.lotes
        : cert.lote
          ? cert.lote.split(',').map((s) => s.trim())
          : []
    const curvasCert = cargarCurvas().filter((o) =>
      lotesCert.includes(o.lote || ''),
    )
    // 1) Intenta rellenar la plantilla Word con marca de agua real.
    try {
      const resp = await fetch(PLANTILLA_WORD)
      const tipo = resp.headers.get('content-type') || ''
      if (resp.ok && !tipo.includes('text/html')) {
        const buf = await resp.arrayBuffer()
        const zip = new PizZip(buf)
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
        })
        doc.render({
          numero: cert.numero,
          fecha: formatearFecha(cert.fecha),
          dirigido: cert.dirigidoA || 'CARNES SANTACRUZ',
          kilos: cert.kilos || '8262.48',
          cliente: cert.dirigidoA || 'CARNES SANTACRUZ',
          fsacrificio: fechasSacrificioTexto(cert.fechaSacrificio),
          fproduccion: fechaCorta(cert.fechaProduccion),
          fdespacho: fechaCorta(cert.fechaDespacho),
          tienda: cert.tienda,
          lote: cert.lote,
          rProducto: cert.tcProducto ? cert.tcProducto + '°C' : '',
          rAlmacen: cert.tcAlmacenamiento ? cert.tcAlmacenamiento + '°C' : '',
          rColor: cert.color,
          rOlor: cert.olor,
          rTextura: cert.textura,
          rAspecto: cert.aspectoGeneral,
          cuerpo: cert.cuerpo,
          firmante: cert.firmante || 'Adriana Martínez C.',
          cargo: cert.cargo || 'Directora de Calidad',
          guias: (cert.guias || []).map((g) => ({
            malambo: formatearFecha(cert.fecha),
            fechaSac: fechaLarga(g.fecha),
            total: g.totalSacrificados,
            cliente: cert.dirigidoA || 'CARNES SANTACRUZ',
            guiaSanitaria: g.guiaSanitaria,
            granja: g.granja,
            municipios: g.municipios,
            departamentos: g.departamentos,
          })),
          curvas: curvasCert.map((o) => ({
            cuarto: o.cuartoFrio || '',
            cCliente: o.cliente || '',
            mediciones: (o.mediciones || []).map((m) => ({
              cFecha: fechaCorta(o.fecha),
              cHora: m.hora,
              cCanal: m.canal,
              cTcCanal: m.tcCanal ? m.tcCanal + '°C' : '',
              cTcCuarto: m.tcCuarto ? m.tcCuarto + '°C' : '',
              cVerif: m.verificado,
            })),
          })),
        })
        const zip2 = doc.getZip()
        if (cert.curvaAlmacenImg) {
          await inyectarImagenAlmacen(zip2, cert.curvaAlmacenImg)
        }
        const out = zip2.generate({
          type: 'blob',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
        descargar(out, `certificado-${cert.numero || cert.id}.docx`)
        return
      }
    } catch {
      // sin plantilla: usa el metodo HTML de respaldo
    }

    // 2) Respaldo: HTML con el membrete como fondo.
    const membrete = await cargarMembrete()
    const logo = await cargarImagen('/logos/agropecuaria-santacruz.png')
    const html = construirHTML(cert, membrete, logo, curvasCert)
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    descargar(blob, `certificado-${cert.numero || cert.id}.doc`)
  }

  function descargar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.download = nombre
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Certificado de Calidad
          </h2>
          <p className="text-slate-500">
            Certificado de la inspeccion del proceso.
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Nuevo
          </button>
        )}
      </header>

      {mostrarForm ? (
        <form
          onSubmit={guardar}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Seccion 1: Numero - Fecha - Digitado por */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${
                  seccion1Completa ? 'bg-brand-600' : 'bg-slate-400'
                }`}
              >
                1
              </span>
              <h3 className="text-base font-semibold text-slate-800">
                Certificados de calidad
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[8.5rem_9rem_minmax(0,1fr)_10rem_6rem_10rem]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Numero
                </span>
                <input
                  readOnly
                  data-no-upper
                  className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                  value={form.numero}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Fecha
                </span>
                <input
                  type="date"
                  data-no-upper
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={form.fecha}
                  onChange={(e) => actualizar('fecha', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Cliente
                </span>
                <SelectorBuscable
                  opciones={clientes.map((c) => c.nombre)}
                  value={form.dirigidoA}
                  onChange={(v) => actualizar('dirigidoA', v)}
                  placeholder="Seleccione un cliente..."
                  buscarPlaceholder="Buscar cliente..."
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Lotes
                </span>
                <SelectorBuscable
                  opciones={lotesDelDia}
                  value=""
                  onChange={(v) => agregarLoteCert(v)}
                  permitirLibre
                  placeholder={
                    form.dirigidoA ? 'Agrega uno o varios lotes' : 'Elige cliente'
                  }
                  buscarPlaceholder="Buscar lote..."
                />
                {form.lotes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.lotes.map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                      >
                        {l}
                        <button
                          type="button"
                          onClick={() => quitarLoteCert(l)}
                          className="text-brand-500 hover:text-brand-800"
                          aria-label="Quitar lote"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Kilos *
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  data-no-upper
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={form.kilos}
                  onChange={(e) => actualizar('kilos', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Digitado por
                </span>
                <input
                  readOnly
                  data-no-upper
                  className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                  value={form.digitadoPor}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Firmante
                </span>
                <SelectorBuscable
                  opciones={firmantes.map((f) => f.nombre)}
                  value={form.firmante}
                  onChange={(v) => {
                    const f = firmantes.find((x) => x.nombre === v)
                    setForm((prev) => ({
                      ...prev,
                      firmante: v,
                      cargo: f ? f.cargo : prev.cargo,
                    }))
                  }}
                  permitirLibre
                  placeholder="Selecciona firmante..."
                  buscarPlaceholder="Buscar firmante..."
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Cargo
                </span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={form.cargo}
                  onChange={(e) => actualizar('cargo', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Sucursal
                </span>
                <SelectorBuscable
                  opciones={sucursales.map((s) => s.nombre)}
                  value={form.sucursal}
                  onChange={(v) =>
                    setForm((prev) => ({ ...prev, sucursal: v, tienda: v }))
                  }
                  permitirLibre
                  placeholder="Selecciona sucursal..."
                  buscarPlaceholder="Buscar sucursal..."
                />
              </label>
            </div>
          </section>

          {/* Secciones 2 a 7 (por construir) */}
          {SECCIONES.map((titulo, i) => (
            <section
              key={i}
              className="space-y-3 border-t border-dashed border-slate-300 pt-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${
                    seccionesCompletas[i] ? 'bg-brand-600' : 'bg-slate-400'
                  }`}
                >
                  {i + 2}
                </span>
                <h3 className="text-base font-semibold text-slate-800">
                  {titulo}
                </h3>
              </div>
              {i === 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha de sacrificio <span className="text-rose-500">*</span>
                      </span>
                      {fechasSacrificio.length > 0 ? (
                        <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-2">
                          {fechasSacrificio.map((f) => (
                            <span
                              key={f}
                              className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                            >
                              {f.split('-').reverse().join('/')}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <input
                          readOnly
                          className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                          value=""
                          placeholder="Agrega lotes en el paso 1"
                        />
                      )}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha de producción <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="date"
                        data-no-upper
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        value={form.fechaProduccion}
                        onChange={(e) =>
                          actualizar('fechaProduccion', e.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Fecha despacho <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="date"
                        data-no-upper
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        value={form.fechaDespacho}
                        onChange={(e) =>
                          actualizar('fechaDespacho', e.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Tienda <span className="text-rose-500">*</span>
                      </span>
                      <input
                        readOnly
                        className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                        value={form.tienda}
                        placeholder="Selecciona la sucursal (paso 1)"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Lotes <span className="text-rose-500">*</span>
                      </span>
                      {form.lotes.length > 0 ? (
                        <div className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-2">
                          {form.lotes.map((l) => (
                            <span
                              key={l}
                              className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <input
                          readOnly
                          className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                          value=""
                          placeholder="Agrega lotes en el paso 1"
                        />
                      )}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                    {(
                      [
                        ['tcProducto', 'T°C Producto'],
                        ['tcAlmacenamiento', 'T°C Almacenamiento'],
                        ['color', 'Color'],
                        ['olor', 'Olor'],
                        ['textura', 'Textura'],
                        ['aspectoGeneral', 'Aspecto general'],
                      ] as [
                        (
                          | 'tcProducto'
                          | 'tcAlmacenamiento'
                          | 'color'
                          | 'olor'
                          | 'textura'
                          | 'aspectoGeneral'
                        ),
                        string,
                      ][]
                    ).map(([campo, label]) => {
                      const esTemperatura =
                        campo === 'tcProducto' || campo === 'tcAlmacenamiento'
                      return (
                        <label key={campo} className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            {label} <span className="text-rose-500">*</span>
                          </span>
                          <input
                            {...(esTemperatura
                              ? { inputMode: 'decimal' as const, 'data-no-upper': true }
                              : {})}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={form[campo]}
                            onChange={(e) => {
                              const v = esTemperatura
                                ? e.target.value.replace(/[^0-9.]/g, '')
                                : e.target.value
                              actualizar(campo, v)
                            }}
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : i === 1 ? (
                form.guias.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Agrega lotes en el paso 1 para generar las guías de
                    transporte.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {form.guias.map((g) => (
                      <div
                        key={`${g.lote}|${g.fecha}`}
                        className="rounded-md border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-3 text-sm font-semibold text-brand-700">
                          Guía de transporte — Lote {g.lote} —{' '}
                          {g.fecha.split('-').reverse().join('/')}
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                              N° Guía sanitaria
                            </span>
                            <input
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              value={g.guiaSanitaria}
                              onChange={(e) =>
                                actualizarGuia(
                                  g.lote,
                                  g.fecha,
                                  'guiaSanitaria',
                                  e.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                              Predios
                            </span>
                            <SelectorBuscable
                              opciones={predios}
                              value={g.granja}
                              onChange={(v) =>
                                actualizarGuia(g.lote, g.fecha, 'granja', v)
                              }
                              placeholder="Selecciona predio"
                              buscarPlaceholder="Buscar predio..."
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                              Municipios
                            </span>
                            <SelectorBuscable
                              opciones={municipios}
                              value={g.municipios}
                              onChange={(v) =>
                                actualizarGuia(g.lote, g.fecha, 'municipios', v)
                              }
                              placeholder="Selecciona municipio"
                              buscarPlaceholder="Buscar municipio..."
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                              Departamentos
                            </span>
                            <SelectorBuscable
                              opciones={departamentos}
                              value={g.departamentos}
                              onChange={(v) =>
                                actualizarGuia(
                                  g.lote,
                                  g.fecha,
                                  'departamentos',
                                  v,
                                )
                              }
                              placeholder="Selecciona departamento"
                              buscarPlaceholder="Buscar departamento..."
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                              Total sacrificados
                            </span>
                            <input
                              inputMode="numeric"
                              data-no-upper
                              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              value={g.totalSacrificados}
                              onChange={(e) =>
                                actualizarGuia(
                                  g.lote,
                                  g.fecha,
                                  'totalSacrificados',
                                  e.target.value.replace(/[^0-9]/g, ''),
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : i === 2 ? (
                !form.lotes.length ? (
                  <p className="text-sm text-slate-400">
                    Agrega lotes en el paso 1 para ver las curvas asociadas.
                  </p>
                ) : curvasCliente.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No hay curvas registradas para los lotes{' '}
                    {form.lotes.join(', ')}.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {curvasCliente.map((o) => (
                      <div
                        key={o.id}
                        className="overflow-hidden rounded-lg border border-slate-300"
                      >
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-slate-300 bg-slate-50 px-4 py-2 text-sm">
                          <span className="font-semibold text-slate-700">
                            Monitoreo de temperaturas de canal
                          </span>
                          <span className="text-slate-500">
                            Consecutivo: <b className="text-slate-700">{o.consecutivo}</b>
                          </span>
                          <span className="text-slate-500">
                            Cuarto N°: <b className="text-slate-700">{o.cuartoFrio || '—'}</b>
                          </span>
                          <span className="text-slate-500">
                            N° guía: <b className="text-slate-700">{o.numeroGuia || '—'}</b>
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                              <tr>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">Hora</th>
                                <th className="px-3 py-2">Canal</th>
                                <th className="px-3 py-2">T°C canal</th>
                                <th className="px-3 py-2">T°C cuarto</th>
                                <th className="px-3 py-2">Verificado por</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {o.mediciones.map((m) => (
                                <tr key={m.id}>
                                  <td className="px-3 py-2">{fechaCorta(o.fecha)}</td>
                                  <td className="px-3 py-2">{m.hora}</td>
                                  <td className="px-3 py-2">{m.canal}</td>
                                  <td className="px-3 py-2">
                                    {m.tcCanal ? `${m.tcCanal}°C` : ''}
                                  </td>
                                  <td className="px-3 py-2">
                                    {m.tcCuarto ? `${m.tcCuarto}°C` : ''}
                                  </td>
                                  <td className="px-3 py-2">{m.verificado}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : i === 3 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Carga una imagen de la curva de temperatura del cuarto de
                    almacenamiento. Se incrustará en el certificado.
                  </p>
                  {!form.curvaAlmacenImg ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 hover:border-brand-400 hover:bg-brand-50">
                      <span className="font-medium text-brand-700">
                        Seleccionar imagen
                      </span>
                      <span className="text-xs text-slate-400">
                        PNG o JPG
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={cargarImagenAlmacen}
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white p-2">
                        <img
                          src={form.curvaAlmacenImg}
                          alt="Curva de temperatura del cuarto de almacenamiento"
                          className="mx-auto max-h-80 w-auto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Reemplazar
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={cargarImagenAlmacen}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => actualizar('curvaAlmacenImg', '')}
                          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Sección en construcción. La configuraremos más adelante.
                </p>
              )}
            </section>
          ))}
          <div className="flex justify-end gap-3">
            {errorForm && (
              <p className="mr-auto self-center text-sm font-medium text-rose-600">
                {errorForm}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false)
                setEditandoId(null)
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Guardar
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Mes
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-36"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Desde
              <input
                type="date"
                data-no-upper
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="flex flex-col text-xs font-medium text-slate-600">
              Hasta
              <input
                type="date"
                data-no-upper
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            {(filtroMes || filtroDesde || filtroHasta) && (
              <button
                type="button"
                onClick={() => {
                  const hoy = new Date().toLocaleDateString('en-CA')
                  setFiltroMes(hoy.slice(0, 7))
                  setFiltroDesde(hoy)
                  setFiltroHasta(hoy)
                  setBusqueda('')
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Limpiar filtro
              </button>
            )}
            <label className="flex flex-1 flex-col text-xs font-medium text-slate-600 min-w-[220px]">
              Buscar
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Numero, dirigido a, firmante o lote"
                className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {seleccionados.size > 0
                ? `${seleccionados.size} seleccionado(s)`
                : `${certificadosFiltrados.length} certificado(s)`}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportarWordSeleccionados}
                disabled={seleccionados.size === 0}
                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                Word
              </button>
              <button
                onClick={exportarPDFSeleccionados}
                disabled={seleccionados.size === 0}
                className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                PDF
              </button>
              {seleccionados.size > 0 && (
                <button
                  onClick={() => {
                    setErrorEliminar(null)
                    setMostrarEliminar(true)
                  }}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      data-no-upper
                      className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={
                        certificadosFiltrados.length > 0 &&
                        seleccionados.size === certificadosFiltrados.length
                      }
                      onChange={alternarTodos}
                    />
                  </th>
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Dirigido a</th>
                  <th className="px-4 py-3">Firmante</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificadosFiltrados.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      data-no-upper
                      className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={seleccionados.has(c.id)}
                      onChange={() => alternarSeleccion(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.numero || '—'}
                  </td>
                  <td className="px-4 py-3">{c.fecha}</td>
                  <td className="px-4 py-3">{c.dirigidoA}</td>
                  <td className="px-4 py-3">{c.firmante}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => editar(c)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
                {certificadosFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No hay certificados. Usa "+ Nuevo" para crear uno.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {mostrarEliminar && (
        <ModalEliminar
          titulo="Eliminar certificados"
          descripcion={`Vas a eliminar ${seleccionados.size} certificado(s).`}
          eliminando={eliminando}
          error={errorEliminar}
          onCancelar={() => setMostrarEliminar(false)}
          onConfirmar={confirmarEliminar}
        />
      )}
    </div>
  )
}
