import { pool, query } from '../db.js'

// Convierte los catalogos Tipos V.POES (suesdr), Tipos LYD y Personal en datos
// globales compartidos por todos los puntos de venta (punto_venta_id = NULL).

async function globalizarCatalogo(tabla: string) {
  // Elimina duplicados por (tipo, nombre) conservando el id mas bajo.
  await query(
    `DELETE FROM ${tabla} a USING ${tabla} b
     WHERE a.id > b.id AND a.tipo = b.tipo AND UPPER(a.nombre) = UPPER(b.nombre)`,
  )
  await query(`UPDATE ${tabla} SET punto_venta_id = NULL`)
  await query(
    `ALTER TABLE ${tabla} DROP CONSTRAINT IF EXISTS ${tabla}_tipo_nombre_pdv_key`,
  )
  await query(
    `ALTER TABLE ${tabla} DROP CONSTRAINT IF EXISTS ${tabla}_tipo_nombre_key`,
  )
  await query(
    `ALTER TABLE ${tabla} ADD CONSTRAINT ${tabla}_tipo_nombre_key UNIQUE (tipo, nombre)`,
  )
  console.log(`  ${tabla}: global (UNIQUE tipo, nombre)`)
}

async function main() {
  await globalizarCatalogo('catalogos_suesdr')
  await globalizarCatalogo('catalogos_lyd')

  // Personal: quita duplicados por cedula y lo vuelve global.
  await query(
    `DELETE FROM personal a USING personal b
     WHERE a.id > b.id AND UPPER(a.cedula) = UPPER(b.cedula)`,
  )
  await query('UPDATE personal SET punto_venta_id = NULL')
  console.log('  personal: global (sin filtro por PDV)')

  console.log('Catalogos Tipos V.POES, Tipos LYD y Personal ahora son globales')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
