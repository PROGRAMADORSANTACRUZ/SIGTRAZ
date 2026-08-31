import { pool, query } from '../db.js'

// Crea la tabla de catalogos S.U.E.S.D.R y precarga los valores base.
// tipo: superficie | sustancia | dosificacion | realizado
const SEED: Record<string, string[]> = {
  superficie: [
    'TABLAS, MESONES',
    'CUCHILLOS, PORTACUCHILLOS',
    'UTENCILIOS DE ASADERO',
    'GUANTES Y MANOS',
    'DELANTALES',
    'MOLINO Y SIERRA',
  ],
  sustancia: [
    'DEGRATEC-BIQUAT',
    'DEGRATEC-SANICHLOR',
    'DEGRATEC 25-SANICHLOR',
    'CITROSAM',
    'JABON ANTIBACTERIAL',
  ],
  dosificacion: [
    '10ML X L',
    '10ML-2ML X L',
    '10ML-6ML X L',
    '10-6ML X L',
    '2,5ML X L',
    'PURO',
  ],
  realizado: [
    'AUX. L Y D',
    'AUX. COCINA',
    'AUX. CARNICOS Y CAJERAS',
    'AUX. CARNICOS',
  ],
}

async function main() {
  // Elimina la tabla combinada anterior si existia.
  await query('DROP TABLE IF EXISTS tipos_suesdr')

  await query(
    'CREATE TABLE IF NOT EXISTS catalogos_suesdr (' +
      ' id             SERIAL PRIMARY KEY,' +
      ' tipo           VARCHAR(20) NOT NULL,' +
      ' nombre         VARCHAR(200) NOT NULL,' +
      ' fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),' +
      ' UNIQUE (tipo, nombre)' +
      ')',
  )

  for (const [tipo, nombres] of Object.entries(SEED)) {
    for (const nombre of nombres) {
      await query(
        'INSERT INTO catalogos_suesdr (tipo, nombre) VALUES ($1,$2)' +
          ' ON CONFLICT (tipo, nombre) DO NOTHING',
        [tipo, nombre.toUpperCase()],
      )
    }
  }

  console.log('Tabla catalogos_suesdr lista y precargada')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
