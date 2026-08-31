import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv } from '../scope.js'
import type { ScopePdv } from '../scope.js'
import type { Colaborador, NuevoColaborador } from '../types.js'

export const colaboradoresRouter = Router()

function mapColaborador(r: Record<string, unknown>): Colaborador {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    puntoVentaId:
      r.punto_venta_id != null ? Number(r.punto_venta_id) : undefined,
    puntoVenta: (r.punto_venta as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

// Verifica que el usuario tenga acceso al PDV indicado.
function pdvPermitido(scope: ScopePdv | undefined, pv: number): boolean {
  if (!scope) return false
  if (scope.admin) return true
  return Array.isArray(scope.permitidos) && scope.permitidos.includes(pv)
}

colaboradoresRouter.get('/', async (req, res, next) => {
  try {
    const sc = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT c.id, c.nombre, c.punto_venta_id, pv.pdv AS punto_venta, c.fecha_creacion
         FROM colaboradores c
         LEFT JOIN puntos_venta pv ON pv.id = c.punto_venta_id
        WHERE ${sc.clause}
        ORDER BY c.nombre`,
      sc.params,
    )
    res.json(rows.map(mapColaborador))
  } catch (err) {
    next(err)
  }
})

colaboradoresRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoColaborador>
    const nombre = body.nombre?.trim()
    if (!nombre) {
      res.status(400).json({ errores: ['nombre es obligatorio'] })
      return
    }

    const pv = body.puntoVentaId != null ? Number(body.puntoVentaId) : null
    if (pv == null || !Number.isInteger(pv)) {
      res.status(400).json({ errores: ['Debes seleccionar un punto de venta'] })
      return
    }
    if (!pdvPermitido(req.scope, pv)) {
      res.status(403).json({ error: 'No tienes acceso a ese punto de venta' })
      return
    }

    const rows = await query(
      `INSERT INTO colaboradores (nombre, punto_venta_id)
       VALUES ($1, $2)
       RETURNING id, nombre, punto_venta_id,
         (SELECT pdv FROM puntos_venta WHERE id = $2) AS punto_venta,
         fecha_creacion`,
      [nombre, pv],
    )

    res.status(201).json(mapColaborador(rows[0]))
  } catch (err) {
    next(err)
  }
})

colaboradoresRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevoColaborador>
    const nombre = body.nombre?.trim()
    if (!nombre) {
      res.status(400).json({ errores: ['nombre es obligatorio'] })
      return
    }

    const pv = body.puntoVentaId != null ? Number(body.puntoVentaId) : null
    if (pv == null || !Number.isInteger(pv)) {
      res.status(400).json({ errores: ['Debes seleccionar un punto de venta'] })
      return
    }
    if (!pdvPermitido(req.scope, pv)) {
      res.status(403).json({ error: 'No tienes acceso a ese punto de venta' })
      return
    }

    const sc = condicionPdv(req.scope, 4)
    const rows = await query(
      `UPDATE colaboradores
          SET nombre = $2, punto_venta_id = $3
        WHERE id = $1 AND ${sc.clause}
      RETURNING id, nombre, punto_venta_id,
        (SELECT pdv FROM puntos_venta WHERE id = $3) AS punto_venta,
        fecha_creacion`,
      [id, nombre, pv, ...sc.params],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Colaborador no encontrado' })
      return
    }

    res.json(mapColaborador(rows[0]))
  } catch (err) {
    next(err)
  }
})

colaboradoresRouter.delete('/:id', async (req, res, next) => {
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

    const sc = condicionPdv(req.scope, 2)
    const rows = await query(
      `DELETE FROM colaboradores WHERE id = $1 AND ${sc.clause} RETURNING id`,
      [id, ...sc.params],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Colaborador no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
