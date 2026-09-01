import type { Usuario } from '../../types/trazabilidad'

// Nombre de archivo de firma a partir del nombre del usuario logueado.
function slugFirma(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// Datos del firmante (usuario logueado) para certificados y cronologias.
export function datosFirmante(usuario: Usuario | null): {
  archivoFirma: string
  nombre: string
} {
  const nombre =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ').trim() ||
    usuario?.email ||
    ''
  const slug = slugFirma(nombre)
  return {
    archivoFirma: slug ? `/firmas/${slug}.png` : '',
    nombre,
  }
}
