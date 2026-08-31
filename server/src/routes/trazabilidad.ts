import { Router } from 'express'
import { query } from '../db.js'

export const trazabilidadRouter = Router()

// Endpoint PUBLICO: detalle de una entrada para la pagina que abre el QR.
// No requiere autenticacion porque se consulta al escanear la etiqueta.
trazabilidadRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Identificador invalido' })
      return
    }

    const rows = await query(
      `SELECT e.id, e.fecha, e.lote_codigo, e.cantidad, e.proveedor,
              e.almacen, e.responsable, e.documento, e.notas,
              e.fecha_vencimiento, e.fecha_beneficio, e.fecha_empaque,
              e.lote_externo, e.veh_pisos, e.veh_paredes, e.veh_techos,
              e.veh_cortinas, e.organolepticas, e.temp_producto,
              e.temp_vehiculo, e.placa,
              p.nombre AS producto_nombre, p.sku AS producto_sku,
              p.categoria AS producto_categoria, p.unidad AS producto_unidad,
              pr.nit AS prov_nit, pr.telefono AS prov_telefono,
              pr.direccion AS prov_direccion, pr.email AS prov_email,
              pr.contacto AS prov_contacto
         FROM entradas e
         LEFT JOIN productos p ON p.id = e.producto_id
         LEFT JOIN proveedores pr ON pr.nombre = e.proveedor
        WHERE e.id = $1`,
      [id],
    )

    const r = rows[0] as Record<string, unknown> | undefined
    if (!r) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }

    res.json({
      id: String(r.id),
      fecha: (r.fecha as Date).toISOString(),
      loteCodigo: r.lote_codigo as string,
      loteExterno: (r.lote_externo as string | null) ?? null,
      cantidad: Number(r.cantidad),
      almacen: r.almacen as string,
      responsable: r.responsable as string,
      documento: (r.documento as string | null) ?? null,
      notas: (r.notas as string | null) ?? null,
      fechaVencimiento: (r.fecha_vencimiento as string | null) ?? null,
      fechaBeneficio: (r.fecha_beneficio as string | null) ?? null,
      fechaEmpaque: (r.fecha_empaque as string | null) ?? null,
      vehPisos: (r.veh_pisos as string | null) ?? null,
      vehParedes: (r.veh_paredes as string | null) ?? null,
      vehTechos: (r.veh_techos as string | null) ?? null,
      vehCortinas: (r.veh_cortinas as string | null) ?? null,
      organolepticas: (r.organolepticas as string | null) ?? null,
      tempProducto: r.temp_producto != null ? Number(r.temp_producto) : null,
      tempVehiculo: r.temp_vehiculo != null ? Number(r.temp_vehiculo) : null,
      placa: (r.placa as string | null) ?? null,
      producto: {
        nombre: (r.producto_nombre as string | null) ?? null,
        sku: (r.producto_sku as string | null) ?? null,
        categoria: (r.producto_categoria as string | null) ?? null,
        unidad: (r.producto_unidad as string | null) ?? null,
      },
      proveedor: {
        nombre: r.proveedor as string,
        nit: (r.prov_nit as string | null) ?? null,
        telefono: (r.prov_telefono as string | null) ?? null,
        direccion: (r.prov_direccion as string | null) ?? null,
        email: (r.prov_email as string | null) ?? null,
        contacto: (r.prov_contacto as string | null) ?? null,
      },
    })
  } catch (err) {
    next(err)
  }
})

