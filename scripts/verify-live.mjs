/**
 * Verifica la app PUBLICADA en internet, tal y como la ve el movil.
 *
 * Es distinto de `test:smoke` (que prueba lo compilado en local) y de `test:pages` (que prueba
 * la subcarpeta en local). Aqui se abre la direccion de verdad, por HTTPS, y se comprueba que
 * funciona. Sirve para dos cosas:
 *
 *   1. Saber que la publicacion ha salido bien (y no una pagina en blanco).
 *   2. Saber que lo publicado es LA VERSION ACTUAL y no una antigua. Ese fallo es facil de
 *      cometer y dificil de ver: la app funciona, pero le falta el ultimo cambio. Para eso se
 *      compara la version que enseña Ajustes con la de `src/version.ts`.
 *
 * Uso:
 *   node scripts/verify-live.mjs                     (la direccion publicada)
 *   node scripts/verify-live.mjs <direccion>         (otra direccion cualquiera)
 *   node scripts/verify-live.mjs --local             (sirve dist/ en /oikos/ y prueba eso)
 *
 * `--local` existe para poder comprobar que ESTE script funciona sin esperar a publicar.
 */

import { chromium } from 'playwright'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { creaComprobador, entraEnLaApp, esperaServiceWorkerActivo, rutaChromium, sirveDirectorio } from './navegador.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const DIST = join(RAIZ, 'dist')
const DIRECCION_PUBLICADA = 'https://oscarmestre2011.github.io/oikos/'
const MOVIL = { width: 412, height: 915 }

/** La version del codigo fuente, para compararla con la publicada. */
function versionDelCodigo() {
  const fuente = readFileSync(join(RAIZ, 'src', 'version.ts'), 'utf8')
  const coincide = /export const VERSION = '([^']+)'/.exec(fuente)
  if (!coincide) throw new Error('No se ha podido leer VERSION de src/version.ts')
  return coincide[1]
}

