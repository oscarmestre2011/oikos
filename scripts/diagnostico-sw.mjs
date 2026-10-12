/**
 * Diagnostico del service worker y del modo sin conexion.
 *
 * Sirve para averiguar POR QUE no arranca sin cobertura, en lugar de adivinar: pregunta al
 * navegador estado por estado (contexto seguro, registro, activacion, control de la pagina,
 * claves de la cache) y lo imprime. Cuando una prueba falla en ese punto, esto dice cual de
 * los pasos no ha ocurrido.
 *
 * Uso:
 *   node scripts/diagnostico-sw.mjs           (servido en la raiz)
 *   node scripts/diagnostico-sw.mjs /oikos/   (servido en subcarpeta, como GitHub Pages)
 */

import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { esperaServiceWorkerActivo, rutaChromium, sirveDirectorio } from './navegador.mjs'
const AQUI = dirname(fileURLToPath(import.meta.url))
const DIST = join(AQUI, '..', 'dist')

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Falta dist/. Ejecuta: npm run build (o npm run build:pages)')
    process.exit(1)
  }

  const prefijo = process.argv[2] ?? '/'
  const servidor = await sirveDirectorio(DIST, { prefijo })
  const navegador = await chromium.launch({ executablePath: rutaChromium() })
  const contexto = await navegador.newContext({ viewport: { width: 412, height: 915 } })
  const pagina = await contexto.newPage()

  pagina.on('console', (mensaje) => console.log(`  [navegador ${mensaje.type()}] ${mensaje.text()}`))
  pagina.on('pageerror', (error) => console.log(`  [error de pagina] ${error.message}`))
  pagina.on('requestfailed', (peticion) =>
    console.log(`  [peticion fallida] ${peticion.url()} -> ${peticion.failure()?.errorText}`),
  )

  console.log('')
  console.log(`Sirviendo ${DIST}`)
  console.log(`Direccion: ${servidor.url}   (prefijo ${prefijo})`)
  console.log('')

  await pagina.goto(servidor.url, { waitUntil: 'load' })

  // Se espera a que la interfaz este dibujada: la app siembra el historico antes de pintar,
  // y el service worker se registra despues.
  try {
    await pagina.getByRole('button', { name: '✏️ Apuntar mi primer gasto' }).waitFor({ timeout: 20_000 })
    console.log('✅ La interfaz esta dibujada (el historico se ha sembrado).')
    // Se sale de la bienvenida: si no, al comprobar el modo sin conexion se buscaria la
    // pantalla de Inicio y lo que se veria seria la bienvenida, dando un falso fallo.
    await pagina.getByRole('button', { name: 'Entrar en la app', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    console.log('✅ Se ha entrado en la app (Inicio a la vista).')
  } catch {
    console.log('⚠️  La interfaz no se ha dibujado en 20 s.')
  }

  const estado = await esperaServiceWorkerActivo(pagina)
  console.log('')
  console.log('Service worker:')
  console.log(`  contexto seguro:     ${await pagina.evaluate(() => window.isSecureContext)}`)
  console.log(`  hay registro:        ${estado?.hay ?? false}`)
  console.log(`  estado:              ${estado?.activo ?? '—'}`)
  console.log(`  controla la pagina:  ${estado?.controlada ?? false}`)
  console.log(`  ambito (scope):      ${estado?.scope ?? '—'}`)

  if (!estado?.hay) {
    console.log('')
    console.log('NO HAY SERVICE WORKER. Sin el, la app no puede abrir sin conexion.')
    const respuesta = await pagina.request.get(`${servidor.url}sw.js`)
    console.log(`  GET sw.js -> ${respuesta.status()} (${respuesta.headers()['content-type'] ?? 'sin tipo'})`)
  }

  // Las CLAVES de la cache: aqui se ve el fallo tipico de la subcarpeta, en el que el worker
  // guarda `/index.html` pero busca `/oikos/index.html`, y sin conexion no encuentra nada.
  const claves = await pagina
    .evaluate(async () => {
      const nombres = await caches.keys()
      const todas = {}
      for (const nombre of nombres) {
        const cache = await caches.open(nombre)
        todas[nombre] = (await cache.keys()).map((peticion) => peticion.url)
      }
      return todas
    })
    .catch(() => null)

  console.log('')
  if (claves === null) {
    console.log('No se han podido leer las claves de la cache (la pagina se estaba recargando).')
  } else {
    console.log('Claves guardadas en la caché:')
    for (const [nombre, urls] of Object.entries(claves)) {
      console.log(`  ${nombre}  (${urls.length} entradas)`)
      for (const url of urls) console.log(`    ${url}`)
    }
  }

  if (estado?.activo === 'activated' && estado?.controlada) {
    console.log('')
    console.log('Recargando SIN CONEXION...')
    await contexto.setOffline(true)
    try {
      await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 })
      await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
      console.log('✅ La app arranca sin conexion.')
    } catch (error) {
      console.log(`❌ La app NO arranca sin conexion: ${String(error).split('\n')[0]}`)
      const texto = await pagina.locator('body').innerText().catch(() => '(sin cuerpo)')
      console.log(`   Lo que se ve en pantalla: ${texto.slice(0, 120).replace(/\n/g, ' ')}`)
    }
    await contexto.setOffline(false)
  }

  await navegador.close()
  await servidor.cierra()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
