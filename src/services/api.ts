import type { Entrada, Producto, Usuario } from '../types/trazabilidad'

const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export const TOKEN_KEY = 'sigtraz_token'

export type NuevaEntrada = Omit<Entrada, 'id'>
export type NuevoProducto = Omit<Producto, 'id'>
export interface FilaCargaProducto {
  item?: string
  sku?: string
  nombre?: string
  categoria?: string
  unidad?: string
}
export interface ResultadoCarga {
  creados: number
  omitidos: number
  errores: { fila: number; mensaje: string }[]
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

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const resp = await fetch(`${API_URL}${ruta}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (resp.status === 401) {
    // Token ausente, invalido o expirado: forzar re-login.
    setToken(null)
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('Sesion expirada')
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
  getMe: () => pedir<Usuario>('/auth/me'),
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
  eliminarProducto: (id: string) =>
    pedir<void>(`/productos/${id}`, {
      method: 'DELETE',
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
}
