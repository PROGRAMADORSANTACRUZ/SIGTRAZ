import { query } from '../db.js'

async function main() {
  const pdv = process.argv[2] ?? 'CARNES SANTACRUZ CARTAGENA'
  const rows = await query(
    `SELECT c.nombre, c.tipo
       FROM cuartos_frios c
       JOIN puntos_venta pv ON pv.id = c.punto_venta_id
      WHERE pv.pdv = $1
      ORDER BY c.id`,
    [pdv],
  )
  console.log(`== ${pdv} (${rows.length}) ==`)
  for (const r of rows) console.log(`${r.tipo}\t${r.nombre}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
