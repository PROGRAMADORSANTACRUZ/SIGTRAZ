import type { NextFunction, Request, Response } from 'express'
import { query } from './db.js'

// El rol Administrador ve todos los puntos de venta.
export function esRolAdmin(rol: string | undefined): boolean {
  return (rol ?? '').trim().toLowerCase() === 'administrador'
}

// Ids de los puntos de venta asignados a un usuario.
export async function puntosVentaDeUsuario(
  userId: string | number | undefined,
): Promise<number[]> {
  if (userId == null) return []
  const rows = await query(
    'SELECT punto_venta_id FROM usuarios_puntos_venta WHERE usuario_id = $1',
    [Number(userId)],
  )
  return rows.map((r) => Number((r as { punto_venta_id: number }).punto_venta_id))
}

export interface ScopePdv {
  admin: boolean
  // Lista de PDV permitidos; 'ALL' para administradores.
  permitidos: number[] | 'ALL'
  // PDV activo elegido en la barra (cabecera X-Punto-Venta). null = "todos".
  activo: number | null
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      scope?: ScopePdv
    }
  }
}

// Carga el scope de puntos de venta del usuario autenticado. Debe usarse
// DESPUES de requireAuth. Lee el PDV activo de la cabecera X-Punto-Venta y
// valida que el usuario tenga acceso a el (los administradores acceden a todo).
export async function cargarScopePdv(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admin = esRolAdmin(req.usuario?.rol)
    const permitidos: number[] | 'ALL' = admin
      ? 'ALL'
      : await puntosVentaDeUsuario(req.usuario?.sub)

    const header = req.header('x-punto-venta')
    let activo: number | null = null
    if (header && header.trim() !== '' && header.trim().toLowerCase() !== 'todos') {
      const n = Number(header)
      if (!Number.isInteger(n)) {
        res.status(400).json({ error: 'Punto de venta invalido' })
        return
      }
      if (!admin && !(permitidos as number[]).includes(n)) {
        res.status(403).json({ error: 'No tienes acceso a ese punto de venta' })
        return
      }
      activo = n
    }

    req.scope = { admin, permitidos, activo }
    next()
  } catch (err) {
    next(err)
  }
}

// Construye la condicion SQL para filtrar por punto de venta segun el scope.
// `desde` es el numero del primer parametro disponible ($n). Devuelve la
// clausula (sin la palabra WHERE) y los parametros que le corresponden.
export function condicionPdv(
  scope: ScopePdv | undefined,
  desde: number,
): { clause: string; params: unknown[] } {
  // Sin scope (ruta no protegida por PDV): no filtra.
  if (!scope) return { clause: 'TRUE', params: [] }

  // Administrador con un PDV activo: solo ese. Sin activo: todos.
  if (scope.admin) {
    if (scope.activo != null) {
      return { clause: 'punto_venta_id = $' + desde, params: [scope.activo] }
    }
    return { clause: 'TRUE', params: [] }
  }

  // Usuario normal sin PDV asignados: no ve nada.
  const permitidos = scope.permitidos as number[]
  if (permitidos.length === 0) return { clause: 'FALSE', params: [] }

  // Con PDV activo (ya validado como permitido): solo ese.
  if (scope.activo != null) {
    return { clause: 'punto_venta_id = $' + desde, params: [scope.activo] }
  }
  // Sin activo: la union de todos sus PDV.
  return { clause: 'punto_venta_id = ANY($' + desde + ')', params: [permitidos] }
}

// Devuelve el PDV donde se debe crear un registro nuevo, o null si el usuario
// aun no ha elegido uno (y no se puede inferir).
export function pdvParaCrear(scope: ScopePdv | undefined): number | null {
  if (!scope) return null
  if (scope.activo != null) return scope.activo
  if (!scope.admin) {
    const permitidos = scope.permitidos as number[]
    if (permitidos.length === 1) return permitidos[0]
  }
  return null
}
