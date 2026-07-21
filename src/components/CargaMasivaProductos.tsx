import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  api,
  type FilaCargaProducto,
  type ResultadoCarga,
} from '../services/api'

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
function campoDe(encabezado: string): keyof FilaCargaProducto | null {
  const h = normalizar(encabezado)
  if (['item', 'codigo', 'id'].includes(h)) return 'item'
  if (['referencia', 'ref', 'sku'].includes(h)) return 'sku'
  if (['descitem', 'descripcion', 'desc', 'nombre', 'producto'].includes(h))
    return 'nombre'
  if (
    ['uminvent', 'um', 'unidad', 'unidadmedida', 'unidaddemedida', 'medida'].includes(
      h,
    )
  )
    return 'unidad'
  if (['categoria', 'linea', 'grupo'].includes(h)) return 'categoria'
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

function parsearCSV(texto: string): FilaCargaProducto[] {
  const lineas = texto
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
  if (lineas.length < 2) return []

  const sep = lineas[0].includes(';') ? ';' : ','
  const encabezados = dividirLinea(lineas[0], sep).map(campoDe)

  const filas: FilaCargaProducto[] = []
  for (let i = 1; i < lineas.length; i++) {
    const celdas = dividirLinea(lineas[i], sep)
    const fila: FilaCargaProducto = {}
    encabezados.forEach((campo, idx) => {
      if (campo) fila[campo] = celdas[idx] ?? ''
    })
    filas.push(fila)
  }
  return filas
}

// Convierte una matriz (primera fila = encabezados) en filas de producto.
function filasDeMatriz(matriz: unknown[][]): FilaCargaProducto[] {
  if (matriz.length < 2) return []
  const encabezados = matriz[0].map((h) => campoDe(String(h ?? '')))
  const filas: FilaCargaProducto[] = []
  for (let i = 1; i < matriz.length; i++) {
    const celdas = matriz[i]
    if (!celdas || celdas.every((c) => c === undefined || c === '')) continue
    const fila: FilaCargaProducto = {}
    encabezados.forEach((campo, idx) => {
      if (campo) fila[campo] = String(celdas[idx] ?? '').trim()
    })
    filas.push(fila)
  }
  return filas
}

// Lee un archivo Excel (.xlsx/.xls) y devuelve las filas de la primera hoja.
function parsearExcel(datos: ArrayBuffer): FilaCargaProducto[] {
  const libro = XLSX.read(datos, { type: 'array' })
  const hoja = libro.Sheets[libro.SheetNames[0]]
  if (!hoja) return []
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    blankrows: false,
    defval: '',
    // raw:false devuelve el texto tal como se ve en Excel, respetando los
    // ceros a la izquierda de codigos como "0000001".
    raw: false,
  })
  return filasDeMatriz(matriz)
}

const PLANTILLA_ENCABEZADOS = [
  'Item',
  'Referencia',
  'Desc. item',
  'U.M. invent.',
]
const PLANTILLA_FILAS = [
  ['100001', 'CAF-010', 'Cafe tostado especial', 'kg'],
  ['100002', 'MIE-011', 'Miel de abeja frasco', 'unidad'],
]

export function CargaMasivaProductos({ onCerrar, onCargado }: Props) {
  const [filas, setFilas] = useState<FilaCargaProducto[]>([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validas = filas.filter(
    (f) => f.sku?.trim() && f.nombre?.trim() && f.unidad?.trim(),
  ).length

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
    hoja['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 12 }]
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Productos')
    XLSX.writeFile(libro, 'plantilla-productos.xlsx')
  }

  async function confirmar() {
    if (validas === 0 || cargando) return
    setCargando(true)
    setError(null)
    try {
      const res = await api.cargaMasivaProductos(filas)
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
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Carga masiva de productos
            </h3>
            <p className="text-sm text-slate-500">
              Sube un archivo Excel (.xlsx) o CSV con las columnas: Item,
              Referencia, Desc. item, U.M. invent.
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
                  Incompletas: <strong>{filas.length - validas}</strong>
                </span>
              )}
            </div>

            <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Referencia</th>
                    <th className="px-3 py-2 font-medium">Desc. item</th>
                    <th className="px-3 py-2 font-medium">U.M.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filas.slice(0, 100).map((f, i) => {
                    const ok = f.sku?.trim() && f.nombre?.trim() && f.unidad?.trim()
                    return (
                      <tr
                        key={i}
                        className={ok ? '' : 'bg-amber-50 text-amber-800'}
                      >
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.item ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.sku ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700">
                          {f.nombre ?? ''}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">
                          {f.unidad ?? ''}
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
              Productos creados: <strong>{resultado.creados}</strong>
            </p>
            <p className="text-slate-600">
              Omitidos (referencia ya existente):{' '}
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
              {cargando ? 'Cargando...' : `Cargar ${validas} producto(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
