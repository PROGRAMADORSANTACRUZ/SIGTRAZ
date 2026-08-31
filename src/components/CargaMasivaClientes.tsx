import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { api, type FilaCargaCliente, type ResultadoCarga } from '../services/api'

interface Props {
  onCerrar: () => void
  onCargado: () => void
}

// Normaliza un encabezado: minusculas, sin acentos ni signos.
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// Mapea un encabezado del archivo al campo interno.
function campoDe(encabezado: string): keyof FilaCargaCliente | null {
  const h = normalizar(encabezado)
  if (['nit', 'cedula', 'nitcedula', 'documento', 'cc'].includes(h)) return 'nit'
  if (['nombre', 'nombres', 'cliente', 'razonsocial'].includes(h))
    return 'nombre'
  if (['apellidos', 'apellido'].includes(h)) return 'apellidos'
  if (['direccion'].includes(h)) return 'direccion'
  if (['referencia', 'ref'].includes(h)) return 'referencia'
  if (['barrio'].includes(h)) return 'barrio'
  if (['ciudad', 'municipio'].includes(h)) return 'ciudad'
  if (['telefono', 'tel', 'celular', 'movil'].includes(h)) return 'telefono'
  if (['correo', 'email', 'mail'].includes(h)) return 'correo'
  if (['puntoventa', 'pdv', 'punto'].includes(h)) return 'puntoVenta'
  if (['activo'].includes(h)) return 'activo'
  if (['horeca'].includes(h)) return 'horeca'
  if (['diasdespach', 'diasdespacho', 'despacho', 'dias'].includes(h))
    return 'diasDespacho'
  if (['lat', 'latitud'].includes(h)) return 'lat'
  if (['lng', 'lon', 'long', 'longitud'].includes(h)) return 'lng'
  return null
}

// Divide una linea CSV respetando comillas.
function dividirLinea(linea: string, sep: string): string[] {
  const celdas: string[] = []
  let actual = ''
  let entreComillas = false
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]
    if (c === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"'
        i++
      } else {
        entreComillas = !entreComillas
      }
    } else if (c === sep && !entreComillas) {
      celdas.push(actual)
      actual = ''
    } else {
      actual += c
    }
  }
  celdas.push(actual)
  return celdas.map((c) => c.trim())
}

function filaDeCeldas(
  encabezados: (keyof FilaCargaCliente | null)[],
  celdas: string[],
): FilaCargaCliente {
  const fila: FilaCargaCliente = {}
  encabezados.forEach((campo, idx) => {
    if (campo) fila[campo] = (celdas[idx] ?? '').trim()
  })
  return fila
}

function parsearCSV(texto: string): FilaCargaCliente[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lineas.length < 2) return []
  const sep = lineas[0].includes(';') ? ';' : ','
  const encabezados = dividirLinea(lineas[0], sep).map(campoDe)
  const filas: FilaCargaCliente[] = []
  for (let i = 1; i < lineas.length; i++) {
    filas.push(filaDeCeldas(encabezados, dividirLinea(lineas[i], sep)))
  }
  return filas
}

function parsearExcel(datos: ArrayBuffer): FilaCargaCliente[] {
  const libro = XLSX.read(datos, { type: 'array' })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (!hoja) return []
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  })
  if (matriz.length < 2) return []
  const encabezados = matriz[0].map((h) => campoDe(String(h ?? '')))
  const filas: FilaCargaCliente[] = []
  for (let i = 1; i < matriz.length; i++) {
    const celdas = matriz[i]
    if (!celdas || celdas.every((c) => c === undefined || c === '')) continue
    filas.push(filaDeCeldas(encabezados, celdas.map((c) => String(c ?? ''))))
  }
  return filas
}

const PLANTILLA_ENCABEZADOS = [
  'NIT/Cedula',
  'Nombre',
  'Apellidos',
  'Direccion',
  'Referencia',
  'Barrio',
  'Ciudad',
  'Telefono',
  'Correo',
  'Punto Venta',
  'Activo',
  'HORECA',
  'Dias Despach',
  'Lat',
  'Lng',
]
const PLANTILLA_FILAS = [
  [
    '900123456-7',
    'Restaurante El Sabor',
    '',
    'Calle 10 # 5-20',
    'Frente al parque',
    'Centro',
    'Cali',
    '3001112233',
    'contacto@elsabor.com',
    'ALAMEDA 1',
    'Si',
    'Si',
    'Lunes, Miercoles',
    '3.4516',
    '-76.5320',
  ],
]

