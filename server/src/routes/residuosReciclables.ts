import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import type {
  ResiduoReciclable,
  NuevoResiduoReciclable,
} from '../types.js'

export const residuosReciclablesRouter = Router()

function map(r: Record<string, unknown>): ResiduoReciclable {
  return {
    id: String(r.id),
    fecha: r.fecha
      ? typeof r.fecha === 'string'
        ? r.fecha.slice(0, 10)
        : (r.fecha as Date).toISOString().slice(0, 10)
      : undefined,
    material: (r.material as string) ?? undefined,
    cantidad: (r.cantidad as string) ?? undefined,
    entidadRecolectora: (r.entidad_recolectora as string) ?? undefined,
    firmaEntrega: (r.firma_entrega as string) ?? undefined,
    firmaRecibe: (r.firma_recibe as string) ?? undefined,
    firmaRecibeImagen: (r.firma_recibe_imagen as string) ?? undefined,
    observaciones: (r.observaciones as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoResiduoReciclable>): string[] {
  const errores: string[] = []
  if (!body.fecha?.trim()) errores.push('fecha es obligatoria')
  if (!body.firmaRecibe?.trim())
    errores.push('el nombre de quien recibe es obligatorio')
  if (!body.firmaRecibeImagen?.trim())
    errores.push('la firma de quien recibe es obligatoria')
  return errores
}

const COLS = `id, fecha, material, cantidad, entidad_recolectora, firma_entrega, firma_recibe, firma_recibe_imagen, observaciones, fecha_creacion`

residuosReciclablesRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT ${COLS} FROM residuos_reciclables WHERE ${clause} ORDER BY fecha_creacion DESC`,
      params,
    )
    res.json(rows.map(map))
  } catch (err) {
    next(err)
  }
})

residuosReciclablesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoResiduoReciclable>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const pv = pdvParaCrear(req.scope)
    if (pv == null) {
      res.status(400).json({ error: 'Debes seleccionar un punto de venta' })
      return
    }
    const ins = await query(
      `INSERT INTO residuos_reciclables
        (fecha, material, cantidad, entidad_recolectora, firma_entrega, firma_recibe, firma_recibe_imagen, observaciones, punto_venta_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${COLS}`,
      [
        body.fecha || null,
        body.material?.trim() || null,
        body.cantidad?.trim() || null,
        body.entidadRecolectora?.trim() || null,
        body.firmaEntrega?.trim() || null,
        body.firmaRecibe?.trim() || null,
        body.firmaRecibeImagen?.trim() || null,
        body.observaciones?.trim() || null,
        pv,
      ],
    )
    res.status(201).json(map(ins[0]))
  } catch (err) {
    next(err)
  }
})

residuosReciclablesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }
    const body = req.body as Partial<NuevoResiduoReciclable>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }
    const upd = await query(
      `UPDATE residuos_reciclables SET
        fecha=$2, material=$3, cantidad=$4, entidad_recolectora=$5,
        firma_entrega=$6, firma_recibe=$7, firma_recibe_imagen=$8, observaciones=$9
        WHERE id=$1 AND ${condicionPdv(req.scope, 10).clause} RETURNING ${COLS}`,
      [
        id,
        body.fecha || null,
        body.material?.trim() || null,
        body.cantidad?.trim() || null,
        body.entidadRecolectora?.trim() || null,
        body.firmaEntrega?.trim() || null,
        body.firmaRecibe?.trim() || null,
        body.firmaRecibeImagen?.trim() || null,
        body.observaciones?.trim() || null,
        ...condicionPdv(req.scope, 10).params,
      ],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.json(map(upd[0]))
  } catch (err) {
    next(err)
  }
})

residuosReciclablesRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM residuos_reciclables WHERE id=$1 AND ' +
        condicionPdv(req.scope, 2).clause +
        ' RETURNING id',
      [id, ...condicionPdv(req.scope, 2).params],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
