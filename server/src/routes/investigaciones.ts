import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_INVESTIGACION,
  type Investigacion,
  type NuevaInvestigacion,
} from '../types.js'

export const investigacionesRouter = Router()

function map(r: Record<string, unknown>): Investigacion {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    contratiempoId:
      r.contratiempo_id != null ? String(r.contratiempo_id) : undefined,
    contratiempoTitulo: (r.contratiempo_titulo as string) ?? undefined,
    investigador: (r.investigador as string) ?? undefined,
    estado: r.estado as Investigacion['estado'],
    causaRaiz: (r.causa_raiz as string) ?? undefined,
    conclusiones: (r.conclusiones as string) ?? undefined,
    fecha: (r.fecha as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaInvestigacion>): string[] {
  const errores: string[] = []
  if (!body.titulo || !body.titulo.trim()) errores.push('titulo es obligatorio')
  if (body.estado && !ESTADOS_INVESTIGACION.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

function idNum(valor: unknown): number | null {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

const SELECT_BASE = `
  SELECT i.id, i.titulo, i.contratiempo_id, c.titulo AS contratiempo_titulo,
         i.investigador, i.estado, i.causa_raiz, i.conclusiones, i.fecha,
         i.fecha_creacion
    FROM investigaciones i
    LEFT JOIN contratiempos c ON c.id = i.contratiempo_id`

investigacionesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(`${SELECT_BASE} ORDER BY i.fecha_creacion DESC`)
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

investigacionesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaInvestigacion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO investigaciones
         (titulo, contratiempo_id, investigador, estado, causa_raiz, conclusiones, fecha)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        body.titulo!.trim(),
        idNum(body.contratiempoId),
        body.investigador?.trim() || null,
        body.estado ?? 'Abierta',
        body.causaRaiz?.trim() || null,
        body.conclusiones?.trim() || null,
        body.fecha || null,
      ],
    )
    const rows = await query(`${SELECT_BASE} WHERE i.id=$1`, [ins[0].id])
    res.status(201).json(map(rows[0]))
  } catch (err) {
    next(err)
  }
})

investigacionesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevaInvestigacion>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE investigaciones SET titulo=$2, contratiempo_id=$3, investigador=$4,
              estado=$5, causa_raiz=$6, conclusiones=$7, fecha=$8
        WHERE id=$1 RETURNING id`,
      [
        id,
        body.titulo!.trim(),
        idNum(body.contratiempoId),
        body.investigador?.trim() || null,
        body.estado ?? 'Abierta',
        body.causaRaiz?.trim() || null,
        body.conclusiones?.trim() || null,
        body.fecha || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Investigacion no encontrada' })
      return
    }
    const rows = await query(`${SELECT_BASE} WHERE i.id=$1`, [id])
    res.json(map(rows[0]))
  } catch (err) {
    next(err)
  }
})

investigacionesRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM investigaciones WHERE id=$1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Investigacion no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
