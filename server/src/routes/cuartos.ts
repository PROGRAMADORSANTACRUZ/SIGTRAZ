import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { condicionPdv, pdvParaCrear, type ScopePdv } from '../scope.js'
import {
  ESTADOS_CUARTO,
  TIPOS_CUARTO,
  type CuartoFrio,
  type EstadoCuarto,
  type NuevoCuartoFrio,
  type TipoCuarto,
} from '../types.js'

export const cuartosRouter = Router()

function mapCuarto(r: Record<string, unknown>): CuartoFrio {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    tipo: (r.tipo as TipoCuarto) ?? 'Congelado',
    capacidad: r.capacidad != null ? Number(r.capacidad) : undefined,
    capacidadUnidad: (r.capacidad_unidad as string) ?? 'kg',
    ubicacion: (r.ubicacion as string) ?? undefined,
    responsable: (r.responsable as string) ?? undefined,
    estado: r.estado as EstadoCuarto,
    puntoVentaId: r.punto_venta_id != null ? Number(r.punto_venta_id) : undefined,
    puntoVenta: (r.punto_venta as string) ?? undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoCuartoFrio>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (body.tipo && !TIPOS_CUARTO.includes(body.tipo)) {
    errores.push(`tipo debe ser uno de: ${TIPOS_CUARTO.join(', ')}`)
  }
  if (body.estado && !ESTADOS_CUARTO.includes(body.estado)) {
    errores.push(`estado debe ser uno de: ${ESTADOS_CUARTO.join(', ')}`)
  }
  return errores
}

const num = (v: unknown) =>
  v === undefined || v === null || v === '' ? null : Number(v)

// Resuelve el PDV donde se crea/edita el cuarto. Si el body trae puntoVentaId
// se valida contra el scope; si no, se usa el PDV activo.
function resolverPdv(
  scope: ScopePdv | undefined,
  puntoVentaId: unknown,
): { pv: number | null; error?: string } {
  if (puntoVentaId !== undefined && puntoVentaId !== null && puntoVentaId !== '') {
    const n = Number(puntoVentaId)
    if (!Number.isInteger(n)) return { pv: null, error: 'Punto de venta invalido' }
    if (!scope) return { pv: null, error: 'Debes seleccionar un punto de venta' }
    if (!scope.admin) {
      const permitidos = scope.permitidos as number[]
      if (!permitidos.includes(n)) {
        return { pv: null, error: 'No tienes acceso a ese punto de venta' }
      }
    }
    return { pv: n }
  }
  return { pv: pdvParaCrear(scope) }
}

cuartosRouter.get('/', async (req, res, next) => {
  try {
    const sc = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT c.id, c.nombre, c.tipo, c.capacidad, c.capacidad_unidad,
              c.ubicacion, c.responsable, c.estado, c.fecha_creacion,
              c.punto_venta_id, pv.pdv AS punto_venta
         FROM cuartos_frios c
         LEFT JOIN puntos_venta pv ON pv.id = c.punto_venta_id
        WHERE ${sc.clause.replace(/punto_venta_id/g, 'c.punto_venta_id')}
        ORDER BY c.nombre`,
      sc.params,
    )
    res.json(rows.map(mapCuarto))
  } catch (err) {
    next(err)
  }
})

cuartosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoCuartoFrio>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const pdv = resolverPdv(req.scope, (body as { puntoVentaId?: unknown }).puntoVentaId)
    if (pdv.pv == null) {
      res.status(400).json({ errores: [pdv.error ?? 'Debes seleccionar un punto de venta'] })
      return
    }
    const pv = pdv.pv

    const nombre = body.nombre!.trim().toUpperCase()
    const duplicado = await query(
      'SELECT 1 FROM cuartos_frios WHERE UPPER(nombre) = UPPER($1) AND punto_venta_id = $2',
      [nombre, pv],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El cuarto frio ya esta registrado'] })
      return
    }

    const rows = await query(
      `WITH ins AS (
         INSERT INTO cuartos_frios
           (nombre, tipo, capacidad, capacidad_unidad,
            ubicacion, responsable, estado, punto_venta_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, nombre, tipo, capacidad, capacidad_unidad,
                   ubicacion, responsable, estado, fecha_creacion, punto_venta_id
       )
       SELECT ins.*, pv.pdv AS punto_venta
         FROM ins LEFT JOIN puntos_venta pv ON pv.id = ins.punto_venta_id`,
      [
        nombre,
        body.tipo ?? 'Congelado',
        num(body.capacidad),
        body.capacidadUnidad?.trim() || 'kg',
        body.ubicacion?.trim() || null,
        body.responsable?.trim() || null,
        body.estado ?? 'Activo',
        pv,
      ],
    )

    res.status(201).json(mapCuarto(rows[0]))
  } catch (err) {
    next(err)
  }
})

cuartosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevoCuartoFrio>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const nombre = body.nombre!.trim().toUpperCase()

    // PDV opcional: si viene en el body se valida; si no, se conserva.
    let pvNuevo: number | null = null
    const pvRaw = (body as { puntoVentaId?: unknown }).puntoVentaId
    if (pvRaw !== undefined && pvRaw !== null && pvRaw !== '') {
      const r = resolverPdv(req.scope, pvRaw)
      if (r.pv == null) {
        res.status(400).json({ errores: [r.error ?? 'Punto de venta invalido'] })
        return
      }
      pvNuevo = r.pv
    }

    const scDup = condicionPdv(req.scope, 3)
    const duplicado = await query(
      `SELECT 1 FROM cuartos_frios WHERE UPPER(nombre) = UPPER($1) AND id <> $2 AND ${scDup.clause}`,
      [nombre, id, ...scDup.params],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El cuarto frio ya esta registrado'] })
      return
    }

    const sc = condicionPdv(req.scope, 10)
    const rows = await query(
      `WITH upd AS (
         UPDATE cuartos_frios
            SET nombre = $2, tipo = $3, capacidad = $4,
                capacidad_unidad = $5, ubicacion = $6, responsable = $7,
                estado = $8, punto_venta_id = COALESCE($9, punto_venta_id)
          WHERE id = $1 AND ${sc.clause}
        RETURNING id, nombre, tipo, capacidad, capacidad_unidad,
                  ubicacion, responsable, estado, fecha_creacion, punto_venta_id
       )
       SELECT upd.*, pv.pdv AS punto_venta
         FROM upd LEFT JOIN puntos_venta pv ON pv.id = upd.punto_venta_id`,
      [
        id,
        nombre,
        body.tipo ?? 'Congelado',
        num(body.capacidad),
        body.capacidadUnidad?.trim() || 'kg',
        body.ubicacion?.trim() || null,
        body.responsable?.trim() || null,
        body.estado ?? 'Activo',
        pvNuevo,
        ...sc.params,
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Cuarto frio no encontrado' })
      return
    }

    res.json(mapCuarto(rows[0]))
  } catch (err) {
    next(err)
  }
})

cuartosRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM cuartos_frios WHERE id = $1 AND ${sc.clause} RETURNING id`,
      [id, ...sc.params],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Cuarto frio no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
