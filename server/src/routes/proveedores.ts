import { Router } from 'express'
import { query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { pdvParaCrear } from '../scope.js'
import type { NuevoProveedor, Proveedor } from '../types.js'

export const proveedoresRouter = Router()

function mapProveedor(r: Record<string, unknown>): Proveedor {
  return {
    id: String(r.id),
    nombre: r.nombre as string,
    nit: (r.nit as string) ?? undefined,
    contacto: (r.contacto as string) ?? undefined,
    telefono: (r.telefono as string) ?? undefined,
    email: (r.email as string) ?? undefined,
    direccion: (r.direccion as string) ?? undefined,
    activo: Boolean(r.activo),
    fechaCreacion: (r.fecha_creacion as Date).toISOString(),
  }
}

function validar(body: Partial<NuevoProveedor>): string[] {
  const errores: string[] = []
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errores.push('email invalido')
  }
  return errores
}

proveedoresRouter.get('/', async (_req, res, next) => {
  try {
    // Catalogo global: todos los puntos de venta comparten los proveedores.
    const rows = await query(
      `SELECT id, nombre, nit, contacto, telefono, email, direccion, activo, fecha_creacion
         FROM proveedores
        ORDER BY nombre`,
    )
    res.json(rows.map(mapProveedor))
  } catch (err) {
    next(err)
  }
})

proveedoresRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoProveedor>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    // Catalogo global: el PDV solo marca el origen del registro (puede ser null).
    const pv = pdvParaCrear(req.scope)

    const nombre = body.nombre!.trim()
    const duplicado = await query(
      'SELECT 1 FROM proveedores WHERE UPPER(nombre) = UPPER($1)',
      [nombre],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El proveedor ya esta registrado'] })
      return
    }

    const rows = await query(
      `INSERT INTO proveedores (nombre, nit, contacto, telefono, email, direccion, activo, punto_venta_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nombre, nit, contacto, telefono, email, direccion, activo, fecha_creacion`,
      [
        nombre,
        body.nit?.trim() || null,
        body.contacto?.trim() || null,
        body.telefono?.trim() || null,
        body.email?.trim() || null,
        body.direccion?.trim() || null,
        body.activo ?? true,
        pv,
      ],
    )

    res.status(201).json(mapProveedor(rows[0]))
  } catch (err) {
    next(err)
  }
})

proveedoresRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevoProveedor>
    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const nombre = body.nombre!.trim()
    const duplicado = await query(
      `SELECT 1 FROM proveedores WHERE UPPER(nombre) = UPPER($1) AND id <> $2`,
      [nombre, id],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El proveedor ya esta registrado'] })
      return
    }

    const rows = await query(
      `UPDATE proveedores
          SET nombre = $2, nit = $3, contacto = $4, telefono = $5,
              email = $6, direccion = $7, activo = $8
        WHERE id = $1
      RETURNING id, nombre, nit, contacto, telefono, email, direccion, activo, fecha_creacion`,
      [
        id,
        nombre,
        body.nit?.trim() || null,
        body.contacto?.trim() || null,
        body.telefono?.trim() || null,
        body.email?.trim() || null,
        body.direccion?.trim() || null,
        body.activo ?? true,
      ],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Proveedor no encontrado' })
      return
    }

    res.json(mapProveedor(rows[0]))
  } catch (err) {
    next(err)
  }
})

proveedoresRouter.delete('/:id', async (req, res, next) => {
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
      `DELETE FROM proveedores WHERE id = $1 RETURNING id`,
      [id],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Proveedor no encontrado' })
      return
    }

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
