import { pool, query } from '../db.js'

// Crea la tabla de evacuacion de residuos reciclables (FOR-CIA-019).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS residuos_reciclables (' +
      ' id                  SERIAL PRIMARY KEY,' +
      ' fecha               DATE,' +
      ' material            VARCHAR(150),' +
      ' cantidad            VARCHAR(50),' +
      ' entidad_recolectora VARCHAR(150),' +
      ' firma_entrega       VARCHAR(150),' +
      ' firma_recibe        VARCHAR(150),' +
      ' observaciones       TEXT,' +
      ' punto_venta_id      INTEGER REFERENCES puntos_venta(id),' +
      ' fecha_creacion      TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  await query(
    'CREATE INDEX IF NOT EXISTS idx_residuos_reciclables_pdv ON residuos_reciclables (punto_venta_id)',
  )

  console.log('Tabla residuos_reciclables lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
