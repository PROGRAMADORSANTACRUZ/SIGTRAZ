const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function cargarModulo(archivo, dependencias, globales = {}) {
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const contexto = { exports: {}, Error, require: (nombre) => {
    assert.ok(nombre in dependencias, `Dependencia inesperada: ${nombre}`)
    return dependencias[nombre]
  }, ...globales }
  vm.runInNewContext(codigo, contexto, { filename: archivo })
  return contexto.exports
}

function crearAlmacen(items = [], antiguos = {}) {
  const llamadas = []
  const local = { ...antiguos }
  Object.defineProperties(local, {
    getItem: { value: (clave) => local[clave] ?? null },
    removeItem: { value: (clave) => { delete local[clave] } },
    setItem: { value: () => assert.fail('No se debe escribir en localStorage') },
  })
  const api = {
    getAgroKv: async () => items,
    putAgroKv: async (...argumentos) => { llamadas.push(argumentos) },
  }
  const almacen = cargarModulo('src/services/almacenamientoDatos.ts', { './api': { api } }, {
    window: { dispatchEvent() {} }, Event, localStorage: local,
  })
  return { almacen, api, llamadas, local }
}

test('no permite guardar antes de cargar la base de datos', () => {
  const { almacen } = crearAlmacen()
  assert.throws(() => almacen.almacenamientoDatos.setItem('agro_clientes', '[]'), /no se han cargado/)
})

test('carga desde servidor y no reenvia el mismo valor al montar', async () => {
  const { almacen, llamadas } = crearAlmacen([{ clave: 'agro_clientes', valor: [{ id: 'servidor' }] }])
  await almacen.cargarDatos()
  assert.equal(almacen.almacenamientoDatos.getItem('agro_clientes'), '[{"id":"servidor"}]')
  almacen.almacenamientoDatos.setItem('agro_clientes', '[{"id":"servidor"}]')
  await almacen.esperarGuardados()
  assert.equal(llamadas.length, 0)
})

test('guarda sin escribir localStorage y envia la version anterior', async () => {
  const { almacen, llamadas } = crearAlmacen([{ clave: 'agro_clientes', valor: [] }])
  await almacen.cargarDatos()
  almacen.almacenamientoDatos.setItem('agro_clientes', '[{"id":"nuevo"}]')
  assert.equal(almacen.estadoGuardado().pendientes, 1)
  await almacen.esperarGuardados()
  assert.deepEqual(JSON.parse(JSON.stringify(llamadas)), [['agro_clientes', [{ id: 'nuevo' }], []]])
  assert.equal(almacen.estadoGuardado().pendientes, 0)
})

test('un error queda pendiente y se puede reintentar', async () => {
  const { almacen, api, llamadas } = crearAlmacen()
  await almacen.cargarDatos()
  api.putAgroKv = async () => { throw new Error('Sin conexion') }
  almacen.almacenamientoDatos.setItem('agro_clientes', '[{"id":"nuevo"}]')
  await assert.rejects(almacen.esperarGuardados(), /no se han guardado/)
  assert.equal(almacen.estadoGuardado().pendientes, 1)
  assert.equal(almacen.estadoGuardado().errores[0][1], 'Sin conexion')
  api.putAgroKv = async (...argumentos) => llamadas.push(argumentos)
  almacen.reintentarGuardados()
  await almacen.esperarGuardados()
  assert.equal(almacen.estadoGuardado().pendientes, 0)
  assert.equal(almacen.estadoGuardado().errores.length, 0)
})

test('migra datos antiguos solo despues de confirmacion', async () => {
  const { almacen, api, local } = crearAlmacen([], { agro_clientes: '[{"id":"antiguo"}]' })
  let confirmar
  api.putAgroKv = () => new Promise((resolve) => { confirmar = resolve })
  await almacen.cargarDatos()
  assert.ok(local.agro_clientes)
  confirmar()
  await almacen.esperarGuardados()
  assert.equal(local.agro_clientes, undefined)
})

test('no pisa datos remotos ni borra la copia antigua en conflicto', async () => {
  const { almacen, llamadas, local } = crearAlmacen(
    [{ clave: 'agro_clientes', valor: [] }], { agro_clientes: '[{"id":"antiguo"}]' },
  )
  await almacen.cargarDatos()
  await almacen.esperarGuardados()
  assert.equal(almacen.almacenamientoDatos.getItem('agro_clientes'), '[]')
  assert.ok(local.agro_clientes)
  assert.equal(almacen.estadoGuardado().heredados, 1)
  assert.equal(llamadas.length, 0)
})

