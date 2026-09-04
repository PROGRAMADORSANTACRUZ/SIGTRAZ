import type {
  Accion,
  Acondicionamiento,
  Activo,
  ArticuloMercado,
  Aviso,
  Contratiempo,
  Contratista,
  CuartoFrio,
  Documento,
  Entrada,
  FichaTecnica,
  Formacion,
  Inspeccion,
  InspeccionVehiculo,
  Investigacion,
  Plantilla,
  Producto,
  Programa,
  Proveedor,
  Cliente,
  RecursoBiblioteca,
  Salida,
  Devolucion,
  SolicitudCredito,
  VinculacionCliente,
  RegistroProveedor,
  RegistroActualizacionProveedor,
  Sensor,
  TrabajadorSolitario,
  Usuario,
  VerificacionPoes,
  VerificacionLyd,
  CatalogoSuesdr,
  TipoCatalogoSuesdr,
  CatalogoLyd,
  TipoCatalogoLyd,
  PuntoVenta,
  Personal,
  Colaborador,
  MonitoreoAgua,
  ResiduoSolido,
  ResiduoReciclable,
  MonitoreoTemperatura,
  InspeccionHigiene,
  EdicionLog,
} from '../types/trazabilidad'

const API_URL =
  import.meta.env.VITE_API_URL ??
  // Deriva la URL del API del mismo host desde el que se abre la app. Asi,
  // en la PC (localhost) llama a localhost:4000 y desde el celular
  // (http://192.168.x.x:5173) llama a 192.168.x.x:4000 automaticamente, sin
  // configurar ninguna IP.
  `${window.location.protocol}//${window.location.hostname}:4000/api`

export const TOKEN_KEY = 'sigtraz_token'

export type NuevaEntrada = Omit<Entrada, 'id'>
export type NuevoProducto = Omit<Producto, 'id' | 'categoria'> & {
  categoria?: string
  item?: string
}
export interface FilaCargaProducto {
  item?: string
  sku?: string
  nombre?: string
  categoria?: string
  unidad?: string
}
export interface ResultadoCarga {
  creados: number
  actualizados?: number
  omitidos: number
  errores: { fila: number; mensaje: string }[]
}
export interface FilaCargaCliente {
  nit?: string
  nombre?: string
  apellidos?: string
  direccion?: string
  referencia?: string
  barrio?: string
  ciudad?: string
  telefono?: string
  correo?: string
  puntoVenta?: string
  activo?: string
  horeca?: string
  diasDespacho?: string
  lat?: string
  lng?: string
}
export type NuevoUsuario = Omit<Usuario, 'id' | 'fechaCreacion'> & {
  password?: string
}
export type ActualizarUsuario = Omit<Usuario, 'id' | 'fechaCreacion'> & {
  password?: string
}
export type NuevoProveedor = Omit<Proveedor, 'id' | 'fechaCreacion'>
export type NuevoCliente = Omit<Cliente, 'id' | 'fechaCreacion' | 'puntoVenta'>
export type NuevoCuartoFrio = Omit<CuartoFrio, 'id' | 'fechaCreacion'>
export type NuevaFichaTecnica = Omit<FichaTecnica, 'id' | 'fechaCreacion'>
export type NuevaAccion = Omit<Accion, 'id' | 'fechaCreacion'>
export type NuevoActivo = Omit<Activo, 'id' | 'fechaCreacion'>
export type NuevaFormacion = Omit<Formacion, 'id' | 'fechaCreacion'>
export type NuevaPlantilla = Omit<Plantilla, 'id' | 'fechaCreacion'>
export type NuevaInspeccion = Omit<
  Inspeccion,
  'id' | 'fechaCreacion' | 'plantillaNombre'
>
export type NuevoPrograma = Omit<
  Programa,
  'id' | 'fechaCreacion' | 'plantillaNombre'
>

export interface RespuestaAsistente {
  texto: string
  datos?: { etiqueta: string; valor: string | number }[]
}

export interface SesionActiva {
  id: string
  usuarioId: string
  nombre: string
  apellido?: string
  email: string
  rol: string
  empresa?: string
  creadaEn: string
  ultimaActividad: string
  userAgent?: string
  esActual: boolean
}

export type NuevoContratista = Omit<Contratista, 'id' | 'fechaCreacion'>
export type NuevoAcondicionamiento = Omit<
  Acondicionamiento,
  'id' | 'fechaCreacion'
