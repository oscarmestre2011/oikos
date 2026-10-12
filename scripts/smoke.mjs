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
import { readFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
    acceptDownloads: true,
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
    // OJO: `innerText` devuelve el texto TAL COMO SE VE, y los títulos de las tarjetas van en
    // mayúsculas por CSS (`text-transform`). Por eso aquí se compara en mayúsculas: buscar
    // "Gastos que se repiten" en el texto visible no encontraría nada aunque esté en pantalla.
    const textoMesMayusculas = textoMes.toUpperCase()
    comprueba.comprueba(
      textoMesMayusculas.includes('GASTOS QUE SE REPITEN'),
      'La tarjeta de gastos repetidos está (aunque salga vacía, se explica)',
    )
    comprueba.comprueba(
      textoMes.includes('mar 26') && textoMes.includes('abr 26'),
      'Dice en qué meses hay datos, para entender por qué todavía no detecta ninguno',
    )
    await captura('03-mes')

    // --- 5. Los movimientos del histórico están ------------------------
    // Movimientos no es una pestaña: se entra desde El mes (o desde Inicio).
    // El texto del botón cambia en singular y en plural, así que se busca por la parte común.
    await pagina.getByRole('button', { name: /Ver (el|los) .*movimiento/ }).click()
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
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })

    // El retroceso tiene que volver a la pantalla anterior, no salir de la app.
    //
    // Se comprueba aquí, con Movimientos, porque es una pantalla que SE APILA (`ir`). Las
    // pestañas de abajo usan `irARaiz`, que a propósito NO crea historial (volver a una pestaña
    // reinicia la navegación): comprobarlo con una de ellas daría un fallo que no es real.
    //
    // Y se usa `history.back()` dentro de la página y NO `page.goBack()`: el de Playwright espera
    // el suceso de carga de una navegación normal, y las navegaciones internas de una SPA (las
    // que crea `pushState`) no lo disparan. `history.back()` es exactamente lo que hace el botón
    // atrás del navegador y el gesto del móvil.
    await pagina.getByRole('button', { name: 'El mes', exact: true }).click()
    await pagina.getByText('En qué se ha ido').waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: /Ver (el|los) .*movimiento/ }).click()
    await pagina.getByPlaceholder('Buscar por concepto o categoría').waitFor({ timeout: 10_000 })

    await pagina.evaluate(() => window.history.back())
    await pagina.waitForTimeout(600)
    const trasAtras = await pagina.locator('body').innerText()
    // Se compara en mayúsculas porque el título de la tarjeta va en mayúsculas por CSS y
    // `innerText` devuelve el texto tal y como se ve.
    const volvioAlMes = trasAtras.toUpperCase().includes('EN QUÉ SE HA IDO')
    comprueba.comprueba(
      volvioAlMes,
      'El botón atrás vuelve a la pantalla anterior en lugar de salir de la app' +
        (volvioAlMes ? '' : ` — se ve: «${trasAtras.slice(0, 70).replace(/\n/g, ' ')}» · url: ${pagina.url()}`),
    )

    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })

    // --- 6. El patrimonio resta la deuda -------------------------------
    // Se entra con el enlace de la tarjeta de Inicio, que es una navegación de pestaña.
    await pagina.getByRole('button', { name: 'Ver detalle' }).click()
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

    // --- 11. La copia de seguridad se guarda de verdad -----------------
    // Esto no se había probado nunca de punta a punta, y es la función de la que depende que
    // no se pierdan las cuentas. No basta con que el botón exista: tiene que salir un archivo
    // con los datos dentro.
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })

    const [descargaCopia] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 20_000 }),
      pagina.getByRole('button', { name: /Compartir o descargar la copia/ }).click(),
    ])
    const rutaCopia = await descargaCopia.path()
    comprueba.comprueba(
      descargaCopia.suggestedFilename().startsWith('oikos-'),
      `La copia se descarga con nombre con fecha (${descargaCopia.suggestedFilename()})`,
    )

    const copia = JSON.parse(readFileSync(rutaCopia, 'utf8'))
    comprueba.comprueba(copia.app === 'oikos', 'El archivo de copia se identifica como de Oikos')
    comprueba.comprueba(copia.fotos?.length === 36, `La copia lleva las 36 fotos (${copia.fotos?.length})`)
    comprueba.comprueba(
      copia.movimientos?.length === 25,
      `La copia lleva los 24 movimientos del histórico más el apuntado (${copia.movimientos?.length})`,
    )
    comprueba.comprueba(
      copia.movimientos?.some((m) => m.concepto === 'Prueba de humo'),
      'La copia incluye el movimiento recién apuntado',
    )
    comprueba.comprueba(copia.deudas?.length === 4, 'La copia lleva las deudas')
    comprueba.comprueba(copia.bitcoin?.length === 89, 'La copia lleva las 89 compras de Bitcoin')

    // --- 12. La exportación a Markdown del vault ----------------------
    const [descargaMd] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 20_000 }),
      // El emoji distingue este botón del de "Markdown del patrimonio", que también empieza igual.
      pagina.getByRole('button', { name: /📄 Markdown de/ }).click(),
    ])
    const markdown = readFileSync(await descargaMd.path(), 'utf8')
    comprueba.comprueba(
      descargaMd.suggestedFilename().endsWith('.md'),
      `El Markdown se descarga como .md (${descargaMd.suggestedFilename()})`,
    )
    comprueba.comprueba(markdown.includes('tipo: finanzas'), 'El Markdown lleva el frontmatter del vault')
    comprueba.comprueba(markdown.includes('## Movimientos'), 'El Markdown lleva la tabla de movimientos')
    comprueba.comprueba(markdown.includes('Prueba de humo'), 'El Markdown incluye el movimiento apuntado')
    comprueba.comprueba(
      /^\| 2026-\d\d-\d\d \|/m.test(markdown),
      'Las fechas del Markdown van en formato YYYY-MM-DD, como en el vault',
    )
    comprueba.comprueba(
      markdown.includes('| 12,50 |'),
      'Los importes van con coma decimal, como en el vault',
    )

    const [descargaPatrimonio] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 20_000 }),
      pagina.getByRole('button', { name: /Markdown del patrimonio/ }).click(),
    ])
    const mdPatrimonio = readFileSync(await descargaPatrimonio.path(), 'utf8')
    comprueba.comprueba(
      mdPatrimonio.includes('Patrimonio neto') && mdPatrimonio.includes('Hipoteca'),
      'El Markdown del patrimonio lleva las deudas y el neto real',
    )
    comprueba.comprueba(
      mdPatrimonio.includes('no incluyen deuda') || mdPatrimonio.includes('no registraba'),
      'El Markdown avisa de que las fotos antiguas no incluían deuda',
    )

    // --- 13. El navegador la considera instalable ----------------------
    // Se hace en un PERFIL DE VERDAD, no en el contexto de las pruebas: el contexto normal de
    // Playwright es de incógnito, y Chrome marca "in-incognito" como impedimento para instalar.
    // Comprobarlo ahí daría un fallo que no es de la app, y darlo por bueno sería peor: la
    // instalación en el móvil es justamente lo que hay que demostrar.
    await compruebaInstalabilidad(comprueba, servidor.url)

    // --- 14. En una pantalla estrecha no se sale nada de sitio ----------
    // Que algo sea más ancho que la pantalla hace aparecer una barra horizontal y se ve fatal en
    // un móvil: es un fallo facil de colar y muy facil de no ver si solo se prueba en una
    // pantalla. Aqui se prueba a 360 px, mas estrecho que el Pixel 7 de las demas pruebas.
    await pagina.setViewportSize({ width: 360, height: 640 })
    const desbordes = []
    for (const nombre of ['Inicio', 'Apuntar', 'El mes', 'Patrimonio', 'Ajustes']) {
      await pagina.getByRole('button', { name: nombre, exact: true }).click()
      await pagina.waitForTimeout(250)
      const anchos = await pagina.evaluate(() => ({
        documento: document.documentElement.scrollWidth,
        ventana: document.documentElement.clientWidth,
      }))
      if (anchos.documento > anchos.ventana + 1) {
        desbordes.push(`${nombre} (${anchos.documento} > ${anchos.ventana})`)
      }
      await captura(`08-estrecho-${nombre.toLowerCase().replace(/\s+/g, '-')}`)
    }
    comprueba.comprueba(
      desbordes.length === 0,
      `Ninguna pantalla se desborda a lo ancho en 360 px${desbordes.length ? `: ${desbordes.join(', ')}` : ''}`,
    )

    // El repaso de errores de consola va AL FINAL, para que cubra también las descargas.
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

