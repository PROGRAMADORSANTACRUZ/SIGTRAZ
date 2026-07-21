export interface Producto {
  id: string
  sku: string
  nombre: string
  categoria: string
  unidad: string
}

export type NuevoProducto = Omit<Producto, 'id'>

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

export type NuevaEntrada = Omit<Entrada, 'id'>

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

export type NuevoUsuario = Omit<Usuario, 'id' | 'fechaCreacion'> & {
  password?: string
}
export type ActualizarUsuario = Omit<Usuario, 'id' | 'fechaCreacion'> & {
  password?: string
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}
