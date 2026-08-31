import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { pdvParaCrear } from '../scope.js'
import { type FichaTecnica, type NuevaFichaTecnica } from '../types.js'

export const fichasRouter = Router()

function mapFicha(r: Record<string, unknown>): FichaTecnica {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    ficha: (r.ficha as string) ?? '',
    diasVencimiento:
      r.dias_vencimiento != null ? Number(r.dias_vencimiento) : undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevaFichaTecnica>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  return errores
}

const num = (v: unknown) =>
  v === undefined || v === null || v === '' ? null : Number(v)

fichasRouter.get('/', async (_req, res, next) => {
  try {
    // Catalogo global: todos los puntos de venta comparten las fichas tecnicas.
    const rows = await query(
      `SELECT id, nombre, ficha, dias_vencimiento, fecha_creacion
         FROM fichas_tecnicas
        ORDER BY nombre`,
    )
    res.json(rows.map(mapFicha))
  } catch (err) {
    next(err)
  }
})

fichasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaFichaTecnica>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    // Catalogo global: el PDV solo marca el origen del registro (puede ser null).
    const pv = pdvParaCrear(req.scope)

    const nombre = body.nombre!.trim()
    const duplicado = await query(
      'SELECT 1 FROM fichas_tecnicas WHERE UPPER(nombre) = UPPER($1)',
      [nombre],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['La ficha tecnica ya esta registrada'] })
      return
    }

    const rows = await query(
      `INSERT INTO fichas_tecnicas (nombre, ficha, dias_vencimiento, punto_venta_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, ficha, dias_vencimiento, fecha_creacion`,
      [nombre, body.ficha?.trim() || '', num(body.diasVencimiento), pv],
    )

    res.status(201).json(mapFicha(rows[0]))
  } catch (err) {
    next(err)
  }
})

fichasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevaFichaTecnica>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const nombre = body.nombre!.trim()
    const duplicado = await query(
      `SELECT 1 FROM fichas_tecnicas WHERE UPPER(nombre) = UPPER($1) AND id <> $2`,
      [nombre, id],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['La ficha tecnica ya esta registrada'] })
      return
    }

    const rows = await query(
      `UPDATE fichas_tecnicas
          SET nombre = $2, ficha = $3, dias_vencimiento = $4
        WHERE id = $1
      RETURNING id, nombre, ficha, dias_vencimiento, fecha_creacion`,
      [id, nombre, body.ficha?.trim() || '', num(body.diasVencimiento)],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Ficha tecnica no encontrada' })
      return
    }

    res.json(mapFicha(rows[0]))
  } catch (err) {
    next(err)
  }
})

fichasRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM fichas_tecnicas WHERE id = $1 RETURNING id`,
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Ficha tecnica no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
