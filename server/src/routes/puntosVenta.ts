import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import type { NuevoPuntoVenta, PuntoVenta } from '../types.js'

export const puntosVentaRouter = Router()

function map(r: Record<string, unknown>): PuntoVenta {
  return {
    id: String(r.id),
    pdv: r.pdv as string,
    prefijo: (r.prefijo as string) ?? undefined,
    direccion: (r.direccion as string) ?? undefined,
    telefono: (r.telefono as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoPuntoVenta>): string[] {
  const errores: string[] = []
  if (!body.pdv?.trim()) errores.push('pdv es obligatorio')
  return errores
}

const COLS = `id, pdv, prefijo, direccion, telefono, fecha_creacion`

puntosVentaRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS} FROM puntos_venta ORDER BY pdv ASC`,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

puntosVentaRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoPuntoVenta>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const pdv = body.pdv!.trim()
    const duplicado = await query(
      'SELECT 1 FROM puntos_venta WHERE UPPER(pdv) = UPPER($1)',
      [pdv],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El punto de venta ya esta registrado'] })
      return
    }
    const prefijo = body.prefijo?.trim() || null
    if (prefijo) {
      const prefDup = await query(
        'SELECT 1 FROM puntos_venta WHERE UPPER(prefijo) = UPPER($1)',
        [prefijo],
      )
      if (prefDup.length > 0) {
        res.status(409).json({ errores: ['El prefijo ya esta en uso'] })
        return
      }
    }
    const ins = await query(
      `INSERT INTO puntos_venta (pdv, prefijo, direccion, telefono)
       VALUES ($1,$2,$3,$4) RETURNING ${COLS}`,
      [
        pdv,
        prefijo,
        body.direccion?.trim() || null,
        body.telefono?.trim() || null,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

puntosVentaRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoPuntoVenta>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const prefijo = body.prefijo?.trim() || null
    if (prefijo) {
      const prefDup = await query(
        'SELECT 1 FROM puntos_venta WHERE UPPER(prefijo) = UPPER($1) AND id <> $2',
        [prefijo, id],
      )
      if (prefDup.length > 0) {
        res.status(409).json({ errores: ['El prefijo ya esta en uso'] })
        return
      }
    }
    const upd = await query(
      `UPDATE puntos_venta SET pdv=$2, prefijo=$3, direccion=$4, telefono=$5
        WHERE id=$1 RETURNING ${COLS}`,
      [
        id,
        body.pdv!.trim(),
        prefijo,
        body.direccion?.trim() || null,
        body.telefono?.trim() || null,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Punto de venta no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

puntosVentaRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM puntos_venta WHERE id=$1 RETURNING id',
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Punto de venta no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
