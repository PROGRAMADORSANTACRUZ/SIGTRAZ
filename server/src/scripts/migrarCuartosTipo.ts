import { pool, query } from '../db.js'

async function main() {
  await query(
    "ALTER TABLE cuartos_frios ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) " +
      "NOT NULL DEFAULT 'Congelado' " +
      "CHECK (tipo IN ('Congelado', 'Refrigerado'))",
  )
  await query('ALTER TABLE cuartos_frios DROP COLUMN IF EXISTS temp_min')
  await query('ALTER TABLE cuartos_frios DROP COLUMN IF EXISTS temp_max')
  await pool.end()
  console.log('Migracion cuartos_frios lista: columna tipo agregada, temp_min/temp_max eliminadas.')
}

main().catch((err) => {
  console.error('Error en migracion:', err)
  process.exit(1)
})
