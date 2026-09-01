import PizZip from 'pizzip'
import {
  formatoConsecutivo,
  fechaLarga,
  mesDe,
  type CertificadoDecomiso,
} from './certificadosStore'
import { datosFirmante } from './firmante'
import type { Usuario } from '../../types/trazabilidad'

// Carga la firma del usuario logueado; si no existe, usa la del veterinario por defecto.
async function cargarFirma(
  usuario: Usuario | null,
): Promise<{ bytes: Uint8Array; nombre: string }> {
  const { archivoFirma, nombre } = datosFirmante(usuario)
  if (archivoFirma) {
    try {
      const resp = await fetch(archivoFirma)
      if (resp.ok) {
        const bytes = new Uint8Array(await resp.arrayBuffer())
        // Verifica firma PNG (0x89 'P' 'N' 'G') para descartar paginas de error 404.
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
          return { bytes, nombre: nombre || 'Juan Camilo Alean Rodríguez.' }
        }
      }
    } catch {
      // cae al respaldo
    }
  }
  const bytes = await cargarBytes('/firmas/juancamiloalean.png')
  return { bytes, nombre: nombre || 'Juan Camilo Alean Rodríguez.' }
}

interface Media {
  id: string
  nombre: string
  bytes: Uint8Array
}

interface Emu {
  cx: number
  cy: number
}

// Referencias fijas a las imagenes del membrete.
const RID_LOGO = 'rIdLogo'
const RID_FIRMA = 'rIdFirma'

// Ruta del membrete oficial en Word (encabezado, marca de agua y pie reales).
const RUTA_MEMBRETE = '/plantillas/MEMBRETE.docx'

// Genera el .docx usando el membrete oficial como base; si falla, lo arma desde cero.
export async function generarCertificadoDocx(
  certs: CertificadoDecomiso[],
  usuario: Usuario | null = null,
): Promise<Blob> {
  try {
    return await generarConMembrete(certs, usuario)
  } catch {
    return await generarDesdeCero(certs, usuario)
  }
}

