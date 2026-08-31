import { pool, query } from '../db.js'

// Agrega la firma dibujada de quien recibe (dataURL PNG) al formato de residuos
// reciclables (FOR-CIA-019).
async function main() {
  await query(
    'ALTER TABLE residuos_reciclables ADD COLUMN IF NOT EXISTS firma_recibe_imagen TEXT',
  )
  console.log('Columna firma_recibe_imagen lista en residuos_reciclables')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
