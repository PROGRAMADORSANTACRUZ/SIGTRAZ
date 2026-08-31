import { Router } from 'express'
import { pool, query } from '../db.js'
import { passwordUsuarioValida } from '../auth.js'
import { registrarEdicion } from '../auditoria.js'
import { condicionPdv, pdvParaCrear } from '../scope.js'
import { siguienteLoteInterno } from '../loteInterno.js'
import type { Entrada, NuevaEntrada } from '../types.js'

export const entradasRouter = Router()

// Columnas de cabecera a auditar (columna_bd -> etiqueta legible).
const ETIQUETAS_ENTRADA: Record<string, string> = {
  fecha: 'Fecha',
  proveedor: 'Proveedor',
  almacen: 'Almacen',
  responsable: 'Responsable',
  documento: 'Documento',
  notas: 'Notas',
  fecha_vencimiento: 'Fecha de vencimiento',
  fecha_beneficio: 'Fecha de beneficio',
  fecha_empaque: 'Fecha de empaque',
  lote_externo: 'Lote externo',
  veh_pisos: 'Vehiculo pisos',
  veh_paredes: 'Vehiculo paredes',
  veh_techos: 'Vehiculo techos',
  veh_cortinas: 'Vehiculo cortinas',
  organolepticas: 'Organolepticas',
  temp_producto: 'Temp. producto',
  temp_vehiculo: 'Temp. vehiculo',
  placa: 'Placa',
  colaborador: 'Colaborador',
  productos: 'Productos',
}

// Construye una firma legible de los productos de una recepcion.
function firmaProductos(
  rows: { producto_id?: unknown; cantidad?: unknown }[],
): string {
  return rows
    .map((r) => `${String(r.producto_id ?? '')}:${Number(r.cantidad ?? 0)}`)
    .sort()
    .join(', ')
}

// La columna `foto` (TEXT) guarda un arreglo de data URLs en formato JSON.
function parseFotos(valor: string | null): string[] | undefined {
  if (!valor) return undefined
  try {
    const arr = JSON.parse(valor)
    if (Array.isArray(arr) && arr.length) return arr.map(String)
    return undefined
  } catch {
    // Compatibilidad con registros antiguos que guardaban una sola imagen.
    return [valor]
  }
}

function serializarFotos(fotos?: string[]): string | null {
  const limpias = (fotos ?? []).map((f) => f.trim()).filter(Boolean)
  return limpias.length ? JSON.stringify(limpias) : null
}

function mapEntrada(r: Record<string, unknown>): Entrada {
  return {
    id: String(r.id),
    fecha: (r.fecha as Date).toISOString(),
    productoId: r.producto_id as string,
    loteCodigo: r.lote_codigo as string,
    cantidad: Number(r.cantidad),
    proveedor: r.proveedor as string,
    almacen: r.almacen as string,
    responsable: r.responsable as string,
    documento: (r.documento as string | null) ?? undefined,
    notas: (r.notas as string | null) ?? undefined,
    fechaVencimiento: (r.fecha_vencimiento as string | null) ?? undefined,
    fechaBeneficio: (r.fecha_beneficio as string | null) ?? undefined,
    fechaEmpaque: (r.fecha_empaque as string | null) ?? undefined,
    loteExterno: (r.lote_externo as string | null) ?? undefined,
    vehPisos: (r.veh_pisos as string | null) ?? undefined,
    vehParedes: (r.veh_paredes as string | null) ?? undefined,
    vehTechos: (r.veh_techos as string | null) ?? undefined,
    vehCortinas: (r.veh_cortinas as string | null) ?? undefined,
    organolepticas: (r.organolepticas as string | null) ?? undefined,
    tempProducto: r.temp_producto != null ? Number(r.temp_producto) : undefined,
    tempVehiculo: r.temp_vehiculo != null ? Number(r.temp_vehiculo) : undefined,
    placa: (r.placa as string | null) ?? undefined,
    fotos: parseFotos(r.foto as string | null),
    colaborador: (r.colaborador as string | null) ?? undefined,
    editado: Boolean(r.editado),
    loteInterno: (r.lote_interno as string | null) ?? undefined,
  }
}

