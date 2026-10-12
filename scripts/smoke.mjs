/**
 * Prueba de humo: la app de verdad, en un navegador de verdad.
 *
 * No comprueba funciones sueltas (eso lo hacen las pruebas de vitest): comprueba que se
 * puede ABRIR, APUNTAR un gasto y VERLO en el resumen, que es lo que hace falta que
 * funcione. Incluye el modo sin conexion, que es la razon de ser de una PWA.
 *
 * Uso:
 *   npm run build
 *   npm run test:smoke
 *
 * Las capturas quedan en `capturas/`.
 */

import { chromium } from 'playwright'
import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { creaComprobador, esperaServiceWorkerActivo, rutaChromium, sirveDirectorio } from './navegador.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const DIST = join(RAIZ, 'dist')
const CAPTURAS = join(RAIZ, 'capturas')

/** Pixel 7: la pantalla real donde se va a usar. */
const MOVIL = { width: 412, height: 915 }

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Falta la carpeta dist/. Ejecuta primero: npm run build')
    process.exit(1)
  }

  // Esta prueba sirve dist/ en la RAIZ. Si dist/ se compiló para la subcarpeta de GitHub
  // Pages (con OIKOS_BASE=/oikos/), los ficheros se pediran a /oikos/... y no se encontraran:
  // la app sale en blanco y la prueba falla por un tiempo de espera que no explica nada.
  if (readFileSync(join(DIST, 'index.html'), 'utf8').includes('/oikos/assets/')) {
    console.error('dist/ está compilado para la SUBCARPETA (rutas /oikos/).')
    console.error('Esta prueba lo sirve en la raíz. Ejecuta primero:  npm run build')
    console.error('(y para comprobar la subcarpeta:  npm run build:pages && npm run test:pages)')
    process.exit(1)
  }

  mkdirSync(CAPTURAS, { recursive: true })
  const comprueba = creaComprobador('Prueba de humo en navegador real')
  const servidor = await sirveDirectorio(DIST)
  const navegador = await chromium.launch({ executablePath: rutaChromium() })
  const contexto = await navegador.newContext({
    viewport: MOVIL,
    deviceScaleFactor: 2,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  })
  const pagina = await contexto.newPage()

  const errores = []
  pagina.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))
  pagina.on('console', (mensaje) => {
    if (mensaje.type() === 'error') errores.push(`console.error: ${mensaje.text()}`)
  })

  // Se vuelve arriba antes de cada captura: la pantalla anterior puede haber quedado
  // desplazada y entonces la foto no enseña la cabecera y los primeros datos.
  const captura = async (nombre) => {
    await pagina.evaluate(() => window.scrollTo(0, 0))
    await pagina.waitForTimeout(150)
    await pagina.screenshot({ path: join(CAPTURAS, `${nombre}.png`) })
  }

  try {
    // --- 1. La app abre y se presenta -----------------------------------
    await pagina.goto(servidor.url, { waitUntil: 'domcontentloaded' })
    await pagina.getByRole('button', { name: '✏️ Apuntar mi primer gasto' }).waitFor({ timeout: 20_000 })
    comprueba.comprueba(true, 'La app abre y enseña la bienvenida la primera vez')

    const textoBienvenida = await pagina.locator('body').innerText()
    comprueba.comprueba(
      textoBienvenida.includes('36') || textoBienvenida.includes('Fotos de patrimonio'),
      'La bienvenida explica que el histórico del Excel ya viene cargado',
    )
    comprueba.comprueba(
      textoBienvenida.includes('sin nube') || textoBienvenida.includes('Sin cuenta'),
      'La bienvenida dice dónde se guardan los datos',
    )
    await captura('00-bienvenida')

    // --- 2. Apuntar un gasto con el teclado propio ----------------------
    await pagina.getByRole('button', { name: '✏️ Apuntar mi primer gasto' }).click()
    await pagina.getByRole('button', { name: 'Apuntar 0,00 €' }).waitFor({ timeout: 10_000 })
    comprueba.comprueba(true, 'Se entra a la pantalla de apuntar')

    // 12,50 € en el teclado: 1 2 , 5 0
    // La coma y el borrar se buscan por su `aria-label`, no por el simbolo: el simbolo no
    // es un nombre accesible util para quien usa un lector de pantalla.
    for (const tecla of ['1', '2', 'Coma decimal', '5', '0']) {
      await pagina.getByRole('button', { name: tecla, exact: true }).click()
    }
    const botonGuardar = pagina.getByRole('button', { name: 'Apuntar 12,50 €' })
    comprueba.comprueba(await botonGuardar.isVisible(), 'El teclado compone el importe 12,50 €')

    await pagina.getByRole('button', { name: 'Alimentación', exact: false }).first().click()
    await pagina.getByPlaceholder('Mercadona, gasolina, cuota…').fill('Prueba de humo')
    await captura('01-apuntar')
    await botonGuardar.click()

    // --- 3. El gasto aparece en Inicio ---------------------------------
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    const textoInicio = await pagina.locator('body').innerText()
    comprueba.comprueba(textoInicio.includes('Prueba de humo'), 'El gasto apuntado sale en Inicio')
    comprueba.comprueba(textoInicio.includes('12,50'), 'El importe guardado es el que se tecleó')
    await captura('02-inicio')

    // --- 4. Y en el resumen del mes ------------------------------------
    await pagina.getByRole('button', { name: 'El mes', exact: true }).click()
    await pagina.getByText('En qué se ha ido').waitFor({ timeout: 10_000 })
    const textoMes = await pagina.locator('body').innerText()
    comprueba.comprueba(textoMes.includes('Alimentación'), 'El resumen del mes agrupa por categoría')
    comprueba.comprueba(textoMes.includes('12,50'), 'El resumen del mes suma el gasto nuevo')
    await captura('03-mes')

    // --- 5. Los movimientos del histórico están ------------------------
    // Movimientos no es una pestaña: se entra desde El mes (o desde Inicio).
    await pagina.getByRole('button', { name: /Ver los \d+ movimientos/ }).click()
    await pagina.getByPlaceholder('Buscar por concepto o categoría').waitFor({ timeout: 10_000 })
    comprueba.comprueba(true, 'Se entra al listado de movimientos desde El mes')

    await pagina.getByPlaceholder('Buscar por concepto o categoría').fill('Prueba de humo')
    await pagina.waitForTimeout(300)
    const textoFiltrado = await pagina.locator('body').innerText()
    comprueba.comprueba(
      textoFiltrado.includes('Prueba de humo'),
      'El buscador encuentra el movimiento recién apuntado',
    )

    // Y con el filtro del histórico: los movimientos de marzo de 2026 tienen que estar.
    await pagina.getByPlaceholder('Buscar por concepto o categoría').fill('')
    await pagina.getByRole('button', { name: 'marzo de 2026', exact: true }).click()
    await pagina.waitForTimeout(300)
    const textoMarzo = await pagina.locator('body').innerText()
    comprueba.comprueba(
      textoMarzo.includes('Mercadona') || textoMarzo.includes('Decathlon'),
      'Los movimientos del Gastos 2026.csv están cargados y filtran por mes',
    )
    await captura('04-movimientos')

    // Se vuelve a Inicio con el botón de la barra de abajo.
    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()

    // --- 6. El patrimonio resta la deuda -------------------------------
    await pagina.getByRole('button', { name: 'Patrimonio', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    const textoPatrimonio = await pagina.locator('body').innerText()
    comprueba.comprueba(
      textoPatrimonio.includes('-') && textoPatrimonio.includes('Deuda'),
      'El patrimonio enseña la deuda y un neto negativo',
    )
    comprueba.comprueba(
      textoPatrimonio.includes('Hipoteca') || textoPatrimonio.includes('Plan de libertad financiera'),
      'Las deudas del plan financiero están cargadas',
    )
    await captura('05-patrimonio')

    // --- 7. Presupuestos y ayuda ---------------------------------------
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    // `exact` porque "Copia de seguridad" sale también en la lista de novedades.
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })
    const textoAjustes = await pagina.locator('body').innerText()
    comprueba.comprueba(textoAjustes.includes('solo en este móvil'), 'Ajustes avisa de dónde viven los datos')
    await captura('06-ajustes')

    // --- 8. Los datos siguen ahí al recargar ---------------------------
    await pagina.reload({ waitUntil: 'domcontentloaded' })
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
    const trasRecargar = await pagina.locator('body').innerText()
    comprueba.comprueba(trasRecargar.includes('Prueba de humo'), 'El movimiento sobrevive a recargar la página')
    comprueba.comprueba(
      !trasRecargar.includes('Apuntar mi primer gasto'),
      'La bienvenida no vuelve a salir en la segunda apertura',
    )

    // --- 9. Sin conexión (es una PWA, esto es lo importante) -----------
    // Hay que esperar a que el service worker esté ACTIVO y controlando: si se corta la
    // conexión mientras aún se está instalando, falla la prueba sin que la app tenga la culpa.
    const estadoSw = await esperaServiceWorkerActivo(pagina)
    comprueba.comprueba(
      estadoSw?.activo === 'activated' && estadoSw?.controlada === true,
      'El service worker se registra, queda activo y controla la página',
    )

    await contexto.setOffline(true)
    let arrancaSinConexion = false
    try {
      await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 })
      await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
      arrancaSinConexion = true
    } catch {
      arrancaSinConexion = false
    }
    comprueba.comprueba(arrancaSinConexion, 'La app abre SIN CONEXIÓN (service worker funcionando)')
    if (arrancaSinConexion) {
      const sinConexion = await pagina.locator('body').innerText()
      comprueba.comprueba(
        sinConexion.includes('Prueba de humo'),
        'Los datos siguen ahí sin conexión (están en el móvil, no en la red)',
      )
      await captura('07-sin-conexion')
    }
    await contexto.setOffline(false)

    // --- 10. El manifest y los iconos existen --------------------------
    const manifest = await (await pagina.request.get(`${servidor.url}manifest.webmanifest`)).json()
    comprueba.comprueba(manifest.short_name === 'Oikos', 'El manifiesto declara el nombre Oikos')
    comprueba.comprueba(manifest.display === 'standalone', 'El manifiesto pide pantalla completa')
    for (const icono of manifest.icons) {
      const respuesta = await pagina.request.get(`${servidor.url}${icono.src.replace('./', '')}`)
      comprueba.comprueba(respuesta.ok(), `El icono ${icono.src} existe de verdad`)
    }

    comprueba.comprueba(errores.length === 0, `Sin errores en consola${errores.length ? `: ${errores[0]}` : ''}`)
  } finally {
    await navegador.close()
    await servidor.cierra()
  }

  const todoBien = comprueba.resumen()
  if (!todoBien) {
    console.log('')
    console.log('Errores recogidos de la consola del navegador:')
    for (const error of errores.slice(0, 10)) console.log(`  - ${error}`)
  }
}

main().catch((error) => {
  console.error('La prueba de humo ha fallado:', error)
  process.exit(1)
})
