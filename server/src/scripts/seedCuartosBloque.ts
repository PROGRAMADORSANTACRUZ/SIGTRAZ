import { query } from '../db.js'

// Crea un bloque de cuartos frios para un PDV. Todo en MAYUSCULAS.
// Editar PDV_NOMBRE y NOMBRES por cada bloque y ejecutar.
const PDV_NOMBRE = 'CARNES SANTACRUZ BUCARAMANGA'

const NOMBRES = [
  'Vitrina pescado',
  'Vitrina cerdo',
  'Vitrina res',
  'Vitrina viceras',
  'Vitrina pollo',
  'Vitrina queso',
  'Sala Procesos y limpieza',
  'Cuarto viceras',
  'Cuarto congelación cerdo',
  'Cuarto congelación',
  'Cuarto refrigeración canales',
  'Cuarto de aliños',
  'Cuarto congelación pescado',
  'Cuarto de congelación pollo',
]

function tipoDe(nombre: string): 'Congelado' | 'Refrigerado' {
  return nombre.toLowerCase().includes('congel') ? 'Congelado' : 'Refrigerado'
}

async function main() {
  const pv = await query('SELECT id FROM puntos_venta WHERE UPPER(pdv) = UPPER($1)', [PDV_NOMBRE])
  if (pv.length === 0) {
    console.error(`No existe el PDV: ${PDV_NOMBRE}`)
    process.exit(1)
  }
  const pvId = Number((pv[0] as { id: number }).id)

  let creados = 0
  let omitidos = 0
  for (const raw of NOMBRES) {
    const nombre = raw.trim().toUpperCase()
    const dup = await query(
      'SELECT 1 FROM cuartos_frios WHERE UPPER(nombre) = UPPER($1) AND punto_venta_id = $2',
      [nombre, pvId],
    )
    if (dup.length > 0) {
      omitidos++
      continue
    }
    await query(
      `INSERT INTO cuartos_frios (nombre, tipo, capacidad_unidad, estado, punto_venta_id)
       VALUES ($1, $2, 'kg', 'Activo', $3)`,
      [nombre, tipoDe(nombre), pvId],
    )
    creados++
  }

  console.log(`== ${PDV_NOMBRE} == creados: ${creados}, omitidos: ${omitidos}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