entradasRouter.get('/', async (req, res, next) => {
  try {
    const { clause, params } = condicionPdv(req.scope, 1)
    const rows = await query(
      `SELECT id, fecha, producto_id, lote_codigo, cantidad,
              proveedor, almacen, responsable, documento, notas,
              fecha_vencimiento, fecha_beneficio, fecha_empaque,
              lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
              organolepticas, temp_producto, temp_vehiculo, placa, editado,
              lote_interno, foto, colaborador
         FROM entradas
        WHERE ${clause}
        ORDER BY fecha DESC, id DESC`,
      params,
    )
    res.json(rows.map(mapEntrada))
  } catch (err) {
    next(err)
  }
})

entradasRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaEntrada>

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

    const fecha = body.fecha ? new Date(body.fecha) : new Date()

    const loteInterno = await siguienteLoteInterno('entradas', 'EN', pv)

    const rows = await query(
      `INSERT INTO entradas
          (fecha, producto_id, lote_codigo, cantidad, proveedor,
           almacen, responsable, documento, notas,
           fecha_vencimiento, fecha_beneficio, fecha_empaque,
           lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
           organolepticas, temp_producto, temp_vehiculo, placa, lote_interno,
           punto_venta_id, foto, colaborador)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               $10, $11, $12,
               $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       RETURNING id, fecha, producto_id, lote_codigo, cantidad,
                 proveedor, almacen, responsable, documento, notas,
                 fecha_vencimiento, fecha_beneficio, fecha_empaque,
                 lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
                 organolepticas, temp_producto, temp_vehiculo, placa, lote_interno,
                 foto, colaborador`,
      [
        fecha,
        body.productoId!,
        body.loteCodigo?.trim() || loteInterno,
        body.cantidad!,
        body.proveedor!.trim(),
        body.almacen!.trim(),
        body.responsable!.trim(),
        body.documento?.trim() || null,
        body.notas?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        body.fechaBeneficio?.trim() || null,
        body.fechaEmpaque?.trim() || null,
        body.loteExterno?.trim() || null,
        body.vehPisos?.trim() || null,
        body.vehParedes?.trim() || null,
        body.vehTechos?.trim() || null,
        body.vehCortinas?.trim() || null,
        body.organolepticas?.trim() || null,
        typeof body.tempProducto === 'number' ? body.tempProducto : null,
        typeof body.tempVehiculo === 'number' ? body.tempVehiculo : null,
        body.placa?.trim() || null,
        loteInterno,
        pv,
        serializarFotos(body.fotos),
        body.colaborador?.trim() || null,
      ],
    )

    res.status(201).json(mapEntrada(rows[0]))
  } catch (err) {
    next(err)
  }
})

// Crea varias entradas (varios productos) en una misma recepcion,
// compartiendo UN SOLO lote interno que las identifica como un grupo.
entradasRouter.post('/lote', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevaEntrada> & {
      productos?: { productoId?: string; cantidad?: number }[]
    }

    const productos = Array.isArray(body.productos) ? body.productos : []
    if (productos.length === 0) {
      res.status(400).json({ errores: ['Debes agregar al menos un producto'] })
      return
    }

    // Valida la cabecera y cada producto.
    const errores: string[] = []
    if (!body.proveedor?.trim()) errores.push('proveedor es obligatorio')
    if (!body.almacen?.trim()) errores.push('almacen es obligatorio')
    if (!body.responsable?.trim()) errores.push('responsable es obligatorio')
    productos.forEach((p, i) => {
      if (!p.productoId?.trim())
        errores.push(`productoId es obligatorio (producto ${i + 1})`)
      if (typeof p.cantidad !== 'number' || p.cantidad <= 0)
        errores.push(`cantidad debe ser mayor a 0 (producto ${i + 1})`)
    })
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const pv = pdvParaCrear(req.scope)
    if (pv == null) {
      res.status(400).json({ error: 'Debes seleccionar un punto de venta' })
      return
    }

    const fecha = body.fecha ? new Date(body.fecha) : new Date()

    // Genera un unico lote interno para toda la recepcion.
    const loteInterno = await siguienteLoteInterno('entradas', 'EN', pv)

    const creadas = []
    for (const p of productos) {
      const rows = await query(
        `INSERT INTO entradas
            (fecha, producto_id, lote_codigo, cantidad, proveedor,
             almacen, responsable, documento, notas,
             fecha_vencimiento, fecha_beneficio, fecha_empaque,
             lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
             organolepticas, temp_producto, temp_vehiculo, placa, lote_interno,
             punto_venta_id, foto, colaborador)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
         RETURNING id, fecha, producto_id, lote_codigo, cantidad,
                   proveedor, almacen, responsable, documento, notas,
                   fecha_vencimiento, fecha_beneficio, fecha_empaque,
                   lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
                   organolepticas, temp_producto, temp_vehiculo, placa, lote_interno,
                   foto, colaborador`,
        [
          fecha,
          p.productoId!.trim(),
          loteInterno,
          p.cantidad!,
          body.proveedor!.trim(),
          body.almacen!.trim(),
          body.responsable!.trim(),
          body.documento?.trim() || null,
          body.notas?.trim() || null,
          body.fechaVencimiento?.trim() || null,
          body.fechaBeneficio?.trim() || null,
          body.fechaEmpaque?.trim() || null,
          body.loteExterno?.trim() || null,
          body.vehPisos?.trim() || null,
          body.vehParedes?.trim() || null,
          body.vehTechos?.trim() || null,
          body.vehCortinas?.trim() || null,
          body.organolepticas?.trim() || null,
          typeof body.tempProducto === 'number' ? body.tempProducto : null,
          typeof body.tempVehiculo === 'number' ? body.tempVehiculo : null,
          body.placa?.trim() || null,
          loteInterno,
          pv,
          serializarFotos(body.fotos),
          body.colaborador?.trim() || null,
        ],
      )
      creadas.push(mapEntrada(rows[0]))
    }

    res.status(201).json(creadas)
  } catch (err) {
    next(err)
  }
})

