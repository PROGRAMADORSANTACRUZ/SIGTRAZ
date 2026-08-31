import { query } from '../db.js'

// Semilla de cuartos frios / vitrinas por punto de venta (lista definitiva
// confirmada por el usuario). El tipo se asigna por palabra clave:
//   contiene "congel" -> Congelado ; en caso contrario -> Refrigerado.

// Nombre de PDV tal como esta en la BD (columna puntos_venta.pdv).
const SANFELIPE = 'CARNES SANTACRUZ SAN FELIPE'
const CARTAGENA = 'CARNES SANTACRUZ CARTAGENA'
const BUCARAMANGA = 'CARNES SANTACRUZ BUCARAMANGA'
const CENTRO = 'CARNES SANTACRUZ CENTRO'
const SOLEDAD = 'CARNES SANTACRUZ SOLEDAD'
const ALAMEDA2 = 'CARNES SANTACRUZ ALAMEDA 2'
const OLAYA = 'CARNES SANTACRUZ OLAYA'
const LA93 = 'CARNES SANTACRUZ LA 93'
const LA70 = 'CARNES SANTACRUZ LA 70'
const CONCORD = 'CARNES SANTACRUZ CONCORD'
const ALAMEDA1 = 'CARNES SANTACRUZ ALAMEDA 1'
const MALAMBO = 'CARNES SANTACRUZ MALAMBO'
const SIMON = 'CARNES SANTACRUZ SIMON BOLIVAR'
const LA43 = 'CARNES SANTACRUZ LA 43'

const listas: Record<string, string[]> = {
  [SANFELIPE]: [
    'Vitrina res',
    'Vitrina víscera',
    'Vitrina cerdo',
    'Vitrina pollo',
    'Vitrina pescado',
    'Cuarto de refrigeración',
    'Cuarto de congelación',
    'Área de proceso',
  ],
  [CARTAGENA]: [
    'Vitrina de res y vísceras',
    'Vitrina de cerdo',
    'Vitrina pescado',
    'Vitrina de pollo',
    'Vitrina de embutidos',
    'Cuarto de congelación',
    'Cuarto de refrigeración',
    'Cuarto de proceso',
  ],
  [BUCARAMANGA]: [
    'Vitrina pescado',
    'Vitrina res',
    'Vitrina cerdo',
    'Vitrina vísceras',
    'Vitrina pollo',
    'Vitrina queso',
    'Sala Procesos y limpieza',
    'Cuarto vísceras',
    'Cuarto congelación cerdo',
    'Cuarto congelación',
    'Cuarto refrigeración canales',
    'Cuarto de aliños',
    'Cuarto congelación pescado',
    'Cuarto de congelación pollo',
  ],
  [CENTRO]: [
    'Vitrina de pollo',
    'Vitrina de cerdo',
    'Vitrina embutido',
    'Vitrina de res',
    'Vitrina de vísceras',
    'Cuarto de refrigeración',
    'Cuarto de proceso',
    'Cuarto de congelación 1',
    'Cuarto de congelación 2',
  ],
  [SOLEDAD]: [
    'Vitrina de la res',
    'Vitrina del cerdo',
    'Vitrina víscera',
    'Vitrina pescado',
    'Vitrina del pollo',
    'Cuarto refrigeración',
    'Cuarto de congelación',
  ],
  [ALAMEDA2]: [
    'Vitrina del pollo',
    'Vitrina de la res',
    'Vitrina cerdo',
    'Nevera de productos extra',
    'Nevera vertical del pescado',
    'Cuarto de refrigeración',
    'Cuarto de congelación',
  ],
  [OLAYA]: [
    'Vitrina res',
    'Vitrina cerdo',
    'Vitrina pollo',
    'Vitrina pescado',
    'Vitrina vísceras',
    'Procesos',
    'Cuarto congelación',
    'Cuarto de refrigeración',
  ],
  [LA93]: [
    'Vitrina res',
    'Vitrina vísceras',
    'Vitrina cerdo',
    'Vitrina pollo',
    'Vitrina pescado',
    'Cuarto de proceso',
    'Cuarto de congelación',
    'Cuarto refrigeración',
  ],
  [LA70]: [
    'Vitrina res',
    'Vitrina vísceras',
    'Vitrina cerdo',
    'Vitrina pescado',
    'Vitrina pollo',
    'Cuarto refrigeración',
    'Cuarto congelación',
    'Cuarto de proceso',
  ],
  [CONCORD]: [
    'Vitrina vísceras',
    'Vitrina pescado',
    'Vitrina pollo',
    'Vitrina embutido',
    'Vitrina cerdo',
    'Vitrina res',
    'Cuarto de refrigeración',
    'Cuarto de congelación',
    'Cuarto de proceso',
  ],
  [ALAMEDA1]: [
    'Vitrina cerdo',
    'Vitrina pollo',
    'Vitrina res',
    'Vitrina pescado',
    'Cuarto de refrigeración',
    'Cuarto de congelación',
    'Área de proceso',
  ],
  [MALAMBO]: [
    'Vitrina vísceras',
    'Vitrina res',
    'Vitrina cerdo',
    'Vitrina pollo',
    'Cuarto de refrigeración',
    'Cuarto de congelación',
    'Cuarto de proceso',
  ],
  [SIMON]: [
    'Vitrina vísceras',
    'Vitrina pescado',
    'Vitrina pollo',
    'Vitrina embutido',
    'Vitrina res',
    'Cuarto de refrigeración primer piso',
    'Cuarto de refrigeración segundo piso',
    'Cuarto de congelación',
    'Cuarto de proceso primer piso',
    'Cuarto de proceso segundo piso',
  ],
  [LA43]: [
    'Vitrina vísceras',
    'Vitrina pescado',
    'Vitrina pollo',
    'Vitrina embutido',
    'Vitrina cerdo',
    'Vitrina res',
    'Cuarto de refrigeración',
    'Cuarto de congelación patio',
    'Cuarto de congelación turbo',
    'Cuarto de proceso 1',
    'Cuarto de proceso 2',
  ],
}

