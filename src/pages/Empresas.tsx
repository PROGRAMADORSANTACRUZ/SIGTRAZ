import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

interface Empresa {
  nombre: string
  ruta?: string
  proximamente?: boolean
  logo?: string
}

const EMPRESAS: Empresa[] = [
  { nombre: 'CARNES SANTACRUZ', ruta: '/', logo: '/logos/carnes-santacruz.png' },
  {
    nombre: 'AGROPECUARIA SANTACRUZ',
    ruta: '/agropecuaria',
    logo: '/logos/agropecuaria-santacruz.png',
  },
  {
    nombre: 'INVERSIONES SERRANO MILLAN',
    proximamente: true,
    logo: '/logos/inversiones-serrano-millan.png',
  },
  { nombre: 'ADMINISTRACION', ruta: '/admin' },
]

export function Empresas() {
  const navigate = useNavigate()
  const { usuario, logout } = useAuth()

  const esAdmin = usuario?.rol === 'Administrador'

  // Un Administrador ve todas las empresas y la administracion. El resto de
  // usuarios solo ve la empresa a la que pertenece (sin administracion).
  const empresasVisibles = EMPRESAS.filter((empresa) => {
    if (empresa.nombre === 'ADMINISTRACION') return esAdmin
    if (esAdmin) return true
    return empresa.nombre === usuario?.empresa
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-900">
            SIGTRAZ
          </h1>
          <p className="text-sm text-slate-500">Selecciona una empresa</p>
        </div>
        <div className="flex items-center gap-4">
          {usuario?.nombre && (
            <span className="hidden text-sm text-slate-600 sm:block">
              {usuario.nombre}
            </span>
          )}
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar sesion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <div className="grid grid-cols-2 gap-4">
          {empresasVisibles.map((empresa) => {
            const activa = !empresa.proximamente && !!empresa.ruta
            return (
              <button
                key={empresa.nombre}
                type="button"
                disabled={!activa}
                onClick={() => activa && navigate(empresa.ruta!)}
                className={`group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition ${
                  activa
                    ? 'cursor-pointer border-slate-900 bg-white hover:border-brand-600 hover:shadow-lg'
                    : 'cursor-not-allowed border-slate-300 bg-slate-100'
                }`}
              >
                {empresa.logo && (
                  <img
                    src={empresa.logo}
                    alt={empresa.nombre}
                    className={`max-h-24 w-auto object-contain ${activa ? '' : 'opacity-40 grayscale'}`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span
                  className={`font-display text-xs font-semibold uppercase tracking-wide ${
                    activa ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {empresa.nombre}
                </span>
                {empresa.proximamente && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    Proximamente
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
