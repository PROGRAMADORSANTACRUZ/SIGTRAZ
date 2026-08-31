import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout, adminNavGroups, agropecuariaNavGroups } from './components/Layout'
import { RequireAuth, RequireEmpresa, RequireAdmin } from './components/RequireAuth'
import { Dashboard } from './pages/Dashboard'

import { Asistente } from './pages/Asistente'
import { Documentos } from './pages/Documentos'
import { Entradas } from './pages/Entradas'
import { Acondicionamiento } from './pages/Acondicionamiento'
import { Salida } from './pages/Salida'
import { Devolucion } from './pages/Devolucion'
import { SolicitudCredito } from './pages/SolicitudCredito'
import { VinculacionClientes } from './pages/VinculacionClientes'
import { RegistroProveedores } from './pages/RegistroProveedores'
import { RegistroActualizacionProveedores } from './pages/RegistroActualizacionProveedores'
import { EdicionesLog } from './pages/EdicionesLog'
import { InspeccionVehiculo } from './pages/InspeccionVehiculo'
import { VerificacionPoes } from './pages/VerificacionPoes'
import { VerificacionLyd } from './pages/VerificacionLyd'
import { TiposSuesdr } from './pages/TiposSuesdr'
import { TiposLyd } from './pages/TiposLyd'
import { PuntosVenta } from './pages/PuntosVenta'
import { Personal } from './pages/Personal'
import { MonitoreoAguaPotable } from './pages/MonitoreoAguaPotable'
import { MonitoreoTemperatura } from './pages/MonitoreoTemperatura'
import { ResiduosSolidos } from './pages/ResiduosSolidos'
import { ResiduosReciclables } from './pages/ResiduosReciclables'
import { HigienePersonal } from './pages/HigienePersonal'
import { TrazabilidadEntrada } from './pages/TrazabilidadEntrada'
import { TrazabilidadAcondicionamiento } from './pages/TrazabilidadAcondicionamiento'
import { TrazabilidadSalida } from './pages/TrazabilidadSalida'
import { Login } from './pages/Login'
import { Movimientos } from './pages/Movimientos'
import { Productos } from './pages/Productos'
import { Proveedores } from './pages/Proveedores'
import { Clientes } from './pages/Clientes'
import { FichasTecnicas } from './pages/FichasTecnicas'
import { CuartosFrios } from './pages/CuartosFrios'
import { Colaboradores } from './pages/Colaboradores'
import { Usuarios } from './pages/Usuarios'
import { Empresas } from './pages/Empresas'
import { AgroDashboard } from './pages/agropecuaria/AgroDashboard'
import { CertificadoDecomiso } from './pages/agropecuaria/CertificadoDecomiso'
import { AnteMortem } from './pages/agropecuaria/AnteMortem'
import { Cronologia } from './pages/agropecuaria/Cronologia'
import { PosMortem } from './pages/agropecuaria/PosMortem'
import { CurvaTemperaturaCanales } from './pages/agropecuaria/CurvaTemperaturaCanales'
import { Certificado } from './pages/agropecuaria/Certificado'
import { Informes } from './pages/agropecuaria/Informes'
import { Datos } from './pages/agropecuaria/Datos'
import { Clientes as ClientesAgro } from './pages/agropecuaria/Clientes'
import { Sucursales } from './pages/agropecuaria/Sucursales'
import { Firmantes } from './pages/agropecuaria/Firmantes'
import { MovimientosLog } from './pages/agropecuaria/MovimientosLog'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/t/:id', element: <TrazabilidadEntrada /> },
  { path: '/ta/:id', element: <TrazabilidadAcondicionamiento /> },
  { path: '/ts/:id', element: <TrazabilidadSalida /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/empresas', element: <Empresas /> },
      {
        element: <RequireEmpresa empresa="CARNES SANTACRUZ" />,
        children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'entradas', element: <Entradas /> },
          { path: 'acondicionamiento', element: <Acondicionamiento /> },
          { path: 'salida', element: <Salida /> },
          { path: 'devolucion', element: <Devolucion /> },
          { path: 'ediciones-log', element: <EdicionesLog /> },
          { path: 'movimientos', element: <Movimientos /> },
          { path: 'productos', element: <Productos /> },
          { path: 'proveedores', element: <Proveedores /> },
          { path: 'clientes', element: <Clientes /> },
          { path: 'fichas-tecnicas', element: <FichasTecnicas /> },
          { path: 'cuartos-frios', element: <CuartosFrios /> },
          { path: 'colaboradores', element: <Colaboradores /> },
          { path: 'acciones', element: <Navigate to="/" replace /> },
          { path: 'activos', element: <Navigate to="/" replace /> },
          { path: 'formacion', element: <Navigate to="/" replace /> },
          { path: 'plantillas', element: <Navigate to="/" replace /> },
          { path: 'inspecciones', element: <Navigate to="/" replace /> },
          { path: 'programas', element: <Navigate to="/" replace /> },
          { path: 'asistente', element: <Asistente /> },
          { path: 'contratistas', element: <Navigate to="/" replace /> },
          { path: 'biblioteca', element: <Navigate to="/" replace /> },
          { path: 'documentos', element: <Documentos /> },
          { path: 'inspeccion-vehiculo', element: <InspeccionVehiculo /> },
          { path: 'verificacion-poes', element: <VerificacionPoes /> },
          { path: 'verificacion-lyd', element: <VerificacionLyd /> },
          { path: 'tipos-suesdr', element: <TiposSuesdr /> },
          { path: 'tipos-lyd', element: <TiposLyd /> },
          { path: 'puntos-venta', element: <PuntosVenta /> },
          { path: 'personal', element: <Personal /> },
          { path: 'monitoreo-agua', element: <MonitoreoAguaPotable /> },
          { path: 'monitoreo-temperatura', element: <MonitoreoTemperatura /> },
          { path: 'residuos-solidos', element: <ResiduosSolidos /> },
          { path: 'residuos-reciclables', element: <ResiduosReciclables /> },
          { path: 'higiene-personal', element: <HigienePersonal /> },
          { path: 'contratiempos', element: <Navigate to="/" replace /> },
          { path: 'investigaciones', element: <Navigate to="/" replace /> },
          { path: 'trabajador-solitario', element: <Navigate to="/" replace /> },
          { path: 'avisos', element: <Navigate to="/" replace /> },
          { path: 'sensores', element: <Navigate to="/" replace /> },
          { path: 'estadisticas', element: <Navigate to="/" replace /> },
          { path: 'lotes', element: <Navigate to="/" replace /> },
          { path: 'lotes/:id', element: <Navigate to="/" replace /> },
          { path: 'mercado', element: <Navigate to="/" replace /> },
        ],
      },
        ],
      },
      {
        element: <RequireEmpresa empresa="AGROPECUARIA SANTACRUZ" />,
        children: [
      {
        path: '/agropecuaria',
        element: (
          <Layout
            groups={agropecuariaNavGroups}
            titulo="Agropecuaria"
            subtitulo="Planta de proceso"
            mostrarPuntoVenta={false}
          />
        ),
        children: [
          { index: true, element: <AgroDashboard /> },
          {
            path: 'sacrificio',
            element: <AnteMortem />,
          },
          {
            path: 'cronologia',
            element: <Cronologia />,
          },
          {
            path: 'pos-mortem',
            element: <PosMortem />,
          },
          {
            path: 'certificado-decomiso',
            element: <CertificadoDecomiso />,
          },
          {
            path: 'curva-canales',
            element: <CurvaTemperaturaCanales />,
          },
          {
            path: 'certificado',
            element: <Certificado />,
          },
          {
            path: 'informes',
            element: <Informes />,
          },
          {
            path: 'datos',
            element: <Datos />,
          },
          {
            path: 'clientes',
            element: <ClientesAgro />,
          },
          {
            path: 'sucursales',
            element: <Sucursales />,
          },
          {
            path: 'firmantes',
            element: <Firmantes />,
          },
          {
            path: 'log',
            element: <MovimientosLog />,
          },
        ],
      },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
      {
        path: '/admin',
        element: (
          <Layout
            groups={adminNavGroups}
            titulo="Administracion"
            subtitulo="Usuarios y creditos"
            mostrarPuntoVenta={false}
          />
        ),
        children: [
          { index: true, element: <Usuarios /> },
          { path: 'usuarios', element: <Usuarios /> },
          { path: 'solicitud-credito', element: <SolicitudCredito /> },
          { path: 'vinculacion-clientes', element: <VinculacionClientes /> },
          { path: 'registro-proveedores', element: <RegistroProveedores /> },
          {
            path: 'registro-actualizacion-proveedores',
            element: <RegistroActualizacionProveedores />,
          },
        ],
      },
        ],
      },
    ],
  },
])
