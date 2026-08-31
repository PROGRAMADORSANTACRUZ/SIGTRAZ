import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { api, type NuevaEntrada } from '../services/api'
import { useEntradas } from '../store/EntradasContext'
import { FormatoRecepcion } from '../components/FormatoRecepcion'
import { SelectorProducto } from '../components/SelectorProducto'
import { SelectorProveedor } from '../components/SelectorProveedor'
import { BotonBascula } from '../components/PesoInput'
import { marcarUsadaPorNumero } from '../store/notificacionesStore'
import type {
  Colaborador,
  CuartoFrio,
  Entrada,
  Producto,
  Proveedor,
} from '../types/trazabilidad'

function hoyLocalDateTime(): string {
  const ahora = new Date()
  const offset = ahora.getTimezoneOffset() * 60000
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 16)
}

// Convierte una fecha ISO (o Date) a formato datetime-local (yyyy-MM-ddTHH:mm)
// en la zona horaria local, para precargar el input al editar.
function isoToLocalDateTime(iso?: string): string {
  if (!iso) return hoyLocalDateTime()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return hoyLocalDateTime()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

// Devuelve solo la parte de fecha (yyyy-MM-dd) para los inputs type="date".
function soloFecha(v?: string): string {
  return v ? v.slice(0, 10) : ''
}

// Redimensiona y comprime una imagen a un data URL JPEG para no guardar
// archivos enormes en la base de datos (foto de la recepcion).
function comprimirImagen(file: File, maxLado = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen invalida'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const w = Math.round(img.width * escala)
        const h = Math.round(img.height * escala)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(file)
  })
}

// Captura el frame actual de un <video> a un data URL JPEG redimensionado.
function capturarDeVideo(video: HTMLVideoElement, maxLado = 1280): string {
  const vw = video.videoWidth || 1280
  const vh = video.videoHeight || 720
  const escala = Math.min(1, maxLado / Math.max(vw, vh))
  const w = Math.round(vw * escala)
  const h = Math.round(vh * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.7)
}

const entradaVacia = (productoId = ''): NuevaEntrada => ({
  fecha: hoyLocalDateTime(),
  productoId,
  loteCodigo: '',
  cantidad: 0,
  proveedor: '',
  almacen: '',
  responsable: '',
  documento: '',
  notas: '',
  fechaVencimiento: '',
  fechaBeneficio: '',
  fechaEmpaque: '',
  loteExterno: '',
  vehPisos: 'C',
  vehParedes: 'C',
  vehTechos: 'C',
  vehCortinas: 'C',
  organolepticas: 'C',
  tempProducto: undefined,
  tempVehiculo: undefined,
  placa: '',
  fotos: [],
  colaborador: '',
})

// Una linea de producto dentro de una misma recepcion (varios productos).
interface LineaProducto {
  productoId: string
  cantidad: number
}

const lineaVacia = (productoId = ''): LineaProducto => ({
  productoId,
  cantidad: 0,
})

// Una recepcion agrupada: todos los productos que comparten el mismo lote
// interno se muestran en una sola fila de la tabla.
interface Grupo {
  clave: string
  loteInterno: string
  fecha: string
  proveedor: string
  almacen: string
  documento?: string
  editado: boolean
  totalTexto: string
  entradas: Entrada[]
}

