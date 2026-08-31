import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_FORMACION,
  type NuevaFormacion,
  type Formacion,
} from '../types.js'

export const formacionesRouter = Router()

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function mapFormacion(r: Record<string, unknown>): Formacion {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    tema: (r.tema as string) ?? undefined,
    instructor: (r.instructor as string) ?? undefined,
    participante: (r.participante as string) ?? undefined,
    estado: r.estado as Formacion['estado'],
    fecha: (r.fecha as string) ?? undefined,
    duracionHoras: num(r.duracion_horas),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaFormacion>): string[] {
  const errores: string[] = []
  if (!body.titulo?.trim()) errores.push('titulo es obligatorio')
  if (body.estado && !ESTADOS_FORMACION.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

formacionesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, titulo, tema, instructor, participante, estado, fecha,
              duracion_horas, fecha_creacion
         FROM formaciones
        ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(mapFormacion))
  } catch (err) {
    next(err)
  }
})

formacionesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaFormacion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const rows = await query(
      `INSERT INTO formaciones
         (titulo, tema, instructor, participante, estado, fecha, duracion_horas)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, titulo, tema, instructor, participante, estado, fecha,
                 duracion_horas, fecha_creacion`,
      [
        body.titulo!.trim(),
        body.tema?.trim() || null,
        body.instructor?.trim() || null,
        body.participante?.trim() || null,
        body.estado ?? 'Programada',
        body.fecha || null,
        body.duracionHoras ?? null,
      ],
    )

    res.status(201).json(mapFormacion(rows[0]))
  } catch (err) {
    next(err)
  }
})

formacionesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevaFormacion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const rows = await query(
      `UPDATE formaciones
          SET titulo = $2, tema = $3, instructor = $4, participante = $5,
              estado = $6, fecha = $7, duracion_horas = $8
        WHERE id = $1
      RETURNING id, titulo, tema, instructor, participante, estado, fecha,
                duracion_horas, fecha_creacion`,
      [
        id,
        body.titulo!.trim(),
        body.tema?.trim() || null,
        body.instructor?.trim() || null,
        body.participante?.trim() || null,
        body.estado ?? 'Programada',
        body.fecha || null,
        body.duracionHoras ?? null,
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Formacion no encontrada' })
      return
    }

    res.json(mapFormacion(rows[0]))
  } catch (err) {
    next(err)
  }
})

formacionesRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM formaciones WHERE id = $1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Formacion no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
