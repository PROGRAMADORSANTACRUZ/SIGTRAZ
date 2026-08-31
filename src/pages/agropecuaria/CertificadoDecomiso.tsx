import { useEffect, useMemo, useRef, useState } from 'react'
import { ModalEliminar } from '../../components/ModalEliminar'
import { api } from '../../services/api'
import {
  actualizarCertificado,
  eliminarCertificados,
  formatoConsecutivo,
  useCertificados,
  type CertificadoDecomiso as Certificado,
  type HallazgoCertificado,
} from './certificadosStore'
import { generarCertificadoDocx } from './certificadoDocx'

const ESTILOS_DOC =
  `*{box-sizing:border-box;}` +
  `body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;background:#fff;}` +
  `.hoja{position:relative;max-width:820px;margin:0 auto;padding-bottom:12px;}` +
  `.membrete{text-align:center;padding:28px 56px 4px;}` +
  `.membrete img{width:190px;height:auto;}` +
  `.marca{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;}` +
  `.cuerpo{position:relative;z-index:1;padding:4px 56px 8px;font-size:13px;line-height:1.7;outline:none;}` +
  `.consecutivo{text-align:right;font-weight:bold;color:#2f9e44;margin-bottom:6px;font-size:12px;}` +
  `.fecha{text-align:left;margin:2px 0 6px;}` +
  `.cuerpo .intro{text-align:center;font-weight:bold;margin:18px 0 0;}` +
  `.cuerpo .subintro{text-align:center;margin:2px 0 16px;font-weight:bold;}` +
  `.cuerpo p{text-align:justify;margin:12px 0;}` +
  `table{border-collapse:collapse;width:100%;margin:20px 0;font-size:11.5px;box-shadow:0 1px 3px rgba(0,0,0,.12);}` +
  `th{background:#4caf50;color:#fff;padding:8px 6px;text-transform:uppercase;font-size:10.5px;letter-spacing:.3px;border:1px solid #43a047;text-align:center;}` +
  `td{border:1px solid #c8e6c9;padding:6px 8px;color:#2e7d32;}` +
  `tbody tr:nth-child(even){background:#f1f8e9;}` +
  `.c{text-align:center;}` +
  `.fotos{margin:22px 0;page-break-inside:avoid;}` +
  `.fotos-titulo{font-weight:bold;color:#2f9e44;text-align:center;letter-spacing:.5px;margin-bottom:10px;font-size:12px;}` +
  `.fotos-grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}` +
  `.fotos-grid img{width:220px;height:165px;object-fit:cover;border:1px solid #c8e6c9;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.15);}` +
  `.firma{position:relative;z-index:1;margin-top:48px;text-align:center;}` +
  `.firma img{width:170px;height:auto;display:block;margin:0 auto -10px;}` +
  `.firma .nombre{font-weight:bold;border-top:1px solid #333;display:inline-block;padding:6px 24px 0;}` +
  `.firma .cargo{margin-top:2px;font-size:12px;}` +
  `.pie{position:relative;z-index:1;margin-top:44px;border-top:3px solid #4caf50;padding:12px 56px 0;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:10px;color:#555;}` +
  `.pie img{width:120px;height:auto;}` +
  `.pie .contacto{text-align:center;line-height:1.6;}` +
  `.pie .sanitaria{text-align:center;line-height:1.4;font-weight:bold;color:#2f9e44;}` +
  `.barra{position:fixed;top:0;left:0;right:0;background:#1e293b;padding:8px 16px;display:flex;gap:8px;justify-content:flex-end;z-index:10;}` +
  `.barra button{font-family:Arial,sans-serif;font-size:13px;font-weight:600;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;}` +
  `.barra .imp{background:#2563eb;color:#fff;}` +
  `.hoja{margin-top:52px;}` +
  `@media print{.barra{display:none;}.hoja{margin-top:0;}}`