export function CargaMasivaClientes({ onCerrar, onCargado }: Props) {
  const [filas, setFilas] = useState<FilaCargaCliente[]>([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validas = filas.filter((f) => f.nombre?.trim()).length

  function alSeleccionar(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError(null)
    setResultado(null)
    setNombreArchivo(archivo.name)
    const esExcel = /\.(xlsx|xls)$/i.test(archivo.name)
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const parsed = esExcel
          ? parsearExcel(lector.result as ArrayBuffer)
          : parsearCSV(String(lector.result))
        if (parsed.length === 0) {
          setError('El archivo no contiene filas validas.')
          setFilas([])
        } else {
          setFilas(parsed)
        }
      } catch {
        setError('No se pudo leer el archivo.')
      }
    }
    if (esExcel) lector.readAsArrayBuffer(archivo)
    else lector.readAsText(archivo, 'utf-8')
  }

  function descargarPlantilla() {
    const hoja = XLSX.utils.aoa_to_sheet([
      PLANTILLA_ENCABEZADOS,
      ...PLANTILLA_FILAS,
    ])
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Clientes')
    XLSX.writeFile(libro, 'plantilla-clientes.xlsx')
  }

  async function confirmar() {
    if (validas === 0 || cargando) return
    setCargando(true)
    setError(null)
    try {
      const res = await api.cargaMasivaClientes(filas)
      setResultado(res)
      if (res.creados > 0) onCargado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la carga masiva')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Carga masiva de clientes
            </h3>
            <p className="text-sm text-slate-500">
              Sube un archivo Excel (.xlsx) o CSV con las columnas: NIT/Cedula,
              Nombre, Apellidos, Direccion, Referencia, Barrio, Ciudad, Telefono,
              Correo, Punto Venta, Activo, HORECA, Dias Despach, Lat, Lng.
            </p>
          </div>
          <button
            onClick={descargarPlantilla}
            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Descargar plantilla
          </button>
        </div>

        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={alSeleccionar}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Seleccionar archivo Excel / CSV
          </button>
          {nombreArchivo && (
            <p className="mt-2 text-sm text-slate-600">{nombreArchivo}</p>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {filas.length > 0 && !resultado && (
          <>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-slate-600">
                Filas leidas: <strong>{filas.length}</strong>
              </span>
              <span className="text-emerald-700">
                Validas: <strong>{validas}</strong>
              </span>
              {filas.length - validas > 0 && (
                <span className="text-amber-700">
                  Sin nombre: <strong>{filas.length - validas}</strong>
                </span>
              )}
            </div>

            <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">NIT/Cedula</th>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Ciudad</th>
                    <th className="px-3 py-2 font-medium">Telefono</th>
                    <th className="px-3 py-2 font-medium">Punto Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.slice(0, 100).map((f, i) => {
                    const ok = Boolean(f.nombre?.trim())
                    return (
                      <tr
                        key={i}
                        className={ok ? '' : 'bg-amber-50 text-amber-800'}
                      >
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.nit ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">
                          {f.nombre ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.ciudad ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.telefono ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.puntoVenta ?? ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {resultado && (
          <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <p className="text-emerald-700">
              Clientes creados: <strong>{resultado.creados}</strong>
            </p>
            <p className="text-sky-700">
              Clientes actualizados:{' '}
              <strong>{resultado.actualizados ?? 0}</strong>
            </p>
            <p className="text-slate-600">
              Omitidos (sin nombre):{' '}
              <strong>{resultado.omitidos}</strong>
            </p>
            {resultado.errores.length > 0 && (
              <div className="text-amber-700">
                <p>Filas con error: {resultado.errores.length}</p>
                <ul className="mt-1 max-h-32 list-inside list-disc overflow-auto">
                  {resultado.errores.slice(0, 20).map((e, i) => (
                    <li key={i}>
                      Fila {e.fila}: {e.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!resultado && (
            <button
              onClick={confirmar}
              disabled={validas === 0 || cargando}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cargando ? 'Cargando...' : `Cargar ${validas} cliente(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
