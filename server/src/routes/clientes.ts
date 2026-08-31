import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import type { Cliente, NuevoCliente } from '../types.js'

export const clientesRouter = Router()

const COLS = `c.id, c.nit, c.nombre, c.apellidos, c.direccion, c.referencia,
              c.barrio, c.ciudad, c.telefono, c.correo, c.punto_venta_id,
              pv.pdv AS punto_venta, c.activo, c.horeca, c.dias_despacho,
              c.lat, c.lng, c.fecha_creacion`

function mapCliente(r: Record<string, unknown>): Cliente {
  return {
    id: String(r.id),
    nit: (r.nit as string | null) ?? undefined,
    nombre: r.nombre as string,
    apellidos: (r.apellidos as string | null) ?? undefined,
    direccion: (r.direccion as string | null) ?? undefined,
    referencia: (r.referencia as string | null) ?? undefined,
    barrio: (r.barrio as string | null) ?? undefined,
    ciudad: (r.ciudad as string | null) ?? undefined,
    telefono: (r.telefono as string | null) ?? undefined,
    correo: (r.correo as string | null) ?? undefined,
    puntoVentaId: r.punto_venta_id != null ? Number(r.punto_venta_id) : undefined,
    puntoVenta: (r.punto_venta as string | null) ?? undefined,
    activo: Boolean(r.activo),
    horeca: Boolean(r.horeca),
    diasDespacho: (r.dias_despacho as string | null) ?? undefined,
    lat: r.lat != null ? Number(r.lat) : undefined,
    lng: r.lng != null ? Number(r.lng) : undefined,
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoCliente>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (body.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo)) {
    errores.push('correo invalido')
  }
  return errores
}

function valores(body: Partial<NuevoCliente>): unknown[] {
  return [
    body.nit?.trim() || null,
    body.nombre!.trim(),
    body.apellidos?.trim() || null,
    body.direccion?.trim() || null,
    body.referencia?.trim() || null,
    body.barrio?.trim() || null,
    body.ciudad?.trim() || null,
    body.telefono?.trim() || null,
    body.correo?.trim() || null,
    body.puntoVentaId != null ? Number(body.puntoVentaId) : null,
    body.activo ?? true,
    body.horeca ?? false,
    body.diasDespacho?.trim() || null,
    typeof body.lat === 'number' ? body.lat : null,
    typeof body.lng === 'number' ? body.lng : null,
  ]
}

clientesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${COLS}
         FROM clientes c
         LEFT JOIN puntos_venta pv ON pv.id = c.punto_venta_id
        ORDER BY c.nombre`,
    )
    res.json(rows.map(mapCliente))
  } catch (err) {
    next(err)
  }
})

clientesRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoCliente>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const ins = await query(
      `INSERT INTO clientes
         (nit, nombre, apellidos, direccion, referencia, barrio, ciudad,
          telefono, correo, punto_venta_id, activo, horeca, dias_despacho, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      valores(body),
    )
    const rows = await query(
      `SELECT ${COLS}
         FROM clientes c
         LEFT JOIN puntos_venta pv ON pv.id = c.punto_venta_id
        WHERE c.id = $1`,
      [ins[0].id],
    )
    res.status(201).json(mapCliente(rows[0]))
  } catch (err) {
    next(err)
  }
})

clientesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevoCliente>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const upd = await query(
      `UPDATE clientes
          SET nit = $2, nombre = $3, apellidos = $4, direccion = $5,
              referencia = $6, barrio = $7, ciudad = $8, telefono = $9,
              correo = $10, punto_venta_id = $11, activo = $12, horeca = $13,
              dias_despacho = $14, lat = $15, lng = $16
        WHERE id = $1
      RETURNING id`,
      [id, ...valores(body)],
    )
    if (upd.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }
    const rows = await query(
      `SELECT ${COLS}
         FROM clientes c
         LEFT JOIN puntos_venta pv ON pv.id = c.punto_venta_id
        WHERE c.id = $1`,
      [id],
    )
    res.json(mapCliente(rows[0]))
  } catch (err) {
    next(err)
  }
})