// Envuelve el contenido con membrete, marca de agua, firma y pie de pagina.
function plantillaCertificado(contenido: string, editable = false): string {
  const origin = window.location.origin
  const logo = `${origin}/logos/agropecuaria-santacruz.png`
  const firma = `${origin}/firmas/juancamiloalean.png`
  const marca = `${origin}/logos/marca%20de%20agua.png`
  return (
    `<div class="hoja">` +
    `<img class="marca" src="${marca}" alt="" onerror="this.style.display='none'"/>` +
    `<div class="membrete"><img src="${logo}" alt="Santacruz" onerror="this.style.display='none'"/></div>` +
    `<div class="cuerpo"${editable ? ' contenteditable="true"' : ''}>${contenido}</div>` +
    `<div class="firma">` +
    `<img src="${firma}" alt="" onerror="this.style.display='none'"/>` +
    `<div class="nombre">Juan Camilo Alean Rodríguez.</div>` +
    `<div class="cargo">Médico Veterinario Zootecnista</div>` +
    `<div class="cargo">Frigorífico Agropecuaria Santacruz.</div>` +
    `</div>` +
    `<div class="pie">` +
    `<img src="${logo}" alt="Santacruz"/>` +
    `<div class="contacto">Tel: 376 6701&nbsp;&nbsp;|&nbsp;&nbsp;Nit. 830.505.537-2<br/>Malambo - Atlántico I km. 3 vía oriental<br/>administracion@frigorificosantacruz.com<br/>www.frigorificosantacruz.com</div>` +
    `<div class="sanitaria">CON AUTORIZACIÓN<br/>SANITARIA<br/>INVIMA · DECRETO 1500</div>` +
    `</div>` +
    `</div>`
  )
}

interface EdicionForm {
  cliente: string
  lote: string
  fechaSacrificio: string
  fechaCertificado: string
  tipoAnimales: string
  totalAnimales: string
  hallazgos: HallazgoCertificado[]
  imagenes: string[]
}

const DICTAMENES = ['DECOMISO', 'DECOMISO PARCIAL', 'RETENIDO']
const TIPOS_ANIMAL = ['BOVINOS', 'BUFALOS']

