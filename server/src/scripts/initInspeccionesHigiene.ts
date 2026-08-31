import { pool, query } from '../db.js'

// Crea la tabla de inspecciones de higiene personal del manipulador.
async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS inspecciones_higiene (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' operario       VARCHAR(150) NOT NULL,' +
      ' evaluacion     VARCHAR(200),' +
      ' mes            VARCHAR(20),' +
      ' anio           VARCHAR(10),' +
      " semanas        JSONB NOT NULL DEFAULT '[]'::jsonb," +
      ' observacion    TEXT,' +
      ' firma          VARCHAR(150),' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now()' +
      ')',
  )

  console.log('Tabla inspecciones_higiene lista')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
