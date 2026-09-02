import { Router, type NextFunction, type Request, type Response } from 'express'
import { query } from '../db.js'

export const sesionesRouter = Router()

/** Solo un Administrador puede ver o cerrar sesiones ajenas. */
function soloAdmin(req: Request, res: Response, next: NextFunction): void {
  if ((req.usuario?.rol ?? '').trim().toLowerCase() !== 'administrador') {
    res.status(403).json({ error: 'Solo un administrador puede ver las sesiones' })
    return
  }
  next()
}

// Lista las sesiones activas (usuarios conectados).
sesionesRouter.get('/', soloAdmin, async (req, res, next) => {
  try {
    const filas = await query(
      `SELECT s.id, s.usuario_id, s.creada_en, s.ultima_actividad, s.user_agent,
              u.nombre, u.apellido, u.email, u.rol, u.empresa
         FROM sesiones s
         JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.activa
        ORDER BY s.ultima_actividad DESC`,
    )
    const sesiones = filas.map((r) => ({
      id: String(r.id),
      usuarioId: String(r.usuario_id),
      nombre: r.nombre as string,
      apellido: (r.apellido as string | null) ?? undefined,
      email: r.email as string,
      rol: r.rol as string,
      empresa: (r.empresa as string | null) ?? undefined,
      creadaEn: (r.creada_en as Date).toISOString(),
      ultimaActividad: (r.ultima_actividad as Date).toISOString(),
      userAgent: (r.user_agent as string | null) ?? undefined,
      esActual: String(r.id) === req.usuario?.sid,
    }))
    res.json(sesiones)
  } catch (err) {
    next(err)
  }
})

// Cierra una sesion concreta (expulsa al usuario en su proxima peticion).
sesionesRouter.delete('/:id', soloAdmin, async (req, res, next) => {
  try {
    await query('UPDATE sesiones SET activa = false WHERE id = $1', [
      req.params.id,
    ])
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
