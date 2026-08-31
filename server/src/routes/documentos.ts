import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import {
  ESTADOS_DOCUMENTO,
  type Documento,
  type NuevoDocumento,
} from '../types.js'

export const documentosRouter = Router()

function map(r: Record<string, unknown>): Documento {
  return {
    id: String(r.id),
    titulo: r.titulo as string,
    tipo: (r.tipo as string) ?? undefined,
    version: (r.version as string) ?? undefined,
    responsable: (r.responsable as string) ?? undefined,
    estado: r.estado as Documento['estado'],
    fechaVigencia: (r.fecha_vigencia as string) ?? undefined,
    enlace: (r.enlace as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoDocumento>): string[] {
  const errores: string[] = []
  if (!body.titulo || !body.titulo.trim()) errores.push('titulo es obligatorio')
  if (body.estado && !ESTADOS_DOCUMENTO.includes(body.estado)) {
    errores.push('estado invalido')
  }
  return errores
}

const COLS = `id, titulo, tipo, version, responsable, estado, fecha_vigencia,
              enlace, fecha_creacion`

documentosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM documentos ORDER BY fecha_creacion DESC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

documentosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoDocumento>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const ins = await query(
      `INSERT INTO documentos
         (titulo, tipo, version, responsable, estado, fecha_vigencia, enlace)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
      [
        body.titulo!.trim(),
        body.tipo?.trim() || null,
        body.version?.trim() || null,
        body.responsable?.trim() || null,
        body.estado ?? 'Borrador',
        body.fechaVigencia || null,
        body.enlace?.trim() || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

documentosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoDocumento>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE documentos SET titulo=$2, tipo=$3, version=$4, responsable=$5,
              estado=$6, fecha_vigencia=$7, enlace=$8
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.titulo!.trim(),
        body.tipo?.trim() || null,
        body.version?.trim() || null,
        body.responsable?.trim() || null,
        body.estado ?? 'Borrador',
        body.fechaVigencia || null,
        body.enlace?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Documento no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

documentosRouter.delete('/:id', async (req, res, next) => {
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
    const rows = await query('DELETE FROM documentos WHERE id=$1 RETURNING id', [
      id,
    ])
    if (rows.length === 0) {
      res.status(404).json({ error: 'Documento no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
