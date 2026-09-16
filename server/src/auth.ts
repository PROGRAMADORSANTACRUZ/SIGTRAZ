import type { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { query } from './db.js'
import type { RolUsuario } from './types.js'

export interface TokenPayload {
  sub: string
  email: string
  rol: RolUsuario
  nombre: string
  /** Id de la sesion en la tabla `sesiones` (para poder cerrarla remotamente). */
  sid?: string
}

/** Nombre de la cookie httpOnly donde viaja el JWT (ya no se guarda en localStorage). */
export const TOKEN_COOKIE = 'sigtraz_token'

/** Extrae el token de la cookie httpOnly, o del header Authorization como respaldo. */
function extraerToken(req: Request): string | undefined {
  const deCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    TOKEN_COOKIE
  ]
  if (deCookie) return deCookie
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
}

/** Crea una fila de sesion y devuelve su id (para incrustarlo en el token). */
export async function crearSesion(
  usuarioId: string,
  userAgent?: string,
): Promise<string> {
  const filas = await query(
    'INSERT INTO sesiones (usuario_id, user_agent) VALUES ($1, $2) RETURNING id',
    [usuarioId, userAgent?.slice(0, 300) ?? null],
  )
  return String(filas[0].id)
}

/** Marca una sesion como cerrada (inactiva). */
export async function cerrarSesion(sid: string | undefined): Promise<void> {
  if (!sid) return
  await query('UPDATE sesiones SET activa = false WHERE id = $1', [sid])
}

/**
 * Comprueba si la sesion del token sigue activa SIN actualizar la ultima
 * actividad (para el "latido" del cliente, que no debe contar como uso). Cierra
 * la sesion si supero la inactividad. Devuelve false si ya no es valida.
 */
export async function sesionSigueActiva(req: Request): Promise<boolean> {
  const token = extraerToken(req)
  if (!token) return false
  let payload: TokenPayload
  try {
    payload = jwt.verify(token, config.jwtSecret) as TokenPayload
  } catch {
    return false
  }
  if (!payload.sid) return true
  const filas = await query(
    'SELECT activa, ultima_actividad FROM sesiones WHERE id = $1',
    [payload.sid],
  )
  const s = filas[0]
  if (!s || s.activa === false) return false
  return true
}

export function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, 10)
}

export function verificarPassword(
  plano: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plano, hash)
}

/** Valida que la contrasena corresponda al usuario indicado (por su id). */
export async function passwordUsuarioValida(
  userId: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!userId || !password?.trim()) return false
  const filas = await query('SELECT password_hash FROM usuarios WHERE id = $1', [
    userId,
  ])
  const hash = filas[0]?.password_hash as string | null
  if (!hash) return false
  return verificarPassword(password, hash)
}

/** Convierte duraciones simples ('8h', '30m', '7d') a milisegundos para la cookie. */
function duracionAMs(duracion: string): number | undefined {
  const m = /^(\d+)\s*(s|m|h|d)$/.exec(duracion.trim())
  if (!m) return undefined
  const unidades = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const
  return Number(m[1]) * unidades[m[2] as keyof typeof unidades]
}

/** Opciones de la cookie httpOnly que reemplaza al token en localStorage. */
export function opcionesCookieToken() {
  return {
    httpOnly: true as const,
    // Same-site (mismo host) tanto en produccion (mismo dominio via Traefik)
    // como en LAN (celular por IP: puerto distinto pero mismo host), por lo
    // que 'lax' basta sin necesitar 'none' + HTTPS obligatorio.
    sameSite: 'lax' as const,
    secure: config.esProduccion,
    path: '/',
    maxAge: duracionAMs(config.jwtExpiresIn),
  }
}

export function firmarToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions)
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenPayload
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extraerToken(req)
  if (!token) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  let payload: TokenPayload
  try {
    payload = jwt.verify(token, config.jwtSecret) as TokenPayload
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' })
    return
  }
  req.usuario = payload

  // Tokens antiguos sin sid: se aceptan (compatibilidad), sin control de sesion.
  if (!payload.sid) {
    next()
    return
  }

  // Verifica que la sesion siga activa y no haya superado la inactividad. Cada
  // peticion valida refresca `ultima_actividad`.
  query('SELECT activa, ultima_actividad FROM sesiones WHERE id = $1', [
    payload.sid,
  ])
    .then((filas) => {
      const sesion = filas[0]
      if (!sesion || sesion.activa === false) {
        res.status(401).json({ error: 'Sesion cerrada' })
        return
      }
      query('UPDATE sesiones SET ultima_actividad = now() WHERE id = $1', [
        payload.sid,
      ])
        .catch(() => {})
        .finally(() => next())
    })
    .catch((err) => next(err))
}

/** Solo el rol Administrador puede ejecutar peticiones DELETE. */
export function soloAdminElimina(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method !== 'DELETE') {
    next()
    return
  }
  const token = extraerToken(req)
  if (!token) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload
    if ((payload.rol ?? '').trim().toLowerCase() !== 'administrador') {
      res.status(403).json({ error: 'Solo un administrador puede eliminar' })
      return
    }
    req.usuario = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' })
  }
}