test('serializa cambios y conserva la ultima version pendiente', async () => {
  const { almacen, api, llamadas } = crearAlmacen([{ clave: 'agro_clientes', valor: [] }])
  await almacen.cargarDatos()
  let confirmar
  api.putAgroKv = async (...argumentos) => {
    llamadas.push(argumentos)
    if (llamadas.length === 1) await new Promise((resolve) => { confirmar = resolve })
  }
  almacen.almacenamientoDatos.setItem('agro_clientes', '[1]')
  await Promise.resolve()
  almacen.almacenamientoDatos.setItem('agro_clientes', '[2]')
  almacen.almacenamientoDatos.setItem('agro_clientes', '[3]')
  confirmar()
  await almacen.esperarGuardados()
  assert.deepEqual(JSON.parse(JSON.stringify(llamadas)), [['agro_clientes', [1], []], ['agro_clientes', [3], [1]]])
})

test('fallo de precarga no habilita guardados locales', async () => {
  const { almacen, api } = crearAlmacen()
  api.getAgroKv = async () => { throw new Error('Servidor no disponible') }
  await assert.rejects(almacen.cargarDatos(), /Servidor no disponible/)
  assert.throws(() => almacen.almacenamientoDatos.setItem('agro_clientes', '[]'), /no se han cargado/)
})

test('limpiar sesion descarta escrituras aun no iniciadas', async () => {
  const { almacen, llamadas } = crearAlmacen()
  await almacen.cargarDatos()
  almacen.almacenamientoDatos.setItem('agro_clientes', '[1]')
  almacen.limpiarDatos()
  await almacen.esperarGuardados()
  assert.equal(llamadas.length, 0)
  assert.equal(almacen.almacenamientoDatos.getItem('agro_clientes'), null)
})

function crearRuta(resultados) {
  const rutas = {}
  const consultas = []
  cargarModulo('server/src/routes/agroKv.ts', {
    express: { Router: () => ({ get: (ruta, funcion) => { rutas.get = funcion }, put: (ruta, funcion) => { rutas.put = funcion } }) },
    '../db.js': { query: async (sql, parametros) => { consultas.push({ sql, parametros }); return resultados.shift() ?? [] } },
  })
  const res = { codigo: 200, status(codigo) { this.codigo = codigo; return this }, json(datos) { this.datos = datos; return this }, end() {} }
  const next = (error) => { throw error }
  return { rutas, consultas, res, next }
}

test('servidor rechaza sobrescritura si la version anterior cambio', async () => {
  const { rutas, consultas, res, next } = crearRuta([[], []])
  await rutas.put({ params: { clave: 'agro_clientes' }, body: { valor: [2], anterior: [1] }, usuario: { sub: 'uno' } }, res, next)
  assert.equal(res.codigo, 409)
  assert.match(consultas[0].sql, /valor = \$3::jsonb/)
  assert.equal(consultas[0].parametros[2], '[1]')
})

test('servidor confirma un guardado que ya habia recibido', async () => {
  const { rutas, res, next } = crearRuta([[], [{ clave: 'agro_clientes' }]])
  await rutas.put({ params: { clave: 'agro_clientes' }, body: { valor: [2], anterior: [1] }, usuario: { sub: 'uno' } }, res, next)
  assert.equal(res.codigo, 204)
})

test('preferencias guardadas en la base de datos por usuario', async () => {
  const { rutas, consultas, res, next } = crearRuta([[{ clave: 'usuario:uno:sigtraz_tema' }]])
  await rutas.put({ params: { clave: 'sigtraz_tema' }, body: { valor: 'oscuro' }, usuario: { sub: 'uno' } }, res, next)
  assert.equal(consultas[0].parametros[0], 'usuario:uno:sigtraz_tema')
  assert.equal(res.codigo, 204)
})

test('precarga expone preferencias del usuario sin prefijo privado', async () => {
  const { rutas, consultas, res, next } = crearRuta([[
    { clave: 'usuario:uno:sigtraz_tema', valor: 'oscuro' },
    { clave: 'agro_clientes', valor: [] },
  ]])
  await rutas.get({ usuario: { sub: 'uno' } }, res, next)
  assert.deepEqual(JSON.parse(JSON.stringify(res.datos)), [{ clave: 'sigtraz_tema', valor: 'oscuro' }, { clave: 'agro_clientes', valor: [] }])
  assert.equal(consultas[0].parametros[1], 'usuario:uno:')
})

test('cargas concurrentes comparten una sola peticion', async () => {
  const { almacen, api } = crearAlmacen()
  let peticiones = 0
  api.getAgroKv = async () => { peticiones += 1; return [] }
  await Promise.all([almacen.cargarDatos(), almacen.cargarDatos()])
  assert.equal(peticiones, 1)
})

test('datos antiguos corruptos se conservan sin enviarse al servidor', async () => {
  const { almacen, llamadas, local } = crearAlmacen([], { agro_clientes: '{invalido' })
  await almacen.cargarDatos()
  await almacen.esperarGuardados()
  assert.equal(llamadas.length, 0)
  assert.equal(local.agro_clientes, '{invalido')
  assert.equal(almacen.estadoGuardado().heredados, 1)
})