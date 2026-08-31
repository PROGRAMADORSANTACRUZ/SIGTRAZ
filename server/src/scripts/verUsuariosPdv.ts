import { pool, query } from '../db.js'

async function main() {
  const ref = await query(
    `SELECT nombre, apellido, email, rol, empresa, modulos
       FROM usuarios WHERE email = 'alameda1@sigtraz.com'`,
  )
  console.log('--- USUARIO REFERENCIA (alameda1) ---')
  console.log(JSON.stringify(ref[0], null, 2))

  const pdvs = await query(
    'SELECT id, pdv, prefijo FROM puntos_venta ORDER BY pdv',
  )
  console.log('--- PUNTOS DE VENTA ---')
  for (const p of pdvs) console.log(p.id, '|', p.pdv, '|', p.prefijo)

  const users = await query(
    `SELECT u.email, u.nombre, u.rol,
            COALESCE(ARRAY_AGG(upv.punto_venta_id) FILTER (WHERE upv.punto_venta_id IS NOT NULL), '{}') AS pv
       FROM usuarios u
       LEFT JOIN usuarios_puntos_venta upv ON upv.usuario_id = u.id
      GROUP BY u.id ORDER BY u.email`,
  )
  console.log('--- USUARIOS EXISTENTES ---')
  for (const u of users) console.log(u.email, '|', u.nombre, '|', u.rol, '| pv:', JSON.stringify(u.pv))

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
