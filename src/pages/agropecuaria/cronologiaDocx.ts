import PizZip from 'pizzip'
import type { Usuario } from '../../types/trazabilidad'

interface Emu {
  cx: number
  cy: number
}

export interface FilaCronologia {
  fecha: string
  numeroGuia: string
  loteSacrificio: string
  gancho: string
  dientes: string
  edadMes: string
  edadAnio: string
  observaciones: string
}

export interface GrupoCronologia {
  lote: string
  items: FilaCronologia[]
}

const RUTA_MEMBRETE = '/plantillas/MEMBRETE.docx'
const RID_FIRMA = 'rIdCronFirma'

// Genera un .docx de cronologia usando el membrete oficial; una pagina por lote.
export async function generarCronologiaDocx(
  grupos: GrupoCronologia[],
  usuario: Usuario | null,
  especie: 'BOVINA' | 'PORCINA',
): Promise<Blob> {
  const zip = new PizZip(await cargarBytes(RUTA_MEMBRETE))
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('membrete sin document.xml')
  let docXml = asegurarNamespaces(docFile.asText())

  const sectPr = ajustarMargenes(
    (docXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/) || [''])[0],
  )

  const nombre =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() ||
    usuario?.email ||
    ''
  const slug = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

  const firmaBytes = slug ? await cargarPng(`/firmas/${slug}.png`) : null
  const firmaSize = firmaBytes ? pngSizeEmu(firmaBytes, 5) : null

  const media: { id: string; nombre: string; bytes: Uint8Array }[] = []
  if (firmaBytes) {
    media.push({ id: RID_FIRMA, nombre: 'cron-firma.png', bytes: firmaBytes })
  }
  let seq = 1000
  const next = () => ++seq

  const cuerpo = grupos
    .map((g, i) =>
      bloqueCronologia(g, i > 0, especie, nombre.toUpperCase(), firmaSize, next),
    )
    .join('')

  const apertura = (docXml.match(/<w:body[^>]*>/) || [''])[0]
  const inicio = docXml.indexOf(apertura)
  const fin = docXml.lastIndexOf('</w:body>')
  docXml =
    docXml.slice(0, inicio + apertura.length) +
    cuerpo +
    sectPr +
    docXml.slice(fin)

  const relsFile = zip.file('word/_rels/document.xml.rels')
  if (relsFile && media.length > 0) {
    const nuevas = media
      .map(
        (m) =>
          `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.nombre}"/>`,
      )
      .join('')
    zip.file(
      'word/_rels/document.xml.rels',
      relsFile.asText().replace('</Relationships>', nuevas + '</Relationships>'),
    )
  }

  const ctFile = zip.file('[Content_Types].xml')
  if (ctFile) {
    let ct = ctFile.asText()
    if (!/Extension="png"/.test(ct))
      ct = ct.replace(
        '</Types>',
        '<Default Extension="png" ContentType="image/png"/></Types>',
      )
    zip.file('[Content_Types].xml', ct)
  }

  zip.file('word/document.xml', docXml)
  for (const m of media) zip.file(`word/media/${m.nombre}`, m.bytes)

  return zip.generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

// Contenido de una pagina: titulo, tabla y firma del usuario.
function bloqueCronologia(
  g: GrupoCronologia,
  saltoPagina: boolean,
  especie: 'BOVINA' | 'PORCINA',
  nombre: string,
  firmaSize: Emu | null,
  next: () => number,
): string {
  const salto = saltoPagina
    ? `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`
    : ''
  const firma =
    firmaSize != null
      ? imagenInline(RID_FIRMA, firmaSize, next(), 'firma')
      : `<w:p><w:pPr><w:spacing w:before="480"/></w:pPr></w:p>`
  return (
    salto +
    parrafo(`CRONOLOGIA DENTARIA ${especie}`, {
      bold: true,
      color: '2F9E44',
      align: 'center',
      spacingBefore: 120,
    }) +
    tabla(g.items) +
    firma +
    firmaNombre(nombre) +
    parrafo('Frigorífico Agropecuaria Santacruz.', {
      align: 'center',
      size: 18,
    })
  )
}

function tabla(items: FilaCronologia[]): string {
  const columnas = [
    'FECHA',
    'NUMERO DE GUIA',
    'LOTE DE SACRIFICIO',
    'GANCHO',
    'N DIENTES',
    'EDAD MES',
    'EDAD APROX AÑO',
    'OBSERVACIONES',
  ]
  const cabecera = `<w:tr>${columnas.map(th).join('')}</w:tr>`
  const filas = items
    .map(
      (r) =>
        `<w:tr>` +
        td(r.fecha, true) +
        td(r.numeroGuia, true) +
        td(r.loteSacrificio, true) +
        td(r.gancho, true) +
        td(r.dientes, true) +
        td(r.edadMes, true) +
        td(r.edadAnio, true) +
        td(r.observaciones) +
        `</w:tr>`,
    )
    .join('')
  const grid = [1100, 1300, 1500, 800, 900, 900, 1100, 1600]
    .map((w) => `<w:gridCol w:w="${w}"/>`)
    .join('')
  return (
    `<w:tbl>` +
    `<w:tblPr><w:tblW w:w="5000" w:type="pct"/>` +
    `<w:jc w:val="center"/>` +
    `<w:tblBorders>${bordesCelda()}</w:tblBorders>` +
    `<w:tblLayout w:type="fixed"/></w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>` +
    cabecera +
    filas +
    `</w:tbl>`
  )
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    c === '&'
      ? '&amp;'
      : c === '<'
        ? '&lt;'
        : c === '>'
          ? '&gt;'
          : c === '"'
            ? '&quot;'
            : '&apos;',
  )
}