// Endpoint PUBLICO: detalle de un acondicionamiento (producto terminado) para el QR.
trazabilidadRouter.get('/acond/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Identificador invalido' })
      return
    }

    const rows = await query(
      `SELECT a.id, a.fecha, a.producto, a.producto_resultante,
              a.lote, a.lote_interno, a.cantidad_resultante, a.cantidad_entrada,
              a.unidad, a.proceso, a.responsable, a.observaciones,
              a.conservacion, a.instrucciones, a.empresa,
              a.fecha_vencimiento, a.fecha_empaque,
              p.nombre AS producto_nombre, p.sku AS producto_sku,
              p.categoria AS producto_categoria, p.unidad AS producto_unidad,
              f.dias_vencimiento AS ficha_dias
         FROM acondicionamiento a
         LEFT JOIN productos p ON p.id::text = a.producto_id
         LEFT JOIN fichas_tecnicas f ON f.id::text = a.ficha_id
        WHERE a.id = $1`,
      [id],
    )

    const r = rows[0] as Record<string, unknown> | undefined
    if (!r) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }

    const fechaISO = (v: unknown): string | null =>
      v == null
        ? null
        : v instanceof Date
          ? v.toISOString()
          : String(v)

    res.json({
      id: String(r.id),
      fecha: fechaISO(r.fecha),
      producto:
        (r.producto_resultante as string | null) ?? (r.producto as string),
      lote: (r.lote as string | null) ?? null,
      loteInterno: (r.lote_interno as string | null) ?? null,
      cantidad:
        r.cantidad_resultante != null
          ? Number(r.cantidad_resultante)
          : r.cantidad_entrada != null
            ? Number(r.cantidad_entrada)
            : null,
      unidad: (r.unidad as string | null) ?? null,
      proceso: (r.proceso as string | null) ?? null,
      responsable: (r.responsable as string | null) ?? null,
      observaciones: (r.observaciones as string | null) ?? null,
      conservacion: (r.conservacion as string | null) ?? null,
      instrucciones: (r.instrucciones as string | null) ?? null,
      empresa: (r.empresa as string | null) ?? null,
      fechaVencimiento: fechaISO(r.fecha_vencimiento),
      fechaEmpaque: fechaISO(r.fecha_empaque),
      vidaUtilDias: r.ficha_dias != null ? Number(r.ficha_dias) : null,
      productoInfo: {
        nombre: (r.producto_nombre as string | null) ?? null,
        sku: (r.producto_sku as string | null) ?? null,
        categoria: (r.producto_categoria as string | null) ?? null,
        unidad: (r.producto_unidad as string | null) ?? null,
      },
    })
  } catch (err) {
    next(err)
  }
})

// Endpoint PUBLICO: detalle de una salida para el QR.
trazabilidadRouter.get('/salida/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Identificador invalido' })
      return
    }

    const rows = await query(
      `SELECT s.id, s.fecha, s.producto, s.lote, s.lote_interno,
              s.cantidad, s.unidad, s.destino, s.responsable, s.documento,
              s.observaciones, s.fecha_vencimiento,
              p.nombre AS producto_nombre, p.sku AS producto_sku,
              p.categoria AS producto_categoria, p.unidad AS producto_unidad
         FROM salidas s
         LEFT JOIN productos p ON p.id::text = s.producto_id
        WHERE s.id = $1`,
      [id],
    )

    const r = rows[0] as Record<string, unknown> | undefined
    if (!r) {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }

    const fechaISO = (v: unknown): string | null =>
      v == null
        ? null
        : v instanceof Date
          ? v.toISOString()
          : String(v)

    res.json({
      id: String(r.id),
      fecha: fechaISO(r.fecha),
      producto: r.producto as string,
      lote: (r.lote as string | null) ?? null,
      loteInterno: (r.lote_interno as string | null) ?? null,
      cantidad: r.cantidad != null ? Number(r.cantidad) : null,
      unidad: (r.unidad as string | null) ?? null,
      destino: (r.destino as string | null) ?? null,
      responsable: (r.responsable as string | null) ?? null,
      documento: (r.documento as string | null) ?? null,
      observaciones: (r.observaciones as string | null) ?? null,
      fechaVencimiento: fechaISO(r.fecha_vencimiento),
      productoInfo: {
        nombre: (r.producto_nombre as string | null) ?? null,
        sku: (r.producto_sku as string | null) ?? null,
        categoria: (r.producto_categoria as string | null) ?? null,
        unidad: (r.producto_unidad as string | null) ?? null,
      },
    })
  } catch (err) {
    next(err)
  }
})