export function CertificadoDecomiso() {
  const certificados = useCertificados()
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [mostrarEliminar, setMostrarEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [editando, setEditando] = useState<Certificado | null>(null)
  const [form, setForm] = useState<EdicionForm | null>(null)
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Enciende la camara cuando se abre el visor y la apaga al cerrarlo.
  useEffect(() => {
    if (!camaraAbierta) return
    let activo = true
    setErrorCamara(null)
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      })
      .catch(() =>
        setErrorCamara('No se pudo acceder a la cámara. Revisa los permisos.'),
      )
    return () => {
      activo = false
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [camaraAbierta])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return [...certificados]
      .filter((c) => {
        const f = c.fechaSacrificio // YYYY-MM-DD
        if (filtroMes && !f.startsWith(filtroMes)) return false
        if (filtroDesde && f < filtroDesde) return false
        if (filtroHasta && f > filtroHasta) return false
        if (
          texto &&
          ![
            String(c.consecutivo),
            c.cliente,
            c.lote,
            c.tipoAnimales,
          ].some((v) => (v || '').toLowerCase().includes(texto))
        )
          return false
        return true
      })
      .sort((a, b) => b.consecutivo - a.consecutivo)
  }, [certificados, filtroMes, filtroDesde, filtroHasta, busqueda])

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
      prev.size === filtrados.length
        ? new Set()
        : new Set(filtrados.map((c) => c.id)),
    )
  }

  async function confirmarEliminar(password: string) {
    if (seleccionados.size === 0 || eliminando) return
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await api.verificarPassword(password)
      eliminarCertificados(new Set(seleccionados))
      setSeleccionados(new Set())
      setMostrarEliminar(false)
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  // Certificados a exportar: solo los seleccionados.
  function certificadosParaExportar() {
    return filtrados.filter((c) => seleccionados.has(c.id))
  }

  function documentoExport(lista: Certificado[]) {
    return lista
      .map(
        (c, i) =>
          `<div style="${i > 0 ? 'page-break-before:always;' : ''}">` +
          plantillaCertificado(c.contenido) +
          `</div>`,
      )
      .join('')
  }

  async function exportarWord() {
    const lista = certificadosParaExportar()
    if (lista.length === 0) return
    const blob = await generarCertificadoDocx(lista)
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(blob)
    enlace.download =
      lista.length === 1
        ? `certificado-${formatoConsecutivo(lista[0].consecutivo)}.docx`
        : 'certificados-decomiso.docx'
    enlace.click()
    URL.revokeObjectURL(enlace.href)
  }

  function exportarPDF() {
    const lista = certificadosParaExportar()
    if (lista.length === 0) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificados de decomiso</title><style>${ESTILOS_DOC}</style></head><body>` +
        `<div class="barra"><button class="imp" onclick="window.print()">Imprimir / Guardar PDF</button></div>` +
        documentoExport(lista) +
        `</body></html>`,
    )
    win.document.close()
  }

  function abrirEditor(c: Certificado) {
    setEditando(c)
    setForm({
      cliente: c.cliente,
      lote: c.lote,
      fechaSacrificio: c.fechaSacrificio,
      fechaCertificado:
        c.fechaCertificado || new Date().toLocaleDateString('en-CA'),
      tipoAnimales: c.tipoAnimales || 'BOVINOS',
      totalAnimales: String(c.totalAnimales ?? 0),
      hallazgos: c.hallazgos.map((h) => ({
        organo: h.organo,
        patologia: h.patologia,
        dictamen: h.dictamen,
        cantidad: h.cantidad,
        gancho: h.gancho ?? '',
      })),
      imagenes: c.imagenes ?? [],
    })
  }

  function actualizarCampo<K extends keyof EdicionForm>(
    campo: K,
    valor: EdicionForm[K],
  ) {
    setForm((f) => (f ? { ...f, [campo]: valor } : f))
  }

  function actualizarHallazgo(
    idx: number,
    campo: keyof HallazgoCertificado,
    valor: string,
  ) {
    setForm((f) =>
      f
        ? {
            ...f,
            hallazgos: f.hallazgos.map((h, i) =>
              i === idx ? { ...h, [campo]: valor } : h,
            ),
          }
        : f,
    )
  }

  function agregarHallazgo() {
    setForm((f) =>
      f
        ? {
            ...f,
            hallazgos: [
              ...f.hallazgos,
              { organo: '', patologia: '', dictamen: '', cantidad: '', gancho: '' },
            ],
          }
        : f,
    )
  }

  function quitarHallazgo(idx: number) {
    setForm((f) =>
      f ? { ...f, hallazgos: f.hallazgos.filter((_, i) => i !== idx) } : f,
    )
  }

  function agregarImagenes(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return
    const imagenes = Array.from(archivos).filter((a) =>
      a.type.startsWith('image/'),
    )
    imagenes.forEach((archivo) => {
      const lector = new FileReader()
      lector.onload = () => {
        const url = String(lector.result)
        setForm((f) => (f ? { ...f, imagenes: [...f.imagenes, url] } : f))
      }
      lector.readAsDataURL(archivo)
    })
  }

  function quitarImagen(idx: number) {
    setForm((f) =>
      f ? { ...f, imagenes: f.imagenes.filter((_, i) => i !== idx) } : f,
    )
  }

  function capturarFoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const url = canvas.toDataURL('image/jpeg', 0.85)
    setForm((f) => (f ? { ...f, imagenes: [...f.imagenes, url] } : f))
  }

  function cerrarCamara() {
    setCamaraAbierta(false)
    setErrorCamara(null)
  }

  function datosDesdeForm(f: EdicionForm) {
    return {
      fechaCertificado: f.fechaCertificado,
      fechaSacrificio: f.fechaSacrificio,
      cliente: f.cliente,
      lote: f.lote,
      totalAnimales: Number(f.totalAnimales) || 0,
      tipoAnimales: f.tipoAnimales,
      hallazgos: f.hallazgos,
      imagenes: f.imagenes,
    }
  }

  function guardarEdicion() {
    if (!editando || !form) return
    actualizarCertificado(editando.id, datosDesdeForm(form))
    setEditando(null)
    setForm(null)
  }

  function cerrarEditor() {
    setEditando(null)
    setForm(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Certificado Decomiso
        </h2>
        <p className="text-slate-500">
          Certificados de decomiso generados desde Pos Mortem, con consecutivo.
        </p>
      </header>

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
              placeholder="Consecutivo, cliente o lote"
              className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm uppercase focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-500">
            {seleccionados.size > 0
              ? `${seleccionados.size} seleccionado(s)`
              : `${filtrados.length} certificado(s)`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportarWord}
              disabled={filtrados.length === 0}
              className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              Word
            </button>
            <button
              onClick={exportarPDF}
              disabled={filtrados.length === 0}
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
                    className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={
                      filtrados.length > 0 &&
                      seleccionados.size === filtrados.length
                    }
                    onChange={alternarTodos}
                  />
                </th>
                <th className="px-4 py-3">Consecutivo</th>
                <th className="px-4 py-3">Fecha emisión</th>
                <th className="px-4 py-3">Fecha sacrificio</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Hallazgos</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-full border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={seleccionados.has(c.id)}
                      onChange={() => alternarSeleccion(c.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {formatoConsecutivo(c.consecutivo)}
                  </td>
                  <td className="px-4 py-3">{c.fechaEmision}</td>
                  <td className="px-4 py-3">{c.fechaSacrificio}</td>
                  <td className="px-4 py-3">{c.cliente}</td>
                  <td className="px-4 py-3">{c.lote}</td>
                  <td className="px-4 py-3">{c.hallazgos.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirEditor(c)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Ver / Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Aún no hay certificados. Se generan desde Pos Mortem al
                    guardar un decomiso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editando && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Editar certificado {formatoConsecutivo(editando.consecutivo)}
              </h3>
              <button
                onClick={cerrarEditor}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Cliente
                  </span>
                  <input
                    type="text"
                    value={form.cliente}
                    onChange={(e) => actualizarCampo('cliente', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Lote
                  </span>
                  <input
                    type="text"
                    value={form.lote}
                    onChange={(e) => actualizarCampo('lote', e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Fecha de sacrificio
                  </span>
                  <input
                    type="date"
                    value={form.fechaSacrificio}
                    onChange={(e) =>
                      actualizarCampo('fechaSacrificio', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Fecha del certificado
                  </span>
                  <input
                    type="date"
                    value={form.fechaCertificado}
                    onChange={(e) =>
                      actualizarCampo('fechaCertificado', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Tipo de animales (SEXO)
                  </span>
                  <select
                    value={form.tipoAnimales}
                    onChange={(e) =>
                      actualizarCampo('tipoAnimales', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                  >
                    {TIPOS_ANIMAL.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Total de animales
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.totalAnimales}
                    onChange={(e) =>
                      actualizarCampo('totalAnimales', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">
                    Hallazgos
                  </h4>
                  <button
                    type="button"
                    onClick={agregarHallazgo}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    + Agregar hallazgo
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Turno (Gancho)</th>
                        <th className="px-3 py-2">Órgano</th>
                        <th className="px-3 py-2">Patología</th>
                        <th className="px-3 py-2">Cantidad</th>
                        <th className="px-3 py-2">Dictamen</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.hallazgos.map((h, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={h.gancho}
                              onChange={(e) =>
                                actualizarHallazgo(i, 'gancho', e.target.value)
                              }
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={h.organo}
                              onChange={(e) =>
                                actualizarHallazgo(i, 'organo', e.target.value)
                              }
                              className="w-full min-w-[120px] rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={h.patologia}
                              onChange={(e) =>
                                actualizarHallazgo(i, 'patologia', e.target.value)
                              }
                              className="w-full min-w-[140px] rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={h.cantidad}
                              onChange={(e) =>
                                actualizarHallazgo(i, 'cantidad', e.target.value)
                              }
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select
                              value={h.dictamen}
                              onChange={(e) =>
                                actualizarHallazgo(i, 'dictamen', e.target.value)
                              }
                              className="w-full min-w-[140px] rounded-md border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option value="">—</option>
                              {DICTAMENES.map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <button
                              type="button"
                              onClick={() => quitarHallazgo(i)}
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {form.hallazgos.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-slate-400"
                          >
                            Sin hallazgos. Agrega al menos uno.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-700">
                    Evidencia fotográfica
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCamaraAbierta(true)}
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Tomar foto
                    </button>
                    <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Cargar imagen
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          agregarImagenes(e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </div>
                {form.imagenes.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {form.imagenes.map((src, i) => (
                      <div
                        key={i}
                        className="group relative h-28 w-36 overflow-hidden rounded-md border border-slate-200"
                      >
                        <img
                          src={src}
                          alt={`evidencia ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => quitarImagen(i)}
                          className="absolute right-1 top-1 rounded-full bg-rose-600/90 px-2 py-0.5 text-xs font-bold text-white hover:bg-rose-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">
                    Sin imágenes. Toma una foto o carga una imagen.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={cerrarEditor}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Guardar cambios
              </button>
            </div>
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

      {camaraAbierta && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Tomar foto</h3>
              <button
                onClick={cerrarCamara}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="relative bg-black">
              {errorCamara ? (
                <p className="px-6 py-16 text-center text-sm text-rose-300">
                  {errorCamara}
                </p>
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="mx-auto max-h-[60vh] w-full object-contain"
                />
              )}
            </div>
            <div className="flex justify-center gap-3 px-4 py-4">
              <button
                onClick={cerrarCamara}
                className="rounded-md border border-slate-500 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Cerrar
              </button>
              <button
                onClick={capturarFoto}
                disabled={!!errorCamara}
                className="rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
