import { Router } from 'express'
import { query } from '../db.js'
import {
  firmarToken,
  requireAuth,
  verificarPassword,
  passwordUsuarioValida,
  crearSesion,
  cerrarSesion,
  sesionSigueActiva,
} from '../auth.js'
import type { EmpresaUsuario, LoginResponse, RolUsuario, Usuario } from '../types.js'

export const authRouter = Router()

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
    modulos: Array.isArray(r.modulos)
      ? (r.modulos as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
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
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.empresa, u.activo, u.password_hash, u.fecha_creacion, u.modulos,
              COALESCE(
                ARRAY_AGG(upv.punto_venta_id)
                  FILTER (WHERE upv.punto_venta_id IS NOT NULL),
                '{}'
              ) AS puntos_venta
         FROM usuarios u
         LEFT JOIN usuarios_puntos_venta upv ON upv.usuario_id = u.id
        WHERE u.email = $1
        GROUP BY u.id`,
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
    const sid = await crearSesion(usuario.id, req.headers['user-agent'])
    const token = firmarToken({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      sid,
    })

    const respuesta: LoginResponse = { token, usuario }
    res.json(respuesta)
  } catch (err) {
    next(err)
  }
})

// Cierra la sesion actual (al pulsar "Cerrar sesion" en el cliente).
authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await cerrarSesion(req.usuario?.sid)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// "Latido" del cliente: comprueba si la sesion sigue viva sin contar como
// actividad. Si un admin la cerro o expiro por inactividad, responde 401 y el
// cliente cierra sesion al instante.
authRouter.get('/estado', async (req, res, next) => {
  try {
    const activa = await sesionSigueActiva(req.headers.authorization)
    if (!activa) {
      res.status(401).json({ error: 'Sesion cerrada' })
      return
    }
    res.json({ activa: true })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
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
        WHERE u.id = $1
        GROUP BY u.id`,
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

// Verifica la contrasena del usuario autenticado (para confirmar acciones
// sensibles como editar antes de mostrar el formulario).
authRouter.post('/verificar-password', requireAuth, async (req, res, next) => {
  try {
    const password = ((req.body?.password as string | undefined) ?? '').trim()
    if (!password) {
      res.status(400).json({ error: 'Debes ingresar tu contrasena' })
      return
    }
    const valida = await passwordUsuarioValida(req.usuario?.sub, password)
    if (!valida) {
      res.status(403).json({ error: 'Contrasena incorrecta' })
      return
    }
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
