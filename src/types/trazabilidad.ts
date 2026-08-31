// Modelo de dominio de trazabilidad (generico productos / lotes)

export type EstadoLote =
  | 'En produccion'
  | 'Disponible'
  | 'En transito'
  | 'Entregado'
  | 'Retenido'

export type TipoEvento =
  | 'Produccion'
  | 'Recepcion'
  | 'Inspeccion'
  | 'Traslado'
  | 'Despacho'
  | 'Retencion'

export interface Producto {
  id: string
  sku: string
  nombre: string
  categoria: string
  unidad: string
}

export interface Acondicionamiento {
  id: string
  fecha?: string
  producto: string
  productoId?: string
  lote?: string
  loteInterno?: string
  cantidadEntrada?: number
  unidad?: string
  productoResultante?: string
  cantidadResultante?: number
  proceso?: string
  responsable?: string
  observaciones?: string
  fichaId?: string
  empresa?: string
  conservacion?: string
  instrucciones?: string
  fechaVencimiento?: string
  fechaEmpaque?: string
  destino?: string
  placaVehiculo?: string
  temperaturaVehiculo?: string
  temperaturaProducto?: string
  editado?: boolean
  puntoVenta?: string
  fechaCreacion: string
}

export interface Salida {
  id: string
  fecha?: string
  producto: string
  productoId?: string
  lote?: string
  cantidad?: number
  unidad?: string
  destino?: string
  responsable?: string
  documento?: string
  observaciones?: string
  fechaVencimiento?: string
  loteInterno?: string
  fechaCreacion: string
}

export interface Devolucion {
  id: string
  fecha?: string
  producto: string
  productoId?: string
  lote?: string
  cantidad?: number
  unidad?: string
  origen?: string
  motivo?: string
  responsable?: string
  documento?: string
  observaciones?: string
  fechaVencimiento?: string
  loteInterno?: string
  fechaCreacion: string
}

export interface SolicitudCredito {
  id: string
  fecha?: string
  cliente: string
  documento?: string
  telefono?: string
  direccion?: string
  monto?: number
  plazo?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  datos?: Record<string, unknown>
  fechaCreacion: string
}

export interface VinculacionCliente {
  id: string
  fecha?: string
  cliente: string
  documento?: string
  telefono?: string
  direccion?: string
  tipoPersona?: string
  tipoSolicitud?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  datos?: Record<string, unknown>
  fechaCreacion: string
}

export interface RegistroProveedor {
  id: string
  fecha?: string
  proveedor: string
  nit?: string
  telefono?: string
  correo?: string
  tipoProveedor?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  datos?: Record<string, unknown>
  fechaCreacion: string
}

export interface RegistroActualizacionProveedor {
  id: string
  fecha?: string
  proveedor: string
  documento?: string
  telefono?: string
  correo?: string
  clasificacion?: string
  tipoRegistro?: string
  estado?: string
  observaciones?: string
  consecutivo?: string
  datos?: Record<string, unknown>
  fechaCreacion: string
}

export interface InspeccionVehiculo {
  id: string
  fecha?: string
  tipoVehiculo?: string
  placa?: string
  cliente?: string
  numeroFactura?: string
  producto?: string
  lote?: string
  estadoUnidad?: string
  limpiezaInterior?: string
  limpiezaExterior?: string
  ausenciaPlagas?: string
  temperaturaVehiculo?: number
  temperaturaProducto?: number
  observaciones?: string
  firmaResponsable?: string
  verificadoPor?: string
  fechaCreacion: string
}

export interface VerificacionPoes {
  id: string
  fecha?: string
  hora?: string
  superficie?: string
  sustancia?: string
  dosificacion?: string
  verificacion?: string
  realizo?: string
  verifico?: string
  accionCorrectiva?: string
  fechaCreacion: string
}

export type TipoCatalogoSuesdr =
  | 'superficie'
  | 'sustancia'
  | 'dosificacion'
  | 'realizado'

export interface CatalogoSuesdr {
  id: string
  tipo: TipoCatalogoSuesdr
  nombre: string
  fechaCreacion: string
}

