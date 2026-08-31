import { pool, query } from '../db.js'

// Quita el prefijo "CARNES SANTACRUZ " del nombre del PDV.
function limpiarNombre(pdv: string): string {
  return pdv.replace(/^CARNES SANTACRUZ\s+/i, '').trim()
}

// Email: nombre limpio en minusculas sin espacios ni signos.
function emailDe(nombre: string): string {
  return nombre.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sigtraz.com'
}

async function main() {
  const pdvs = await query<{ id: number; pdv: string }>(
    'SELECT id, pdv FROM puntos_venta ORDER BY pdv',
  )

  let actualizados = 0
  for (const p of pdvs) {
    // Solo los usuarios auto-generados: nombre igual al nombre completo del PDV.
    const usuarios = await query<{ id: number }>(
      `SELECT u.id
         FROM usuarios u
         JOIN usuarios_puntos_venta upv ON upv.usuario_id = u.id
        WHERE upv.punto_venta_id = $1 AND u.nombre = $2`,
      [p.id, p.pdv],
    )
    if (usuarios.length === 0) continue

    const nombre = limpiarNombre(p.pdv)
    const email = emailDe(nombre)

    for (const u of usuarios) {
      const dup = await query('SELECT 1 FROM usuarios WHERE email = $1 AND id <> $2', [
        email,
        u.id,
      ])
      const emailFinal = dup.length > 0 ? emailDe(nombre) .replace('@', `${u.id}@`) : email
      await query('UPDATE usuarios SET nombre = $1, email = $2 WHERE id = $3', [
        nombre,
        emailFinal,
        u.id,
      ])
      console.log(`ACTUALIZADO: ${p.pdv} -> nombre="${nombre}", email=${emailFinal}`)
      actualizados++
    }
  }

  console.log(`\nListo. Actualizados: ${actualizados}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
