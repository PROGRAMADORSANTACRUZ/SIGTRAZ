import { pool, query } from '../db.js'

// Crea la tabla de catalogos LYD (Limpieza y Desinfeccion) y precarga
// los valores base. tipo: superficie | frecuencia
const SEED: Record<string, string[]> = {
  superficie: [
    'BARRILES',
    'FREIDORA',
    'ESTUFA',
    'HORNOS',
    'CAMPANA EXTRACTORA',
    'OREADOR',
    'LICUADORA',
    'MICROONDAS',
    'VITRINAS CALENTADORAS',
    'BASCULAS',
    'GANCHOS DE BARRILES',
    'MESONES',
    'PORTACUCHILLO',
    'TABLAS',
    'UTENSILIOS',
    'MENAJE DE COCINA',
    'TRAMPA GRASA',
    'PAREDES DE COCINA Y PROCESO',
    'PISOS DE COCINA Y PROCESO',
    'REFRIGERADORES',
    'CONGELADORES',
    'NEVERAS VERTICALES',
    'PAREDES AREA CLIENTES',
    'PISOS AREA CLIENTES',
    'TECHOS AREA CLIENTES',
    'MESAS Y SILLAS CLIENTES',
    'CUARTO DE INSUMOS',
    'CAJAS REGISTRADORAS',
    'CONTENEDORES DE BASURA',
    'COMEDOR DE EMPLEADOS',
    'ZONA DE VESTIERES',
  ],
  frecuencia: ['DIARIO', 'SEMANAL', 'BIMESTRAL', 'QUINCENAL'],
}

async function main() {
  await query(
    'CREATE TABLE IF NOT EXISTS catalogos_lyd (' +
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
        'INSERT INTO catalogos_lyd (tipo, nombre) VALUES ($1,$2)' +
          ' ON CONFLICT (tipo, nombre) DO NOTHING',
        [tipo, nombre.toUpperCase()],
      )
    }
  }

  console.log('Tabla catalogos_lyd lista y precargada')
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
