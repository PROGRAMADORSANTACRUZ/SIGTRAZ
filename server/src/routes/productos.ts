import { Router } from 'express'
import { query } from '../db.js'
import type { NuevoProducto, Producto } from '../types.js'

export const productosRouter = Router()

function mapProducto(r: Record<string, unknown>): Producto {
  return {
    id: r.id as string,
    sku: r.sku as string,
    nombre: r.nombre as string,
    categoria: r.categoria as string,
    unidad: r.unidad as string,
  }
}

productosRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, sku, nombre, categoria, unidad
         FROM productos
        ORDER BY nombre`,
    )
    res.json(rows.map(mapProducto))
  } catch (err) {
    next(err)
  }
})

productosRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<NuevoProducto>

    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const sku = body.sku!.trim()

    const duplicado = await query(
      'SELECT 1 FROM productos WHERE UPPER(sku) = UPPER($1)',
      [sku],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El SKU ya esta registrado'] })
      return
    }

    // El id es la PK textual; se genera uno unico y corto (<= 20 chars).
    const id = `p${Date.now().toString(36)}`

    const rows = await query(
      `INSERT INTO productos (id, sku, nombre, categoria, unidad)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, sku, nombre, categoria, unidad`,
      [id, sku, body.nombre!.trim(), body.categoria!.trim(), body.unidad!.trim()],
    )

    res.status(201).json(mapProducto(rows[0]))
  } catch (err) {
    next(err)
  }
})

interface FilaCarga {
  item?: string
  sku?: string
  nombre?: string
  categoria?: string
  unidad?: string
}

productosRouter.post('/carga-masiva', async (req, res, next) => {
  try {
    const filas = (req.body as { productos?: FilaCarga[] }).productos

    if (!Array.isArray(filas) || filas.length === 0) {
      res.status(400).json({ errores: ['No se recibieron productos'] })
      return
    }
    if (filas.length > 50000) {
      res.status(400).json({ errores: ['Maximo 50000 productos por carga'] })
      return
    }

    // Precarga los SKUs e ids existentes para evitar consultas por fila.
    const existentes = await query<{ id: string; sku: string }>(
      'SELECT id, sku FROM productos',
    )
    const skusExistentes = new Set(
      existentes.map((r) => r.sku.toLowerCase()),
    )
    const idsExistentes = new Set(existentes.map((r) => r.id))

    let omitidos = 0
    const errores: { fila: number; mensaje: string }[] = []
    const nuevos: [string, string, string, string, string][] = []

    filas.forEach((fila, i) => {
      const sku = fila.sku?.trim() ?? ''
      const nombre = fila.nombre?.trim() ?? ''
      const unidad = fila.unidad?.trim() ?? ''
      const categoria = fila.categoria?.trim() || 'General'

      if (!sku || !nombre || !unidad) {
        errores.push({
          fila: i + 1,
          mensaje: 'Referencia, descripcion y U.M. son obligatorias',
        })
        return
      }

      // Omite duplicados (ya en BD o repetidos dentro del archivo).
      const skuKey = sku.toLowerCase()
      if (skusExistentes.has(skuKey)) {
        omitidos++
        return
      }
      skusExistentes.add(skuKey)

      // Usa el "Item" como id si es valido y unico; si no, genera uno.
      const itemLimpio = fila.item?.trim().slice(0, 20)
      let id =
        itemLimpio && /^[\w.-]+$/.test(itemLimpio) && !idsExistentes.has(itemLimpio)
          ? itemLimpio
          : `p${Date.now().toString(36)}${i}`
      while (idsExistentes.has(id)) {
        id = `p${Date.now().toString(36)}${i}${Math.random().toString(36).slice(2, 5)}`
      }
      idsExistentes.add(id)

      nuevos.push([id, sku, nombre.slice(0, 150), categoria.slice(0, 80), unidad.slice(0, 20)])
    })

    // Inserta en lotes de 500 filas usando multi-row INSERT.
    let creados = 0
    const TAM_LOTE = 500
    for (let inicio = 0; inicio < nuevos.length; inicio += TAM_LOTE) {
      const lote = nuevos.slice(inicio, inicio + TAM_LOTE)
      const valores: string[] = []
      const params: string[] = []
      lote.forEach((fila, idx) => {
        const base = idx * 5
        valores.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
        )
        params.push(...fila)
      })
      const insertados = await query(
        `INSERT INTO productos (id, sku, nombre, categoria, unidad)
         VALUES ${valores.join(', ')}
         ON CONFLICT DO NOTHING
         RETURNING id`,
        params,
      )
      creados += insertados.length
    }

    res.status(201).json({ creados, omitidos, errores })
  } catch (err) {
    next(err)
  }
})

productosRouter.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const body = req.body as Partial<NuevoProducto>

    const errores = validar(body)
    if (errores.length > 0) {
      res.status(400).json({ errores })
      return
    }

    const sku = body.sku!.trim()

    const duplicado = await query(
      'SELECT 1 FROM productos WHERE UPPER(sku) = UPPER($1) AND id <> $2',
      [sku, id],
    )
    if (duplicado.length > 0) {
      res.status(409).json({ errores: ['El SKU ya esta registrado'] })
      return
    }

    const rows = await query(
      `UPDATE productos
          SET sku = $2, nombre = $3, categoria = $4, unidad = $5
        WHERE id = $1
      RETURNING id, sku, nombre, categoria, unidad`,
      [id, sku, body.nombre!.trim(), body.categoria!.trim(), body.unidad!.trim()],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    res.json(mapProducto(rows[0]))
  } catch (err) {
    next(err)
  }
})

productosRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id

    // No permitir borrar productos referenciados por lotes o entradas.
    const referencias = await query(
      `SELECT 1 FROM lotes WHERE producto_id = $1
       UNION ALL
       SELECT 1 FROM entradas WHERE producto_id = $1
       LIMIT 1`,
      [id],
    )
    if (referencias.length > 0) {
      res.status(409).json({
        errores: [
          'No se puede eliminar: el producto tiene lotes o entradas asociadas',
        ],
      })
      return
    }

    const rows = await query(
      'DELETE FROM productos WHERE id = $1 RETURNING id',
      [id],
    )

    if (rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

function validar(body: Partial<NuevoProducto>): string[] {
  const errores: string[] = []
  if (!body.sku?.trim()) errores.push('sku es obligatorio')
  if (!body.nombre?.trim()) errores.push('nombre es obligatorio')
  if (!body.categoria?.trim()) errores.push('categoria es obligatoria')
  if (!body.unidad?.trim()) errores.push('unidad es obligatoria')
  return errores
}
