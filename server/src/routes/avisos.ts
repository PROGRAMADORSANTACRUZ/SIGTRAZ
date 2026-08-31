import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_AVISO,
  PRIORIDADES_AVISO,
  type Aviso,
  type NuevoAviso,
} from '../types.js'

export const avisosRouter = Router()

function map(r: Record<string, unknown>): Aviso {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    mensaje: (r.mensaje as string) ?? undefined,
    prioridad: r.prioridad as Aviso['prioridad'],
    dirigidoA: (r.dirigido_a as string) ?? undefined,
    estado: r.estado as Aviso['estado'],
    fecha: (r.fecha as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoAviso>): string[] {
  const errores: string[] = []
  if (!body.titulo || !body.titulo.trim()) errores.push('titulo es obligatorio')
  if (body.prioridad && !PRIORIDADES_AVISO.includes(body.prioridad)) {
    errores.push('prioridad invalida')
  }
  if (body.estado && !ESTADOS_AVISO.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

const COLS = `id, titulo, mensaje, prioridad, dirigido_a, estado, fecha, fecha_creacion`

avisosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM avisos ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

avisosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoAviso>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO avisos (titulo, mensaje, prioridad, dirigido_a, estado, fecha)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`,
      [
        body.titulo!.trim(),
        body.mensaje?.trim() || null,
        body.prioridad ?? 'Media',
        body.dirigidoA?.trim() || null,
        body.estado ?? 'Borrador',
        body.fecha || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

avisosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoAviso>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE avisos SET titulo=$2, mensaje=$3, prioridad=$4, dirigido_a=$5,
              estado=$6, fecha=$7
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.titulo!.trim(),
        body.mensaje?.trim() || null,
        body.prioridad ?? 'Media',
        body.dirigidoA?.trim() || null,
        body.estado ?? 'Borrador',
        body.fecha || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Aviso no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

avisosRouter.delete('/:id', async (req, res, next) => {
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
    const rows = await query('DELETE FROM avisos WHERE id=$1 RETURNING id', [id])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Aviso no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
