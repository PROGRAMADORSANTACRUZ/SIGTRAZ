import { query } from '../db.js'

// La tabla cuartos_frios tenia UNIQUE(nombre) global, lo que impedia usar el
// mismo nombre (p. ej. "Vitrina pescado") en distintos puntos de venta.
// Se reemplaza por una restriccion compuesta UNIQUE(nombre, punto_venta_id).
async function main() {
  await query(
    'ALTER TABLE cuartos_frios DROP CONSTRAINT IF EXISTS cuartos_frios_nombre_key',
  )
  // Puede existir con otro nombre autogenerado; se ignora si no existe.
  await query(
    'ALTER TABLE cuartos_frios DROP CONSTRAINT IF EXISTS cuartos_frios_nombre_punto_venta_id_key',
  )
  await query(
    'ALTER TABLE cuartos_frios ' +
      'ADD CONSTRAINT cuartos_frios_nombre_punto_venta_id_key ' +
      'UNIQUE (nombre, punto_venta_id)',
  )
  console.log('Restriccion actualizada: UNIQUE(nombre, punto_venta_id).')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