export function Entradas() {
  const { entradas, cargando, error, agregarEntradasLote, actualizarLoteEntradas, eliminarLoteEntradas } =
    useEntradas()
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState<NuevaEntrada>(() => entradaVacia())
  const [lineas, setLineas] = useState<LineaProducto[]>(() => [lineaVacia()])
  const [editandoLote, setEditandoLote] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [formato, setFormato] = useState<Entrada[] | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [cuartos, setCuartos] = useState<CuartoFrio[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [errorCamara, setErrorCamara] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [grupoAEliminar, setGrupoAEliminar] = useState<Grupo | null>(null)
  const [passwordEliminar, setPasswordEliminar] = useState('')
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [grupoAEditar, setGrupoAEditar] = useState<Grupo | null>(null)
  const [passwordEditar, setPasswordEditar] = useState('')
  const [errorEditar, setErrorEditar] = useState<string | null>(null)
  const [verificandoPassword, setVerificandoPassword] = useState(false)
  const [passwordVerificada, setPasswordVerificada] = useState('')
  const [actualizando, setActualizando] = useState(false)
  const [filtroLote, setFiltroLote] = useState('')
  // Por defecto se muestra solo el dia de hoy; el usuario filtra para ver mas.
  const [filtroDesde, setFiltroDesde] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [filtroHasta, setFiltroHasta] = useState(() =>
    new Date().toLocaleDateString('en-CA'),
  )
  const [numeroCert, setNumeroCert] = useState('')
  // Se activa al intentar guardar con campos faltantes: pinta de rojo lo que falta.
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [certMsg, setCertMsg] = useState<{ ok: boolean; texto: string } | null>(
    null,
  )
  // Lotes del certificado con su fecha de sacrificio (cuando hay varios).
  const [lotesCert, setLotesCert] = useState<
    Array<{ lote: string; fecha: string }>
  >([])
  const [searchParams, setSearchParams] = useSearchParams()

  // Al llegar desde un aviso de certificado (?cert=ASC-...): abre el formulario
  // y precarga los datos de ese certificado para comenzar a ingresar.
  useEffect(() => {
    const cert = searchParams.get('cert')
    if (!cert) return
    setNumeroCert(cert)
    setMostrarForm(true)
    buscarCertificado(cert)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    api
      .getProductos()
      .then((datos) => {
        setProductos(datos)
        setForm((prev) =>
          prev.productoId ? prev : { ...prev, productoId: datos[0]?.id ?? '' },
        )
      })
      .catch(() => setProductos([]))
  }, [])

  useEffect(() => {
    api
      .getProveedores()
      .then((datos) => setProveedores(datos.filter((p) => p.activo)))
      .catch(() => setProveedores([]))
  }, [])

  useEffect(() => {
    api
      .getCuartosFrios()
      .then((datos) =>
        setCuartos(datos.filter((c) => c.estado === 'Activo')),
      )
      .catch(() => setCuartos([]))
  }, [])

  // Colaboradores del punto de venta activo (el backend ya filtra por PDV).
  useEffect(() => {
    api
      .getColaboradores()
      .then((datos) => setColaboradores(datos))
      .catch(() => setColaboradores([]))
  }, [])

  const productoPorId = useMemo(() => {
    const mapa = new Map<string, Producto>()
    productos.forEach((p) => mapa.set(p.id, p))
    return mapa
  }, [productos])

  const formValido = useMemo(
    () =>
      form.proveedor.trim() !== '' &&
      form.almacen.trim() !== '' &&
      form.responsable.trim() !== '' &&
      (form.vehPisos ?? '') !== '' &&
      (form.vehParedes ?? '') !== '' &&
      (form.vehTechos ?? '') !== '' &&
      (form.vehCortinas ?? '') !== '' &&
      (form.organolepticas ?? '') !== '' &&
      form.tempProducto != null &&
      form.tempVehiculo != null &&
      (form.placa ?? '').trim() !== '' &&
      lineas.length > 0 &&
      lineas.every((l) => l.productoId.trim() !== '' && l.cantidad > 0),
    [form, lineas],
  )

  // Lista legible de los campos obligatorios que aun faltan por llenar.
  const camposFaltantes = useMemo(() => {
    const faltan: string[] = []
    if (form.proveedor.trim() === '') faltan.push('Proveedor')
    if (lineas.length === 0 || lineas.some((l) => l.productoId.trim() === ''))
      faltan.push('Producto')
    if (lineas.some((l) => !(l.cantidad > 0))) faltan.push('Cantidad (peso)')
    if (form.almacen.trim() === '') faltan.push('Almacén destino')
    if (form.responsable.trim() === '') faltan.push('Responsable')
    if ((form.vehPisos ?? '') === '') faltan.push('Pisos')
    if ((form.vehParedes ?? '') === '') faltan.push('Paredes')
    if ((form.vehTechos ?? '') === '') faltan.push('Techos')
    if ((form.vehCortinas ?? '') === '') faltan.push('Cortinas')
    if ((form.organolepticas ?? '') === '') faltan.push('C.O.P')
    if (form.tempProducto == null) faltan.push('T.Producto')
    if (form.tempVehiculo == null) faltan.push('T. Vehiculo')
    if ((form.placa ?? '').trim() === '') faltan.push('Placa')
    return faltan
  }, [form, lineas])

  function actualizar<K extends keyof NuevaEntrada>(
    campo: K,
    valor: NuevaEntrada[K],
  ) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function detenerCamara() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function abrirCamara() {
    setErrorCamara(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorForm('Este dispositivo o navegador no permite usar la camara')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      setCamaraAbierta(true)
    } catch {
      setErrorForm('No se pudo acceder a la camara (revisa los permisos)')
    }
  }

  function cerrarCamara() {
    detenerCamara()
    setCamaraAbierta(false)
    setErrorCamara(null)
  }

  function tomarFoto() {
    const video = videoRef.current
    if (!video) return
    try {
      const dataUrl = capturarDeVideo(video)
      agregarFoto(dataUrl)
      // La camara sigue abierta para capturar varias fotos seguidas.
    } catch {
      setErrorCamara('No se pudo capturar la imagen')
    }
  }

  function agregarFoto(dataUrl: string) {
    setForm((prev) => ({ ...prev, fotos: [...(prev.fotos ?? []), dataUrl] }))
  }

  function quitarFoto(idx: number) {
    setForm((prev) => ({
      ...prev,
      fotos: (prev.fotos ?? []).filter((_, i) => i !== idx),
    }))
  }

  // Conecta el stream al elemento de video una vez montado el modal.
  useEffect(() => {
    if (camaraAbierta && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => undefined)
    }
  }, [camaraAbierta])

  // Detiene la camara si el componente se desmonta.
  useEffect(() => () => detenerCamara(), [])

  // Busca el certificado de Agropecuaria por su numero (ASC-XXXXXXX) y
  // precarga proveedor, fecha de sacrificio, fecha de empaque y lote.
  function buscarCertificado(valor?: string) {
    const num = (valor ?? numeroCert).trim().toUpperCase()
    if (!num) return
    let lista: Array<Record<string, unknown>> = []
    try {
      lista = JSON.parse(localStorage.getItem('agro_certificados') || '[]')
    } catch {
      lista = []
    }
    const cert = lista.find(
      (c) => String(c.numero || '').toUpperCase() === num,
    )
    if (!cert) {
      setCertMsg({ ok: false, texto: `No se encontro el certificado ${num}.` })
      setLotesCert([])
      return
    }

    // Empareja cada lote con su fecha de sacrificio a partir de las guias del
    // certificado (una guia por lote y fecha). Si no hay guias, usa el/los
    // lote(s) sueltos con la primera fecha de sacrificio.
    const guias = Array.isArray(cert.guias)
      ? (cert.guias as Array<Record<string, unknown>>)
      : []
    const pares: Array<{ lote: string; fecha: string }> = []
    const vistos = new Set<string>()
    for (const g of guias) {
      const lote = String(g.lote || '').trim()
      const fecha = String(g.fecha || '').trim()
      if (!lote) continue
      const clave = `${lote}|${fecha}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      pares.push({ lote, fecha })
    }
    if (pares.length === 0) {
      const lotes = Array.isArray(cert.lotes)
        ? (cert.lotes as string[])
        : String(cert.lote || '')
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean)
      const fechaUnica = String(cert.fechaSacrificio || '').split(' - ')[0] || ''
      for (const lote of lotes) pares.push({ lote, fecha: fechaUnica })
    }

    setLotesCert(pares)
    const primero = pares[0]
    setForm((prev) => ({
      ...prev,
      proveedor: 'AGROPECUARIA SANTACRUZ',
      fechaBeneficio:
        primero?.fecha ||
        (String(cert.fechaSacrificio || '').split(' - ')[0] || ''),
      fechaEmpaque: String(cert.fechaProduccion || ''),
      loteExterno: primero?.lote || String(cert.lote || ''),
      documento: String(cert.numero || prev.documento),
    }))
    setCertMsg({
      ok: true,
      texto:
        pares.length > 1
          ? `Certificado ${String(cert.numero)} cargado (${String(
              cert.dirigidoA || 'sin cliente',
            )}). ${pares.length} lotes: elige uno abajo.`
          : `Certificado ${String(cert.numero)} cargado (${String(
              cert.dirigidoA || 'sin cliente',
            )}).`,
    })
  }

  // Aplica un lote del certificado (fija lote externo y su fecha de sacrificio).
  function elegirLoteCert(par: { lote: string; fecha: string }) {
    setForm((prev) => ({
      ...prev,
      loteExterno: par.lote,
      fechaBeneficio: par.fecha || prev.fechaBeneficio,
    }))
  }

  // Helpers para la lista de productos (varios productos por recepcion).
  function actualizarLinea<K extends keyof LineaProducto>(
    indice: number,
    campo: K,
    valor: LineaProducto[K],
  ) {
    setLineas((prev) =>
      prev.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)),
    )
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()])
  }

  function quitarLinea(indice: number) {
    setLineas((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== indice) : prev,
    )
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido) {
      setIntentoGuardar(true)
      return
    }
    if (guardando) return
    // En modo edicion la contrasena ya se verifico al abrir el formulario;
    // se guardan los cambios directamente.
    if (editandoLote) {
      void confirmarEdicion()
      return
    }
    setGuardando(true)
    setErrorForm(null)
    try {
      const cabecera = {
        fecha: new Date(form.fecha).toISOString(),
        proveedor: form.proveedor,
        almacen: form.almacen,
        responsable: form.responsable,
        documento: form.documento?.trim() || undefined,
        notas: form.notas?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
        fechaBeneficio: form.fechaBeneficio || undefined,
        fechaEmpaque: form.fechaEmpaque || undefined,
        loteExterno: form.loteExterno?.trim() || undefined,
        vehPisos: form.vehPisos || undefined,
        vehParedes: form.vehParedes || undefined,
        vehTechos: form.vehTechos || undefined,
        vehCortinas: form.vehCortinas || undefined,
        organolepticas: form.organolepticas || undefined,
        tempProducto:
          typeof form.tempProducto === 'number' ? form.tempProducto : undefined,
        tempVehiculo:
          typeof form.tempVehiculo === 'number' ? form.tempVehiculo : undefined,
        placa: form.placa?.trim() || undefined,
        fotos: form.fotos?.length ? form.fotos : undefined,
        colaborador: form.colaborador?.trim() || undefined,
      }
      // Crea todos los productos con UN solo lote interno compartido.
      const creadas = await agregarEntradasLote(
        cabecera,
        lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      )
      setForm(entradaVacia(productos[0]?.id ?? ''))
      setLineas([lineaVacia()])
      setMostrarForm(false)
      setIntentoGuardar(false)
      // Marca el certificado como usado para que el aviso del Dashboard pase a "OK".
      if (numeroCert.trim()) marcarUsadaPorNumero(numeroCert)
      setNumeroCert('')
      setCertMsg(null)
      setLotesCert([])
      if (creadas.length > 0) setFormato(creadas)
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo registrar la entrada',
      )
    } finally {
      setGuardando(false)
    }
  }

  const { totalKilos, totalUnidades } = useMemo(() => {
    let kilos = 0
    let unidades = 0
    for (const e of entradas) {
      const unidad = (productoPorId.get(e.productoId)?.unidad ?? '')
        .trim()
        .toLowerCase()
      if (unidad.startsWith('k')) kilos += e.cantidad
      else unidades += e.cantidad
    }
    return { totalKilos: kilos, totalUnidades: unidades }
  }, [entradas, productoPorId])

  // Filtra el historial por codigo de lote y por rango de fechas.
  const entradasFiltradas = useMemo(() => {
    const lote = filtroLote.trim().toLowerCase()
    return entradas.filter((e) => {
      if (
        lote &&
        !e.loteCodigo.toLowerCase().includes(lote) &&
        !(e.loteInterno ?? '').toLowerCase().includes(lote)
      )
        return false
      const fecha = isoToLocalDateTime(e.fecha).slice(0, 10)
      if (filtroDesde && fecha < filtroDesde) return false
      if (filtroHasta && fecha > filtroHasta) return false
      return true
    })
  }, [entradas, filtroLote, filtroDesde, filtroHasta])

  // Agrupa las entradas por lote interno: cada recepcion (uno o varios
  // productos) se muestra en una sola fila de la tabla.
  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Entrada[]>()
    for (const e of entradasFiltradas) {
      const clave = e.loteInterno ?? e.loteCodigo ?? e.id
      const lista = mapa.get(clave)
      if (lista) lista.push(e)
      else mapa.set(clave, [e])
    }
    return Array.from(mapa.entries()).map(([clave, lista]) => {
      let kilos = 0
      let unidades = 0
      for (const e of lista) {
        const unidad = (productoPorId.get(e.productoId)?.unidad ?? '')
          .trim()
          .toLowerCase()
        if (unidad.startsWith('k')) kilos += e.cantidad
        else unidades += e.cantidad
      }
      const partes: string[] = []
      if (kilos > 0)
        partes.push(
          `${kilos.toLocaleString('es-CO', { maximumFractionDigits: 2 })} KG`,
        )
      if (unidades > 0)
        partes.push(
          `${unidades.toLocaleString('es-CO', { maximumFractionDigits: 2 })} U`,
        )
      const cab = lista[0]
      return {
        clave,
        loteInterno: cab.loteInterno ?? cab.loteCodigo ?? '-',
        fecha: cab.fecha,
        proveedor: cab.proveedor,
        almacen: cab.almacen,
        documento: cab.documento,
        editado: lista.some((e) => e.editado),
        totalTexto: partes.length > 0 ? partes.join(' · ') : '0',
        entradas: lista,
      }
    })
  }, [entradasFiltradas, productoPorId])

  const hayFiltros =
    filtroLote.trim() !== '' || filtroDesde !== '' || filtroHasta !== ''

  // Consecutivo visual por modulo (E-1, E-2...). La recepcion mas antigua es la 1.
  const consecutivos = useMemo(() => {
    const orden: string[] = []
    const visto = new Set<string>()
    for (const e of entradas) {
      const clave = e.loteInterno ?? e.loteCodigo ?? e.id
      if (!visto.has(clave)) {
        visto.add(clave)
        orden.push(clave)
      }
    }
    const m = new Map<string, number>()
    orden.forEach((clave, k) => m.set(clave, orden.length - k))
    return m
  }, [entradas])

  const todosMarcados =
    grupos.length > 0 && grupos.every((g) => seleccionados.has(g.clave))

  const entradasSeleccionadas = useMemo(
    () =>
      grupos
        .filter((g) => seleccionados.has(g.clave))
        .flatMap((g) => g.entradas),
    [grupos, seleccionados],
  )

  function alternarSeleccion(clave: string) {
    setSeleccionados((prev) => {
      const s = new Set(prev)
      if (s.has(clave)) s.delete(clave)
      else s.add(clave)
      return s
    })
  }

  function alternarTodos() {
    setSeleccionados(
      todosMarcados ? new Set() : new Set(grupos.map((g) => g.clave)),
    )
  }

  function pedirEliminar(grupo: Grupo) {
    setGrupoAEliminar(grupo)
    setPasswordEliminar('')
    setErrorEliminar(null)
  }

  // Abre el modal que pide la contrasena antes de poder editar.
  function pedirPasswordEdicion(grupo: Grupo) {
    setGrupoAEditar(grupo)
    setPasswordEditar('')
    setErrorEditar(null)
  }

  // Verifica la contrasena; si es correcta abre el formulario de edicion.
  async function confirmarPasswordEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!grupoAEditar || verificandoPassword) return
    if (!passwordEditar.trim()) {
      setErrorEditar('Ingresa tu contrasena')
      return
    }
    setVerificandoPassword(true)
    setErrorEditar(null)
    try {
      await api.verificarPassword(passwordEditar)
      setPasswordVerificada(passwordEditar)
      iniciarEdicion(grupoAEditar)
      setGrupoAEditar(null)
      setPasswordEditar('')
    } catch (err) {
      setErrorEditar(
        err instanceof Error ? err.message : 'Contrasena incorrecta',
      )
    } finally {
      setVerificandoPassword(false)
    }
  }

  // Carga una recepcion completa (varios productos) en el formulario para
  // editarla. La contrasena ya fue verificada al pulsar el lapiz.
  function iniciarEdicion(grupo: Grupo) {
    const cab = grupo.entradas[0]
    setForm({
      fecha: isoToLocalDateTime(cab.fecha),
      productoId: cab.productoId,
      loteCodigo: cab.loteCodigo,
      cantidad: cab.cantidad,
      proveedor: cab.proveedor,
      almacen: cab.almacen,
      responsable: cab.responsable,
      documento: cab.documento ?? '',
      notas: cab.notas ?? '',
      fechaVencimiento: soloFecha(cab.fechaVencimiento),
      fechaBeneficio: soloFecha(cab.fechaBeneficio),
      fechaEmpaque: soloFecha(cab.fechaEmpaque),
      loteExterno: cab.loteExterno ?? '',
      vehPisos: cab.vehPisos ?? 'C',
      vehParedes: cab.vehParedes ?? 'C',
      vehTechos: cab.vehTechos ?? 'C',
      vehCortinas: cab.vehCortinas ?? 'C',
      organolepticas: cab.organolepticas ?? 'C',
      tempProducto: cab.tempProducto,
      tempVehiculo: cab.tempVehiculo,
      placa: cab.placa ?? '',
      fotos: cab.fotos ?? [],
      colaborador: cab.colaborador ?? '',
    })
    setLineas(
      grupo.entradas.map((e) => ({
        productoId: e.productoId,
        cantidad: e.cantidad,
      })),
    )
    setEditandoLote(grupo.loteInterno)
    setErrorForm(null)
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Cierra el formulario y descarta el estado de edicion.
  function cerrarForm() {
    setMostrarForm(false)
    setEditandoLote(null)
    setErrorForm(null)
    setPasswordVerificada('')
    setForm(entradaVacia(productos[0]?.id ?? ''))
    setLineas([lineaVacia()])
    setNumeroCert('')
    setCertMsg(null)
    setLotesCert([])
  }

  // Exporta la recepcion (uno o varios productos de un mismo lote interno) a
  // un archivo Excel (.xlsx) con el mismo diseno del formato impreso.
  async function exportarExcel(filas: Entrada[]) {
    if (filas.length === 0) return
    const fmt = (v?: string) => {
      if (!v) return ''
      const [a, m, d] = v.slice(0, 10).split('-')
      return a && m && d ? `${d}/${m}/${a}` : v
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Recepcion', {
      views: [{ showGridLines: false }],
    })

    // Anchos de las 19 columnas
    const anchos = [
      12, 22, 22, 14, 14, 14, 18, 16, 8, 8, 8, 8, 6, 6, 10, 10, 12, 26, 18,
    ]
    anchos.forEach((w, i) => {
      ws.getColumn(i + 1).width = w
    })

    // Alturas de fila
    const alturas = [24, 18, 18, 30, 30, 16, 46]
    alturas.forEach((h, i) => {
      ws.getRow(i + 1).height = h
    })

    // Merges del encabezado
    ws.mergeCells('A1:B3')
    ws.mergeCells('C1:P1')
    ws.mergeCells('C2:P2')
    ws.mergeCells('C3:P3')
    ws.mergeCells('Q1:S1')
    ws.mergeCells('Q2:S2')
    ws.mergeCells('Q3:S3')
    ws.getCell('C1').value = 'FORMATO DE RECEPCION DE MATERIA PRIMA'
    ws.getCell('C2').value = 'PROGRAMA DE TRAZABILIDAD DE PRODUCTOS'
    ws.getCell('Q1').value = 'CODIGO: FOR-CIA-023'
    ws.getCell('Q2').value = 'VERSION: 2'
    ws.getCell('Q3').value = 'FECHA: 20/10/2025'

    // Merges de las cabeceras de la tabla
    const merges = [
      'A4:A6', 'B4:B6', 'C4:C6', 'D4:D6', 'E4:E6', 'F4:F6', 'G4:G6', 'H4:H6',
      'Q4:Q6', 'R4:R6', 'S4:S6', 'I4:N4', 'O4:P4', 'I5:L5', 'M5:N5', 'O5:O6',
      'P5:P6',
    ]
    merges.forEach((m) => ws.mergeCells(m))

    ws.getCell('A4').value = 'Fecha'
    ws.getCell('B4').value = 'Proveedor'
    ws.getCell('C4').value = 'Producto'
    ws.getCell('D4').value = 'Fecha sacrificio'
    ws.getCell('E4').value = 'Fecha empaque'
    ws.getCell('F4').value = 'Fecha vencimiento'
    ws.getCell('G4').value = 'Lote Externo (Proveedor)'
    ws.getCell('H4').value = 'Lote interno (Si aplica)'
    ws.getCell('I4').value = 'C: cumple   NC: No cumple   No aplica: N.A'
    ws.getCell('O4').value = 'Temperatura'
    ws.getCell('Q4').value = 'Placa'
    ws.getCell('R4').value = 'Observaciones'
    ws.getCell('S4').value = 'Responsable'
    ws.getCell('I5').value =
      'Condiciones sanitarias del vehiculo (Cumple: C / No Cumple: NC)'
    ws.getCell('M5').value = 'Condiciones Organolepticas del producto'
    ws.getCell('O5').value = 'Producto'
    ws.getCell('P5').value = 'Vehiculo'
    ws.getCell('I6').value = 'Pisos'
    ws.getCell('J6').value = 'Paredes'
    ws.getCell('K6').value = 'Techos'
    ws.getCell('L6').value = 'Cortinas'
    ws.getCell('M6').value = 'C'
    ws.getCell('N6').value = 'N.C'

    // Filas 7+: una por cada producto de la recepcion
    filas.forEach((entrada, idx) => {
      const producto = productoPorId.get(entrada.productoId)
      const datos: (string | number)[] = [
        fmt(entrada.fecha),
        entrada.proveedor,
        producto?.nombre ?? '',
        fmt(entrada.fechaBeneficio),
        fmt(entrada.fechaEmpaque),
        fmt(entrada.fechaVencimiento),
        entrada.loteExterno ?? '',
        entrada.loteInterno ?? entrada.loteCodigo,
        entrada.vehPisos ?? '',
        entrada.vehParedes ?? '',
        entrada.vehTechos ?? '',
        entrada.vehCortinas ?? '',
        entrada.organolepticas === 'C' ? 'X' : '',
        entrada.organolepticas === 'NC' ? 'X' : '',
        entrada.tempProducto != null ? `${entrada.tempProducto} C` : '',
        entrada.tempVehiculo != null ? `${entrada.tempVehiculo} C` : '',
        entrada.placa ?? '',
        entrada.notas ?? '',
        entrada.responsable,
      ]
      const fila = ws.getRow(7 + idx)
      fila.height = 46
      datos.forEach((v, i) => {
        fila.getCell(i + 1).value = v
      })
    })

    // Estilos
    const brand = 'FF7A3B2E'
    const gris = 'FFEFE7E0'
    const linea = { style: 'thin' as const, color: { argb: 'FF888888' } }
    const bordes = { top: linea, bottom: linea, left: linea, right: linea }
    const centro = {
      horizontal: 'center' as const,
      vertical: 'middle' as const,
      wrapText: true,
    }

    const ultimaFila = 6 + filas.length
    for (let r = 1; r <= ultimaFila; r++) {
      for (let c = 1; c <= 19; c++) {
        const cell = ws.getRow(r).getCell(c)
        cell.border = bordes
        if (r <= 3) {
          if (c <= 2) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' },
            }
            cell.alignment = centro
          } else if (c >= 17) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: gris },
            }
            cell.font = { bold: true, size: 9 }
            cell.alignment = {
              horizontal: 'left',
              vertical: 'middle',
              wrapText: true,
            }
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: brand },
            }
            cell.font = {
              bold: true,
              size: r === 1 ? 12 : 10,
              color: { argb: 'FFFFFFFF' },
            }
            cell.alignment = centro
          }
        } else if (r <= 6) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: gris },
          }
          cell.font = { bold: true, size: 9 }
          cell.alignment = centro
        } else {
          cell.font = { size: 10 }
          cell.alignment = centro
        }
      }
    }

    // Logo: se descarga y se incrusta sobre la celda combinada A1:B3,
    // conservando su proporcion original para que no se vea estirado.
    try {
      const resp = await fetch('/logo.jpg')
      const blob = await resp.blob()
      const dataUrl: string = await new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onloadend = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })
      // Tamano natural para respetar la proporcion
      const img = new Image()
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = rej
        img.src = dataUrl
      })
      const natW = img.naturalWidth || 200
      const natH = img.naturalHeight || 200

      // Ajusta la altura a la celda y calcula el ancho por proporcion
      const h = 62
      const w = Math.round((natW / natH) * h)

      const logoId = wb.addImage({ base64: dataUrl, extension: 'jpeg' })
      ws.addImage(logoId, {
        tl: { col: 0.25, row: 0.18 },
        ext: { width: w, height: h },
        editAs: 'oneCell',
      })
    } catch {
      // Si el logo no carga, se exporta igual sin imagen.
      ws.getCell('A1').value = 'CARNES SANTACRUZ'
    }

    // Descargar
    const buffer = await wb.xlsx.writeBuffer()
    const salida = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(salida)
    const enlace = document.createElement('a')
    enlace.download = `recepcion-${filas[0].loteInterno || filas[0].loteCodigo || filas[0].id}.xlsx`
    enlace.href = url
    enlace.click()
    URL.revokeObjectURL(url)
  }

  async function confirmarEliminar(e: React.FormEvent) {
    e.preventDefault()
    if (!grupoAEliminar || eliminando) return
    if (!passwordEliminar.trim()) {
      setErrorEliminar('Ingresa tu contrasena')
      return
    }
    setEliminando(true)
    setErrorEliminar(null)
    try {
      await eliminarLoteEntradas(grupoAEliminar.loteInterno, passwordEliminar)
      setGrupoAEliminar(null)
      setPasswordEliminar('')
    } catch (err) {
      setErrorEliminar(
        err instanceof Error ? err.message : 'No se pudo eliminar',
      )
    } finally {
      setEliminando(false)
    }
  }

  async function confirmarEdicion(e?: React.FormEvent) {
    e?.preventDefault()
    if (!editandoLote || actualizando) return
    setActualizando(true)
    setErrorForm(null)
    try {
      const cabecera = {
        fecha: new Date(form.fecha).toISOString(),
        proveedor: form.proveedor,
        almacen: form.almacen,
        responsable: form.responsable,
        documento: form.documento?.trim() || undefined,
        notas: form.notas?.trim() || undefined,
        fechaVencimiento: form.fechaVencimiento || undefined,
        fechaBeneficio: form.fechaBeneficio || undefined,
        fechaEmpaque: form.fechaEmpaque || undefined,
        loteExterno: form.loteExterno?.trim() || undefined,
        vehPisos: form.vehPisos || undefined,
        vehParedes: form.vehParedes || undefined,
        vehTechos: form.vehTechos || undefined,
        vehCortinas: form.vehCortinas || undefined,
        organolepticas: form.organolepticas || undefined,
        tempProducto:
          typeof form.tempProducto === 'number' ? form.tempProducto : undefined,
        tempVehiculo:
          typeof form.tempVehiculo === 'number' ? form.tempVehiculo : undefined,
        placa: form.placa?.trim() || undefined,
        fotos: form.fotos?.length ? form.fotos : undefined,
        colaborador: form.colaborador?.trim() || undefined,
      }
      await actualizarLoteEntradas(
        editandoLote,
        cabecera,
        lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
        passwordVerificada,
      )
      setPasswordVerificada('')
      setEditandoLote(null)
      setMostrarForm(false)
      setForm(entradaVacia(productos[0]?.id ?? ''))
      setLineas([lineaVacia()])
      setNumeroCert('')
      setCertMsg(null)
      setLotesCert([])
    } catch (err) {
      setErrorForm(
        err instanceof Error ? err.message : 'No se pudo actualizar',
      )
    } finally {
      setActualizando(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Entradas</h2>
          <p className="text-slate-500">
            Recepcion de mercancia y lotes al almacen
          </p>
        </div>
        <button
          onClick={() => {
            if (mostrarForm) {
              cerrarForm()
            } else {
              setForm(entradaVacia(productos[0]?.id ?? ''))
              setLineas([lineaVacia()])
              setEditandoLote(null)
              setErrorForm(null)
              setNumeroCert('')
              setCertMsg(null)
              setLotesCert([])
              setMostrarForm(true)
            }
          }}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Entradas registradas" value={entradas.length} />
        <Kpi
          label="Kilos recibidos"
          value={totalKilos.toLocaleString('es-CO', {
            maximumFractionDigits: 2,
          })}
        />
        <Kpi
          label="Unidades recibidas"
          value={totalUnidades.toLocaleString('es-CO', {
            maximumFractionDigits: 2,
          })}
        />
        <Kpi
          label="Proveedores"
          value={new Set(entradas.map((e) => e.proveedor)).size}
        />
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4"
        >
          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {editandoLote ? 'Editar recepcion' : 'Datos de recepcion'}
            </h3>
          </div>

          <Campo label="Fecha y hora">
            <input
              type="datetime-local"
              value={form.fecha}
              onChange={(e) => actualizar('fecha', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="N° de certificado (Agropecuaria)">
            <div className="flex gap-2">
              <input
                value={numeroCert}
                data-no-upper
                onChange={(e) => {
                  setNumeroCert(e.target.value)
                  setCertMsg(null)
                  setLotesCert([])
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    buscarCertificado()
                  }
                }}
                placeholder="ASC-0000001 y presiona Enter"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => buscarCertificado()}
                className="shrink-0 rounded-md border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Buscar
              </button>
            </div>
            {certMsg && (
              <p
                className={`mt-1 text-xs ${
                  certMsg.ok ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {certMsg.texto}
              </p>
            )}
            {lotesCert.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lotesCert.map((par) => {
                  const activo = form.loteExterno === par.lote
                  return (
                    <button
                      key={`${par.lote}|${par.fecha}`}
                      type="button"
                      onClick={() => elegirLoteCert(par)}
                      title={par.fecha ? `Sacrificio: ${par.fecha}` : undefined}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        activo
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {par.lote}
                      {par.fecha ? ` · ${par.fecha}` : ''}
                    </button>
                  )
                })}
              </div>
            )}
          </Campo>

          <Campo label="Proveedor" className="md:col-span-2">
            <SelectorProveedor
              proveedores={proveedores}
              value={form.proveedor}
              onChange={(nombre) => actualizar('proveedor', nombre)}
              invalido={intentoGuardar && form.proveedor.trim() === ''}
            />
          </Campo>

          <div className="md:col-span-4 rounded-md border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Productos</p>
              <button
                type="button"
                onClick={agregarLinea}
                className="rounded-md border border-brand-300 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                + Agregar producto
              </button>
            </div>
            <div className="space-y-2">
              {lineas.map((linea, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_10rem_auto_auto] md:items-center"
                >
                  <SelectorProducto
                    productos={productos}
                    value={linea.productoId}
                    onChange={(id) => actualizarLinea(i, 'productoId', id)}
                    invalido={intentoGuardar && linea.productoId.trim() === ''}
                  />
                  <input
                    type="number"
                    min={0}
                    value={linea.cantidad || ''}
                    onChange={(e) =>
                      actualizarLinea(i, 'cantidad', Number(e.target.value) || 0)
                    }
                    placeholder="Cantidad"
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      intentoGuardar && !(linea.cantidad > 0)
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                    }`}
                  />
                  <BotonBascula
                    onCapturar={(peso) => actualizarLinea(i, 'cantidad', peso)}
                  />
                  <button
                    type="button"
                    onClick={() => quitarLinea(i)}
                    disabled={lineas.length === 1}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Campo label="Fecha de sacrificio">
            <input
              type="date"
              value={form.fechaBeneficio ?? ''}
              onChange={(e) => actualizar('fechaBeneficio', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Fecha de empaque">
            <input
              type="date"
              value={form.fechaEmpaque ?? ''}
              onChange={(e) => actualizar('fechaEmpaque', e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Lote externo (proveedor)">
            <input
              value={form.loteExterno ?? ''}
              onChange={(e) => actualizar('loteExterno', e.target.value)}
              placeholder="Lote del proveedor"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <Campo label="Almacen destino">
            <select
              value={form.almacen}
              onChange={(e) => actualizar('almacen', e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                intentoGuardar && form.almacen.trim() === ''
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
              }`}
            >
              <option value="">Selecciona un cuarto frio</option>
              {cuartos.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Documento (guia / factura)">
            <input
              value={form.documento ?? ''}
              onChange={(e) => actualizar('documento', e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </Campo>

          <div className="md:col-span-4 mt-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Control de transporte y calidad
            </h3>
          </div>

          <div className="md:col-span-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Condiciones sanitarias del vehiculo y organolepticas (C = Cumple /
              NC = No cumple)
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(5,4.5rem)_7rem_7rem_6rem_minmax(0,1fr)] md:items-end">
              <Campo label="Pisos">
                <SelectCNC
                  value={form.vehPisos ?? ''}
                  onChange={(v) => actualizar('vehPisos', v)}
                  invalido={intentoGuardar && (form.vehPisos ?? '') === ''}
                />
              </Campo>
              <Campo label="Paredes">
                <SelectCNC
                  value={form.vehParedes ?? ''}
                  onChange={(v) => actualizar('vehParedes', v)}
                  invalido={intentoGuardar && (form.vehParedes ?? '') === ''}
                />
              </Campo>
              <Campo label="Techos">
                <SelectCNC
                  value={form.vehTechos ?? ''}
                  onChange={(v) => actualizar('vehTechos', v)}
                  invalido={intentoGuardar && (form.vehTechos ?? '') === ''}
                />
              </Campo>
              <Campo label="Cortinas">
                <SelectCNC
                  value={form.vehCortinas ?? ''}
                  onChange={(v) => actualizar('vehCortinas', v)}
                  invalido={intentoGuardar && (form.vehCortinas ?? '') === ''}
                />
              </Campo>
              <Campo label="C.O.P" title="Condiciones Organolépticas del Producto">
                <SelectCNC
                  value={form.organolepticas ?? ''}
                  onChange={(v) => actualizar('organolepticas', v)}
                  invalido={intentoGuardar && (form.organolepticas ?? '') === ''}
                />
              </Campo>
              <Campo label="T.Producto">
                <input
                  type="number"
                  step="0.1"
                  value={form.tempProducto ?? ''}
                  onChange={(e) =>
                    actualizar(
                      'tempProducto',
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                  placeholder="Ej. -18"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    intentoGuardar && form.tempProducto == null
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
              </Campo>
              <Campo label="T. Vehiculo">
                <input
                  type="number"
                  step="0.1"
                  value={form.tempVehiculo ?? ''}
                  onChange={(e) =>
                    actualizar(
                      'tempVehiculo',
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                  placeholder="Ej. -20"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    intentoGuardar && form.tempVehiculo == null
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
              </Campo>
              <Campo label="Placa">
                <input
                  value={form.placa ?? ''}
                  onChange={(e) => actualizar('placa', e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    intentoGuardar && (form.placa ?? '').trim() === ''
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
              </Campo>
              <Campo label="Responsable">
                <input
                  value={form.responsable}
                  onChange={(e) => actualizar('responsable', e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    intentoGuardar && form.responsable.trim() === ''
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
                  }`}
                />
              </Campo>
            </div>
          </div>

          <div className="md:col-span-4">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Foto / imagen
            </span>
            <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={abrirCamara}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Tomar foto
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Subir archivo
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? [])
                      e.target.value = ''
                      for (const file of files) {
                        try {
                          const dataUrl = await comprimirImagen(file)
                          agregarFoto(dataUrl)
                        } catch {
                          setErrorForm('No se pudo procesar la imagen')
                        }
                      }
                    }}
                  />
                </label>
              </div>
            {form.fotos && form.fotos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {form.fotos.map((f, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={f}
                      alt={`Foto ${idx + 1} de la recepcion`}
                      className="h-24 w-24 rounded-md border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => quitarFoto(idx)}
                      title="Quitar foto"
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-4">
            <Campo label="Observaciones">
              <textarea
                value={form.notas ?? ''}
                onChange={(e) => actualizar('notas', e.target.value)}
                rows={2}
                placeholder="Opcional"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </Campo>
          </div>

          <div className="flex flex-wrap items-end gap-3 md:col-span-4">
            <div className="w-full sm:w-64">
              <Campo label="Colaborador">
                <select
                  value={form.colaborador ?? ''}
                  onChange={(e) => actualizar('colaborador', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Sin colaborador</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <div className="flex flex-1 items-center justify-end gap-3">
              {errorForm ? (
                <span className="mr-auto text-sm text-red-600">{errorForm}</span>
              ) : (
                camposFaltantes.length > 0 && (
                  <span className="mr-auto text-sm text-amber-600">
                    Falta por llenar: {camposFaltantes.join(', ')}
                  </span>
                )
              )}
              <button
                type="button"
                onClick={cerrarForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formValido || guardando || actualizando}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editandoLote
                  ? actualizando
                    ? 'Guardando...'
                    : 'Guardar cambios'
                  : guardando
                    ? 'Guardando...'
                    : 'Registrar entrada'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Buscar por lote
          </label>
          <input
            value={filtroLote}
            onChange={(e) => setFiltroLote(e.target.value)}
            placeholder="Codigo de lote"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Desde
          </label>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Hasta
          </label>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              const hoy = new Date().toLocaleDateString('en-CA')
              setFiltroLote('')
              setFiltroDesde(hoy)
              setFiltroHasta(hoy)
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </button>
        )}
        <button
          type="button"
          disabled={grupos.length === 0}
          onClick={alternarTodos}
          className="rounded-md border border-brand-500 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
        <button
          type="button"
          disabled={entradasSeleccionadas.length === 0}
          onClick={() => setFormato(entradasSeleccionadas)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Imprimir PDF
          {entradasSeleccionadas.length > 0 &&
            ` (${entradasSeleccionadas.length})`}
        </button>
        <button
          type="button"
          disabled={entradasSeleccionadas.length === 0}
          onClick={() => void exportarExcel(entradasSeleccionadas)}
          className="rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Descargar Excel
          {entradasSeleccionadas.length > 0 &&
            ` (${entradasSeleccionadas.length})`}
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  onChange={alternarTodos}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Lote interno</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium">Total K-U</th>
              <th className="px-4 py-3 font-medium">Almacen</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grupos.map((grupo, indice) => (
              <tr key={grupo.clave} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(grupo.clave)}
                    onChange={() => alternarSeleccion(grupo.clave)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3 text-slate-400 tabular-nums">
                  {`E-${consecutivos.get(grupo.clave) ?? indice + 1}`}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(grupo.fecha).toLocaleString('es')}
                  {grupo.editado && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Editado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-brand-700">
                  {grupo.loteInterno}
                </td>
                <td className="px-4 py-3 text-slate-600">{grupo.proveedor}</td>
                <td className="px-4 py-3 text-slate-600">{grupo.totalTexto}</td>
                <td className="px-4 py-3 text-slate-600">{grupo.almacen}</td>
                <td className="px-4 py-3 text-slate-500">
                  {grupo.documento ?? '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => exportarExcel(grupo.entradas)}
                      title="Exportar a Excel"
                      aria-label="Exportar a Excel"
                      className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                    >
                      <IconoExcel />
                    </button>
                    <button
                      onClick={() => setFormato(grupo.entradas)}
                      title="Ver / imprimir PDF"
                      aria-label="Ver o imprimir PDF"
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <IconoPdf />
                    </button>
                    <button
                      onClick={() => pedirPasswordEdicion(grupo)}
                      title="Editar"
                      aria-label="Editar"
                      className="rounded p-1.5 text-amber-600 hover:bg-amber-50"
                    >
                      <IconoLapiz />
                    </button>
                    <button
                      onClick={() => pedirEliminar(grupo)}
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    >
                      <IconoBasura />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {grupos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  {cargando
                    ? 'Cargando entradas...'
                    : error
                      ? `Error: ${error}`
                      : hayFiltros
                        ? 'Sin resultados para el filtro aplicado.'
                        : 'Sin entradas registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formato && (
        <FormatoRecepcion
          entradas={formato}
          productoPorId={productoPorId}
          onCerrar={() => setFormato(null)}
        />
      )}

      {camaraAbierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Tomar foto</h3>
              <span className="text-sm text-slate-500">
                {form.fotos?.length ?? 0} capturada(s)
              </span>
            </div>
            <div className="overflow-hidden rounded-md bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-auto w-full"
              />
            </div>
            {errorCamara && (
              <p className="text-sm text-red-600">{errorCamara}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarCamara}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Listo
              </button>
              <button
                type="button"
                onClick={tomarFoto}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Capturar
              </button>
            </div>
          </div>
        </div>
      )}

      {grupoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={confirmarEliminar}
            className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Eliminar entrada
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Vas a eliminar el lote{' '}
                <span className="font-medium text-slate-700">
                  {grupoAEliminar.loteInterno}
                </span>
                . Esta accion no se puede deshacer. Ingresa tu contrasena para
                confirmar.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contrasena
              </label>
              <input
                type="password"
                name="clave-confirmacion"
                autoComplete="new-password"
                autoFocus
                value={passwordEliminar}
                onChange={(e) => setPasswordEliminar(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {errorEliminar && (
              <p className="text-sm text-red-600">{errorEliminar}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setGrupoAEliminar(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={eliminando}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {grupoAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={confirmarPasswordEdicion}
            className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Editar entrada
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Vas a editar el lote{' '}
                <span className="font-medium text-slate-700">
                  {grupoAEditar.loteInterno}
                </span>
                . Ingresa tu contrasena para poder editarlo.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Contrasena
              </label>
              <input
                type="password"
                name="clave-edicion"
                autoComplete="new-password"
                autoFocus
                value={passwordEditar}
                onChange={(e) => setPasswordEditar(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {errorEditar && (
              <p className="text-sm text-red-600">{errorEditar}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setGrupoAEditar(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={verificandoPassword}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verificandoPassword ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function SelectCNC({
  value,
  onChange,
  invalido,
}: {
  value: string
  onChange: (valor: string) => void
  invalido?: boolean
}) {
  // Dos ovalos: C (Cumple, verde) y NC (No cumple, rojo). Volver a tocar deselecciona.
  const alternar = (v: string) => onChange(value === v ? '' : v)
  const base =
    'flex-1 rounded-full border px-2 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-1'
  const sinSel = invalido
    ? 'border-red-500 bg-white text-slate-600 hover:bg-slate-50'
    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => alternar('C')}
        className={`${base} ${
          value === 'C'
            ? 'border-green-600 bg-green-600 text-white focus:ring-green-500'
            : `${sinSel} focus:ring-green-500`
        }`}
      >
        S
      </button>
      <button
        type="button"
        onClick={() => alternar('NC')}
        className={`${base} ${
          value === 'NC'
            ? 'border-red-600 bg-red-600 text-white focus:ring-red-500'
            : `${sinSel} focus:ring-red-500`
        }`}
      >
        N
      </button>
    </div>
  )
}

function Campo({
  label,
  children,
  className = '',
  title,
}: {
  label: string
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <label className={`block ${className}`} title={title}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function IconoExcel() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="m9.5 12 3 5" />
      <path d="m12.5 12-3 5" />
    </svg>
  )
}

function IconoPdf() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3Z" />
      <path d="M9 16v2" />
      <path d="M14 13v5" />
      <path d="M14 13h1.8" />
      <path d="M14 15.5h1.5" />
    </svg>
  )
}

function IconoBasura() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  )
}

function IconoLapiz() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