>
export type NuevaSalida = Omit<Salida, 'id' | 'fechaCreacion' | 'loteInterno'>
export type NuevaDevolucion = Omit<
  Devolucion,
  'id' | 'fechaCreacion' | 'loteInterno'
>
export type NuevaSolicitudCredito = Omit<
  SolicitudCredito,
  'id' | 'fechaCreacion' | 'consecutivo'
>
export type NuevaVinculacionCliente = Omit<
  VinculacionCliente,
  'id' | 'fechaCreacion' | 'consecutivo'
>
export type NuevoRegistroProveedor = Omit<
  RegistroProveedor,
  'id' | 'fechaCreacion' | 'consecutivo'
>
export type NuevoRegistroActualizacionProveedor = Omit<
  RegistroActualizacionProveedor,
  'id' | 'fechaCreacion' | 'consecutivo'
>
export type NuevaInspeccionVehiculo = Omit<
  InspeccionVehiculo,
  'id' | 'fechaCreacion'
>
export type NuevaVerificacionPoes = Omit<
  VerificacionPoes,
  'id' | 'fechaCreacion'
>
export type NuevoCatalogoSuesdr = Omit<CatalogoSuesdr, 'id' | 'fechaCreacion'>
export type NuevaVerificacionLyd = Omit<
  VerificacionLyd,
  'id' | 'fechaCreacion'
>
export type NuevoPuntoVenta = Omit<PuntoVenta, 'id' | 'fechaCreacion'>
export type NuevoPersonal = Omit<Personal, 'id' | 'fechaCreacion'>
export type NuevoColaborador = { nombre: string; puntoVentaId?: number }
export type NuevoMonitoreoAgua = Omit<MonitoreoAgua, 'id' | 'fechaCreacion'>
export type NuevoResiduoSolido = Omit<ResiduoSolido, 'id' | 'fechaCreacion'>
export type NuevoResiduoReciclable = Omit<
  ResiduoReciclable,
  'id' | 'fechaCreacion'
>
export type NuevoMonitoreoTemperatura = Omit<
  MonitoreoTemperatura,
  'id' | 'fechaCreacion'
>
export type NuevaInspeccionHigiene = Omit<
  InspeccionHigiene,
  'id' | 'fechaCreacion'
>
export type NuevoRecursoBiblioteca = Omit<
  RecursoBiblioteca,
  'id' | 'fechaCreacion'
>
export type NuevoDocumento = Omit<Documento, 'id' | 'fechaCreacion'>
export type NuevoContratiempo = Omit<Contratiempo, 'id' | 'fechaCreacion'>
export type NuevaInvestigacion = Omit<
  Investigacion,
  'id' | 'fechaCreacion' | 'contratiempoTitulo'
>
export type NuevoTrabajadorSolitario = Omit<
  TrabajadorSolitario,
  'id' | 'fechaCreacion'
>
export type NuevoAviso = Omit<Aviso, 'id' | 'fechaCreacion'>
export type NuevoSensor = Omit<Sensor, 'id' | 'fechaCreacion'>
export type NuevoArticuloMercado = Omit<ArticuloMercado, 'id' | 'fechaCreacion'>

export interface Estadisticas {
  totales: {
    acciones: number
    inspecciones: number
    activos: number
    contratistas: number
    contratiempos: number
    investigaciones: number
    documentos: number
    sensores: number
    avisos: number
  }
  accionesPorEstado: { etiqueta: string; valor: number }[]
  inspeccionesPorEstado: { etiqueta: string; valor: number }[]
  activosPorEstado: { etiqueta: string; valor: number }[]
  contratiemposPorGravedad: { etiqueta: string; valor: number }[]
  sensoresPorEstado: { etiqueta: string; valor: number }[]
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}

