// Escribe en localStorage sin romper la app si se llena la cuota (QuotaExceededError).
export function guardarLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch (error) {
    const esCuotaLlena =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22)
    if (esCuotaLlena) {
      console.error('Almacenamiento local lleno al guardar la clave', clave, error)
      alert(
        'El almacenamiento del navegador esta lleno y no se pudo guardar "' +
          clave +
          '". Elimina fotos o registros antiguos (sobre todo en Certificados de decomiso) y vuelve a intentar.',
      )
    } else {
      throw error
    }
  }
}
