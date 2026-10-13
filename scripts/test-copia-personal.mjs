/**
 * Comprueba que TU archivo de datos (`datos/oikos-mi-historial.json`) se importa bien en la app.
 *
 * Es la prueba del eslabón mas fragil de todo el montaje: la app ya no lleva el historico dentro,
 * asi que si este archivo no importa correctamente, al abrir la app no hay nada. Y como el
 * archivo NO esta en el repositorio (son datos personales), esta prueba se SALTA en cualquier
 * copia limpia, incluido el flujo de publicacion de GitHub.
 *
 * IMPORTANTE: este fichero no contiene ni una cifra de nadie. Todas las comprobaciones salen de
 * leer el propio archivo (`copia.fotos.length`, `copia.movimientos.length`...). Si se escribieran
 * los numeros a mano, volveriamos a publicar sus finanzas en el repositorio, que es justo el
 * error que se cometio y que se esta corrigiendo.
 *
 * Uso:
 *   npm run build
 *   npm run test:copia
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { creaComprobador, entraEnLaApp, rutaChromium, sirveDirectorio } from './navegador.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const DIST = join(RAIZ, 'dist')
const CAPTURAS = join(RAIZ, 'capturas')
const ARCHIVO = resolve(RAIZ, '..', 'datos', 'oikos-mi-historial.json')

// Este fichero es JavaScript normal (no TypeScript): los scripts .mjs los ejecuta Node tal cual,
// sin compilar, asi que aqui no valen las anotaciones de tipo ni los `interface`.
async function main() {
  if (!existsSync(ARCHIVO)) {
    console.log('')
    console.log('⏭️  No está tu archivo de datos (datos/oikos-mi-historial.json), así que esta')
    console.log('    comprobación se salta. Es lo normal en una copia limpia del repositorio.')
    console.log('    Para tenerlo:  npm run copia:personal')
    return
  }

  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Falta dist/. Ejecuta primero: npm run build')
    process.exit(1)
  }

  const copia = JSON.parse(readFileSync(ARCHIVO, 'utf8'))
  const esperado = {
    fotos: copia.fotos.length,
    movimientos: copia.movimientos.length,
    cuentas: copia.cuentas.length,
    deudas: copia.deudas.length,
    bitcoin: copia.bitcoin.length,
  }

  mkdirSync(CAPTURAS, { recursive: true })
  const comprueba = creaComprobador('Tu archivo de datos, importado en la app')
  const servidor = await sirveDirectorio(DIST)
  const navegador = await chromium.launch({ executablePath: rutaChromium() })
  const contexto = await navegador.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    acceptDownloads: true,
  })
  const pagina = await contexto.newPage()

  const errores = []
  pagina.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))
  pagina.on('console', (mensaje) => {
    if (mensaje.type() === 'error') errores.push(`console.error: ${mensaje.text()}`)
  })

  const aparece = async (texto, limiteMs = 15_000) => {
    try {
      await pagina.getByText(texto, { exact: false }).first().waitFor({ timeout: limiteMs })
      return true
    } catch {
      return false
    }
  }

  console.log('')
  console.log(`Archivo: ${ARCHIVO}`)
  console.log(
    `Trae: ${esperado.fotos} fotos, ${esperado.movimientos} movimientos, ${esperado.cuentas} cuentas, ` +
      `${esperado.deudas} deudas, ${esperado.bitcoin} compras de Bitcoin`,
  )
  console.log('')

  try {
    await pagina.goto(servidor.url, { waitUntil: 'domcontentloaded' })

    // --- 1. La app arranca VACÍA (sin datos personales) ----------------
    await pagina.getByRole('button', { name: 'Entrar en la app', exact: true }).waitFor({ timeout: 20_000 })
    comprueba.comprueba(true, 'La app arranca y enseña la bienvenida')
    const bienvenida = await pagina.locator('body').innerText()
    comprueba.comprueba(
      bienvenida.toLowerCase().includes('vacía'),
      'La bienvenida explica que arranca sin datos dentro',
    )

    await entraEnLaApp(pagina, { destino: 'Entrar en la app' })
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
    comprueba.comprueba(
      await aparece('Está vacía porque no lleva tus datos dentro'),
      'Inicio avisa de que no hay datos y de cómo cargarlos',
    )

    // --- 2. Importar tu archivo ---------------------------------------
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })
    await pagina.locator('#modo-import').selectOption('reemplazar')
    await pagina.locator('input[type="file"]').setInputFiles(ARCHIVO)
    comprueba.comprueba(await aparece('Copia restaurada'), 'La copia se importa y la app lo dice')

    // --- 3. Y ahora SÍ están tus datos --------------------------------
    await pagina.getByRole('button', { name: 'Patrimonio', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      await aparece(`${esperado.fotos} fotos`),
      `Están las ${esperado.fotos} fotos de patrimonio`,
    )
    comprueba.comprueba(
      await aparece(`${esperado.fotos} fotos`) && (await pagina.locator('body').innerText()).includes('-'),
      'El patrimonio neto sale negativo (ahora sí resta las deudas)',
    )

    const textoPatrimonio = await pagina.locator('body').innerText()
    const primeraCuenta = copia.cuentas.find((c) => c.activa)?.nombre ?? ''
    comprueba.comprueba(
      primeraCuenta !== '' && textoPatrimonio.includes(primeraCuenta),
      `Aparecen tus cuentas (por ejemplo «${primeraCuenta}»)`,
    )

    // Las deudas se ven directamente en Patrimonio: no hay que entrar en ninguna pantalla.
    await pagina.getByText('Deuda propia').waitFor({ timeout: 10_000 })
    const primeraDeuda = copia.deudas[0]?.nombre ?? ''
    comprueba.comprueba(
      primeraDeuda !== '' && (await pagina.locator('body').innerText()).includes(primeraDeuda),
      `Aparecen tus ${esperado.deudas} deudas («${primeraDeuda}»...)`,
    )
    await pagina.evaluate(() => window.scrollTo(0, 0))
    await pagina.waitForTimeout(200)
    // Se recorta a los primeros 1500 px en vez de hacer la pantalla entera: el patrimonio tiene 36
    // fotos y una captura completa pasa de 8000 px, que ni se puede abrir cómodamente. En ese trozo
    // se ve lo que importa: el neto y, justo debajo, las deudas con su botón de editar.
    await pagina.screenshot({
      path: join(CAPTURAS, 'copia-personal-importada.png'),
      clip: { x: 0, y: 0, width: 412, height: 1500 },
    })

    // --- 4. Los movimientos también -----------------------------------
    // Se entra por Inicio → «Ver todos» y NO por El mes: aquel botón abre los movimientos
    // filtrados por el mes que estuvieras mirando, y el histórico puede ser de otro mes. Es una
    // distinción real de la app, no un capricho de la prueba.
    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: 'Ver todos' }).click()
    comprueba.comprueba(
      await aparece(`${esperado.movimientos} movimientos`),
      `Están los ${esperado.movimientos} movimientos`,
    )

    comprueba.comprueba(errores.length === 0, `Sin errores en consola${errores.length ? `: ${errores[0]}` : ''}`)
  } finally {
    await navegador.close()
    await servidor.cierra()
  }

  comprueba.resumen()
}

main().catch((error) => {
  console.error('La comprobación del archivo de datos ha fallado:', error)
  process.exit(1)
})