// Almacen clave-valor para sincronizar los modulos de Agropecuaria entre
// dispositivos. Cada clave de localStorage con prefijo agro_ (o de catalogo)
// se refleja como una fila en el servidor.
export interface AgroKv {
  clave: string
  valor: unknown
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export const PDV_KEY = 'sigtraz_pdv'

// Punto de venta activo (id) elegido en la barra superior. Se envia en cada
// peticion para que el backend filtre los datos por ese punto de venta.
export function getPuntoVentaActivo(): string | null {
  return localStorage.getItem(PDV_KEY)
}

export function setPuntoVentaActivo(id: string | number | null): void {
  if (id === null || id === '') localStorage.removeItem(PDV_KEY)
  else localStorage.setItem(PDV_KEY, String(id))
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const pdv = getPuntoVentaActivo()
  const resp = await fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(pdv ? { 'X-Punto-Venta': pdv } : {}),
      ...init?.headers,
    },
  })

  if (resp.status === 401) {
    const ruta = window.location.pathname
    // Rutas publicas (login, QR de trazabilidad y callback SSO) no deben
    // redirigir: en el SSO queremos ver el error real del canje del ticket,
    // no rebotar en silencio a /login.
    const esRutaPublica =
      ruta === '/login' ||
      ruta.startsWith('/t/') ||
      ruta.startsWith('/ta/') ||
      ruta.startsWith('/ts/') ||
      ruta.startsWith('/sso/')
    if (!esRutaPublica) {
      setToken(null)
      window.location.href = '/login'
      throw new Error('Sesion expirada')
    }
    // Propaga el mensaje real del servidor (p. ej. "Ticket SSO invalido").
    let detalle = ''
    try {
      const data = await resp.json()
      detalle = data.errores?.join(', ') ?? data.error ?? ''
    } catch {
      detalle = resp.statusText
    }
    throw new Error(detalle || 'No autorizado')
  }

  if (!resp.ok) {
    let detalle = ''
    try {
      const data = await resp.json()
      detalle = data.errores?.join(', ') ?? data.error ?? ''
    } catch {
      detalle = resp.statusText
    }
    throw new Error(detalle || `Error ${resp.status}`)
  }

  if (resp.status === 204) {
    return undefined as T
  }

  return resp.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    pedir<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  ssoLogin: (ticket: string) =>
    pedir<LoginResponse>('/auth/sso-login', {
      method: 'POST',
      body: JSON.stringify({ ticket }),
    }),
  getMe: () => pedir<Usuario>('/auth/me'),
  estadoSesion: () => pedir<{ activa: boolean }>('/auth/estado'),
  logout: () =>
    pedir<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
  getSesiones: () => pedir<SesionActiva[]>('/sesiones'),
  cerrarSesion: (id: string) =>
    pedir<void>(`/sesiones/${id}`, { method: 'DELETE' }),
  verificarPassword: (password: string) =>
    pedir<{ ok: boolean }>('/auth/verificar-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  getProductos: () => pedir<Producto[]>('/productos'),
  crearProducto: (producto: NuevoProducto) =>
    pedir<Producto>('/productos', {
      method: 'POST',
      body: JSON.stringify(producto),
    }),
  actualizarProducto: (id: string, producto: NuevoProducto) =>
    pedir<Producto>(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(producto),
    }),
  eliminarProducto: (id: string, password: string) =>
    pedir<void>(`/productos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  cargaMasivaProductos: (productos: FilaCargaProducto[]) =>
    pedir<ResultadoCarga>('/productos/carga-masiva', {
      method: 'POST',
      body: JSON.stringify({ productos }),
    }),
  getEntradas: () => pedir<Entrada[]>('/entradas'),
  crearEntrada: (entrada: NuevaEntrada) =>
    pedir<Entrada>('/entradas', {
      method: 'POST',
      body: JSON.stringify(entrada),
    }),
  // Crea varios productos en una misma recepcion con UN solo lote interno.
  crearEntradasLote: (
    cabecera: Omit<NuevaEntrada, 'productoId' | 'cantidad' | 'loteCodigo'>,
    productos: { productoId: string; cantidad: number }[],
  ) =>
    pedir<Entrada[]>('/entradas/lote', {
      method: 'POST',
      body: JSON.stringify({ ...cabecera, productos }),
    }),
  // Actualiza toda una recepcion (varios productos) manteniendo el lote interno.
  actualizarEntradasLote: (
    loteInterno: string,
    cabecera: Omit<NuevaEntrada, 'productoId' | 'cantidad' | 'loteCodigo'>,
    productos: { productoId: string; cantidad: number }[],
    password: string,
  ) =>
    pedir<Entrada[]>(`/entradas/lote/${encodeURIComponent(loteInterno)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...cabecera, productos, password }),
    }),
  // Elimina toda una recepcion (todos los productos de un lote interno).
  eliminarEntradasLote: (loteInterno: string, password: string) =>
    pedir<void>(`/entradas/lote/${encodeURIComponent(loteInterno)}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  actualizarEntrada: (id: string, entrada: NuevaEntrada, password: string) =>
    pedir<Entrada>(`/entradas/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...entrada, password }),
    }),
  eliminarEntrada: (id: string, password: string) =>
    pedir<void>(`/entradas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getUsuarios: () => pedir<Usuario[]>('/usuarios'),
  crearUsuario: (usuario: NuevoUsuario) =>
    pedir<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(usuario),
    }),
  actualizarUsuario: (id: string, usuario: ActualizarUsuario) =>
    pedir<Usuario>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(usuario),
    }),
  cambiarEstadoUsuario: (id: string, activo: boolean) =>
    pedir<Usuario>(`/usuarios/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ activo }),
    }),
  getProveedores: () => pedir<Proveedor[]>('/proveedores'),
  crearProveedor: (proveedor: NuevoProveedor) =>
    pedir<Proveedor>('/proveedores', {
      method: 'POST',
      body: JSON.stringify(proveedor),
    }),
  actualizarProveedor: (id: string, proveedor: NuevoProveedor) =>
    pedir<Proveedor>(`/proveedores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(proveedor),
    }),
  eliminarProveedor: (id: string, password: string) =>
    pedir<void>(`/proveedores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getClientes: () => pedir<Cliente[]>('/clientes'),
  crearCliente: (cliente: NuevoCliente) =>
    pedir<Cliente>('/clientes', {
      method: 'POST',
      body: JSON.stringify(cliente),
    }),
  actualizarCliente: (id: string, cliente: NuevoCliente) =>
    pedir<Cliente>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cliente),
    }),
  eliminarCliente: (id: string, password: string) =>
    pedir<void>(`/clientes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  cargaMasivaClientes: (clientes: FilaCargaCliente[]) =>
    pedir<ResultadoCarga>('/clientes/carga-masiva', {
      method: 'POST',
      body: JSON.stringify({ clientes }),
    }),
  getFichas: () => pedir<FichaTecnica[]>('/fichas'),
  crearFicha: (ficha: NuevaFichaTecnica) =>
    pedir<FichaTecnica>('/fichas', {
      method: 'POST',
      body: JSON.stringify(ficha),
    }),
  actualizarFicha: (id: string, ficha: NuevaFichaTecnica) =>
    pedir<FichaTecnica>(`/fichas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ficha),
    }),
  eliminarFicha: (id: string, password: string) =>
    pedir<void>(`/fichas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getCuartosFrios: () => pedir<CuartoFrio[]>('/cuartos-frios'),
  crearCuartoFrio: (cuarto: NuevoCuartoFrio) =>
    pedir<CuartoFrio>('/cuartos-frios', {
      method: 'POST',
      body: JSON.stringify(cuarto),
    }),
  actualizarCuartoFrio: (id: string, cuarto: NuevoCuartoFrio) =>
    pedir<CuartoFrio>(`/cuartos-frios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cuarto),
    }),
  eliminarCuartoFrio: (id: string, password: string) =>
    pedir<void>(`/cuartos-frios/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getAcciones: () => pedir<Accion[]>('/acciones'),
  crearAccion: (accion: NuevaAccion) =>
    pedir<Accion>('/acciones', {
      method: 'POST',
      body: JSON.stringify(accion),
    }),
  actualizarAccion: (id: string, accion: NuevaAccion) =>
    pedir<Accion>(`/acciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accion),
    }),
  eliminarAccion: (id: string, password: string) =>
    pedir<void>(`/acciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getActivos: () => pedir<Activo[]>('/activos'),
  crearActivo: (activo: NuevoActivo) =>
    pedir<Activo>('/activos', {
      method: 'POST',
      body: JSON.stringify(activo),
    }),
  actualizarActivo: (id: string, activo: NuevoActivo) =>
    pedir<Activo>(`/activos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(activo),
    }),
  eliminarActivo: (id: string, password: string) =>
    pedir<void>(`/activos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getFormaciones: () => pedir<Formacion[]>('/formaciones'),
  crearFormacion: (formacion: NuevaFormacion) =>
    pedir<Formacion>('/formaciones', {
      method: 'POST',
      body: JSON.stringify(formacion),
    }),
  actualizarFormacion: (id: string, formacion: NuevaFormacion) =>
    pedir<Formacion>(`/formaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formacion),
    }),
  eliminarFormacion: (id: string, password: string) =>
    pedir<void>(`/formaciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getPlantillas: () => pedir<Plantilla[]>('/plantillas'),
  crearPlantilla: (plantilla: NuevaPlantilla) =>
    pedir<Plantilla>('/plantillas', {
      method: 'POST',
      body: JSON.stringify(plantilla),
    }),
  actualizarPlantilla: (id: string, plantilla: NuevaPlantilla) =>
    pedir<Plantilla>(`/plantillas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plantilla),
    }),
  eliminarPlantilla: (id: string, password: string) =>
    pedir<void>(`/plantillas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getInspecciones: () => pedir<Inspeccion[]>('/inspecciones'),
  crearInspeccion: (inspeccion: NuevaInspeccion) =>
    pedir<Inspeccion>('/inspecciones', {
      method: 'POST',
      body: JSON.stringify(inspeccion),
    }),
  actualizarInspeccion: (id: string, inspeccion: NuevaInspeccion) =>
    pedir<Inspeccion>(`/inspecciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(inspeccion),
    }),
  eliminarInspeccion: (id: string, password: string) =>
    pedir<void>(`/inspecciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  getProgramas: () => pedir<Programa[]>('/programas'),
  crearPrograma: (programa: NuevoPrograma) =>
    pedir<Programa>('/programas', {
      method: 'POST',
      body: JSON.stringify(programa),
    }),
  actualizarPrograma: (id: string, programa: NuevoPrograma) =>
    pedir<Programa>(`/programas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(programa),
    }),
  eliminarPrograma: (id: string, password: string) =>
    pedir<void>(`/programas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  consultarAsistente: (pregunta: string) =>
    pedir<RespuestaAsistente>('/asistente', {
      method: 'POST',
      body: JSON.stringify({ pregunta }),
    }),

  getContratistas: () => pedir<Contratista[]>('/contratistas'),
  crearContratista: (x: NuevoContratista) =>
    pedir<Contratista>('/contratistas', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarContratista: (id: string, x: NuevoContratista) =>
    pedir<Contratista>(`/contratistas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarContratista: (id: string, password: string) =>
    pedir<void>(`/contratistas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getAcondicionamientos: () =>
    pedir<Acondicionamiento[]>('/acondicionamiento'),
  crearAcondicionamiento: (x: NuevoAcondicionamiento) =>
    pedir<Acondicionamiento>('/acondicionamiento', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarAcondicionamiento: (
    id: string,
    x: NuevoAcondicionamiento,
    password: string,
  ) =>
    pedir<Acondicionamiento>(`/acondicionamiento/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...x, password }),
    }),
  eliminarAcondicionamiento: (id: string, password: string) =>
    pedir<void>(`/acondicionamiento/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getSalidas: () => pedir<Salida[]>('/salidas'),
  crearSalida: (x: NuevaSalida) =>
    pedir<Salida>('/salidas', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarSalida: (id: string, x: NuevaSalida) =>
    pedir<Salida>(`/salidas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarSalida: (id: string, password: string) =>
    pedir<void>(`/salidas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getDevoluciones: () => pedir<Devolucion[]>('/devoluciones'),
  crearDevolucion: (x: NuevaDevolucion) =>
    pedir<Devolucion>('/devoluciones', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarDevolucion: (id: string, x: NuevaDevolucion) =>
    pedir<Devolucion>(`/devoluciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarDevolucion: (id: string, password: string) =>
    pedir<void>(`/devoluciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getSolicitudesCredito: () =>
    pedir<SolicitudCredito[]>('/solicitudes-credito'),
  crearSolicitudCredito: (x: NuevaSolicitudCredito) =>
    pedir<SolicitudCredito>('/solicitudes-credito', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarSolicitudCredito: (id: string, x: NuevaSolicitudCredito) =>
    pedir<SolicitudCredito>(`/solicitudes-credito/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarSolicitudCredito: (id: string, password: string) =>
    pedir<void>(`/solicitudes-credito/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getVinculacionClientes: () =>
    pedir<VinculacionCliente[]>('/vinculacion-clientes'),
  crearVinculacionCliente: (x: NuevaVinculacionCliente) =>
    pedir<VinculacionCliente>('/vinculacion-clientes', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarVinculacionCliente: (id: string, x: NuevaVinculacionCliente) =>
    pedir<VinculacionCliente>(`/vinculacion-clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarVinculacionCliente: (id: string, password: string) =>
    pedir<void>(`/vinculacion-clientes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getRegistroProveedores: () =>
    pedir<RegistroProveedor[]>('/registro-proveedores'),
  crearRegistroProveedor: (x: NuevoRegistroProveedor) =>
    pedir<RegistroProveedor>('/registro-proveedores', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarRegistroProveedor: (id: string, x: NuevoRegistroProveedor) =>
    pedir<RegistroProveedor>(`/registro-proveedores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarRegistroProveedor: (id: string, password: string) =>
    pedir<void>(`/registro-proveedores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getRegistroActualizacionProveedores: () =>
    pedir<RegistroActualizacionProveedor[]>(
      '/registro-actualizacion-proveedores',
    ),
  crearRegistroActualizacionProveedor: (
    x: NuevoRegistroActualizacionProveedor,
  ) =>
    pedir<RegistroActualizacionProveedor>(
      '/registro-actualizacion-proveedores',
      {
        method: 'POST',
        body: JSON.stringify(x),
      },
    ),
  actualizarRegistroActualizacionProveedor: (
    id: string,
    x: NuevoRegistroActualizacionProveedor,
  ) =>
    pedir<RegistroActualizacionProveedor>(
      `/registro-actualizacion-proveedores/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(x),
      },
    ),
  eliminarRegistroActualizacionProveedor: (id: string, password: string) =>
    pedir<void>(`/registro-actualizacion-proveedores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getInspeccionesVehiculo: () =>
    pedir<InspeccionVehiculo[]>('/inspecciones-vehiculo'),
  crearInspeccionVehiculo: (x: NuevaInspeccionVehiculo) =>
    pedir<InspeccionVehiculo>('/inspecciones-vehiculo', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarInspeccionVehiculo: (id: string, x: NuevaInspeccionVehiculo) =>
    pedir<InspeccionVehiculo>(`/inspecciones-vehiculo/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarInspeccionVehiculo: (id: string, password: string) =>
    pedir<void>(`/inspecciones-vehiculo/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getVerificacionesPoes: () =>
    pedir<VerificacionPoes[]>('/verificaciones-poes'),
  crearVerificacionPoes: (x: NuevaVerificacionPoes) =>
    pedir<VerificacionPoes>('/verificaciones-poes', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarVerificacionPoes: (id: string, x: NuevaVerificacionPoes) =>
    pedir<VerificacionPoes>(`/verificaciones-poes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarVerificacionPoes: (id: string, password: string) =>
    pedir<void>(`/verificaciones-poes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getCatalogosSuesdr: () => pedir<CatalogoSuesdr[]>('/catalogos-suesdr'),
  crearCatalogoSuesdr: (tipo: TipoCatalogoSuesdr, nombre: string) =>
    pedir<CatalogoSuesdr>('/catalogos-suesdr', {
      method: 'POST',
      body: JSON.stringify({ tipo, nombre }),
    }),
  actualizarCatalogoSuesdr: (
    id: string,
    tipo: TipoCatalogoSuesdr,
    nombre: string,
  ) =>
    pedir<CatalogoSuesdr>(`/catalogos-suesdr/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ tipo, nombre }),
    }),
  eliminarCatalogoSuesdr: (id: string, password: string) =>
    pedir<void>(`/catalogos-suesdr/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getCatalogosLyd: () => pedir<CatalogoLyd[]>('/catalogos-lyd'),
  crearCatalogoLyd: (tipo: TipoCatalogoLyd, nombre: string) =>
    pedir<CatalogoLyd>('/catalogos-lyd', {
      method: 'POST',
      body: JSON.stringify({ tipo, nombre }),
    }),
  actualizarCatalogoLyd: (id: string, tipo: TipoCatalogoLyd, nombre: string) =>
    pedir<CatalogoLyd>(`/catalogos-lyd/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ tipo, nombre }),
    }),
  eliminarCatalogoLyd: (id: string, password: string) =>
    pedir<void>(`/catalogos-lyd/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getPuntosVenta: () => pedir<PuntoVenta[]>('/puntos-venta'),
  crearPuntoVenta: (x: NuevoPuntoVenta) =>
    pedir<PuntoVenta>('/puntos-venta', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarPuntoVenta: (id: string, x: NuevoPuntoVenta) =>
    pedir<PuntoVenta>(`/puntos-venta/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarPuntoVenta: (id: string, password: string) =>
    pedir<void>(`/puntos-venta/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getPersonal: () => pedir<Personal[]>('/personal'),
  crearPersonal: (x: NuevoPersonal) =>
    pedir<Personal>('/personal', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarPersonal: (id: string, x: NuevoPersonal) =>
    pedir<Personal>(`/personal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarPersonal: (id: string, password: string) =>
    pedir<void>(`/personal/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getColaboradores: () => pedir<Colaborador[]>('/colaboradores'),
  crearColaborador: (x: NuevoColaborador) =>
    pedir<Colaborador>('/colaboradores', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarColaborador: (id: string, x: NuevoColaborador) =>
    pedir<Colaborador>(`/colaboradores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarColaborador: (id: string, password: string) =>
    pedir<void>(`/colaboradores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getMonitoreoAgua: () => pedir<MonitoreoAgua[]>('/monitoreo-agua'),
  crearMonitoreoAgua: (x: NuevoMonitoreoAgua) =>
    pedir<MonitoreoAgua>('/monitoreo-agua', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarMonitoreoAgua: (id: string, x: NuevoMonitoreoAgua) =>
    pedir<MonitoreoAgua>(`/monitoreo-agua/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarMonitoreoAgua: (id: string, password: string) =>
    pedir<void>(`/monitoreo-agua/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getResiduosSolidos: () => pedir<ResiduoSolido[]>('/residuos-solidos'),
  crearResiduoSolido: (x: NuevoResiduoSolido) =>
    pedir<ResiduoSolido>('/residuos-solidos', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarResiduoSolido: (id: string, x: NuevoResiduoSolido) =>
    pedir<ResiduoSolido>(`/residuos-solidos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarResiduoSolido: (id: string, password: string) =>
    pedir<void>(`/residuos-solidos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getResiduosReciclables: () =>
    pedir<ResiduoReciclable[]>('/residuos-reciclables'),
  crearResiduoReciclable: (x: NuevoResiduoReciclable) =>
    pedir<ResiduoReciclable>('/residuos-reciclables', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarResiduoReciclable: (id: string, x: NuevoResiduoReciclable) =>
    pedir<ResiduoReciclable>(`/residuos-reciclables/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarResiduoReciclable: (id: string, password: string) =>
    pedir<void>(`/residuos-reciclables/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getAgroKv: () => pedir<AgroKv[]>('/agro-kv'),
  putAgroKv: (clave: string, valor: unknown) =>
    pedir<void>(`/agro-kv/${encodeURIComponent(clave)}`, {
      method: 'PUT',
      body: JSON.stringify({ valor }),
    }),

  getMonitoreoTemperatura: () =>
    pedir<MonitoreoTemperatura[]>('/monitoreo-temperatura'),
  crearMonitoreoTemperatura: (x: NuevoMonitoreoTemperatura) =>
    pedir<MonitoreoTemperatura>('/monitoreo-temperatura', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarMonitoreoTemperatura: (
    id: string,
    x: NuevoMonitoreoTemperatura,
  ) =>
    pedir<MonitoreoTemperatura>(`/monitoreo-temperatura/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarMonitoreoTemperatura: (id: string, password: string) =>
    pedir<void>(`/monitoreo-temperatura/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getInspeccionesHigiene: () =>
    pedir<InspeccionHigiene[]>('/inspecciones-higiene'),
  crearInspeccionHigiene: (x: NuevaInspeccionHigiene) =>
    pedir<InspeccionHigiene>('/inspecciones-higiene', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarInspeccionHigiene: (id: string, x: NuevaInspeccionHigiene) =>
    pedir<InspeccionHigiene>(`/inspecciones-higiene/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarInspeccionHigiene: (id: string, password: string) =>
    pedir<void>(`/inspecciones-higiene/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getVerificacionesLyd: () => pedir<VerificacionLyd[]>('/verificaciones-lyd'),
  crearVerificacionLyd: (x: NuevaVerificacionLyd) =>
    pedir<VerificacionLyd>('/verificaciones-lyd', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarVerificacionLyd: (id: string, x: NuevaVerificacionLyd) =>
    pedir<VerificacionLyd>(`/verificaciones-lyd/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarVerificacionLyd: (id: string, password: string) =>
    pedir<void>(`/verificaciones-lyd/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getBiblioteca: () => pedir<RecursoBiblioteca[]>('/biblioteca'),
  crearRecurso: (x: NuevoRecursoBiblioteca) =>
    pedir<RecursoBiblioteca>('/biblioteca', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarRecurso: (id: string, x: NuevoRecursoBiblioteca) =>
    pedir<RecursoBiblioteca>(`/biblioteca/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarRecurso: (id: string, password: string) =>
    pedir<void>(`/biblioteca/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getDocumentos: () => pedir<Documento[]>('/documentos'),
  crearDocumento: (x: NuevoDocumento) =>
    pedir<Documento>('/documentos', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarDocumento: (id: string, x: NuevoDocumento) =>
    pedir<Documento>(`/documentos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarDocumento: (id: string, password: string) =>
    pedir<void>(`/documentos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getContratiempos: () => pedir<Contratiempo[]>('/contratiempos'),
  crearContratiempo: (x: NuevoContratiempo) =>
    pedir<Contratiempo>('/contratiempos', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarContratiempo: (id: string, x: NuevoContratiempo) =>
    pedir<Contratiempo>(`/contratiempos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarContratiempo: (id: string, password: string) =>
    pedir<void>(`/contratiempos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getInvestigaciones: () => pedir<Investigacion[]>('/investigaciones'),
  crearInvestigacion: (x: NuevaInvestigacion) =>
    pedir<Investigacion>('/investigaciones', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarInvestigacion: (id: string, x: NuevaInvestigacion) =>
    pedir<Investigacion>(`/investigaciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarInvestigacion: (id: string, password: string) =>
    pedir<void>(`/investigaciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getTrabajadoresSolitarios: () =>
    pedir<TrabajadorSolitario[]>('/trabajadores-solitarios'),
  crearTrabajadorSolitario: (x: NuevoTrabajadorSolitario) =>
    pedir<TrabajadorSolitario>('/trabajadores-solitarios', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarTrabajadorSolitario: (id: string, x: NuevoTrabajadorSolitario) =>
    pedir<TrabajadorSolitario>(`/trabajadores-solitarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarTrabajadorSolitario: (id: string, password: string) =>
    pedir<void>(`/trabajadores-solitarios/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getAvisos: () => pedir<Aviso[]>('/avisos'),
  crearAviso: (x: NuevoAviso) =>
    pedir<Aviso>('/avisos', { method: 'POST', body: JSON.stringify(x) }),
  actualizarAviso: (id: string, x: NuevoAviso) =>
    pedir<Aviso>(`/avisos/${id}`, { method: 'PUT', body: JSON.stringify(x) }),
  eliminarAviso: (id: string, password: string) =>
    pedir<void>(`/avisos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getSensores: () => pedir<Sensor[]>('/sensores'),
  crearSensor: (x: NuevoSensor) =>
    pedir<Sensor>('/sensores', { method: 'POST', body: JSON.stringify(x) }),
  actualizarSensor: (id: string, x: NuevoSensor) =>
    pedir<Sensor>(`/sensores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarSensor: (id: string, password: string) =>
    pedir<void>(`/sensores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getMercado: () => pedir<ArticuloMercado[]>('/mercado'),
  crearArticulo: (x: NuevoArticuloMercado) =>
    pedir<ArticuloMercado>('/mercado', {
      method: 'POST',
      body: JSON.stringify(x),
    }),
  actualizarArticulo: (id: string, x: NuevoArticuloMercado) =>
    pedir<ArticuloMercado>(`/mercado/${id}`, {
      method: 'PUT',
      body: JSON.stringify(x),
    }),
  eliminarArticulo: (id: string, password: string) =>
    pedir<void>(`/mercado/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  getEstadisticas: () => pedir<Estadisticas>('/estadisticas'),

  getEdicionesLog: () => pedir<EdicionLog[]>('/ediciones-log'),

  enviarCorreo: (datos: {
    destino: string
    asunto?: string
    mensaje?: string
    adjuntos: { nombre: string; contenidoBase64: string; tipo?: string }[]
  }) =>
    pedir<{ ok: boolean }>('/correo/enviar', {
      method: 'POST',
      body: JSON.stringify(datos),
    }),
}