export type TipoCatalogoLyd = 'superficie' | 'frecuencia'

export interface CatalogoLyd {
  id: string
  tipo: TipoCatalogoLyd
  nombre: string
  fechaCreacion: string
}

export interface PuntoVenta {
  id: string
  pdv: string
  prefijo?: string
  direccion?: string
  telefono?: string
  fechaCreacion: string
}

export interface Personal {
  id: string
  cedula?: string
  nombres?: string
  puntoVenta?: string
  fechaCreacion: string
}

export interface Colaborador {
  id: string
  nombre: string
  puntoVentaId?: number
  puntoVenta?: string
  fechaCreacion: string
}

export interface MonitoreoAgua {
  id: string
  fecha?: string
  lugar?: string
  cloroResidual?: string
  ph?: string
  accionesCorrectivas?: string
  responsable?: string
  observaciones?: string
  fechaCreacion: string
}

export interface ResiduoSolido {
  id: string
  fecha?: string
  horaRecaudo?: string
  placaVehiculo?: string
  kgBolsas?: string
  firma?: string
  firmaImagen?: string
  observaciones?: string
  fechaCreacion: string
}

export interface ResiduoReciclable {
  id: string
  fecha?: string
  material?: string
  cantidad?: string
  entidadRecolectora?: string
  firmaEntrega?: string
  firmaRecibe?: string
  firmaRecibeImagen?: string
  observaciones?: string
  fechaCreacion: string
}

export interface MedicionTemp {
  manianaEquipo?: number | null
  manianaProducto?: number | null
  tardeEquipo?: number | null
  tardeProducto?: number | null
}

export interface MonitoreoTemperatura {
  id: string
  puntoVenta?: string
  ubicacion?: string
  cuartoFrioId?: number
  serial?: string
  mes?: string
  anio?: number
  funcionarios?: string
  observaciones?: string
  mediciones: MedicionTemp[]
  fechaCreacion: string
}

export interface InspeccionHigiene {
  id: string
  operario?: string
  evaluacion?: string
  mes?: string
  anio?: string
  semanas?: string[]
  observacion?: string
  firma?: string
  fechaCreacion: string
}

export interface VerificacionLyd {
  id: string
  superficie?: string
  frecuencia?: string
  restaurante?: string
  mes?: string
  anio?: string
  dias?: string[]
  responsable?: string
  verifica?: string
  observaciones?: string
  fechaCreacion: string
}

export interface Lote {
  id: string
  productoId: string
  codigo: string
  fechaProduccion: string
  fechaVencimiento: string
  cantidad: number
  estado: EstadoLote
}

export interface EventoTrazabilidad {
  id: string
  loteId: string
  tipo: TipoEvento
  fecha: string
  ubicacion: string
  responsable: string
  notas?: string
}

export interface Entrada {
  id: string
  fecha: string
  productoId: string
  loteCodigo: string
  cantidad: number
  proveedor: string
  almacen: string
  responsable: string
  documento?: string
  notas?: string
  fechaVencimiento?: string
  fechaBeneficio?: string
  fechaEmpaque?: string
  loteExterno?: string
  vehPisos?: string
  vehParedes?: string
  vehTechos?: string
  vehCortinas?: string
  organolepticas?: string
  tempProducto?: number
  tempVehiculo?: number
  placa?: string
  fotos?: string[]
  colaborador?: string
  editado?: boolean
  loteInterno?: string
}

export type RolUsuario =
  | 'Administrador'
  | 'Calidad'
  | 'Auxiliar de calidad PDV'
  | 'Auxiliar de calidad Planta'
  | 'Medico Veterinario'
  | 'Medico Veterinario Bovino'
  | 'Medico Veterinario Porcino'
  | 'Consultor'

export const ROLES: RolUsuario[] = [
  'Administrador',
  'Calidad',
  'Auxiliar de calidad PDV',
  'Auxiliar de calidad Planta',
  'Medico Veterinario',
  'Medico Veterinario Bovino',
  'Medico Veterinario Porcino',
  'Consultor',
]