// Nombres que se crearon con una interpretacion equivocada (imagen cortada) y
// ahora deben eliminarse para dejar la lista definitiva.
const aBorrar: Record<string, string[]> = {
  [CARTAGENA]: ['Vitrina de res y víscera'],
  [BUCARAMANGA]: ['Cuarto refrigeración carne', 'Cuarto de congelación'],
  [ALAMEDA2]: ['Nevera de productos congelados'],
  [SIMON]: [
    'Cuarto de refrigeración 1',
    'Cuarto de refrigeración 2',
    'Cuarto de proceso 1',
    'Cuarto de proceso 2',
  ],
  [LA43]: ['Cuarto de congelación'],
}

function tipoDe(nombre: string): 'Congelado' | 'Refrigerado' {
  return nombre.toLowerCase().includes('congel') ? 'Congelado' : 'Refrigerado'
}

async function main() {
  const pdvRows = await query('SELECT id, pdv FROM puntos_venta')
  const idPorPdv = new Map<string, number>()
  for (const r of pdvRows) idPorPdv.set(String(r.pdv), Number(r.id))

  // 1) Elimina los nombres equivocados (imagen cortada).
  let borrados = 0
  for (const [pdv, nombres] of Object.entries(aBorrar)) {
    const pvId = idPorPdv.get(pdv)
    if (pvId == null) continue
    for (const nombre of nombres) {
      const r = await query(
        'DELETE FROM cuartos_frios WHERE UPPER(nombre) = UPPER($1) AND punto_venta_id = $2 RETURNING id',
        [nombre, pvId],
      )
      borrados += r.length
    }
  }

  // 2) Inserta la lista definitiva (idempotente).
  let creados = 0
  let omitidos = 0
  for (const [pdv, nombres] of Object.entries(listas)) {
    const pvId = idPorPdv.get(pdv)
    if (pvId == null) continue
    for (const nombre of nombres) {
      const dup = await query(
        'SELECT 1 FROM cuartos_frios WHERE UPPER(nombre) = UPPER($1) AND punto_venta_id = $2',
        [nombre, pvId],
      )
      if (dup.length > 0) {
        omitidos++
        continue
      }
      await query(
        `INSERT INTO cuartos_frios
           (nombre, tipo, capacidad, capacidad_unidad,
            ubicacion, responsable, estado, punto_venta_id)
         VALUES ($1, $2, NULL, 'kg', NULL, NULL, 'Activo', $3)`,
        [nombre, tipoDe(nombre), pvId],
      )
      creados++
    }
  }

  console.log(`Eliminados (nombres corregidos): ${borrados}`)
  console.log(`Cuartos creados: ${creados}`)
  console.log(`Omitidos (ya existían): ${omitidos}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
