// Catalogos de Sucursales y Firmantes de Agropecuaria. Se guardan en
// localStorage con prefijo agro_ para que se sincronicen entre dispositivos
// (ver src/services/agroSync.ts). El Certificado de calidad usa ambos.

export interface Sucursal {
  id: string
  nombre: string
  empresa: string
  direccion: string
  ciudad: string
  telefono: string
  // Nombre de la sucursal principal a la que pertenece (vacío si es principal).
  principal?: string
}

export interface Firmante {
  id: string
  nombre: string
  cargo: string
  sucursal: string
}

const SUCURSALES_KEY = 'agro_sucursales'
const FIRMANTES_KEY = 'agro_firmantes'

export function cargarSucursales(): Sucursal[] {
  try {
    const raw = localStorage.getItem(SUCURSALES_KEY)
    if (raw) {
      const lista = JSON.parse(raw) as Sucursal[]
      return lista.map((s) => ({
        ...s,
        empresa: s.empresa ?? '',
        ciudad: s.ciudad ?? '',
        principal: s.principal ?? '',
      }))
    }
  } catch {
    // datos corruptos: se ignora
  }
  return []
}

export function guardarSucursales(lista: Sucursal[]): void {
  localStorage.setItem(SUCURSALES_KEY, JSON.stringify(lista))
}

// Catalogo base de sucursales de SUPERTIENDAS Y DROGUERIA OLIMPICA. Se versiona
// en el codigo para que este disponible sin captura manual y se inserta de
// forma idempotente (por nombre) mediante asegurarBaseOlimpica().
export const FIRMADOR_OLIMPICA = 'SUPERTIENDAS Y DROGUERIA OLIMPICA'

