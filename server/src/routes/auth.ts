import { Router } from 'express'
import { query } from '../db.js'
import {
  firmarToken,
  requireAuth,
  verificarPassword,
} from '../auth.js'
import type { LoginResponse, RolUsuario, Usuario } from '../types.js'

export const authRouter = Router()

function mapUsuario(r: Record<string, unknown>): Usuario {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    email: r.email as string,
    rol: r.rol as RolUsuario,
    activo: Boolean(r.activo),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string
      password?: string
    }

    if (!email?.trim() || !password) {
      res.status(400).json({ error: 'Email y password son obligatorios' })
      return
    }

    const rows = await query(
      `SELECT id, nombre, email, rol, activo, password_hash, fecha_creacion
         FROM usuarios
        WHERE email = $1`,
      [email.trim()],
    )

    const fila = rows[0]
    const hash = fila?.password_hash as string | null

    // Respuesta generica para no revelar si el email existe.
    if (!fila || !hash) {
      res.status(401).json({ error: 'Credenciales invalidas' })
      return
    }

    if (!fila.activo) {
      res.status(403).json({ error: 'Usuario inactivo' })
      return
    }

    const valido = await verificarPassword(password, hash)
    if (!valido) {
      res.status(401).json({ error: 'Credenciales invalidas' })
      return
    }

    const usuario = mapUsuario(fila)
    const token = firmarToken({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    })

    const respuesta: LoginResponse = { token, usuario }
    res.json(respuesta)
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, nombre, email, rol, activo, fecha_creacion
         FROM usuarios
        WHERE id = $1`,
      [Number(req.usuario!.sub)],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.json(mapUsuario(rows[0]))
  } catch (err) {
    next(err)
  }
})
