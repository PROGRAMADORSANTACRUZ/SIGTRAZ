import { pool, query } from '../db.js'

async function main() {
  await query('ALTER TABLE fichas_tecnicas DROP COLUMN IF EXISTS temperatura')
  await query(
    'ALTER TABLE fichas_tecnicas ADD COLUMN IF NOT EXISTS dias_vencimiento INTEGER',
  )
  await pool.end()
  console.log('Migracion lista: columna temperatura -> dias_vencimiento.')
}

main().catch((err) => {
  console.error('Error en migracion:', err)
  process.exit(1)
})
