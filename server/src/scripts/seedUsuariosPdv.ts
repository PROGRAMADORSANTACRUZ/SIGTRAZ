import { pool, query } from '../db.js'
import { hashPassword } from '../auth.js'

// Contraseña temporal para todos los usuarios generados (se corrige luego).
const PASSWORD = 'sigtraz123'

async function main() {
  // Usuario de referencia: mismo rol, empresa y modulos que Alameda 1.
  const refRows = await query<{
    rol: string
    empresa: string
    modulos: unknown
  }>(
    `SELECT rol, empresa, modulos FROM usuarios WHERE email = 'alameda1@sigtraz.com'`,
  )
  if (refRows.length === 0) {
    throw new Error('No se encontro el usuario de referencia alameda1@sigtraz.com')
  }
  const ref = refRows[0]
  const modulosJson = JSON.stringify(ref.modulos ?? [])

  const pdvs = await query<{ id: number; pdv: string; prefijo: string | null }>(
    'SELECT id, pdv, prefijo FROM puntos_venta ORDER BY pdv',
  )

  const passwordHash = await hashPassword(PASSWORD)
  let creados = 0
  let saltados = 0

  for (const p of pdvs) {
    // Salta si el PDV ya tiene algun usuario asignado.
    const yaAsignado = await query(
      'SELECT 1 FROM usuarios_puntos_venta WHERE punto_venta_id = $1 LIMIT 1',
      [p.id],
    )
    if (yaAsignado.length > 0) {
      console.log(`SALTA (ya tiene usuario): ${p.pdv}`)
      saltados++
      continue
    }

    // Email a partir del prefijo (o del id si no hay prefijo).
    const base = (p.prefijo ?? String(p.id)).toLowerCase().replace(/[^a-z0-9]/g, '')
    const email = `${base}@sigtraz.com`

    const dup = await query('SELECT 1 FROM usuarios WHERE email = $1', [email])
    if (dup.length > 0) {
      console.log(`SALTA (email existente ${email}): ${p.pdv}`)
      saltados++
      continue
    }

    const ins = await query<{ id: number }>(
      `INSERT INTO usuarios (nombre, apellido, email, rol, empresa, activo, password_hash, modulos)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7::jsonb)
       RETURNING id`,
      [p.pdv, null, email, ref.rol, ref.empresa, passwordHash, modulosJson],
    )
    const usuarioId = ins[0].id

    await query(
      `INSERT INTO usuarios_puntos_venta (usuario_id, punto_venta_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [usuarioId, p.id],
    )

    console.log(`CREADO: ${email} -> ${p.pdv}`)
    creados++
  }

  console.log(`\nListo. Creados: ${creados}, Saltados: ${saltados}. Password temporal: ${PASSWORD}`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
