import { pool, query } from '../db.js'

// Crea la tabla de colaboradores (personas que ayudan a realizar entradas
// cuando el personal de calidad no esta en el punto de venta). Cada
// colaborador queda amarrado a un punto de venta (punto_venta_id).
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS colaboradores (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' nombre         VARCHAR(200) NOT NULL,' +
      ' documento      VARCHAR(50),' +
      ' telefono       VARCHAR(50),' +
      ' cargo          VARCHAR(150),' +
      ' activo         BOOLEAN NOT NULL DEFAULT true,' +
      ' punto_venta_id INTEGER REFERENCES puntos_venta(id),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )
  await query(
    'CREATE INDEX IF NOT EXISTS idx_colaboradores_pdv ON colaboradores (punto_venta_id)',
  )

  console.log('Tabla colaboradores lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
