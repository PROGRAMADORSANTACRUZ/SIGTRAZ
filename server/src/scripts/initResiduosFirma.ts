import { pool, query } from '../db.js'

// Agrega la columna de firma dibujada (dataURL PNG) al formato de residuos
// solidos (FOR-CIA-018).
async function main() {
  await query(
    'ALTER TABLE residuos_solidos ADD COLUMN IF NOT EXISTS firma_imagen TEXT',
  )
  console.log('Columna firma_imagen lista en residuos_solidos')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
