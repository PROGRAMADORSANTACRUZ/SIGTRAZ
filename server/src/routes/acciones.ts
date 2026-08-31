import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_ACCION,
  PRIORIDADES_ACCION,
  type NuevaAccion,
  type Accion,
} from '../types.js'

export const accionesRouter = Router()

function mapAccion(r: Record<string, unknown>): Accion {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    descripcion: (r.descripcion as string) ?? undefined,
    prioridad: r.prioridad as Accion['prioridad'],
    estado: r.estado as Accion['estado'],
    responsable: (r.responsable as string) ?? undefined,
    fechaVencimiento: (r.fecha_vencimiento as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaAccion>): string[] {
  const errores: string[] = []
  if (!body.titulo?.trim()) errores.push('titulo es obligatorio')
  if (body.prioridad && !PRIORIDADES_ACCION.includes(body.prioridad)) {
    errores.push('prioridad invalida')
  }
  if (body.estado && !ESTADOS_ACCION.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

accionesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, titulo, descripcion, prioridad, estado, responsable,
              fecha_vencimiento, fecha_creacion
         FROM acciones
        ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(mapAccion))
  } catch (err) {
    next(err)
  }
})

accionesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaAccion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const rows = await query(
      `INSERT INTO acciones
         (titulo, descripcion, prioridad, estado, responsable, fecha_vencimiento)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, titulo, descripcion, prioridad, estado, responsable,
                 fecha_vencimiento, fecha_creacion`,
      [
        body.titulo!.trim(),
        body.descripcion?.trim() || null,
        body.prioridad ?? 'Media',
        body.estado ?? 'Pendiente',
        body.responsable?.trim() || null,
        body.fechaVencimiento || null,
      ],
    )

    res.status(201).json(mapAccion(rows[0]))
  } catch (err) {
    next(err)
  }
})

accionesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevaAccion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const rows = await query(
      `UPDATE acciones
          SET titulo = $2, descripcion = $3, prioridad = $4, estado = $5,
              responsable = $6, fecha_vencimiento = $7
        WHERE id = $1
      RETURNING id, titulo, descripcion, prioridad, estado, responsable,
                fecha_vencimiento, fecha_creacion`,
      [
        id,
        body.titulo!.trim(),
        body.descripcion?.trim() || null,
        body.prioridad ?? 'Media',
        body.estado ?? 'Pendiente',
        body.responsable?.trim() || null,
        body.fechaVencimiento || null,
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Accion no encontrada' })
      return
    }

    res.json(mapAccion(rows[0]))
  } catch (err) {
    next(err)
  }
})

accionesRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const password = ((req.body?.password as string | undefined) ?? '').trim()
    if (!password) {
      res.status(400).json({ error: 'Debes ingresar tu contrasena' })
      return
    }
    if (!(await passwordUsuarioValida(req.usuario?.sub, password))) {
      res.status(403).json({ error: 'Contrasena incorrecta' })
      return
    }

    const rows = await query(
      'DELETE FROM acciones WHERE id = $1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Accion no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
