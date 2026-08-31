/**
 * Borra TODOS los productos de la base de datos.
 * Uso: npm run borrar:productos
 */
import { pool } from '../db.js'

async function main() {
  const ent = await pool.query('DELETE FROM entradas')
  const prod = await pool.query('DELETE FROM productos')
  await pool.end()
  console.log(
    `Entradas eliminadas: ${ent.rowCount ?? 0} | Productos eliminados: ${prod.rowCount ?? 0}`,
  )
}

main().catch((err) => {
  console.error('Error borrando los productos:', err)
  process.exit(1)
})
