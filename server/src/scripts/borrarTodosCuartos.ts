import { query } from '../db.js'

// Elimina TODOS los cuartos frios (todos los PDV). Accion destructiva.
async function main() {
  const antes = await query('SELECT COUNT(*)::int AS n FROM cuartos_frios')
  const total = Number(antes[0]?.n ?? 0)
  await query('DELETE FROM cuartos_frios')
  const despues = await query('SELECT COUNT(*)::int AS n FROM cuartos_frios')
  console.log(`Eliminados: ${total}. Quedan: ${Number(despues[0]?.n ?? 0)}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