// Actualiza una recepcion completa (varios productos) que comparten el mismo
// lote interno. Reemplaza los productos manteniendo el mismo lote_interno.
entradasRouter.put('/lote/:loteInterno', async (req, res, next) => {
  const loteInterno = String(req.params.loteInterno)
  const body = req.body as Partial<NuevaEntrada> & {
    password?: string
    productos?: { productoId?: string; cantidad?: number }[]
  }

  const password = (body.password ?? '').trim()
  if (!password) {
    res.status(400).json({ error: 'Debes ingresar tu contrasena' })
    return
  }
  if (!(await passwordUsuarioValida(req.usuario?.sub, password))) {
    res.status(403).json({ error: 'Contrasena incorrecta' })
    return
  }

  const productos = Array.isArray(body.productos) ? body.productos : []
  if (productos.length === 0) {
    res.status(400).json({ errores: ['Debes agregar al menos un producto'] })
    return
  }

  const errores: string[] = []
  if (!body.proveedor?.trim()) errores.push('proveedor es obligatorio')
  if (!body.almacen?.trim()) errores.push('almacen es obligatorio')
  if (!body.responsable?.trim()) errores.push('responsable es obligatorio')
  productos.forEach((p, i) => {
    if (!p.productoId?.trim())
      errores.push(`productoId es obligatorio (producto ${i + 1})`)
    if (typeof p.cantidad !== 'number' || p.cantidad <= 0)
      errores.push(`cantidad debe ser mayor a 0 (producto ${i + 1})`)
  })
  if (errores.length > 0) {
    res.status(400).json({ errores })
    return
  }

  const fecha = body.fecha ? new Date(body.fecha) : new Date()
  const pv = pdvParaCrear(req.scope)
  if (pv == null) {
    res.status(400).json({ error: 'Debes seleccionar un punto de venta' })
    return
  }
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')

    const existentes = await cliente.query(
      `SELECT fecha, producto_id, cantidad, proveedor, almacen, responsable,
              documento, notas, fecha_vencimiento, fecha_beneficio,
              fecha_empaque, lote_externo, veh_pisos, veh_paredes, veh_techos,
              veh_cortinas, organolepticas, temp_producto, temp_vehiculo, placa,
              colaborador
         FROM entradas WHERE lote_interno = $1 AND ${condicionPdv(req.scope, 2).clause}`,
      [loteInterno, ...condicionPdv(req.scope, 2).params],
    )
    if (existentes.rows.length === 0) {
      await cliente.query('ROLLBACK')
      res.status(404).json({ error: 'Lote no encontrado' })
      return
    }

    await cliente.query(
      'DELETE FROM entradas WHERE lote_interno = $1 AND ' +
        condicionPdv(req.scope, 2).clause,
      [loteInterno, ...condicionPdv(req.scope, 2).params],
    )

    const creadas: Entrada[] = []
    for (const p of productos) {
      const rows = await cliente.query(
        `INSERT INTO entradas
            (fecha, producto_id, lote_codigo, cantidad, proveedor,
             almacen, responsable, documento, notas,
             fecha_vencimiento, fecha_beneficio, fecha_empaque,
             lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
             organolepticas, temp_producto, temp_vehiculo, placa, editado,
             lote_interno, punto_venta_id, foto, colaborador)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, TRUE, $22, $23, $24, $25)
         RETURNING id, fecha, producto_id, lote_codigo, cantidad,
                   proveedor, almacen, responsable, documento, notas,
                   fecha_vencimiento, fecha_beneficio, fecha_empaque,
                   lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
                   organolepticas, temp_producto, temp_vehiculo, placa, editado,
                   lote_interno, foto, colaborador`,
        [
          fecha,
          p.productoId!.trim(),
          loteInterno,
          p.cantidad!,
          body.proveedor!.trim(),
          body.almacen!.trim(),
          body.responsable!.trim(),
          body.documento?.trim() || null,
          body.notas?.trim() || null,
          body.fechaVencimiento?.trim() || null,
          body.fechaBeneficio?.trim() || null,
          body.fechaEmpaque?.trim() || null,
          body.loteExterno?.trim() || null,
          body.vehPisos?.trim() || null,
          body.vehParedes?.trim() || null,
          body.vehTechos?.trim() || null,
          body.vehCortinas?.trim() || null,
          body.organolepticas?.trim() || null,
          typeof body.tempProducto === 'number' ? body.tempProducto : null,
          typeof body.tempVehiculo === 'number' ? body.tempVehiculo : null,
          body.placa?.trim() || null,
          loteInterno,
          pv,
          serializarFotos(body.fotos),
          body.colaborador?.trim() || null,
        ],
      )
      creadas.push(mapEntrada(rows.rows[0]))
    }

    // Registra en la auditoria los cambios de cabecera y de productos.
    const antes = existentes.rows[0] as Record<string, unknown>
    const rowsNuevas = creadas.map((c) => ({
      producto_id: c.productoId,
      cantidad: c.cantidad,
    }))
    const despues: Record<string, unknown> = {
      fecha,
      proveedor: body.proveedor!.trim(),
      almacen: body.almacen!.trim(),
      responsable: body.responsable!.trim(),
      documento: body.documento?.trim() || null,
      notas: body.notas?.trim() || null,
      fecha_vencimiento: body.fechaVencimiento?.trim() || null,
      fecha_beneficio: body.fechaBeneficio?.trim() || null,
      fecha_empaque: body.fechaEmpaque?.trim() || null,
      lote_externo: body.loteExterno?.trim() || null,
      veh_pisos: body.vehPisos?.trim() || null,
      veh_paredes: body.vehParedes?.trim() || null,
      veh_techos: body.vehTechos?.trim() || null,
      veh_cortinas: body.vehCortinas?.trim() || null,
      organolepticas: body.organolepticas?.trim() || null,
      temp_producto:
        typeof body.tempProducto === 'number' ? body.tempProducto : null,
      temp_vehiculo:
        typeof body.tempVehiculo === 'number' ? body.tempVehiculo : null,
      placa: body.placa?.trim() || null,
      colaborador: body.colaborador?.trim() || null,
      productos: firmaProductos(rowsNuevas),
    }
    await registrarEdicion({
      modulo: 'Entrada',
      loteInterno,
      usuario: req.usuario,
      etiquetas: ETIQUETAS_ENTRADA,
      antes: { ...antes, productos: firmaProductos(existentes.rows) },
      despues,
      ejecutar: (text, params) =>
        cliente.query(text, params).then((r) => r.rows),
    })

    await cliente.query('COMMIT')
    res.json(creadas)
  } catch (err) {
    await cliente.query('ROLLBACK')
    next(err)
  } finally {
    cliente.release()
  }
})

