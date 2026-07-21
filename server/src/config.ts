import 'dotenv/config'

function requerido(nombre: string, valorPorDefecto?: string): string {
  const valor = process.env[nombre] ?? valorPorDefecto
  if (valor === undefined) {
    throw new Error(`Falta la variable de entorno ${nombre}`)
  }
  return valor
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? 'cambia-esta-clave-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  seedPassword: process.env.SEED_PASSWORD ?? 'sigtraz123',
  db: {
    host: requerido('DB_HOST', 'localhost'),
    port: Number(process.env.DB_PORT ?? 5432),
    database: requerido('DB_DATABASE', 'sigtraz'),
    user: requerido('DB_USER', 'postgres'),
    password: requerido('DB_PASSWORD', ''),
  },
}
