import type { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import type { RolUsuario } from './types.js'

export interface TokenPayload {
  sub: string
  email: string
  rol: RolUsuario
  nombre: string
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
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autenticado' })
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    req.usuario = jwt.verify(token, config.jwtSecret) as TokenPayload
    next()
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' })
  }
}