const BASE_OLIMPICA: [nombre: string, direccion: string, ciudad: string][] = [
  ['STO 101 BADILLO', 'Cl 1 35-36', 'CARTAGENA'],
  ['STO 102 MATUNA', 'Cr 9 A 32-57', 'CARTAGENA'],
  ['SAO 105 LA PLAZUELA', 'Dg 31 71-130', 'CARTAGENA'],
  ['STO 106 TORICES', 'Cr 17 38A Torice', 'CARTAGENA'],
  ['STO 107 PIE DE LA POPA', 'AV.PEDRO HEREDIA  CC OMNIPLAZA', 'CARTAGENA'],
  ['STO 108 CRISANTO LUQUE', 'Av CRISANTO Dg.22 50-06', 'CARTAGENA'],
  ['STO 109 BUENOS AIRES', 'Tv 54 41-241', 'CARTAGENA'],
  ['STO 110 BLAS DE LEZO', 'Cr 3 ESTE 20A-19 SUR', 'CARTAGENA'],
  ['SAO 112 SAN FELIPE', 'Cl 29B 17-109', 'CARTAGENA'],
  ['STO 113 TRECE DE JUNIO', 'Dg 32 70-33', 'CARTAGENA'],
  ['STO 115 OUTLET BOSQUE', 'Tv 53A 29E-44', 'CARTAGENA'],
  ['STO 116 ARJONA', 'Cr 14 49-35', 'ARJONA'],
  ['STO 117 TURBACO', 'Av Pastrana Cl Real', 'TURBACO'],
  ['STO 118 PEDRO DE HEREDIA', 'Av. Pedro de Heredia Barrio Al', 'CARTAGENA'],
  ['STO 119 LOS CAMPANOS', 'Cl 35 Cr 100 Esq', 'CARTAGENA'],
  ['STO 120 SAN FERNANDO', 'Cl 83 22B-234', 'CARTAGENA'],
  ['STO 122 CARMELO', 'Cr 71 Mz 3-112', 'CARTAGENA'],
  ['STO 123 CAMPESTRE', 'Cl 10 57-204 L2', 'CARTAGENA'],
  ['STO 124 CASTELLANA MALL', 'Cl 30 CC CASTELLANA MALL 65-20', 'CARTAGENA'],
  ['STO 126 PARQUE HEREDIA', 'CC PARQUE HEREDIA Dg 32 80-547', 'CARTAGENA'],
  ['SAO 127 GRAN MANZANA', 'TRV 54  LC A01 91-95', 'CARTAGENA'],
  ['STO 128 TURBACO PLAZA 90', 'CC PLAZA 90 CL 27 Cr 30 LC-01', 'TURBACO'],
  ['STO 129 MANGA', 'Cl 26 18B-64', 'CARTAGENA'],
  ['STO 609 BAZURTO', 'Cl 32 26-104', 'CARTAGENA'],
  ['STO 201 CENTRO', 'Cl 11 8-54', 'SANTA MARTA'],
  ['STO 202 RODADERO', 'Cr 4 13-58 Roda', 'SANTA MARTA'],
  ['SAO 203 SANTAMARTA', 'Cr 23 7-150', 'SANTA MARTA'],
  ['STO 205 RECORD', 'Cr 9 10-41', 'SANTA MARTA'],
  ['STO 206 SANTAMARTA', 'Cl 30 30-36', 'SANTA MARTA'],
  ['STO 208 TERMINAL SANTA MARTA', 'Cl 34 20-10', 'SANTA MARTA'],
  ['STO 209 GAIRA', 'Cl 6 13-26', 'SANTA MARTA'],
  ['STO 214 MANZANARES Cl 30', 'Cl 30 6A-97', 'SANTA MARTA'],
  ['STO 216 MINCA', 'Cr 49 La Bella Concepcion 53-6', 'SANTA MARTA'],
  ['STO 217 LA BONGA', 'Cr 16 7-39', 'SANTA MARTA'],
  ['STO 231 BAVARIA', 'Cl 17 24-33', 'SANTA MARTA'],
  ['STO 232 ALUNA', 'Cl 17 24-33', 'SANTA MARTA'],
  ['STO 223 MAMATOCO', 'Cl 29 51-51', 'SANTA MARTA'],
  ['STO 702 CLINICA MAR CARIBE', 'Cl 22 18A-120', 'SANTA MARTA'],
  ['STO 704 CIENAGA CALLE 17', 'Cl 17 18-56', 'CIENAGA'],
  ['STO 023 LOS ROBLES', 'Cl 77 23 Esq', 'SOLEDAD'],
  ['STO 025 LOS MANGOS', 'Cl 25 37B-10', 'SOLEDAD'],
  ['STO 029 SABANAGRANDE', 'Cl 11 7-42', 'SABANAGRANDE'],
  ['SAO 031 HIPODROMO', 'Cr 30 29A-218', 'SOLEDAD'],
  ['STO034 PALMAR DE VARELA', 'Cl 11 6-35', 'PALMAR DE VARELA'],
  ['STO 008 CAMPITO Cr 8', 'Cl 36B 8 Esq', 'BARRANQUILLA'],
  ['STO 065 MURILLO ESTADIO', 'Cl 45 16A Sur-40', 'BARRANQUILLA'],
  ['STO 063 TERMINAL', 'Cl 63 14 Soledad', 'SOLEDAD'],
  ['STO064 LA CENTRAL', 'Cl 65 4-151', 'SOLEDAD'],
  ['STO 074 CIUDAD DEL PARQUE', 'Cr 12 Cl 73 y 74', 'SOLEDAD'],
  ['STO503 SIMON BOLIVAR', 'Cl 19 4-132', 'BARRANQUILLA'],
  ['STO 016 GALAPA', 'Cr 18 Cl 10', 'GALAPA'],
]

function slugSucursal(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function sucursalesBaseOlimpica(): Sucursal[] {
  return BASE_OLIMPICA.map(([nombre, direccion, ciudad]) => ({
    id: `olim-${slugSucursal(nombre)}`,
    nombre,
    empresa: FIRMADOR_OLIMPICA,
    direccion,
    ciudad,
    telefono: '',
  }))
}

// Inserta las sucursales base que aun no existan (comparando por nombre). No
// duplica ni sobrescribe las ya presentes.
export function asegurarBaseOlimpica(actual: Sucursal[]): {
  lista: Sucursal[]
  agregadas: number
} {
  const existentes = new Set(actual.map((s) => s.nombre.trim().toUpperCase()))
  const faltantes = sucursalesBaseOlimpica().filter(
    (s) => !existentes.has(s.nombre.toUpperCase()),
  )
  if (faltantes.length === 0) return { lista: actual, agregadas: 0 }
  const lista = [...actual, ...faltantes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  )
  return { lista, agregadas: faltantes.length }
}

export function cargarFirmantes(): Firmante[] {
  try {
    const raw = localStorage.getItem(FIRMANTES_KEY)
    if (raw) return JSON.parse(raw) as Firmante[]
  } catch {
    // datos corruptos: se ignora
  }
  return []
}

export function guardarFirmantes(lista: Firmante[]): void {
  localStorage.setItem(FIRMANTES_KEY, JSON.stringify(lista))
}