async function main() {
  const argumentos = process.argv.slice(2)
  const local = argumentos.includes('--local')
  const direccionDada = argumentos.find((a) => !a.startsWith('--'))

  let servidor = null
  let url = direccionDada ?? DIRECCION_PUBLICADA

  if (local) {
    if (!existsSync(join(DIST, 'index.html'))) {
      console.error('Falta dist/. Ejecuta: npm run build:pages')
      process.exit(1)
    }
    servidor = await sirveDirectorio(DIST, { prefijo: '/oikos/' })
    url = servidor.url
  }

  const comprueba = creaComprobador(`App publicada (${url})`)
  const version = versionDelCodigo()
  const perfil = mkdtempSync(join(tmpdir(), 'oikos-live-'))
  let contexto = null

  try {
    contexto = await chromium.launchPersistentContext(perfil, {
      executablePath: rutaChromium(),
      viewport: MOVIL,
      deviceScaleFactor: 2,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      acceptDownloads: true,
    })
    const pagina = contexto.pages()[0] ?? (await contexto.newPage())

    const errores = []
    pagina.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))
    pagina.on('console', (mensaje) => {
      if (mensaje.type() === 'error') errores.push(`console.error: ${mensaje.text()}`)
    })

    // --- 1. Responde y no es una pagina en blanco ----------------------
    const respuesta = await pagina.request.get(url)
    comprueba.comprueba(respuesta.ok(), `La dirección responde con ${respuesta.status()}`)

    await pagina.goto(url, { waitUntil: 'domcontentloaded' })
    let arranca = false
    try {
      await pagina.getByRole('button', { name: '✏️ Apuntar mi primer gasto' }).waitFor({ timeout: 30_000 })
      arranca = true
    } catch {
      arranca = false
    }
    comprueba.comprueba(arranca, 'La app arranca y enseña la bienvenida (no se queda en blanco)')

    if (!arranca) {
      // Sin esto no tiene sentido seguir: se para y se dice que se ve en pantalla.
      const texto = await pagina.locator('body').innerText().catch(() => '(sin cuerpo)')
      console.log(`   Lo que se ve: ${texto.slice(0, 200).replace(/\n/g, ' ')}`)
      comprueba.resumen()
      return
    }

    const bienvenida = await pagina.locator('body').innerText()
    comprueba.comprueba(
      /\d{2}/.test(bienvenida) && bienvenida.includes('patrimonio'),
      'La bienvenida enseña el histórico cargado',
    )

    // --- 2. Se puede apuntar y se ve el resultado ---------------------
    await entraEnLaApp(pagina, { destino: 'Entrar en la app' })
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 20_000 })
    comprueba.comprueba(true, 'Se entra en la app y se ve el resumen del mes')

    await pagina.getByRole('button', { name: 'Apuntar', exact: true }).click()
    for (const tecla of ['4', '2', 'Coma decimal', '5', '0']) {
      await pagina.getByRole('button', { name: tecla, exact: true }).click()
    }
    await pagina.getByRole('button', { name: 'Alimentación', exact: false }).first().click()
    await pagina.getByPlaceholder('Mercadona, gasolina, cuota…').fill('Prueba de la app publicada')
    await pagina.getByRole('button', { name: 'Apuntar 42,50 €' }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
    comprueba.comprueba(
      (await pagina.locator('body').innerText()).includes('42,50'),
      'Se apunta un gasto en la app publicada y el número se actualiza',
    )

    // --- 3. La versión publicada es la actual -------------------------
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Acerca de Oikos', { exact: true }).click()
    await pagina.getByText(`Versión ${version}`, { exact: false }).waitFor({ timeout: 10_000 })
    comprueba.comprueba(true, `Lo publicado es la versión ${version}, la del código fuente`)

    // --- 4. Service worker y modo sin conexión ------------------------
    const estado = await esperaServiceWorkerActivo(pagina)
    comprueba.comprueba(estado?.activo === 'activated', 'El service worker está activo')
    comprueba.comprueba(
      Boolean(estado?.scope?.endsWith('/oikos/')),
      `El ámbito es /oikos/: ${estado?.scope ?? 'sin registro'}`,
    )

    await contexto.setOffline(true)
    let sinConexion = false
    try {
      await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 })
      await pagina.getByText('Gastado este mes').waitFor({ timeout: 20_000 })
      sinConexion = true
    } catch {
      sinConexion = false
    }
    await contexto.setOffline(false)
    comprueba.comprueba(sinConexion, 'La app publicada abre SIN CONEXIÓN')
    comprueba.comprueba(
      sinConexion && (await pagina.locator('body').innerText()).includes('42,50'),
      'Y los datos siguen ahí sin conexión (están en el móvil, no en la nube)',
    )

    // --- 5. Instalable desde la dirección publicada -------------------
    const sesion = await contexto.newCDPSession(pagina)
    const instalabilidad = await sesion.send('Page.getInstallabilityErrors').catch(() => null)
    const fallos = instalabilidad?.installabilityErrors ?? []
    comprueba.comprueba(
      fallos.length === 0,
      `El navegador la considera instalable desde esa dirección${
        fallos.length ? `: ${fallos.map((f) => f.errorId).join(', ')}` : ''
      }`,
    )

    comprueba.comprueba(errores.length === 0, `Sin errores en consola${errores.length ? `: ${errores[0]}` : ''}`)
    if (errores.length > 0) {
      for (const error of errores.slice(0, 5)) console.log(`   - ${error}`)
    }
  } finally {
    if (contexto) await contexto.close()
    rmSync(perfil, { recursive: true, force: true })
    if (servidor) await servidor.cierra()
  }

  comprueba.resumen()
}

main().catch((error) => {
  const mensaje = String(error?.message ?? error)
  if (mensaje.includes('ERR_NAME_NOT_RESOLVED') || mensaje.includes('ERR_CONNECTION')) {
    console.error('No se ha podido abrir la dirección. Si todavía no está publicada, es normal.')
    console.error('Pasos: crear el repositorio `oikos` en GitHub, subir el código y activar')
    console.error('Settings → Pages → Source: GitHub Actions. Después, volver a lanzar esto.')
  } else {
    console.error('La verificación de la app publicada ha fallado:', error)
  }
  process.exit(1)
})
