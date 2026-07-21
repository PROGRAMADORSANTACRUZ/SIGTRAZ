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
  conservacion?: string
  instrucciones?: string
  empresa?: string
}

export type RolUsuario = 'Administrador' | 'Operador' | 'Consulta'

export const ROLES: RolUsuario[] = ['Administrador', 'Operador', 'Consulta']

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  fechaCreacion: string
}