// Elimina una recepcion completa (todos los productos de un lote interno).
entradasRouter.delete('/lote/:loteInterno', async (req, res, next) => {
  try {
    const loteInterno = String(req.params.loteInterno)
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
      'DELETE FROM entradas WHERE lote_interno = $1 AND ' +
        condicionPdv(req.scope, 2).clause +
        ' RETURNING id',
      [loteInterno, ...condicionPdv(req.scope, 2).params],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Lote no encontrado' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

// Actualiza una entrada previa verificacion de la contrasena del usuario actual.
entradasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      res.status(400).json({ errores: ['id invalido'] })
      return
    }

    const body = req.body as Partial<NuevaEntrada> & { password?: string }

    const password = (body.password ?? '').trim()
    if (!password) {
      res.status(400).json({ error: 'Debes ingresar tu contrasena' })
      return
    }
    if (!(await passwordUsuarioValida(req.usuario?.sub, password))) {
      res.status(403).json({ error: 'Contrasena incorrecta' })
      return
    }

    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const fecha = body.fecha ? new Date(body.fecha) : new Date()

    const previos = await query(
      `SELECT fecha, producto_id, cantidad, proveedor, almacen, responsable,
              documento, notas, fecha_vencimiento, fecha_beneficio,
              fecha_empaque, lote_externo, veh_pisos, veh_paredes, veh_techos,
              veh_cortinas, organolepticas, temp_producto, temp_vehiculo, placa
         FROM entradas WHERE id = $1 AND ${condicionPdv(req.scope, 2).clause}`,
      [id, ...condicionPdv(req.scope, 2).params],
    )
    if (previos.length === 0) {
      res.status(404).json({ error: 'Entrada no encontrada' })
      return
    }

    const rows = await query(
      `UPDATE entradas
          SET fecha = $1, producto_id = $2, lote_codigo = $3, cantidad = $4,
              proveedor = $5, almacen = $6, responsable = $7, documento = $8,
              notas = $9, fecha_vencimiento = $10, fecha_beneficio = $11,
              fecha_empaque = $12, lote_externo = $13, veh_pisos = $14,
              veh_paredes = $15, veh_techos = $16, veh_cortinas = $17,
              organolepticas = $18, temp_producto = $19, temp_vehiculo = $20,
              placa = $21, editado = TRUE
        WHERE id = $22
       RETURNING id, fecha, producto_id, lote_codigo, cantidad,
                 proveedor, almacen, responsable, documento, notas,
                 fecha_vencimiento, fecha_beneficio, fecha_empaque,
                 lote_externo, veh_pisos, veh_paredes, veh_techos, veh_cortinas,
                 organolepticas, temp_producto, temp_vehiculo, placa, editado,
                 lote_interno`,
      [
        fecha,
        body.productoId!,
        body.loteCodigo?.trim() || '',
        body.cantidad!,
        body.proveedor!.trim(),
        body.almacen!.trim(),
        body.responsable!.trim(),
        body.documento?.trim() || null,
        body.notas?.trim() || null,
        body.fechaVencimiento?.trim() || null,
        body.fechaBeneficio?.trim() || null,
        body.fechaEmpaque?.trim() || null,
        body.loteExterno?.trim() || null,
        body.vehPisos?.trim() || null,
        body.vehParedes?.trim() || null,
        body.vehTechos?.trim() || null,
        body.vehCortinas?.trim() || null,
        body.organolepticas?.trim() || null,
        typeof body.tempProducto === 'number' ? body.tempProducto : null,
        typeof body.tempVehiculo === 'number' ? body.tempVehiculo : null,
        body.placa?.trim() || null,
        id,
      ],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Entrada no encontrada' })
      return
    }
    const antes = previos[0] as Record<string, unknown>
    const nuevo = rows[0] as Record<string, unknown>
    await registrarEdicion({
      modulo: 'Entrada',
      registroId: String(id),
      loteInterno: (nuevo.lote_interno as string | null) ?? undefined,
      usuario: req.usuario,
      etiquetas: ETIQUETAS_ENTRADA,
      antes: {
        ...antes,
        productos: firmaProductos([
          { producto_id: antes.producto_id, cantidad: antes.cantidad },
        ]),
      },
      despues: {
        ...nuevo,
        productos: firmaProductos([
          { producto_id: nuevo.producto_id, cantidad: nuevo.cantidad },
        ]),
      },
    })
    res.json(mapEntrada(rows[0]))
  } catch (err) {
    next(err)
  }
})

// Elimina una entrada previa verificacion de la contrasena del usuario actual.
entradasRouter.delete('/:id', async (req, res, next) => {
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
      'DELETE FROM entradas WHERE id = $1 AND ' +
        condicionPdv(req.scope, 2).clause +
        ' RETURNING id',
      [id, ...condicionPdv(req.scope, 2).params],
    )
    if (rows.length === 0) {
      res.status(404).json({ error: 'Entrada no encontrada' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

function validar(body: Partial<NuevaEntrada>): string[] {
  const errores: string[] = []
  if (!body.productoId?.trim()) errores.push('productoId es obligatorio')
  if (typeof body.cantidad !== 'number' || body.cantidad <= 0)
    errores.push('cantidad debe ser mayor a 0')
  if (!body.proveedor?.trim()) errores.push('proveedor es obligatorio')
  if (!body.almacen?.trim()) errores.push('almacen es obligatorio')
  if (!body.responsable?.trim()) errores.push('responsable es obligatorio')
  return errores
}
