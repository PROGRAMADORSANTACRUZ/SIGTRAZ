import { pool, query } from '../db.js'

// Crea la tabla de evacuacion de residuos solidos (FOR-CIA-018).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS residuos_solidos (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' fecha          DATE,' +
      ' hora_recaudo   VARCHAR(20),' +
      ' placa_vehiculo VARCHAR(20),' +
      ' kg_bolsas      VARCHAR(30),' +
      ' firma          VARCHAR(150),' +
      ' observaciones  TEXT,' +
      ' punto_venta_id INTEGER REFERENCES puntos_venta(id),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  await query(
    'CREATE INDEX IF NOT EXISTS idx_residuos_solidos_pdv ON residuos_solidos (punto_venta_id)',
  )

  console.log('Tabla residuos_solidos lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
