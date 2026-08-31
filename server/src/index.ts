import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { config } from './config.js'
import { requireAuth, soloAdminElimina } from './auth.js'
import { cargarScopePdv } from './scope.js'
import { query } from './db.js'
import { authRouter } from './routes/auth.js'
import { accionesRouter } from './routes/acciones.js'
import { activosRouter } from './routes/activos.js'
import { formacionesRouter } from './routes/formaciones.js'
import { plantillasRouter } from './routes/plantillas.js'
import { inspeccionesRouter } from './routes/inspecciones.js'
import { programasRouter } from './routes/programas.js'
import { asistenteRouter } from './routes/asistente.js'
import { contratistasRouter } from './routes/contratistas.js'
import { bibliotecaRouter } from './routes/biblioteca.js'
import { documentosRouter } from './routes/documentos.js'
import { contratiemposRouter } from './routes/contratiempos.js'
import { investigacionesRouter } from './routes/investigaciones.js'
import { trabajadoresSolitariosRouter } from './routes/trabajadoresSolitarios.js'
import { avisosRouter } from './routes/avisos.js'
import { sensoresRouter } from './routes/sensores.js'
import { mercadoRouter } from './routes/mercado.js'
import { estadisticasRouter } from './routes/estadisticas.js'
import { entradasRouter } from './routes/entradas.js'
import { trazabilidadRouter } from './routes/trazabilidad.js'
import { acondicionamientoRouter } from './routes/acondicionamiento.js'
import { salidasRouter } from './routes/salidas.js'
import { devolucionesRouter } from './routes/devoluciones.js'
import { solicitudesCreditoRouter } from './routes/solicitudesCredito.js'
import { vinculacionClientesRouter } from './routes/vinculacionClientes.js'
import { registroProveedoresRouter } from './routes/registroProveedores.js'
import { registroActualizacionProveedoresRouter } from './routes/registroActualizacionProveedores.js'
import { inspeccionesVehiculoRouter } from './routes/inspeccionesVehiculo.js'
import { verificacionesPoesRouter } from './routes/verificacionesPoes.js'
import { catalogosSuesdrRouter } from './routes/catalogosSuesdr.js'
import { catalogosLydRouter } from './routes/catalogosLyd.js'
import { puntosVentaRouter } from './routes/puntosVenta.js'
import { personalRouter } from './routes/personal.js'
import { monitoreoAguaRouter } from './routes/monitoreoAgua.js'
import { residuosRouter } from './routes/residuos.js'
import { residuosReciclablesRouter } from './routes/residuosReciclables.js'
import { monitoreoTemperaturaRouter } from './routes/monitoreoTemperatura.js'
import { inspeccionesHigieneRouter } from './routes/inspeccionesHigiene.js'
import { verificacionesLydRouter } from './routes/verificacionesLyd.js'
import { fichasRouter } from './routes/fichas.js'
import { cuartosRouter } from './routes/cuartos.js'
import { productosRouter } from './routes/productos.js'
import { colaboradoresRouter } from './routes/colaboradores.js'
import { proveedoresRouter } from './routes/proveedores.js'
import { clientesRouter } from './routes/clientes.js'
import { usuariosRouter } from './routes/usuarios.js'
import { edicionesLogRouter } from './routes/edicionesLog.js'
import { agroKvRouter } from './routes/agroKv.js'
import { sesionesRouter } from './routes/sesiones.js'

const app = express()

// Origenes permitidos: los definidos en CORS_ORIGIN (lista separada por comas)
// mas cualquier dispositivo de la red local en el puerto 5173, para poder abrir
// la app desde el celular por WiFi sin configurar la IP a mano.
const origenesPermitidos = config.corsOrigin.split(',').map((o) => o.trim())
const lanEnDesarrollo =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.[\d.]+|172\.(1[6-9]|2\d|3[01])\.[\d.]+|192\.168\.[\d.]+):5173$/
app.use(
  cors({
    origin(origin, cb) {
      // Peticiones sin origen (apps nativas, curl) o de origenes permitidos.
      if (
        !origin ||
        origenesPermitidos.includes('*') ||
        origenesPermitidos.includes(origin) ||
        lanEnDesarrollo.test(origin)
      ) {
        cb(null, true)
        return
      }
      cb(new Error('Origen no permitido por CORS'))
    },
  }),
)
app.use(express.json({ limit: '10mb' }))

