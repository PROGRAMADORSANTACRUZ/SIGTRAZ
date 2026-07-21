import { Router } from 'express'
import { query } from '../db.js'
import { hashPassword } from '../auth.js'
import {
  ROLES,
  type ActualizarUsuario,
  type NuevoUsuario,
  type RolUsuario,
  type Usuario,
} from '../types.js'

export const usuariosRouter = Router()

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

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

function validar(body: Partial<NuevoUsuario>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (!body.email?.trim() || !emailValido(body.email)) {
    errores.push('email invalido')
  }
  if (!body.rol || !ROLES.includes(body.rol)) {
    errores.push(`rol debe ser uno de: ${ROLES.join(', ')}`)
  }
  return errores
}

usuariosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, nombre, email, rol, activo, fecha_creacion
         FROM usuarios
        ORDER BY nombre`,
    )
    res.json(rows.map(mapUsuario))
  } catch (err) {
    next(err)
  }
})

usuariosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoUsuario>
    const errores = validar(body)
    if (!body.password || body.password.length < 6) {
      errores.push('password debe tener al menos 6 caracteres')
    }
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const duplicado = await query(
      'SELECT 1 FROM usuarios WHERE email = $1',
      [body.email!.trim()],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El email ya esta registrado'] })
      return
    }

    const passwordHash = await hashPassword(body.password!)

    const rows = await query(
      `INSERT INTO usuarios (nombre, email, rol, activo, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [
        body.nombre!.trim(),
        body.email!.trim(),
        body.rol!,
        body.activo ?? true,
        passwordHash,
      ],
    )

    res.status(201).json(mapUsuario(rows[0]))
  } catch (err) {
    next(err)
  }
})

usuariosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<ActualizarUsuario>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const duplicado = await query(
      'SELECT 1 FROM usuarios WHERE email = $1 AND id <> $2',
      [body.email!.trim(), id],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El email ya esta registrado'] })
      return
    }

    const cambiaPassword =
      typeof body.password === 'string' && body.password.length > 0
    if (cambiaPassword && body.password!.length < 6) {
      res.status(400).json({
        errores: ['password debe tener al menos 6 caracteres'],
      })
      return
    }
    const passwordHash = cambiaPassword
      ? await hashPassword(body.password!)
      : null

    const rows = await query(
      `UPDATE usuarios
          SET nombre = $2, email = $3, rol = $4, activo = $5,
              password_hash = COALESCE($6, password_hash)
        WHERE id = $1
      RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [
        id,
        body.nombre!.trim(),
        body.email!.trim(),
        body.rol!,
        body.activo ?? true,
        passwordHash,
      ],
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

usuariosRouter.patch('/:id/estado', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const activo = Boolean((req.body as { activo?: boolean }).activo)

    const rows = await query(
      `UPDATE usuarios
          SET activo = $2
        WHERE id = $1
      RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [id, activo],
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
