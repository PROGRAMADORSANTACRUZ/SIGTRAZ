import { pool, query } from '../db.js'

// Agrega las columnas nuevas de recepcion a la tabla entradas.
async function main() {
  const columnas = [
    'ADD COLUMN IF NOT EXISTS lote_externo   VARCHAR(100)',
    'ADD COLUMN IF NOT EXISTS veh_pisos      VARCHAR(2)',
    'ADD COLUMN IF NOT EXISTS veh_paredes    VARCHAR(2)',
    'ADD COLUMN IF NOT EXISTS veh_techos     VARCHAR(2)',
    'ADD COLUMN IF NOT EXISTS veh_cortinas   VARCHAR(2)',
    'ADD COLUMN IF NOT EXISTS organolepticas VARCHAR(2)',
    'ADD COLUMN IF NOT EXISTS temp_producto  NUMERIC(6,2)',
    'ADD COLUMN IF NOT EXISTS temp_vehiculo  NUMERIC(6,2)',
    'ADD COLUMN IF NOT EXISTS placa          VARCHAR(20)',
    'ADD COLUMN IF NOT EXISTS editado        BOOLEAN DEFAULT FALSE',
    'ADD COLUMN IF NOT EXISTS lote_interno   VARCHAR(20)',
  ]

  for (const col of columnas) {
    await query('ALTER TABLE entradas ' + col)
  }

  console.log('Columnas de entradas actualizadas: ' + columnas.length)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
