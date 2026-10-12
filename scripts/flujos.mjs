/**
 * Pruebas de los FLUJOS de la app: las cosas que se hacen de verdad, de principio a fin.
 *
 * `smoke.mjs` comprueba que la app abre, apunta un gasto y lo enseña. Aquí se prueban los
 * caminos que se recorren de vez en cuando y que, por eso mismo, nadie prueba: crear el primer
 * presupuesto, hacer la foto del patrimonio, renombrar una categoría, borrar un movimiento y
 * dar una vuelta completa a la copia de seguridad.
 *
 * Merece la pena tenerlos porque son justo donde aparecen los fallos que no se ven: la pantalla
 * de Presupuestos, por ejemplo, era INALCANZABLE con la app recién instalada (solo se llegaba
 * desde una tarjeta de Inicio que aparece cuando ya tienes un presupuesto). Ese fallo lo
 * encontró el intento de escribir esta prueba.
 *
 * Uso:
 *   npm run build
 *   npm run test:flujos
 *
 * Las capturas quedan en `capturas/`.
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { creaComprobador, entraEnLaApp, rutaChromium, sirveDirectorio } from './navegador.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const DIST = join(RAIZ, 'dist')
const CAPTURAS = join(RAIZ, 'capturas')
const MOVIL = { width: 412, height: 915 }

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Falta dist/. Ejecuta primero: npm run build')
    process.exit(1)
  }
  if (readFileSync(join(DIST, 'index.html'), 'utf8').includes('/oikos/assets/')) {
    console.error('dist/ está compilado para la SUBCARPETA. Ejecuta primero: npm run build')
    process.exit(1)
  }

  mkdirSync(CAPTURAS, { recursive: true })
  const comprueba = creaComprobador('Flujos de la app en navegador real')
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

  const captura = async (nombre) => {
    await pagina.evaluate(() => window.scrollTo(0, 0))
    await pagina.waitForTimeout(150)
    await pagina.screenshot({ path: join(CAPTURAS, `flujo-${nombre}.png`) })
  }

  /** Teclea un importe en el teclado propio de la app. */
  const teclea = async (texto) => {
    for (const caracter of texto) {
      const tecla = caracter === ',' ? 'Coma decimal' : caracter
      await pagina.getByRole('button', { name: tecla, exact: true }).click()
    }
  }

  /**
   * Espera a que un texto APAREZCA y devuelve si lo ha hecho.
   *
   * Se usa en lugar de leer el texto de la pantalla y compararlo: leer y comparar es una
   * carrera, porque justo después de pulsar un botón el dato todavía no se ha actualizado en
   * pantalla y la comprobación falla sin que la app tenga nada malo. Esperar al texto bueno (con
   * un límite de tiempo) es lo que se quiere decir de verdad: "esto tiene que acabar saliendo".
   */
  const aparece = async (texto, limiteMs = 5_000) => {
    try {
      await pagina.getByText(texto, { exact: false }).first().waitFor({ timeout: limiteMs })
      return true
    } catch {
      return false
    }
  }

  /** Espera a que un texto DESAPAREZCA. */
  const desaparece = async (texto, limiteMs = 5_000) => {
    try {
      await pagina.getByText(texto, { exact: false }).first().waitFor({ state: 'detached', timeout: limiteMs })
      return true
    } catch {
      return false
    }
  }

  try {
    await pagina.goto(servidor.url, { waitUntil: 'domcontentloaded' })
    await entraEnLaApp(pagina, { destino: 'Entrar en la app' })
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 20_000 })

    // =====================================================================
    // 1. Crear el PRIMER presupuesto con la app recién instalada
    // =====================================================================
    await pagina.getByRole('button', { name: 'El mes', exact: true }).click()
    const botonPresupuestos = pagina.getByRole('button', { name: /Presupuestos y avisos/ })
    await botonPresupuestos.waitFor({ timeout: 10_000 })
    comprueba.comprueba(true, 'Con la app recién instalada se puede llegar a Presupuestos (antes no)')

    await botonPresupuestos.click()
    await pagina.getByText('Topes por categoría').waitFor({ timeout: 10_000 })
    comprueba.comprueba(true, 'La pantalla de Presupuestos abre sin tener ninguno creado')

    // Se busca por la ETIQUETA y no por el `id`: los `id` llevan un numero para ser seguros en
    // CSS, y la etiqueta es lo que ve una persona (y lo que un lector de pantalla lee).
    const topeAlimentacion = pagina.getByLabel(/^Alimentación/)
    await topeAlimentacion.fill('50')
    await topeAlimentacion.blur()
    await pagina.waitForTimeout(500)

    // Se sale y se vuelve para comprobar que se ha GUARDADO, no solo que se ve en pantalla.
    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: 'El mes', exact: true }).click()
    await pagina.getByRole('button', { name: /Presupuestos y avisos/ }).click()
    await pagina.getByText('Topes por categoría').waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      (await pagina.getByLabel(/^Alimentación/).inputValue()) === '50',
      'El tope se guarda de verdad (sigue ahí al salir y volver)',
    )

    // =====================================================================
    // 2. Que el aviso salga en Inicio cuando te pasas
    // =====================================================================
    await pagina.getByRole('button', { name: 'Apuntar', exact: true }).click()
    await teclea('100')
    await pagina.getByRole('button', { name: 'Alimentación', exact: false }).first().click()
    await pagina.getByPlaceholder('Mercadona, gasolina, cuota…').fill('Compra grande del mes')
    await pagina.getByRole('button', { name: 'Apuntar 100,00 €' }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })

    const textoInicio = await pagina.locator('body').innerText()
    comprueba.comprueba(
      textoInicio.toUpperCase().includes('PRESUPUESTOS QUE VIGILAR'),
      'Al pasarse del tope, Inicio avisa',
    )
    comprueba.comprueba(textoInicio.includes('te has pasado'), 'Y dice cuánto te has pasado')
    comprueba.comprueba(
      (await pagina.locator('.barra__relleno--pasado').count()) > 0,
      'La barra del presupuesto se pone en rojo',
    )
    await captura('01-aviso-presupuesto')

    // =====================================================================
    // 3. La foto del patrimonio del mes
    // =====================================================================
    await pagina.getByRole('button', { name: 'Patrimonio', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    const netoAntes = await pagina.locator('.cifra').first().innerText()

    await pagina.getByRole('button', { name: /Hacer la foto de hoy/ }).click()
    await pagina.getByText('Foto del patrimonio').waitFor({ timeout: 10_000 })
    const campoNomina = pagina.getByLabel('Cuenta nómina (ING)')
    const precargado = await campoNomina.inputValue()
    comprueba.comprueba(
      precargado === '1190,4',
      `La foto viene rellenada con lo que valían las cuentas la última vez (${precargado})`,
    )
    await captura('02-foto-patrimonio')

    await campoNomina.fill('2000')
    await pagina.getByRole('button', { name: 'Guardar la foto' }).click()
    await pagina.getByText('Fotos guardadas').waitFor({ timeout: 10_000 })

    const textoPatrimonio = await pagina.locator('body').innerText()
    comprueba.comprueba(textoPatrimonio.includes('2000,00'), 'La cuenta nueva sale con el valor corregido')
    comprueba.comprueba(textoPatrimonio.includes('37 fotos'), 'La foto se añade a las 36 del Excel')
    comprueba.comprueba(
      textoPatrimonio.includes('apuntada a mano'),
      'Se distingue de las que vinieron del Excel',
    )
    comprueba.comprueba(
      (await pagina.locator('.cifra').first().innerText()) !== netoAntes,
      'El patrimonio neto se recalcula con la foto nueva',
    )

    // =====================================================================
    // 4. Renombrar una categoría y que arrastre el histórico
    // =====================================================================
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })
    await pagina.locator('summary').filter({ hasText: 'Categorías' }).click()

    const campoDeporte = pagina.getByLabel('Nombre de la categoría Deporte')
    await campoDeporte.waitFor({ timeout: 10_000 })
    await campoDeporte.fill('Deporte y bici')
    await campoDeporte.blur()
    await pagina.waitForTimeout(600)

    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByRole('button', { name: 'Ver todos' }).click()
    await pagina.getByPlaceholder('Buscar por concepto o categoría').fill('Decathlon')
    await pagina.waitForTimeout(500)
    comprueba.comprueba(
      (await pagina.locator('body').innerText()).includes('Deporte y bici'),
      'Renombrar una categoría arrastra los movimientos que la usaban',
    )

    // =====================================================================
    // 5. Borrar un movimiento (pide confirmación)
    // =====================================================================
    const buscador = pagina.getByPlaceholder('Buscar por concepto o categoría')
    await buscador.fill('Bonarea')
    await pagina.waitForTimeout(400)
    await pagina.getByText('Bonarea', { exact: true }).first().click()
    await pagina.getByRole('button', { name: 'Borrar movimiento' }).waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: 'Borrar movimiento' }).click()
    await pagina.getByText('Confirmar borrado').waitFor({ timeout: 5_000 })
    comprueba.comprueba(true, 'Borrar un movimiento pide confirmación antes de tocar nada')

    await pagina.getByRole('button', { name: 'Confirmar borrado' }).click()
    await pagina.getByPlaceholder('Buscar por concepto o categoría').waitFor({ timeout: 10_000 })
    await pagina.getByPlaceholder('Buscar por concepto o categoría').fill('Bonarea')
    await pagina.waitForTimeout(500)
    comprueba.comprueba(
      (await pagina.locator('body').innerText()).includes('No hay movimientos con esos filtros'),
      'El movimiento borrado ya no está',
    )

    // =====================================================================
    // 6. La copia de seguridad: ida y vuelta
    // =====================================================================
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })

    const [descargaCopia] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 20_000 }),
      pagina.getByRole('button', { name: /Compartir o descargar la copia/ }).click(),
    ])
    const rutaCopia = await descargaCopia.path()
    const copia = JSON.parse(readFileSync(rutaCopia, 'utf8'))
    const movimientosEnLaCopia = copia.movimientos.length
    const fotosEnLaCopia = copia.fotos.length

    comprueba.comprueba(fotosEnLaCopia === 37, `La copia incluye la foto recién hecha (${fotosEnLaCopia} fotos)`)
    comprueba.comprueba(
      copia.presupuestos.length === 1 && copia.presupuestos[0].categoria === 'Alimentación',
      'La copia incluye el presupuesto creado',
    )
    comprueba.comprueba(copia.deudas.length === 4, 'La copia incluye las deudas')

    // Se apunta algo DESPUÉS de la copia, para comprobar que "reemplazar" lo quita.
    await pagina.getByRole('button', { name: 'Apuntar', exact: true }).click()
    await teclea('7')
    await pagina.getByRole('button', { name: 'Ocio', exact: false }).first().click()
    await pagina.getByPlaceholder('Mercadona, gasolina, cuota…').fill('Esto lo quita la copia')
    await pagina.getByRole('button', { name: 'Apuntar 7,00 €' }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })

    // --- Reemplazar ---
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.locator('#modo-import').selectOption('reemplazar')
    await pagina.locator('input[type="file"]').setInputFiles(rutaCopia)
    await pagina.getByText(/Copia restaurada/).waitFor({ timeout: 20_000 })
    comprueba.comprueba(true, 'La copia se restaura y la app lo dice')

    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
    comprueba.comprueba(
      !(await pagina.locator('body').innerText()).includes('Esto lo quita la copia'),
      '"Reemplazar" deja la app exactamente como la copia',
    )

    // --- Combinar, sin duplicar ---
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.locator('#modo-import').selectOption('combinar')
    await pagina.locator('input[type="file"]').setInputFiles(rutaCopia)
    await pagina.getByText(/Combinada/).waitFor({ timeout: 20_000 })

    const [descargaFinal] = await Promise.all([
      pagina.waitForEvent('download', { timeout: 20_000 }),
      pagina.getByRole('button', { name: /Compartir o descargar la copia/ }).click(),
    ])
    const copiaFinal = JSON.parse(readFileSync(await descargaFinal.path(), 'utf8'))
    comprueba.comprueba(
      copiaFinal.movimientos.length === movimientosEnLaCopia,
      `Combinar la misma copia no duplica movimientos (${copiaFinal.movimientos.length} = ${movimientosEnLaCopia})`,
    )
    comprueba.comprueba(
      copiaFinal.fotos.length === fotosEnLaCopia,
      `Ni duplica las fotos (${copiaFinal.fotos.length} = ${fotosEnLaCopia})`,
    )
    comprueba.comprueba(
      copiaFinal.presupuestos.length === 1,
      'Ni duplica el presupuesto',
    )

    // =====================================================================
    // 7. Las deudas: son lo que corrige el fallo del Excel, así que se prueban
    // =====================================================================
    await pagina.getByRole('button', { name: 'Patrimonio', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    const netoAntesDeLasDeudas = await pagina.locator('.cifra').first().innerText()

    await pagina.getByRole('button', { name: 'Revisar las deudas' }).click()
    await pagina.getByText('Deuda propia').waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      (await pagina.locator('body').innerText()).includes('91.953,13'),
      'La deuda propia suma hipoteca + pignoración + Firefish (91.953,13 €)',
    )

    // --- Editar el saldo de la hipoteca ---
    const tarjetaHipoteca = pagina.locator('.tarjeta').filter({ hasText: 'Hipoteca (ING)' })
    await tarjetaHipoteca.getByRole('button', { name: 'Editar' }).click()
    const campoSaldo = pagina.getByLabel('Capital pendiente')
    await campoSaldo.waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      (await campoSaldo.inputValue()).replace('.', ',') === '83738,84',
      'El formulario viene con el saldo que había',
    )
    await campoSaldo.fill('80000')
    await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()
    comprueba.comprueba(
      await aparece('88.214,29'),
      'Al corregir el saldo de la hipoteca, el total de deuda se recalcula',
    )

    // --- Marcar una deuda como pagada ---
    const tarjetaFirefish = pagina.locator('.tarjeta').filter({ hasText: 'Firefish' })
    await tarjetaFirefish.getByRole('button', { name: 'Marcar como pagada' }).click()
    comprueba.comprueba(await aparece('87.184,29'), 'Una deuda pagada deja de contar en el total')

    // --- Añadir una deuda y borrarla ---
    await pagina.getByRole('button', { name: '+ Añadir una deuda' }).click()
    await pagina.getByLabel('Nombre').fill('Deuda de prueba')
    await pagina.getByLabel('Capital pendiente').fill('500')
    await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()
    comprueba.comprueba(await aparece('87.684,29'), 'Una deuda nueva entra en el total')

    const tarjetaPrueba = pagina.locator('.tarjeta').filter({ hasText: 'Deuda de prueba' })
    await tarjetaPrueba.getByRole('button', { name: 'Editar' }).click()
    await pagina.getByRole('button', { name: 'Borrar', exact: true }).click()
    await pagina.getByRole('button', { name: 'Confirmar borrado' }).click()
    comprueba.comprueba(
      await desaparece('Deuda de prueba'),
      'Borrar una deuda pide confirmación y la quita',
    )

    await pagina.getByRole('button', { name: 'Volver', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      (await pagina.locator('.cifra').first().innerText()) !== netoAntesDeLasDeudas,
      'El patrimonio neto cambia al corregir las deudas (es lo que el Excel no hacía)',
    )

    // =====================================================================
    // 8. Las flechas de mes no apilan pantallas
    // =====================================================================
    // Se cambió el mes que se mira para que viva en el estado de la pantalla y no en la pila de
    // navegación, y un cambio así se deja probado: si cada flecha apilara una pantalla, después
    // de mirar tres meses habría que pulsar "atrás" tres veces para salir, y el historial del
    // móvil se llenaría de meses.
    await pagina.getByRole('button', { name: 'El mes', exact: true }).click()
    await pagina.getByRole('button', { name: 'Mes anterior' }).waitFor({ timeout: 10_000 })

    // Se compara el TÍTULO DEL MES, no el texto entero de la pantalla. Comparar todo el texto era
    // otra carrera: al entrar en la pantalla, las consultas a la base todavía están cargando, así
    // que el texto de antes y el de después podían ser distintos por los datos y no por el mes.
    const mesMostrado = () => pagina.locator('.reparte .cifra--mediana').first().innerText()
    const mesInicial = await mesMostrado()

    for (let i = 0; i < 3; i += 1) await pagina.getByRole('button', { name: 'Mes anterior' }).click()
    const mesAtras = await mesMostrado()
    comprueba.comprueba(
      mesAtras !== mesInicial,
      `Las flechas cambian de mes (${mesInicial} → ${mesAtras})`,
    )
    comprueba.comprueba(
      (await pagina.getByRole('button', { name: 'Volver' }).count()) === 0,
      'Mirar otros meses NO apila pantallas (no aparece el botón de volver)',
    )

    for (let i = 0; i < 3; i += 1) await pagina.getByRole('button', { name: 'Mes siguiente' }).click()
    const mesFinal = await mesMostrado()
    comprueba.comprueba(
      mesFinal === mesInicial,
      `Y con las flechas se vuelve al mes de partida (${mesInicial} → ${mesAtras} → ${mesFinal})`,
    )

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
  console.error('Las pruebas de flujos han fallado:', error)
  process.exit(1)
})