interface OpcionesTexto {
  bold?: boolean
  color?: string
  size?: number
  align?: 'left' | 'center' | 'right' | 'both'
  spacingBefore?: number
}

function parrafo(texto: string, o: OpcionesTexto = {}): string {
  const runs = texto
    .split('\n')
    .map(
      (linea, i) =>
        (i > 0 ? '<w:br/>' : '') +
        `<w:r>${runProps(o)}<w:t xml:space="preserve">${esc(linea)}</w:t></w:r>`,
    )
    .join('')
  return `<w:p>${parProps(o)}${runs}</w:p>`
}

function parProps(o: OpcionesTexto): string {
  const jc = o.align
    ? `<w:jc w:val="${o.align === 'both' ? 'both' : o.align}"/>`
    : ''
  const sp = o.spacingBefore ? `<w:spacing w:before="${o.spacingBefore}"/>` : ''
  return `<w:pPr>${sp}${jc}</w:pPr>`
}

function runProps(o: OpcionesTexto): string {
  const b = o.bold ? '<w:b/>' : ''
  const color = o.color ? `<w:color w:val="${o.color}"/>` : ''
  const sz = o.size ? `<w:sz w:val="${o.size}"/>` : ''
  const rf = `<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>`
  return `<w:rPr>${rf}${b}${color}${sz}</w:rPr>`
}

function th(texto: string): string {
  return (
    `<w:tc><w:tcPr><w:shd w:val="clear" w:fill="4CAF50"/>` +
    `<w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/>` +
    `<w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>` +
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(texto)}</w:t></w:r></w:p></w:tc>`
  )
}

function td(texto: string, center = false): string {
  return (
    `<w:tc><w:tcPr><w:tcBorders>${bordesCelda()}</w:tcBorders>` +
    `<w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/>` +
    `<w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar></w:tcPr>` +
    `<w:p><w:pPr>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="2E7D32"/><w:sz w:val="18"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(texto)}</w:t></w:r></w:p></w:tc>`
  )
}

function bordesCelda(): string {
  const b = `w:val="single" w:sz="4" w:space="0" w:color="C8E6C9"`
  return `<w:top ${b}/><w:left ${b}/><w:bottom ${b}/><w:right ${b}/>`
}

function imagenInline(rId: string, s: Emu, id: number, nombre: string): string {
  return (
    `<w:p><w:pPr><w:spacing w:before="360"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${s.cx}" cy="${s.cy}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${id}" name="${nombre}${id}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${nombre}${id}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${s.cx}" cy="${s.cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic>` +
    `</wp:inline></w:drawing></w:r></w:p>`
  )
}

function firmaNombre(nombre: string): string {
  return (
    `<w:p><w:pPr><w:jc w:val="center"/>` +
    `<w:pBdr><w:top w:val="single" w:sz="6" w:space="2" w:color="333333"/></w:pBdr>` +
    `</w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="20"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(nombre)}</w:t></w:r></w:p>`
  )
}

function ajustarMargenes(sectPr: string): string {
  const TOP_MIN = 2040
  const BOTTOM_MIN = 2160
  return sectPr.replace(/<w:pgMar([^>]*)\/>/, (_m, attrs: string) => {
    let a = subir(attrs, 'w:top', TOP_MIN)
    a = subir(a, 'w:bottom', BOTTOM_MIN)
    return `<w:pgMar${a}/>`
  })
}

function subir(attrs: string, nombre: string, minimo: number): string {
  const re = new RegExp(`${nombre}="(-?\\d+)"`)
  const m = attrs.match(re)
  if (!m) return `${attrs} ${nombre}="${minimo}"`
  const valor = Math.max(parseInt(m[1], 10), minimo)
  return attrs.replace(re, `${nombre}="${valor}"`)
}

function asegurarNamespaces(xml: string): string {
  const m = xml.match(/<w:document[^>]*>/)
  if (!m) return xml
  let tag = m[0]
  const requeridos: [string, string][] = [
    [
      'xmlns:wp',
      'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    ],
    ['xmlns:a', 'http://schemas.openxmlformats.org/drawingml/2006/main'],
    ['xmlns:pic', 'http://schemas.openxmlformats.org/drawingml/2006/picture'],
    [
      'xmlns:r',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    ],
  ]
  for (const [clave, valor] of requeridos) {
    if (!tag.includes(`${clave}=`)) tag = tag.replace(/>$/, ` ${clave}="${valor}">`)
  }
  return xml.replace(m[0], tag)
}

async function cargarBytes(ruta: string): Promise<Uint8Array> {
  const resp = await fetch(ruta)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

// Carga un PNG y valida su firma; devuelve null si no existe o no es PNG.
async function cargarPng(ruta: string): Promise<Uint8Array | null> {
  try {
    const bytes = await cargarBytes(ruta)
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return bytes
    return null
  } catch {
    return null
  }
}

function pngSizeEmu(bytes: Uint8Array, anchoCm: number): Emu {
  const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  const cx = Math.round(anchoCm * 360000)
  const cy = w > 0 ? Math.round((cx * h) / w) : cx
  return { cx, cy }
}
