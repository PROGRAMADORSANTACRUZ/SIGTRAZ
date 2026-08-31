import { Router } from 'express'
import { query } from '../db.js'
import { hashPassword } from '../auth.js'
import {
  ROLES,
  EMPRESAS,
  ROLES_POR_EMPRESA,
  type ActualizarUsuario,
  type EmpresaUsuario,
  type NuevoUsuario,
  type RolUsuario,
  type Usuario,
} from '../types.js'

export const usuariosRouter = Router()

function mapUsuario(r: Record<string, unknown>): Usuario {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    apellido: (r.apellido as string | null) ?? undefined,
    email: r.email as string,
    rol: r.rol as RolUsuario,
    empresa: (r.empresa as EmpresaUsuario | null) ?? undefined,
    activo: Boolean(r.activo),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
    puntosVenta: Array.isArray(r.puntos_venta)
      ? (r.puntos_venta as unknown[]).map((n) => Number(n))
      : [],
    modulos: normalizarModulos(r.modulos),
  }
}

// Normaliza la lista de modulos permitidos (rutas unicas).
function normalizarModulos(v: unknown): string[] {
  return Array.isArray(v)
    ? Array.from(
        new Set(
          (v as unknown[]).filter((x): x is string => typeof x === 'string'),
        ),
      )
    : []
}

// Reemplaza los puntos de venta asignados a un usuario.
async function asignarPuntos(usuarioId: number, ids: unknown): Promise<number[]> {
  const limpios = Array.isArray(ids)
    ? Array.from(
        new Set(
          (ids as unknown[])
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n)),
        ),
      )
    : []
  await query('DELETE FROM usuarios_puntos_venta WHERE usuario_id = $1', [
    usuarioId,
  ])
  for (const pv of limpios) {
    await query(
      `INSERT INTO usuarios_puntos_venta (usuario_id, punto_venta_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [usuarioId, pv],
    )
  }
  return limpios
}

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

function validar(body: Partial<NuevoUsuario>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (!body.apellido?.trim()) errores.push('apellido es obligatorio')
  if (!body.email?.trim() || !emailValido(body.email)) {
    errores.push('email invalido')
  }
  if (!body.empresa || !EMPRESAS.includes(body.empresa)) {
    errores.push(`empresa debe ser una de: ${EMPRESAS.join(', ')}`)
  }
  if (!body.rol || !ROLES.includes(body.rol)) {
    errores.push(`rol debe ser uno de: ${ROLES.join(', ')}`)
  } else if (
    body.empresa &&
    EMPRESAS.includes(body.empresa) &&
    !ROLES_POR_EMPRESA[body.empresa].includes(body.rol)
  ) {
    errores.push(
      `el rol ${body.rol} no aplica para la empresa ${body.empresa}`,
    )
  }
  return errores
}

usuariosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.empresa, u.activo, u.fecha_creacion, u.modulos,
              COALESCE(
                ARRAY_AGG(upv.punto_venta_id)
                  FILTER (WHERE upv.punto_venta_id IS NOT NULL),
                '{}'
              ) AS puntos_venta
         FROM usuarios u
         LEFT JOIN usuarios_puntos_venta upv ON upv.usuario_id = u.id
        GROUP BY u.id
        ORDER BY u.nombre`,
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
      `INSERT INTO usuarios (nombre, apellido, email, rol, empresa, activo, password_hash, modulos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id, nombre, apellido, email, rol, empresa, activo, fecha_creacion, modulos`,
      [
        body.nombre!.trim(),
        body.apellido!.trim(),
        body.email!.trim(),
        body.rol!,
        body.empresa!,
        body.activo ?? true,
        passwordHash,
        JSON.stringify(normalizarModulos(body.modulos)),
      ],
    )

    const usuario = mapUsuario(rows[0])
    usuario.puntosVenta = await asignarPuntos(
      Number(usuario.id),
      (body as { puntosVenta?: unknown }).puntosVenta,
    )
    res.status(201).json(usuario)
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
          SET nombre = $2, apellido = $3, email = $4, rol = $5, empresa = $6,
              activo = $7,
              password_hash = COALESCE($8, password_hash),
              modulos = $9::jsonb
        WHERE id = $1
      RETURNING id, nombre, apellido, email, rol, empresa, activo, fecha_creacion, modulos`,
      [
        id,
        body.nombre!.trim(),
        body.apellido!.trim(),
        body.email!.trim(),
        body.rol!,
        body.empresa!,
        body.activo ?? true,
        passwordHash,
        JSON.stringify(normalizarModulos(body.modulos)),
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    const usuario = mapUsuario(rows[0])
    if ('puntosVenta' in (body as object)) {
      usuario.puntosVenta = await asignarPuntos(
        id,
        (body as { puntosVenta?: unknown }).puntosVenta,
      )
    } else {
      const actuales = await query(
        'SELECT punto_venta_id FROM usuarios_puntos_venta WHERE usuario_id = $1',
        [id],
      )
      usuario.puntosVenta = actuales.map((r) =>
        Number((r as { punto_venta_id: number }).punto_venta_id),
      )
    }
    res.json(usuario)
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
      RETURNING id, nombre, apellido, email, rol, empresa, activo, fecha_creacion, modulos`,
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
