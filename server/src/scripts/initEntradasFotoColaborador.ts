import { pool, query } from '../db.js'

// Agrega a la tabla entradas las columnas para adjuntar una foto (data URL) y
// el colaborador que apoyo la recepcion.
async function main() {
  await query(
    'ALTER TABLE entradas ADD COLUMN IF NOT EXISTS foto TEXT',
  )
  await query(
    'ALTER TABLE entradas ADD COLUMN IF NOT EXISTS colaborador VARCHAR(200)',
  )

  console.log('Columnas foto y colaborador listas en entradas')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
