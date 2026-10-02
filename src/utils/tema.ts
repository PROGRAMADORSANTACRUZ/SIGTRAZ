import { almacenamientoDatos } from '../services/almacenamientoDatos'
// Manejo del tema claro/oscuro. El tema se guarda en almacenamientoDatos y se aplica
// agregando/quitando la clase `dark` en <html> (Tailwind darkMode: 'class').
const CLAVE = 'sigtraz_tema'

export type Tema = 'claro' | 'oscuro'

export function temaGuardado(): Tema {
  return almacenamientoDatos.getItem(CLAVE) === 'oscuro' ? 'oscuro' : 'claro'
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'oscuro')
  almacenamientoDatos.setItem(CLAVE, tema)
}

// Se llama al arrancar la app, antes de renderizar, para evitar parpadeo.
export function aplicarTemaInicial(): void {
  document.documentElement.classList.toggle('dark', temaGuardado() === 'oscuro')
}