interface FilaCargaCliente {
  nit?: string
  nombre?: string
  apellidos?: string
  direccion?: string
  referencia?: string
  barrio?: string
  ciudad?: string
  telefono?: string
  correo?: string
  puntoVenta?: string
  activo?: string
  horeca?: string
  diasDespacho?: string
  lat?: string
  lng?: string
}

function aBooleano(v: string | undefined, porDefecto: boolean): boolean {
  const t = (v ?? '').trim().toLowerCase()
  if (t === '') return porDefecto
  return ['si', 'sí', 'x', 'true', '1', 'verdadero', 'yes'].includes(t)
}

function aNumero(v: string | undefined): number | null {
  const t = (v ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

clientesRouter.post('/carga-masiva', async (req, res, next) => {
  try {
    const filas = (req.body as { clientes?: FilaCargaCliente[] }).clientes
    if (!Array.isArray(filas) || filas.length === 0) {
      res.status(400).json({ errores: ['No se recibieron clientes'] })
      return
    }
    if (filas.length > 50000) {
      res.status(400).json({ errores: ['Maximo 50000 clientes por carga'] })
      return
    }

    // Mapa de puntos de venta por nombre para resolver la columna "Punto Venta".
    const pdvs = await query<{ id: string; pdv: string }>(
      'SELECT id, pdv FROM puntos_venta',
    )
    const pdvPorNombre = new Map(
      pdvs.map((p) => [p.pdv.trim().toLowerCase(), Number(p.id)]),
    )

    let creados = 0
    let actualizados = 0
    let omitidos = 0
    const errores: { fila: number; mensaje: string }[] = []

    for (let i = 0; i < filas.length; i++) {
      const f = filas[i]
      const nombre = (f.nombre ?? '').trim()
      if (!nombre) {
        errores.push({ fila: i + 1, mensaje: 'El nombre es obligatorio' })
        continue
      }
      const nit = (f.nit ?? '').trim()
      const pv =
        f.puntoVenta && pdvPorNombre.has(f.puntoVenta.trim().toLowerCase())
          ? pdvPorNombre.get(f.puntoVenta.trim().toLowerCase())
          : null

      const datos = [
        nit || null,
        nombre.slice(0, 150),
        (f.apellidos ?? '').trim() || null,
        (f.direccion ?? '').trim() || null,
        (f.referencia ?? '').trim() || null,
        (f.barrio ?? '').trim() || null,
        (f.ciudad ?? '').trim() || null,
        (f.telefono ?? '').trim() || null,
        (f.correo ?? '').trim() || null,
        pv,
        aBooleano(f.activo, true),
        aBooleano(f.horeca, false),
        (f.diasDespacho ?? '').trim() || null,
        aNumero(f.lat),
        aNumero(f.lng),
      ]

      // Si el NIT ya existe, actualiza ese cliente sin borrar los demas.
      let existenteId: string | null = null
      if (nit) {
        const dup = await query<{ id: string }>(
          'SELECT id FROM clientes WHERE nit = $1',
          [nit],
        )
        if (dup.length > 0) existenteId = String(dup[0].id)
      }

      if (existenteId) {
        await query(
          `UPDATE clientes
              SET nit = $2, nombre = $3, apellidos = $4, direccion = $5,
                  referencia = $6, barrio = $7, ciudad = $8, telefono = $9,
                  correo = $10, punto_venta_id = $11, activo = $12, horeca = $13,
                  dias_despacho = $14, lat = $15, lng = $16
            WHERE id = $1`,
          [existenteId, ...datos],
        )
        actualizados++
      } else {
        await query(
          `INSERT INTO clientes
             (nit, nombre, apellidos, direccion, referencia, barrio, ciudad,
              telefono, correo, punto_venta_id, activo, horeca, dias_despacho, lat, lng)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          datos,
        )
        creados++
      }
    }

    res.status(201).json({ creados, actualizados, omitidos, errores })
  } catch (err) {
    next(err)
  }
})

clientesRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM clientes WHERE id = $1 RETURNING id`,
      [id],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