export type EmpresaUsuario =
  | 'CARNES SANTACRUZ'
  | 'AGROPECUARIA SANTACRUZ'
  | 'INVERSIONES SERRANO MILLAN'

export const EMPRESAS_USUARIO: EmpresaUsuario[] = [
  'CARNES SANTACRUZ',
  'AGROPECUARIA SANTACRUZ',
  'INVERSIONES SERRANO MILLAN',
]

// Roles disponibles por empresa. Administrador, Calidad y Consultor aplican a todas.
export const ROLES_POR_EMPRESA: Record<EmpresaUsuario, RolUsuario[]> = {
  'CARNES SANTACRUZ': [
    'Administrador',
    'Calidad',
    'Auxiliar de calidad PDV',
    'Consultor',
  ],
  'AGROPECUARIA SANTACRUZ': [
    'Administrador',
    'Calidad',
    'Auxiliar de calidad Planta',
    'Medico Veterinario',
    'Medico Veterinario Bovino',
    'Medico Veterinario Porcino',
    'Consultor',
  ],
  'INVERSIONES SERRANO MILLAN': ['Administrador', 'Calidad', 'Consultor'],
}

// Ruta principal de cada empresa (Inversiones aun no tiene modulo).
export const RUTA_POR_EMPRESA: Record<EmpresaUsuario, string | null> = {
  'CARNES SANTACRUZ': '/',
  'AGROPECUARIA SANTACRUZ': '/agropecuaria',
  'INVERSIONES SERRANO MILLAN': null,
}

export interface Usuario {
  id: string
  nombre: string
  apellido?: string
  email: string
  rol: RolUsuario
  empresa?: EmpresaUsuario
  activo: boolean
  fechaCreacion: string
  // Ids de los puntos de venta asignados (los Administradores ven todos).
  puntosVenta?: number[]
  // Rutas de modulos permitidos (los Administradores ven todos).
  modulos?: string[]
}

export interface Proveedor {
  id: string
  nombre: string
  nit?: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  activo: boolean
  fechaCreacion: string
}

export interface Cliente {
  id: string
  nit?: string
  nombre: string
  apellidos?: string
  direccion?: string
  referencia?: string
  barrio?: string
  ciudad?: string
  telefono?: string
  correo?: string
  puntoVentaId?: number
  puntoVenta?: string
  activo: boolean
  horeca: boolean
  diasDespacho?: string
  lat?: number
  lng?: number
  fechaCreacion: string
}

export interface FichaTecnica {
  id: string
  nombre: string
  ficha: string
  diasVencimiento?: number
  fechaCreacion: string
}

export type EstadoCuarto = 'Activo' | 'Inactivo' | 'Mantenimiento'

export const ESTADOS_CUARTO: EstadoCuarto[] = [
  'Activo',
  'Inactivo',
  'Mantenimiento',
]

export type TipoCuarto = 'Congelado' | 'Refrigerado'

export const TIPOS_CUARTO: TipoCuarto[] = ['Congelado', 'Refrigerado']

export const RANGO_TEMP_CUARTO: Record<TipoCuarto, string> = {
  Congelado: '-18 °C',
  Refrigerado: '0 a 4 °C',
}

export interface CuartoFrio {
  id: string
  nombre: string
  tipo: TipoCuarto
  capacidad?: number
  capacidadUnidad: string
  ubicacion?: string
  responsable?: string
  estado: EstadoCuarto
  puntoVentaId?: number
  puntoVenta?: string
  fechaCreacion: string
}

export type PrioridadAccion = 'Baja' | 'Media' | 'Alta'

export const PRIORIDADES_ACCION: PrioridadAccion[] = ['Baja', 'Media', 'Alta']

export type EstadoAccion = 'Pendiente' | 'En progreso' | 'Completada'

export const ESTADOS_ACCION: EstadoAccion[] = [
  'Pendiente',
  'En progreso',
  'Completada',
]

export interface Accion {
  id: string
  titulo: string
  descripcion?: string
  prioridad: PrioridadAccion
  estado: EstadoAccion
  responsable?: string
  fechaVencimiento?: string
  fechaCreacion: string
}

