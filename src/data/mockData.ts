import type {
  Entrada,
  EventoTrazabilidad,
  Lote,
  Producto,
} from '../types/trazabilidad'

export const productos: Producto[] = [
  { id: 'p1', sku: 'CAF-001', nombre: 'Cafe tostado premium', categoria: 'Bebidas', unidad: 'kg' },
  { id: 'p2', sku: 'MIE-002', nombre: 'Miel organica', categoria: 'Alimentos', unidad: 'L' },
  { id: 'p3', sku: 'HAR-003', nombre: 'Harina integral', categoria: 'Alimentos', unidad: 'kg' },
  { id: 'p4', sku: 'ACE-004', nombre: 'Aceite de oliva extra', categoria: 'Alimentos', unidad: 'L' },
]

export const lotes: Lote[] = [
  {
    id: 'l1',
    productoId: 'p1',
    codigo: 'L-CAF-2026-0012',
    fechaProduccion: '2026-06-01',
    fechaVencimiento: '2027-06-01',
    cantidad: 500,
    estado: 'Disponible',
  },
  {
    id: 'l2',
    productoId: 'p1',
    codigo: 'L-CAF-2026-0013',
    fechaProduccion: '2026-06-15',
    fechaVencimiento: '2027-06-15',
    cantidad: 320,
    estado: 'En transito',
  },
  {
    id: 'l3',
    productoId: 'p2',
    codigo: 'L-MIE-2026-0005',
    fechaProduccion: '2026-05-20',
    fechaVencimiento: '2028-05-20',
    cantidad: 180,
    estado: 'Retenido',
  },
  {
    id: 'l4',
    productoId: 'p3',
    codigo: 'L-HAR-2026-0021',
    fechaProduccion: '2026-07-02',
    fechaVencimiento: '2026-12-02',
    cantidad: 900,
    estado: 'En produccion',
  },
  {
    id: 'l5',
    productoId: 'p4',
    codigo: 'L-ACE-2026-0009',
    fechaProduccion: '2026-04-10',
    fechaVencimiento: '2027-10-10',
    cantidad: 240,
    estado: 'Entregado',
  },
]

export const eventos: EventoTrazabilidad[] = [
  { id: 'e1', loteId: 'l1', tipo: 'Produccion', fecha: '2026-06-01T08:00:00', ubicacion: 'Planta Central', responsable: 'Ana Rojas', notas: 'Lote iniciado' },
  { id: 'e2', loteId: 'l1', tipo: 'Inspeccion', fecha: '2026-06-01T14:30:00', ubicacion: 'Laboratorio QA', responsable: 'Carlos Vega', notas: 'Control de calidad aprobado' },
  { id: 'e3', loteId: 'l1', tipo: 'Recepcion', fecha: '2026-06-02T09:15:00', ubicacion: 'Almacen Norte', responsable: 'Luis Mora' },

  { id: 'e4', loteId: 'l2', tipo: 'Produccion', fecha: '2026-06-15T07:45:00', ubicacion: 'Planta Central', responsable: 'Ana Rojas' },
  { id: 'e5', loteId: 'l2', tipo: 'Despacho', fecha: '2026-06-18T11:00:00', ubicacion: 'Muelle de carga', responsable: 'Sofia Diaz', notas: 'Rumbo a distribuidor sur' },
  { id: 'e6', loteId: 'l2', tipo: 'Traslado', fecha: '2026-06-19T16:20:00', ubicacion: 'Ruta 5 - Km 120', responsable: 'Transportes ABC' },

  { id: 'e7', loteId: 'l3', tipo: 'Produccion', fecha: '2026-05-20T08:00:00', ubicacion: 'Planta Sur', responsable: 'Marta Leon' },
  { id: 'e8', loteId: 'l3', tipo: 'Inspeccion', fecha: '2026-05-21T10:00:00', ubicacion: 'Laboratorio QA', responsable: 'Carlos Vega', notas: 'Desviacion detectada' },
  { id: 'e9', loteId: 'l3', tipo: 'Retencion', fecha: '2026-05-21T12:00:00', ubicacion: 'Zona de cuarentena', responsable: 'Carlos Vega', notas: 'Lote retenido para reanalisis' },

  { id: 'e10', loteId: 'l4', tipo: 'Produccion', fecha: '2026-07-02T06:30:00', ubicacion: 'Planta Central', responsable: 'Ana Rojas', notas: 'En proceso' },

  { id: 'e11', loteId: 'l5', tipo: 'Produccion', fecha: '2026-04-10T08:00:00', ubicacion: 'Planta Sur', responsable: 'Marta Leon' },
  { id: 'e12', loteId: 'l5', tipo: 'Despacho', fecha: '2026-04-14T09:00:00', ubicacion: 'Muelle de carga', responsable: 'Sofia Diaz' },
  { id: 'e13', loteId: 'l5', tipo: 'Recepcion', fecha: '2026-04-16T15:00:00', ubicacion: 'Cliente final', responsable: 'Pedro Ruiz', notas: 'Entrega confirmada' },
]

export function getProducto(id: string): Producto | undefined {
  return productos.find((p) => p.id === id)
}

export function getLote(id: string): Lote | undefined {
  return lotes.find((l) => l.id === id)
}

export function getEventosDeLote(loteId: string): EventoTrazabilidad[] {
  return eventos
    .filter((e) => e.loteId === loteId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export const entradas: Entrada[] = [
  {
    id: 'ent1',
    fecha: '2026-06-02T09:15:00',
    productoId: 'p1',
    loteCodigo: 'L-CAF-2026-0012',
    cantidad: 500,
    proveedor: 'Tostadores del Valle',
    almacen: 'Almacen Norte',
    responsable: 'Luis Mora',
    documento: 'GR-2026-0451',
    notas: 'Recepcion completa',
  },
  {
    id: 'ent2',
    fecha: '2026-06-20T10:40:00',
    productoId: 'p2',
    loteCodigo: 'L-MIE-2026-0005',
    cantidad: 180,
    proveedor: 'Apiarios del Sur',
    almacen: 'Almacen Central',
    responsable: 'Sofia Diaz',
    documento: 'FAC-8890',
  },
  {
    id: 'ent3',
    fecha: '2026-07-05T08:05:00',
    productoId: 'p3',
    loteCodigo: 'L-HAR-2026-0021',
    cantidad: 900,
    proveedor: 'Molinos Union',
    almacen: 'Almacen Norte',
    responsable: 'Pedro Ruiz',
    documento: 'GR-2026-0512',
    notas: 'Pendiente inspeccion de calidad',
  },
]

