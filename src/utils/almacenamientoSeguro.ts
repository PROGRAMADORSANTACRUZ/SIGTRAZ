import { almacenamientoDatos } from '../services/almacenamientoDatos'

export function guardarDatos(clave: string, valor: string): void {
  almacenamientoDatos.setItem(clave, valor)
}
