import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { config } from './config.js'
import { requireAuth } from './auth.js'
import { query } from './db.js'
import { authRouter } from './routes/auth.js'
import { entradasRouter } from './routes/entradas.js'
import { productosRouter } from './routes/productos.js'
import { usuariosRouter } from './routes/usuarios.js'

const app = express()

app.use(cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1 AS ok')
    res.json({ status: 'ok', db: 'conectado' })
  } catch {
    res.status(503).json({ status: 'degradado', db: 'sin conexion' })
  }
})

// Rutas publicas
app.use('/api/auth', authRouter)

// Rutas protegidas (requieren token JWT)
app.use('/api/productos', requireAuth, productosRouter)
app.use('/api/entradas', requireAuth, entradasRouter)
app.use('/api/usuarios', requireAuth, usuariosRouter)

// Manejador de errores centralizado
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(config.port, () => {
  console.log(`API SIGTRAZ escuchando en http://localhost:${config.port}`)
})