// Solo el rol Administrador puede eliminar (cualquier peticion DELETE).
app.use(soloAdminElimina)

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
app.use('/api/trazabilidad', trazabilidadRouter)

// Rutas protegidas (requieren token JWT)
app.use('/api/productos', requireAuth, cargarScopePdv, productosRouter)
app.use('/api/entradas', requireAuth, cargarScopePdv, entradasRouter)
app.use('/api/acondicionamiento', requireAuth, cargarScopePdv, acondicionamientoRouter)
app.use('/api/salidas', requireAuth, cargarScopePdv, salidasRouter)
app.use('/api/devoluciones', requireAuth, cargarScopePdv, devolucionesRouter)
app.use('/api/solicitudes-credito', requireAuth, solicitudesCreditoRouter)
app.use('/api/vinculacion-clientes', requireAuth, vinculacionClientesRouter)
app.use('/api/registro-proveedores', requireAuth, registroProveedoresRouter)
app.use(
  '/api/registro-actualizacion-proveedores',
  requireAuth,
  registroActualizacionProveedoresRouter,
)
app.use('/api/inspecciones-vehiculo', requireAuth, cargarScopePdv, inspeccionesVehiculoRouter)
app.use('/api/verificaciones-poes', requireAuth, cargarScopePdv, verificacionesPoesRouter)
app.use('/api/catalogos-suesdr', requireAuth, cargarScopePdv, catalogosSuesdrRouter)
app.use('/api/catalogos-lyd', requireAuth, cargarScopePdv, catalogosLydRouter)
app.use('/api/puntos-venta', requireAuth, puntosVentaRouter)
app.use('/api/personal', requireAuth, cargarScopePdv, personalRouter)
app.use('/api/monitoreo-agua', requireAuth, cargarScopePdv, monitoreoAguaRouter)
app.use('/api/residuos-solidos', requireAuth, cargarScopePdv, residuosRouter)
app.use('/api/residuos-reciclables', requireAuth, cargarScopePdv, residuosReciclablesRouter)
app.use('/api/monitoreo-temperatura', requireAuth, cargarScopePdv, monitoreoTemperaturaRouter)
app.use('/api/inspecciones-higiene', requireAuth, cargarScopePdv, inspeccionesHigieneRouter)
app.use('/api/verificaciones-lyd', requireAuth, cargarScopePdv, verificacionesLydRouter)
app.use('/api/proveedores', requireAuth, cargarScopePdv, proveedoresRouter)
app.use('/api/clientes', requireAuth, cargarScopePdv, clientesRouter)
app.use('/api/fichas', requireAuth, cargarScopePdv, fichasRouter)
app.use('/api/cuartos-frios', requireAuth, cargarScopePdv, cuartosRouter)
app.use('/api/colaboradores', requireAuth, cargarScopePdv, colaboradoresRouter)
app.use('/api/usuarios', requireAuth, usuariosRouter)
app.use('/api/acciones', requireAuth, accionesRouter)
app.use('/api/activos', requireAuth, activosRouter)
app.use('/api/formaciones', requireAuth, formacionesRouter)
app.use('/api/plantillas', requireAuth, plantillasRouter)
app.use('/api/inspecciones', requireAuth, inspeccionesRouter)
app.use('/api/programas', requireAuth, programasRouter)
app.use('/api/asistente', requireAuth, asistenteRouter)
app.use('/api/contratistas', requireAuth, contratistasRouter)
app.use('/api/biblioteca', requireAuth, bibliotecaRouter)
app.use('/api/documentos', requireAuth, documentosRouter)
app.use('/api/contratiempos', requireAuth, contratiemposRouter)
app.use('/api/investigaciones', requireAuth, investigacionesRouter)
app.use('/api/trabajadores-solitarios', requireAuth, trabajadoresSolitariosRouter)
app.use('/api/avisos', requireAuth, avisosRouter)
app.use('/api/sensores', requireAuth, sensoresRouter)
app.use('/api/mercado', requireAuth, mercadoRouter)
app.use('/api/estadisticas', requireAuth, estadisticasRouter)
app.use('/api/ediciones-log', requireAuth, edicionesLogRouter)
app.use('/api/agro-kv', requireAuth, agroKvRouter)
app.use('/api/sesiones', requireAuth, sesionesRouter)

// Manejador de errores centralizado
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no controlado:', err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(config.port, () => {
  console.log(`API SIGTRAZ escuchando en http://localhost:${config.port}`)
})