// Inserta el certificado dentro del membrete .docx conservando su encabezado y pie.
async function generarConMembrete(
  certs: CertificadoDecomiso[],
  usuario: Usuario | null,
): Promise<Blob> {
  const zip = new PizZip(await cargarBytes(RUTA_MEMBRETE))
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('membrete sin document.xml')
  let docXml = asegurarNamespaces(docFile.asText())

  // sectPr del membrete: contiene tamano de pagina y referencias al encabezado/pie.
  // Se suben los margenes para que el texto no se encime con el logo ni el pie.
  const sectPr = ajustarMargenes(
    (docXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/) || [''])[0],
  )

  const { bytes: firmaBytes, nombre: nombreFirma } = await cargarFirma(usuario)
  const firmaSize = pngSizeEmu(firmaBytes, 4.5)

  const media: Media[] = [
    { id: 'rIdCertFirma', nombre: 'cert-firma.png', bytes: firmaBytes },
  ]
  let seq = 1000
  const next = () => ++seq

  const cuerpo = certs
    .map((c, i) => bloqueMembrete(c, i > 0, media, next, firmaSize, nombreFirma))
    .join('')

  // Reemplaza el cuerpo del membrete conservando su sectPr (encabezado y pie).
  const apertura = (docXml.match(/<w:body[^>]*>/) || [''])[0]
  const inicio = docXml.indexOf(apertura)
  const fin = docXml.lastIndexOf('</w:body>')
  docXml =
    docXml.slice(0, inicio + apertura.length) +
    cuerpo +
    sectPr +
    docXml.slice(fin)

  // Agrega las relaciones de las imagenes nuevas (firma y fotos).
  const relsFile = zip.file('word/_rels/document.xml.rels')
  if (relsFile) {
    const nuevas = media
      .map(
        (m) =>
          `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.nombre}"/>`,
      )
      .join('')
    zip.file(
      'word/_rels/document.xml.rels',
      relsFile
        .asText()
        .replace('</Relationships>', nuevas + '</Relationships>'),
    )
  }

  // Asegura los tipos de contenido de imagen.
  const ctFile = zip.file('[Content_Types].xml')
  if (ctFile) {
    let ct = ctFile.asText()
    if (!/Extension="png"/.test(ct))
      ct = ct.replace(
        '</Types>',
        '<Default Extension="png" ContentType="image/png"/></Types>',
      )
    if (!/Extension="jpe?g"/.test(ct))
      ct = ct.replace(
        '</Types>',
        '<Default Extension="jpg" ContentType="image/jpeg"/>' +
          '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>',
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

// Sube los margenes superior e inferior para que el texto caiga en la zona
// limpia del membrete (logo arriba, pie abajo) sin encimarse.
function ajustarMargenes(sectPr: string): string {
  const TOP_MIN = 2040 // ~3.6 cm
  const BOTTOM_MIN = 2160 // ~3.8 cm
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

// Garantiza que el <w:document> declare los namespaces que usan imagenes y tablas.
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

// Cuerpo del certificado sin logo ni pie (los aporta el membrete).
function bloqueMembrete(
  c: CertificadoDecomiso,
  saltoPagina: boolean,
  media: Media[],
  next: () => number,
  firmaSize: Emu,
  nombreFirma: string,
): string {
  const sexoTotal = c.totalAnimales > 0 ? `${c.totalAnimales} ` : ''
  const dia =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(c.fechaCertificado)?.[3]
      ?.replace(/^0/, '') ?? ''
  const anio = c.fechaCertificado.slice(0, 4)
  const salto = saltoPagina
    ? `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`
    : ''
  const fotos =
    (c.imagenes ?? []).length > 0
      ? parrafo('EVIDENCIA FOTOGRÁFICA', {
          bold: true,
          color: '2F9E44',
          align: 'center',
          spacingBefore: 240,
        }) + c.imagenes.map((s) => imagenFoto(s, media, next)).join('')
      : ''
  return (
    salto +
    parrafo(`Certificado N° ${formatoConsecutivo(c.consecutivo)}`, {
      bold: true,
      color: '2F9E44',
      align: 'right',
      spacingBefore: 120,
    }) +
    parrafo(`Malambo, ${fechaLarga(c.fechaCertificado)}.`, { align: 'left' }) +
    parrafo(
      'El suscrito Médico Veterinario de Frigorífico Agropecuaria Santacruz Ltda.',
      { bold: true, align: 'center', spacingBefore: 200 },
    ) +
    parrafo('certifica que', { bold: true, align: 'center' }) +
    parrafo(
      `El día ${fechaLarga(c.fechaSacrificio)}, ingresan a la planta ${sexoTotal}${c.tipoAnimales} del cliente ${c.cliente} y se realizaron decomisos con los siguientes hallazgos:`,
      { align: 'both', spacingBefore: 160 },
    ) +
    tabla(c) +
    parrafo(
      `Se hace constancia a los ${dia} días del mes de ${mesDe(
        c.fechaCertificado,
      ).toLowerCase()} de ${anio}.`,
      { align: 'both', spacingBefore: 160 },
    ) +
    fotos +
    imagenInline('rIdCertFirma', firmaSize, next(), 'firma') +
    firmaNombre(nombreFirma) +
    parrafo('Médico Veterinario Zootecnista', { align: 'center', size: 18 }) +
    parrafo('Frigorífico Agropecuaria Santacruz.', {
      align: 'center',
      size: 18,
    })
  )
}

// Arma el .docx desde cero con un membrete generado (respaldo si no hay .docx).
async function generarDesdeCero(
  certs: CertificadoDecomiso[],
  usuario: Usuario | null,
): Promise<Blob> {
  const zip = new PizZip()

  const [marcaBytes, logoBytes, firma] = await Promise.all([
    cargarBytes('/logos/marca%20de%20agua.png'),
    cargarBytes('/logos/agropecuaria-santacruz.png'),
    cargarFirma(usuario),
  ])
  const firmaBytes = firma.bytes
  const nombreFirma = firma.nombre
  const logoSize = pngSizeEmu(logoBytes, 4.6)
  const firmaSize = pngSizeEmu(firmaBytes, 4.5)

  const media: Media[] = [
    { id: RID_LOGO, nombre: 'logo.png', bytes: logoBytes },
    { id: RID_FIRMA, nombre: 'firma.png', bytes: firmaBytes },
  ]
  let seq = 0
  const next = () => ++seq

  const cuerpo = certs
    .map((c, i) =>
      bloqueCertificado(c, i > 0, media, next, logoSize, firmaSize, nombreFirma),
    )
    .join('')

  const document =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document ${NS}>` +
    `<w:body>` +
    cuerpo +
    seccion() +
    `</w:body></w:document>`

  const header =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:hdr ${NS}>` +
    `<w:p><w:r><w:pict>` +
    `<v:shape id="MarcaAgua" o:spid="_x0000_s2049" type="#_x0000_t75" ` +
    `style="position:absolute;margin-left:0;margin-top:0;width:400pt;height:400pt;` +
    `z-index:-251658752;mso-position-horizontal:center;mso-position-horizontal-relative:margin;` +
    `mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f">` +
    `<v:imagedata r:id="rIdMarca" o:title="marca"/>` +
    `</v:shape>` +
    `</w:pict></w:r></w:p>` +
    `</w:hdr>`

  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`

  const docRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>` +
    media
      .map(
        (m) =>
          `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.nombre}"/>`,
      )
      .join('') +
    `</Relationships>`

  const headerRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rIdMarca" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/marca.png"/>` +
    `</Relationships>`

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="png" ContentType="image/png"/>` +
    `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
    `<Default Extension="jpg" ContentType="image/jpeg"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>` +
    `</Types>`

  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', rels)
  zip.file('word/document.xml', document)
  zip.file('word/header1.xml', header)
  zip.file('word/_rels/document.xml.rels', docRels)
  zip.file('word/_rels/header1.xml.rels', headerRels)
  zip.file('word/media/marca.png', marcaBytes)
  for (const m of media) zip.file(`word/media/${m.nombre}`, m.bytes)

  return zip.generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

const NS =
  `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
  `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
  `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
  `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
  `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ` +
  `xmlns:v="urn:schemas-microsoft-com:vml" ` +
  `xmlns:o="urn:schemas-microsoft-com:office:office"`

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
  size?: number // en medios puntos (24 = 12pt)
  align?: 'left' | 'center' | 'right' | 'both'
  spacingBefore?: number // twips
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

// Encabezado de tabla (celda verde, texto blanco).
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

// Celda de datos.
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

function tabla(c: CertificadoDecomiso): string {
  const sexo = (c.tipoAnimales || '').replace(/S$/, '')
  const cabecera =
    `<w:tr>` +
    ['LOTE', 'CLIENTE', 'TURNO', 'ÓRGANO', 'PATOLOGÍA', 'CANTIDAD', 'SEXO', 'DICTAMEN']
      .map(th)
      .join('') +
    `</w:tr>`
  const filas = c.hallazgos
    .map(
      (r) =>
        `<w:tr>` +
        td(c.lote, true) +
        td(c.cliente) +
        td(r.gancho, true) +
        td(r.organo) +
        td(r.patologia) +
        td(r.cantidad, true) +
        td(sexo, true) +
        td(r.dictamen, true) +
        `</w:tr>`,
    )
    .join('')
  const grid = [1100, 1600, 900, 1300, 1500, 900, 900, 1300]
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

// Imagen en linea centrada, referenciando una relacion de imagen ya declarada.
function imagenInline(rId: string, s: Emu, id: number, nombre: string): string {
  return (
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>` +
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

function imagenFoto(dataUrl: string, media: Media[], next: () => number): string {
  const n = next()
  const { bytes, ext } = dataUrlABytes(dataUrl)
  const nombre = `foto${n}.${ext}`
  const id = `rIdFoto${n}`
  media.push({ id, nombre, bytes })
  return imagenInline(id, { cx: 2160000, cy: 1620000 }, 500 + n, 'foto')
}

// Nombre del firmante con una linea superior (imita el borde de la firma).
function firmaNombre(nombre: string): string {
  return (
    `<w:p><w:pPr><w:jc w:val="center"/>` +
    `<w:pBdr><w:top w:val="single" w:sz="6" w:space="2" w:color="333333"/></w:pBdr>` +
    `</w:pPr>` +
    `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="20"/></w:rPr>` +
    `<w:t xml:space="preserve">${esc(nombre)}</w:t></w:r></w:p>`
  )
}

// Linea verde separadora (borde inferior de un parrafo).
function lineaVerde(): string {
  return (
    `<w:p><w:pPr><w:spacing w:before="360" w:after="0"/>` +
    `<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="1" w:color="4CAF50"/></w:pBdr>` +
    `</w:pPr></w:p>`
  )
}

// Pie con logo, contacto e INVIMA en tres columnas sin bordes.
function pie(logoSize: Emu, id: number): string {
  const logoPie: Emu = {
    cx: Math.round(logoSize.cx * 0.6),
    cy: Math.round(logoSize.cy * 0.6),
  }
  const contactoLineas = [
    'Tel: 376 6701  |  Nit. 830.505.537-2',
    'Malambo - Atlántico I km. 3 vía oriental',
    'administracion@frigorificosantacruz.com',
    'www.frigorificosantacruz.com',
  ]
  const celdaLogo =
    `<w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
    imagenInline(RID_LOGO, logoPie, id, 'logopie') +
    `</w:tc>`
  const celdaContacto =
    `<w:tc><w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
    contactoLineas
      .map((t) => parrafo(t, { align: 'center', size: 15, color: '555555' }))
      .join('') +
    `</w:tc>`
  const celdaSanitaria =
    `<w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>` +
    parrafo('CON AUTORIZACIÓN\nSANITARIA\nINVIMA · DECRETO 1500', {
      align: 'center',
      size: 15,
      bold: true,
      color: '2F9E44',
    }) +
    `</w:tc>`
  const sinBordes =
    `<w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>` +
    `<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>` +
    `<w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>` +
    `<w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>` +
    `<w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>` +
    `<w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>`
  return (
    lineaVerde() +
    `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>` +
    `<w:tblBorders>${sinBordes}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="2600"/><w:gridCol w:w="4200"/><w:gridCol w:w="2600"/></w:tblGrid>` +
    `<w:tr>${celdaLogo}${celdaContacto}${celdaSanitaria}</w:tr>` +
    `</w:tbl>`
  )
}

function bloqueCertificado(
  c: CertificadoDecomiso,
  saltoPagina: boolean,
  media: Media[],
  next: () => number,
  logoSize: Emu,
  firmaSize: Emu,
  nombreFirma: string,
): string {
  const sexoTotal = c.totalAnimales > 0 ? `${c.totalAnimales} ` : ''
  const dia =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(c.fechaCertificado)?.[3]?.replace(
      /^0/,
      '',
    ) ?? ''
  const anio = c.fechaCertificado.slice(0, 4)
  const salto = saltoPagina
    ? `<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>`
    : ''
  const fotos =
    (c.imagenes ?? []).length > 0
      ? parrafo('EVIDENCIA FOTOGRÁFICA', {
          bold: true,
          color: '2F9E44',
          align: 'center',
          spacingBefore: 240,
        }) + c.imagenes.map((s) => imagenFoto(s, media, next)).join('')
      : ''
  return (
    salto +
    imagenInline(RID_LOGO, logoSize, next(), 'logo') +
    parrafo(`Certificado N° ${formatoConsecutivo(c.consecutivo)}`, {
      bold: true,
      color: '2F9E44',
      align: 'right',
      spacingBefore: 120,
    }) +
    parrafo(`Malambo, ${fechaLarga(c.fechaCertificado)}.`, { align: 'left' }) +
    parrafo(
      'El suscrito Médico Veterinario de Frigorífico Agropecuaria Santacruz Ltda.',
      { bold: true, align: 'center', spacingBefore: 200 },
    ) +
    parrafo('certifica que', { bold: true, align: 'center' }) +
    parrafo(
      `El día ${fechaLarga(c.fechaSacrificio)}, ingresan a la planta ${sexoTotal}${c.tipoAnimales} del cliente ${c.cliente} y se realizaron decomisos con los siguientes hallazgos:`,
      { align: 'both', spacingBefore: 160 },
    ) +
    tabla(c) +
    parrafo(
      `Se hace constancia a los ${dia} días del mes de ${mesDe(
        c.fechaCertificado,
      ).toLowerCase()} de ${anio}.`,
      { align: 'both', spacingBefore: 160 },
    ) +
    fotos +
    imagenInline(RID_FIRMA, firmaSize, next(), 'firma') +
    firmaNombre(nombreFirma) +
    parrafo('Médico Veterinario Zootecnista', { align: 'center', size: 18 }) +
    parrafo('Frigorífico Agropecuaria Santacruz.', { align: 'center', size: 18 }) +
    pie(logoSize, next())
  )
}

function seccion(): string {
  return (
    `<w:sectPr>` +
    `<w:headerReference w:type="default" r:id="rIdHeader"/>` +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1134" w:right="1134" w:bottom="851" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>` +
    `</w:sectPr>`
  )
}

async function cargarBytes(ruta: string): Promise<Uint8Array> {
  const resp = await fetch(ruta)
  const buf = await resp.arrayBuffer()
  return new Uint8Array(buf)
}

function dataUrlABytes(dataUrl: string): { bytes: Uint8Array; ext: string } {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(dataUrl)
  const ext = m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'png'
  const base64 = m ? m[2] : (dataUrl.split(',')[1] ?? '')
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, ext }
}

// Calcula el tamano en EMU manteniendo proporcion, dado un ancho objetivo en cm.
function pngSizeEmu(bytes: Uint8Array, anchoCm: number): Emu {
  const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  const cx = Math.round(anchoCm * 360000)
  const cy = w > 0 ? Math.round((cx * h) / w) : cx
  return { cx, cy }
}
