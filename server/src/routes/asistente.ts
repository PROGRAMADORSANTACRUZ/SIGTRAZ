import { Router } from 'express'
import { query } from '../db.js'

export const asistenteRouter = Router()

interface Respuesta {
  texto: string
  datos?: { etiqueta: string; valor: string | number }[]
}

async function contar(sql: string): Promise<number> {
  const rows = await query<{ n: string }>(sql)
  return Number(rows[0]?.n ?? 0)
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function incluye(texto: string, ...claves: string[]): boolean {
  return claves.some((c) => texto.includes(c))
}

async function resumenAcciones(): Promise<Respuesta> {
  const pendientes = await contar(
    "SELECT COUNT(*) AS n FROM acciones WHERE estado = 'Pendiente'",
  )
  const enProgreso = await contar(
    "SELECT COUNT(*) AS n FROM acciones WHERE estado = 'En progreso'",
  )
  const alta = await contar(
    "SELECT COUNT(*) AS n FROM acciones WHERE prioridad = 'Alta' AND estado <> 'Completada'",
  )
  return {
    texto:
      pendientes + enProgreso === 0
        ? 'No tienes acciones abiertas. Buen trabajo.'
        : `Tienes ${pendientes} accion(es) pendiente(s) y ${enProgreso} en progreso. ${alta} son de prioridad alta.`,
    datos: [
      { etiqueta: 'Pendientes', valor: pendientes },
      { etiqueta: 'En progreso', valor: enProgreso },
      { etiqueta: 'Prioridad alta abiertas', valor: alta },
    ],
  }
}

async function resumenInspecciones(): Promise<Respuesta> {
  const pendientes = await contar(
    "SELECT COUNT(*) AS n FROM inspecciones WHERE estado = 'Pendiente'",
  )
  const enProgreso = await contar(
    "SELECT COUNT(*) AS n FROM inspecciones WHERE estado = 'En progreso'",
  )
  const completadas = await contar(
    "SELECT COUNT(*) AS n FROM inspecciones WHERE estado = 'Completada'",
  )
  return {
    texto: `Hay ${pendientes} inspeccion(es) pendiente(s), ${enProgreso} en progreso y ${completadas} completada(s).`,
    datos: [
      { etiqueta: 'Pendientes', valor: pendientes },
      { etiqueta: 'En progreso', valor: enProgreso },
      { etiqueta: 'Completadas', valor: completadas },
    ],
  }
}

async function resumenActivos(): Promise<Respuesta> {
  const mantenimiento = await contar(
    "SELECT COUNT(*) AS n FROM activos WHERE estado = 'En mantenimiento'",
  )
  const fueraServicio = await contar(
    "SELECT COUNT(*) AS n FROM activos WHERE estado = 'Fuera de servicio'",
  )
  const operativos = await contar(
    "SELECT COUNT(*) AS n FROM activos WHERE estado = 'Operativo'",
  )
  return {
    texto: `Tienes ${operativos} activo(s) operativo(s), ${mantenimiento} en mantenimiento y ${fueraServicio} fuera de servicio.`,
    datos: [
      { etiqueta: 'Operativos', valor: operativos },
      { etiqueta: 'En mantenimiento', valor: mantenimiento },
      { etiqueta: 'Fuera de servicio', valor: fueraServicio },
    ],
  }
}

async function resumenFormaciones(): Promise<Respuesta> {
  const programadas = await contar(
    "SELECT COUNT(*) AS n FROM formaciones WHERE estado = 'Programada'",
  )
  const enCurso = await contar(
    "SELECT COUNT(*) AS n FROM formaciones WHERE estado = 'En curso'",
  )
  return {
    texto: `Hay ${programadas} formacion(es) programada(s) y ${enCurso} en curso.`,
    datos: [
      { etiqueta: 'Programadas', valor: programadas },
      { etiqueta: 'En curso', valor: enCurso },
    ],
  }
}

async function resumenProgramas(): Promise<Respuesta> {
  const activos = await contar(
    'SELECT COUNT(*) AS n FROM programas WHERE activo = true',
  )
  const proximos = await query<{ nombre: string; proxima_fecha: string }>(
    "SELECT nombre, proxima_fecha FROM programas WHERE activo = true AND proxima_fecha IS NOT NULL AND proxima_fecha >= CURRENT_DATE ORDER BY proxima_fecha ASC LIMIT 3",
  )
  const detalle =
    proximos.length > 0
      ? ' Proximos: ' +
        proximos.map((p) => `${p.nombre} (${p.proxima_fecha})`).join(', ') +
        '.'
      : ''
  return {
    texto: `Tienes ${activos} programa(s) activo(s).${detalle}`,
    datos: proximos.map((p) => ({
      etiqueta: p.nombre,
      valor: p.proxima_fecha,
    })),
  }
}

async function resumenInventario(): Promise<Respuesta> {
  const productos = await contar('SELECT COUNT(*) AS n FROM productos')
  const lotes = await contar('SELECT COUNT(*) AS n FROM lotes')
  const proveedores = await contar('SELECT COUNT(*) AS n FROM proveedores')
  return {
    texto: `En inventario hay ${productos} producto(s), ${lotes} lote(s) y ${proveedores} proveedor(es) registrados.`,
    datos: [
      { etiqueta: 'Productos', valor: productos },
      { etiqueta: 'Lotes', valor: lotes },
      { etiqueta: 'Proveedores', valor: proveedores },
    ],
  }
}

async function resumenGeneral(): Promise<Respuesta> {
  const [acciones, inspecciones, activos, programas, formaciones] =
    await Promise.all([
      contar(
        "SELECT COUNT(*) AS n FROM acciones WHERE estado <> 'Completada'",
      ),
      contar(
        "SELECT COUNT(*) AS n FROM inspecciones WHERE estado <> 'Completada'",
      ),
      contar(
        "SELECT COUNT(*) AS n FROM activos WHERE estado <> 'Operativo' AND estado <> 'Baja'",
      ),
      contar('SELECT COUNT(*) AS n FROM programas WHERE activo = true'),
      contar(
        "SELECT COUNT(*) AS n FROM formaciones WHERE estado <> 'Completada'",
      ),
    ])
  return {
    texto: 'Resumen general del sistema:',
    datos: [
      { etiqueta: 'Acciones abiertas', valor: acciones },
      { etiqueta: 'Inspecciones abiertas', valor: inspecciones },
      { etiqueta: 'Activos con incidencia', valor: activos },
      { etiqueta: 'Programas activos', valor: programas },
      { etiqueta: 'Formaciones abiertas', valor: formaciones },
    ],
  }
}

function ayuda(): Respuesta {
  return {
    texto:
      'Puedo ayudarte con informacion de tu sistema. Prueba a preguntar por: ' +
      'acciones pendientes, inspecciones, activos en mantenimiento, formaciones programadas, ' +
      'programas proximos, inventario o un resumen general.',
  }
}

asistenteRouter.post('/', async (req, res, next) => {
  try {
    const pregunta = normalizar(String(req.body?.pregunta ?? ''))
    if (!pregunta) {
      res.json(ayuda())
      return
    }

    let respuesta: Respuesta

    if (incluye(pregunta, 'hola', 'buenas', 'saludos')) {
      respuesta = {
        texto:
          'Hola, soy tu asistente de SIGTRAZ. Preguntame por acciones, inspecciones, activos, formaciones, programas o un resumen general.',
      }
    } else if (incluye(pregunta, 'resumen', 'general', 'estado del sistema')) {
      respuesta = await resumenGeneral()
    } else if (incluye(pregunta, 'accion', 'tarea', 'pendiente')) {
      respuesta = await resumenAcciones()
    } else if (incluye(pregunta, 'inspeccion', 'auditoria', 'checklist')) {
      respuesta = await resumenInspecciones()
    } else if (
      incluye(pregunta, 'activo', 'equipo', 'mantenimiento', 'maquina')
    ) {
      respuesta = await resumenActivos()
    } else if (
      incluye(pregunta, 'formacion', 'capacitacion', 'curso', 'entrenamiento')
    ) {
      respuesta = await resumenFormaciones()
    } else if (incluye(pregunta, 'programa', 'programad', 'recurrente')) {
      respuesta = await resumenProgramas()
    } else if (
      incluye(pregunta, 'inventario', 'producto', 'lote', 'proveedor', 'stock')
    ) {
      respuesta = await resumenInventario()
    } else if (incluye(pregunta, 'ayuda', 'que puedes', 'opciones')) {
      respuesta = ayuda()
    } else {
      respuesta = {
        texto:
          'No entendi bien tu pregunta. ' + ayuda().texto,
      }
    }

    res.json(respuesta)
  } catch (err) {
    next(err)
  }
})