export type EstadoActivo =
  | 'Operativo'
  | 'En mantenimiento'
  | 'Fuera de servicio'
  | 'Baja'

export const ESTADOS_ACTIVO: EstadoActivo[] = [
  'Operativo',
  'En mantenimiento',
  'Fuera de servicio',
  'Baja',
]

export interface Activo {
  id: string
  codigo: string
  nombre: string
  categoria?: string
  ubicacion?: string
  responsable?: string
  estado: EstadoActivo
  fechaAdquisicion?: string
  fechaCreacion: string
}

export type EstadoFormacion = 'Programada' | 'En curso' | 'Completada'

export const ESTADOS_FORMACION: EstadoFormacion[] = [
  'Programada',
  'En curso',
  'Completada',
]

export interface Formacion {
  id: string
  titulo: string
  tema?: string
  instructor?: string
  participante?: string
  estado: EstadoFormacion
  fecha?: string
  duracionHoras?: number
  fechaCreacion: string
}

export type TipoItemPlantilla = 'texto' | 'si_no' | 'numero' | 'seleccion'

export const TIPOS_ITEM_PLANTILLA: TipoItemPlantilla[] = [
  'texto',
  'si_no',
  'numero',
  'seleccion',
]

export const ETIQUETA_TIPO_ITEM: Record<TipoItemPlantilla, string> = {
  texto: 'Texto',
  si_no: 'Si / No',
  numero: 'Numero',
  seleccion: 'Seleccion',
}

export interface ItemPlantilla {
  texto: string
  tipo: TipoItemPlantilla
  opciones?: string[]
}

export interface Plantilla {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  items: ItemPlantilla[]
  fechaCreacion: string
}

export type EstadoInspeccion = 'Pendiente' | 'En progreso' | 'Completada'

export const ESTADOS_INSPECCION: EstadoInspeccion[] = [
  'Pendiente',
  'En progreso',
  'Completada',
]

export interface RespuestaInspeccion {
  texto: string
  tipo: TipoItemPlantilla
  valor: string
}

export interface Inspeccion {
  id: string
  plantillaId?: string
  plantillaNombre?: string
  inspector?: string
  ubicacion?: string
  estado: EstadoInspeccion
  fecha?: string
  respuestas: RespuestaInspeccion[]
  fechaCreacion: string
}

export type FrecuenciaPrograma = 'Diaria' | 'Semanal' | 'Mensual' | 'Anual'

export const FRECUENCIAS_PROGRAMA: FrecuenciaPrograma[] = [
  'Diaria',
  'Semanal',
  'Mensual',
  'Anual',
]

export interface Programa {
  id: string
  nombre: string
  plantillaId?: string
  plantillaNombre?: string
  frecuencia: FrecuenciaPrograma
  responsable?: string
  proximaFecha?: string
  activo: boolean
  fechaCreacion: string
}

// --------------------------- Contratistas ---------------------------
export type EstadoContratista = 'Activo' | 'Inactivo' | 'Suspendido'
export const ESTADOS_CONTRATISTA: EstadoContratista[] = [
  'Activo',
  'Inactivo',
  'Suspendido',
]
export interface Contratista {
  id: string
  nombre: string
  empresa?: string
  documento?: string
  contacto?: string
  especialidad?: string
  estado: EstadoContratista
  fechaInicio?: string
  fechaFin?: string
  fechaCreacion: string
}

// --------------------------- Biblioteca -----------------------------
export interface RecursoBiblioteca {
  id: string
  titulo: string
  tipo?: string
  categoria?: string
  enlace?: string
  descripcion?: string
  fechaCreacion: string
}

// --------------------------- Documentos -----------------------------
export type EstadoDocumento = 'Borrador' | 'Vigente' | 'Obsoleto'
export const ESTADOS_DOCUMENTO: EstadoDocumento[] = [
  'Borrador',
  'Vigente',
  'Obsoleto',
]
export interface Documento {
  id: string
  titulo: string
  tipo?: string
  version?: string
  responsable?: string
  estado: EstadoDocumento
  fechaVigencia?: string
  enlace?: string
  fechaCreacion: string
}

