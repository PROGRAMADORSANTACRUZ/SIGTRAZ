import { pool, query } from '../db.js'

// Relaciona el monitoreo de temperatura con el cuarto frio del PDV (FOR-CIA-007).
async function main() {
  await query(
    'ALTER TABLE monitoreo_temperatura' +
      ' ADD COLUMN IF NOT EXISTS cuarto_frio_id INTEGER REFERENCES cuartos_frios(id)',
  )

  await query(
    'CREATE INDEX IF NOT EXISTS idx_monitoreo_temperatura_cuarto ON monitoreo_temperatura (cuarto_frio_id)',
  )

  console.log('Columna cuarto_frio_id lista en monitoreo_temperatura')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
