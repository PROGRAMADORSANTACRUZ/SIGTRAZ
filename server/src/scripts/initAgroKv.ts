import { pool, query } from '../db.js'

// Almacen clave-valor para sincronizar entre dispositivos los datos de los
// modulos de Agropecuaria que hasta ahora vivian solo en localStorage
// (agro_antemortem, agro_certificados, agro_cronologia, catalogos, etc.).
// Cada clave de localStorage se refleja aqui como una fila JSONB.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS agro_kv (' +
      ' clave                VARCHAR(200) PRIMARY KEY,' +
      ' valor                JSONB NOT NULL,' +
      ' fecha_actualizacion  TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  console.log('Tabla agro_kv lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
