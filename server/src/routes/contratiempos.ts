import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_CONTRATIEMPO,
  GRAVEDADES_CONTRATIEMPO,
  type Contratiempo,
  type NuevoContratiempo,
} from '../types.js'

export const contratiemposRouter = Router()

function map(r: Record<string, unknown>): Contratiempo {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    descripcion: (r.descripcion as string) ?? undefined,
    gravedad: r.gravedad as Contratiempo['gravedad'],
    estado: r.estado as Contratiempo['estado'],
    ubicacion: (r.ubicacion as string) ?? undefined,
    reportadoPor: (r.reportado_por as string) ?? undefined,
    fecha: (r.fecha as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoContratiempo>): string[] {
  const errores: string[] = []
  if (!body.titulo || !body.titulo.trim()) errores.push('titulo es obligatorio')
  if (body.gravedad && !GRAVEDADES_CONTRATIEMPO.includes(body.gravedad)) {
    errores.push('gravedad invalida')
  }
  if (body.estado && !ESTADOS_CONTRATIEMPO.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

const COLS = `id, titulo, descripcion, gravedad, estado, ubicacion,
              reportado_por, fecha, fecha_creacion`

contratiemposRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM contratiempos ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

contratiemposRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoContratiempo>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO contratiempos
         (titulo, descripcion, gravedad, estado, ubicacion, reportado_por, fecha)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
      [
        body.titulo!.trim(),
        body.descripcion?.trim() || null,
        body.gravedad ?? 'Media',
        body.estado ?? 'Abierto',
        body.ubicacion?.trim() || null,
        body.reportadoPor?.trim() || null,
        body.fecha || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

contratiemposRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoContratiempo>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE contratiempos SET titulo=$2, descripcion=$3, gravedad=$4, estado=$5,
              ubicacion=$6, reportado_por=$7, fecha=$8
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.titulo!.trim(),
        body.descripcion?.trim() || null,
        body.gravedad ?? 'Media',
        body.estado ?? 'Abierto',
        body.ubicacion?.trim() || null,
        body.reportadoPor?.trim() || null,
        body.fecha || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Contratiempo no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

contratiemposRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM contratiempos WHERE id=$1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Contratiempo no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