// --------------------------- Contratiempos --------------------------
export type GravedadContratiempo = 'Baja' | 'Media' | 'Alta' | 'Critica'
export const GRAVEDADES_CONTRATIEMPO: GravedadContratiempo[] = [
  'Baja',
  'Media',
  'Alta',
  'Critica',
]
export type EstadoContratiempo = 'Abierto' | 'En revision' | 'Cerrado'
export const ESTADOS_CONTRATIEMPO: EstadoContratiempo[] = [
  'Abierto',
  'En revision',
  'Cerrado',
]
export interface Contratiempo {
  id: string
  titulo: string
  descripcion?: string
  gravedad: GravedadContratiempo
  estado: EstadoContratiempo
  ubicacion?: string
  reportadoPor?: string
  fecha?: string
  fechaCreacion: string
}

// --------------------------- Investigaciones ------------------------
export type EstadoInvestigacion = 'Abierta' | 'En proceso' | 'Cerrada'
export const ESTADOS_INVESTIGACION: EstadoInvestigacion[] = [
  'Abierta',
  'En proceso',
  'Cerrada',
]
export interface Investigacion {
  id: string
  titulo: string
  contratiempoId?: string
  contratiempoTitulo?: string
  investigador?: string
  estado: EstadoInvestigacion
  causaRaiz?: string
  conclusiones?: string
  fecha?: string
  fechaCreacion: string
}

// --------------------- Trabajador en solitario ----------------------
export type EstadoTrabajadorSolitario = 'Activo' | 'Finalizado' | 'Alerta'
export const ESTADOS_TRABAJADOR_SOLITARIO: EstadoTrabajadorSolitario[] = [
  'Activo',
  'Finalizado',
  'Alerta',
]
export interface TrabajadorSolitario {
  id: string
  trabajador: string
  ubicacion?: string
  actividad?: string
  estado: EstadoTrabajadorSolitario
  fecha?: string
  horaInicio?: string
  horaFin?: string
  contactoEmergencia?: string
  fechaCreacion: string
}

// --------------------------- Avisos ---------------------------------
export type PrioridadAviso = 'Baja' | 'Media' | 'Alta'
export const PRIORIDADES_AVISO: PrioridadAviso[] = ['Baja', 'Media', 'Alta']
export type EstadoAviso = 'Borrador' | 'Publicado' | 'Archivado'
export const ESTADOS_AVISO: EstadoAviso[] = [
  'Borrador',
  'Publicado',
  'Archivado',
]
export interface Aviso {
  id: string
  titulo: string
  mensaje?: string
  prioridad: PrioridadAviso
  dirigidoA?: string
  estado: EstadoAviso
  fecha?: string
  fechaCreacion: string
}

// --------------------------- Sensores -------------------------------
export type EstadoSensor = 'Normal' | 'Alerta' | 'Fuera de linea'
export const ESTADOS_SENSOR: EstadoSensor[] = [
  'Normal',
  'Alerta',
  'Fuera de linea',
]
export interface Sensor {
  id: string
  codigo?: string
  nombre: string
  tipo?: string
  ubicacion?: string
  unidad?: string
  valorActual?: number
  estado: EstadoSensor
  ultimaLectura?: string
  fechaCreacion: string
}

// --------------------------- Mercado --------------------------------
export interface ArticuloMercado {
  id: string
  nombre: string
  categoria?: string
  proveedor?: string
  precio?: number
  unidad?: string
  disponible: boolean
  descripcion?: string
  fechaCreacion: string
}

// --------------------------- Log de ediciones ---------------------------
export interface EdicionLog {
  id: string
  consecutivo: number
  modulo: string
  registroId?: string
  loteInterno?: string
  usuarioId?: string
  usuarioNombre?: string
  usuarioEmail?: string
  campo: string
  valorAnterior?: string
  valorNuevo?: string
  fechaCreacion: string
}