/**
 * Comprueba que el navegador considera la app INSTALABLE, en un perfil que no sea de incógnito.
 *
 * Chrome solo deja instalar una PWA si el manifiesto está bien, hay un service worker con su
 * manejador de `fetch`, y no está en modo incógnito. Esta comprobación es la que de verdad
 * respalda la frase «se instala en el móvil»; el manifiesto puede existir y aun así el
 * navegador negarse.
 */
async function compruebaInstalabilidad(comprueba, url) {
  const perfil = mkdtempSync(join(tmpdir(), 'oikos-perfil-'))
  let contexto = null
  try {
    contexto = await chromium.launchPersistentContext(perfil, {
      executablePath: rutaChromium(),
      viewport: MOVIL,
    })
    const pagina = contexto.pages()[0] ?? (await contexto.newPage())
    await pagina.goto(url, { waitUntil: 'domcontentloaded' })
    await pagina.getByRole('button', { name: '✏️ Apuntar mi primer gasto' }).waitFor({ timeout: 20_000 })

    // El service worker tiene que estar activo: sin él, Chrome tampoco la da por instalable.
    const estado = await esperaServiceWorkerActivo(pagina)

    const sesion = await contexto.newCDPSession(pagina)
    const manifiesto = await sesion.send('Page.getAppManifest').catch(() => null)
    comprueba.comprueba(Boolean(manifiesto?.url), 'El navegador reconoce el manifiesto de la app')

    const instalabilidad = await sesion.send('Page.getInstallabilityErrors').catch(() => null)
    const fallos = instalabilidad?.installabilityErrors ?? []
    comprueba.comprueba(
      fallos.length === 0,
      `El navegador la considera instalable, sin impedimentos${
        fallos.length ? `: ${fallos.map((f) => f.errorId).join(', ')}` : ''
      }`,
    )
    comprueba.comprueba(
      estado?.activo === 'activated',
      'Y con el service worker activo (condición para instalarla y para el modo sin conexión)',
    )
  } finally {
    if (contexto) await contexto.close()
    rmSync(perfil, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error('La prueba de humo ha fallado:', error)
  process.exit(1)
})
