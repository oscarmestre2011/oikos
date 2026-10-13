/**
 * Pruebas de los FLUJOS de la app: las cosas que se hacen de verdad, de principio a fin.
 *
 * `smoke.mjs` comprueba que la app abre, apunta un gasto y lo enseña. Aquí se prueban los
 * caminos que se recorren de vez en cuando y que, por eso mismo, nadie prueba: crear el primer
 * presupuesto, hacer la foto del patrimonio, renombrar una categoría, borrar un movimiento,
 * apuntar y corregir deudas y dar una vuelta completa a la copia de seguridad.
 *
 * Merece la pena tenerlos porque son justo donde aparecen los fallos que no se ven: la pantalla
 * de Presupuestos, por ejemplo, era INALCANZABLE con la app recién instalada (solo se llegaba
 * desde una tarjeta de Inicio que aparece cuando ya tienes un presupuesto). Ese fallo lo
 * encontró el intento de escribir esta prueba.
 *
 * IMPORTANTE: esta prueba NO lee ningún fichero de datos ni da por hecho ningún dato personal.
 * La app arranca vacía a propósito (el repositorio es público) y **todo lo que se comprueba aquí
 * lo crea la propia prueba a través de la interfaz**: un presupuesto de 50 €, un gasto de 100 €,
 * la foto del patrimonio, una deuda inventada y los movimientos que luego borra. Toda cifra que
 * se compara sale de lo que la prueba acaba de escribir.
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

// ---------------------------------------------------------------------------
// Datos que INVENTA esta prueba. Ninguno viene de nadie: son los que ella misma
// apunta por la interfaz y luego comprueba. Lo único que se reutiliza del código
// de la app son los nombres genéricos de sus cuentas ("Cuenta corriente",
// "Efectivo"), que sí están en el repositorio.
// ---------------------------------------------------------------------------

const CATEGORIA = 'Alimentación'
const CATEGORIA_RENOMBRADA = 'Alimentación y casa'
const TOPE_ALIMENTACION = '50'
const GASTO_GRANDE = 'Compra grande del mes'
const GASTO_GRANDE_IMPORTE = '100'
const MOV_QUE_SE_BORRA = 'Movimiento que se borra'
const MOV_POSTERIOR_A_LA_COPIA = 'Esto lo quita la copia'

/** La foto del patrimonio que hace la prueba con las cuentas genéricas de la app. */
const FOTO_CORRIENTE = '2000'
const FOTO_EFECTIVO = '100'
const FOTO_TOTAL = '2100,00 €'

/** La deuda inventada de la prueba, y su saldo corregido. */
const DEUDA = 'Hipoteca de prueba'
const DEUDA_SALDO = '5000'
const DEUDA_SALDO_CORREGIDO = '80000'
const DEUDA_TEMPORAL = 'Deuda temporal'
const DEUDA_TEMPORAL_SALDO = '500'
/** Una deuda que paga otra persona: se enseña, pero NO se resta del patrimonio. */
const DEUDA_COMPARTIDA = 'Prestamo compartido de prueba'
const DEUDA_COMPARTIDA_SALDO = '1000'

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

  /**
   * Espera a que la CIFRA GRANDE de la pantalla valga exactamente esto y devuelve si lo ha hecho.
   *
   * Se compara con `===` (no con "contiene") porque en estas pantallas los importes se parecen
   * mucho entre sí: buscar "0,00 €" mientras pone "80.000,00 €" daría por bueno un resultado que
   * no lo es. La primera `.cifra` del documento es la protagonista de la pantalla: el neto en
   * Patrimonio, la deuda propia en Mis deudas.
   */
  const cifraPrincipal = async (texto, limiteMs = 5_000) => {
    try {
      await pagina.waitForFunction(
        // Se comparan sin espacios: el formateador de euros mete un espacio fino entre el
        // número y el símbolo (2100,00 €), y comparar carácter a carácter fallaría por eso.
        (esperado) =>
          (document.querySelector('.cifra')?.textContent ?? '').replace(/\s/g, '') ===
          esperado.replace(/\s/g, ''),
        texto,
        { timeout: limiteMs },
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * La cifra grande de una tarjeta concreta, identificada por un texto que lleve dentro.
   *
   * Hace falta desde que las deudas se ven en la propia pantalla de Patrimonio: ahí ya no hay una
   * sola cifra grande, sino varias a la vez (el patrimonio neto y el total de la deuda propia),
   * así que "la primera del documento" ya no distingue una de otra.
   */
  const cifraDeLaTarjeta = async (textoDeLaTarjeta, esperado, limiteMs = 5_000) => {
    try {
      await pagina.waitForFunction(
        ([titulo, buscado]) => {
          const tarjetas = [...document.querySelectorAll('.tarjeta')]
          const tarjeta = tarjetas.find((t) => (t.textContent ?? '').includes(titulo))
          if (!tarjeta) return false
          const cifra = tarjeta.querySelector('.cifra')
          return (cifra?.textContent ?? '').replace(/\s/g, '') === buscado
        },
        [textoDeLaTarjeta, esperado.replace(/\s/g, '')],
        { timeout: limiteMs },
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * El importe de una fila concreta, buscándola por el texto de su título.
   *
   * No sirve `cifraDeLaTarjeta` para esto: esa devuelve la primera cifra grande de la tarjeta, que
   * en "Mis deudas" es el total de la deuda propia y no la fila que se quiere comprobar.
   */
  const filaDeLaTarjeta = async (tituloDeLaFila, esperado, limiteMs = 5_000) => {
    try {
      await pagina.waitForFunction(
        ([titulo, buscado]) => {
          const filas = [...document.querySelectorAll('.reparte')]
          const fila = filas.find(
            (f) => (f.querySelector('.fila__titulo')?.textContent ?? '').trim() === titulo,
          )
          if (!fila) return false
          return (fila.querySelector('.fila__importe')?.textContent ?? '').replace(/\s/g, '') === buscado
        },
        [tituloDeLaFila, esperado.replace(/\s/g, '')],
        { timeout: limiteMs },
      )
      return true
    } catch {
      return false
    }
  }

  /** El campo de concepto de Apuntar, sin depender del texto de su marcador. */
  const campoConcepto = () =>
    pagina.locator('.tarjeta').filter({ hasText: 'Concepto' }).getByRole('textbox').first()

  try {
    await pagina.goto(servidor.url, { waitUntil: 'domcontentloaded' })
    await entraEnLaApp(pagina, { destino: 'Entrar en la app' })
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 20_000 })

    // La app recién instalada no lleva ni un dato de nadie, y antes no lo decía: se veían ceros
    // por todas partes y no había forma de saber si faltaba cargar algo o si estaba rota.
    comprueba.comprueba(
      await aparece('Está vacía porque no lleva tus datos dentro'),
      'Con la app recién instalada, Inicio avisa de que está vacía y de dónde se cargan los datos',
    )

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
    await topeAlimentacion.fill(TOPE_ALIMENTACION)
    await topeAlimentacion.blur()
    await pagina.waitForTimeout(500)

    // Se sale y se vuelve para comprobar que se ha GUARDADO, no solo que se ve en pantalla.
    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: 'El mes', exact: true }).click()
    await pagina.getByRole('button', { name: /Presupuestos y avisos/ }).click()
    await pagina.getByText('Topes por categoría').waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      (await pagina.getByLabel(/^Alimentación/).inputValue()) === TOPE_ALIMENTACION,
      'El tope se guarda de verdad (sigue ahí al salir y volver)',
    )

    // =====================================================================
    // 2. Que el aviso salga en Inicio cuando te pasas
    // =====================================================================
    await pagina.getByRole('button', { name: 'Apuntar', exact: true }).click()
    await teclea(GASTO_GRANDE_IMPORTE)
    await pagina.getByRole('button', { name: 'Alimentación', exact: false }).first().click()
    await campoConcepto().fill(GASTO_GRANDE)
    await pagina.getByRole('button', { name: 'Apuntar 100,00 €' }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })

    // Los 100 € del tope de 50 € los ha apuntado la prueba: el aviso sale de SUS cifras.
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

    const abrirFoto = async () => {
      await pagina.getByRole('button', { name: /Hacer la foto de hoy/ }).click()
      await pagina.getByText('Foto del patrimonio').waitFor({ timeout: 10_000 })
    }

    await abrirFoto()
    const campoCorriente = pagina.getByLabel('Cuenta corriente')
    const campoEfectivo = pagina.getByLabel('Efectivo')
    // La app arranca sin ninguna foto, así que la primera vez no hay nada que precargar.
    const vaciaAlEmpezar =
      (await campoCorriente.inputValue()) === '' && (await campoEfectivo.inputValue()) === ''

    await campoCorriente.fill(FOTO_CORRIENTE)
    await campoEfectivo.fill(FOTO_EFECTIVO)
    await captura('02-foto-patrimonio')
    await pagina.getByRole('button', { name: 'Guardar la foto' }).click()
    await pagina.getByText('Fotos guardadas').waitFor({ timeout: 10_000 })

    // Y la segunda vez sí tiene que venir rellenada con lo que valían las cuentas la última vez:
    // es lo que hace que la foto mensual sea corregir dos números y no teclearlos todos.
    await abrirFoto()
    const precargada = await pagina.getByLabel('Cuenta corriente').inputValue()
    await pagina.getByRole('button', { name: 'Cancelar', exact: true }).click()
    comprueba.comprueba(
      vaciaAlEmpezar && precargada === FOTO_CORRIENTE,
      `La foto viene vacía la primera vez (${vaciaAlEmpezar ? 'sí' : 'NO'}) y al repetirla con lo último guardado (${precargada})`,
    )

    comprueba.comprueba(
      (await aparece(`${FOTO_CORRIENTE},00`)) && (await aparece(`${FOTO_EFECTIVO},00`)),
      `La cuenta nueva sale con el valor que ha tecleado la prueba (${FOTO_CORRIENTE} € y ${FOTO_EFECTIVO} €)`,
    )
    comprueba.comprueba(
      await aparece('1 fotos'),
      'La foto se añade a las que había: ahora hay 1 (antes esta comprobación contaba las 36 del Excel)',
    )
    comprueba.comprueba(
      await aparece('apuntada a mano'),
      'Se distingue de las que vinieran de una copia importada',
    )
    comprueba.comprueba(
      await cifraPrincipal(FOTO_TOTAL),
      `El patrimonio neto se recalcula con la foto nueva (${FOTO_TOTAL})`,
    )

    // =====================================================================
    // 4. Renombrar una categoría y que arrastre el histórico
    // =====================================================================
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })
    await pagina.locator('summary').filter({ hasText: 'Categorías' }).click()

    const campoCategoria = pagina.getByLabel(`Nombre de la categoría ${CATEGORIA}`)
    await campoCategoria.waitFor({ timeout: 10_000 })
    await campoCategoria.fill(CATEGORIA_RENOMBRADA)
    await campoCategoria.blur()
    await pagina.waitForTimeout(600)

    // Antes se buscaba un movimiento del histórico real. Ahora se busca el gasto que ha
    // apuntado esta misma prueba, que es el que usa esa categoría.
    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: 'Ver todos' }).click()
    const buscador = pagina.getByPlaceholder('Buscar por concepto o categoría')
    await buscador.waitFor({ timeout: 10_000 })
    await buscador.fill(GASTO_GRANDE)
    comprueba.comprueba(
      await aparece(CATEGORIA_RENOMBRADA),
      'Renombrar una categoría arrastra los movimientos que la usaban',
    )

    // =====================================================================
    // 5. Borrar un movimiento (pide confirmación)
    // =====================================================================
    // El movimiento que se borra lo apunta la prueba aquí mismo: antes se borraba uno del
    // histórico de Óscar, y eso ya no existe (ni debe existir) dentro del repositorio.
    await pagina.getByRole('button', { name: 'Apuntar', exact: true }).click()
    await pagina.getByRole('button', { name: 'Apuntar 0,00 €' }).waitFor({ timeout: 10_000 })
    await teclea('7')
    await pagina.getByRole('button', { name: 'Ocio', exact: false }).first().click()
    await campoConcepto().fill(MOV_QUE_SE_BORRA)
    await pagina.getByRole('button', { name: 'Apuntar 7,00 €' }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })

    await pagina.getByRole('button', { name: 'Ver todos' }).click()
    const buscadorBorrado = pagina.getByPlaceholder('Buscar por concepto o categoría')
    await buscadorBorrado.waitFor({ timeout: 10_000 })
    await buscadorBorrado.fill(MOV_QUE_SE_BORRA)
    await pagina.getByText(MOV_QUE_SE_BORRA, { exact: true }).first().click()
    await pagina.getByRole('button', { name: 'Borrar movimiento' }).waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: 'Borrar movimiento' }).click()
    comprueba.comprueba(
      await aparece('Confirmar borrado'),
      'Borrar un movimiento pide confirmación antes de tocar nada',
    )

    await pagina.getByRole('button', { name: 'Confirmar borrado' }).click()
    const buscadorTrasBorrar = pagina.getByPlaceholder('Buscar por concepto o categoría')
    await buscadorTrasBorrar.waitFor({ timeout: 10_000 })
    await buscadorTrasBorrar.fill(MOV_QUE_SE_BORRA)
    comprueba.comprueba(
      await aparece('No hay movimientos con esos filtros'),
      'El movimiento borrado ya no está',
    )

    // =====================================================================
    // 6. La copia de seguridad: ida y vuelta
    // =====================================================================
    // Antes de hacer la copia, la prueba apunta su propia deuda: así la copia lleva algo de
    // verdad que comprobar, en lugar de dar por hecho que existía la hipoteca de nadie.
    await pagina.getByRole('button', { name: 'Patrimonio', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    // Las deudas se ven ya en esta misma pantalla: no hay que entrar en ningún sitio.
    await pagina.getByText('Deuda propia').waitFor({ timeout: 10_000 })
    await pagina.getByRole('button', { name: '+ Añadir una deuda' }).click()
    await pagina.getByLabel('Nombre').fill(DEUDA)
    await pagina.getByLabel('Capital pendiente').fill(DEUDA_SALDO)
    await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()
    await pagina.getByText(DEUDA, { exact: true }).waitFor({ timeout: 10_000 })

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

    comprueba.comprueba(
      fotosEnLaCopia === 1,
      `La copia incluye la foto que ha hecho la prueba (${fotosEnLaCopia} foto)`,
    )
    comprueba.comprueba(
      copia.presupuestos.length === 1 && copia.presupuestos[0].categoria === CATEGORIA_RENOMBRADA,
      'La copia incluye el presupuesto creado, ya con la categoría renombrada',
    )
    comprueba.comprueba(
      copia.deudas.length === 1 && copia.deudas[0].nombre === DEUDA,
      `La copia incluye la deuda que ha creado la prueba (${copia.deudas.length})`,
    )

    // Se apunta algo DESPUÉS de la copia, para comprobar que "reemplazar" lo quita.
    await pagina.getByRole('button', { name: 'Apuntar', exact: true }).click()
    await pagina.getByRole('button', { name: 'Apuntar 0,00 €' }).waitFor({ timeout: 10_000 })
    await teclea('7')
    await pagina.getByRole('button', { name: 'Ocio', exact: false }).first().click()
    await campoConcepto().fill(MOV_POSTERIOR_A_LA_COPIA)
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
      !(await pagina.locator('body').innerText()).includes(MOV_POSTERIOR_A_LA_COPIA),
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
    // 7. Las deudas: se apuntan, se corrigen y se borran
    // =====================================================================
    // Las deudas del plan financiero de Óscar eran un dato suyo y ya no viajan en el código.
    // La prueba se crea la suya (arriba) y aquí comprueba que los totales salen de SUS cifras.
    await pagina.getByRole('button', { name: 'Patrimonio', exact: true }).click()
    await pagina.getByText('Patrimonio neto', { exact: false }).first().waitFor({ timeout: 10_000 })
    const netoAntesDeLasDeudas = await pagina.locator('.cifra').first().innerText()

    // La tarjeta "Mis deudas" está en la propia pantalla, sin entrar en ningún sitio: eso es
    // justo lo que se arregló (antes había que encontrar un botón para llegar a ella).
    await pagina.getByText('Deuda propia').waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      await cifraDeLaTarjeta('Deuda propia', '5000,00 €'),
      'La deuda propia es la que ha apuntado la prueba (5000,00 €)',
    )

    // --- Editar el saldo de la deuda ---
    const tarjetaDeuda = pagina.locator('.tarjeta').filter({ hasText: DEUDA })
    await tarjetaDeuda.getByRole('button', { name: 'Editar' }).click()
    const campoSaldo = pagina.getByLabel('Capital pendiente')
    await campoSaldo.waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      (await campoSaldo.inputValue()).replace('.', ',') === DEUDA_SALDO,
      'El formulario viene con el saldo que había',
    )
    await campoSaldo.fill(DEUDA_SALDO_CORREGIDO)
    await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()
    comprueba.comprueba(
      await cifraDeLaTarjeta('Deuda propia', '80.000,00 €'),
      'Al corregir el saldo de la deuda, el total se recalcula',
    )

    // --- Marcar una deuda como pagada ---
    const tarjetaDeudaPagada = pagina.locator('.tarjeta').filter({ hasText: DEUDA })
    await tarjetaDeudaPagada.getByRole('button', { name: 'Marcar como pagada' }).click()
    comprueba.comprueba(
      await cifraDeLaTarjeta('Deuda propia', '0,00 €'),
      'Una deuda pagada deja de contar en el total',
    )

    // --- Una deuda compartida NO se resta, pero SÍ aparece en el total apuntado ---
    // Esto sale de una duda real: «las deudas no se suman». La app sumaba bien (la compartida no
    // se resta del patrimonio, a propósito), pero la pantalla no lo decía y la lista parecía no
    // cuadrar: sumando todas las deudas salía más que el número grande. Ahora la tarjeta enseña el
    // desglose, y aquí se comprueba que los tres números son coherentes entre sí.
    await pagina.getByRole('button', { name: '+ Añadir una deuda' }).click()
    await pagina.getByLabel('Nombre').fill(DEUDA_COMPARTIDA)
    await pagina.getByLabel('Capital pendiente').fill(DEUDA_COMPARTIDA_SALDO)
    await pagina.getByRole('checkbox', { name: /La paga otra persona/ }).check()
    await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()

    const tarjetaCompartida = pagina.locator('.tarjeta').filter({ hasText: DEUDA_COMPARTIDA })
    comprueba.comprueba(
      (await tarjetaCompartida.innerText()).includes('compartida'),
      'Una deuda compartida se distingue en su propia tarjeta',
    )
    // OJO con el formato: en español los números de CUATRO cifras se escriben sin punto de millar
    // («1000,00 €», no «1.000,00 €»). Lo hace así el formateador de la app, y estuvo a punto de
    // parecer un fallo de la app cuando era de la prueba.
    comprueba.comprueba(
      await filaDeLaTarjeta('Deuda compartida', '1000,00 €'),
      'El desglose enseña aparte lo que se debe y paga otra persona',
    )
    comprueba.comprueba(
      await filaDeLaTarjeta('Total apuntado', '1000,00 €'),
      'El total apuntado SÍ suma la compartida (la propia está a cero: se marcó como pagada)',
    )
    comprueba.comprueba(
      await cifraDeLaTarjeta('Deuda propia', '0,00 €'),
      'Pero la deuda propia, la que se resta del patrimonio, no la incluye',
    )

    // --- Añadir una deuda y borrarla ---
    await pagina.getByRole('button', { name: '+ Añadir una deuda' }).click()
    await pagina.getByLabel('Nombre').fill(DEUDA_TEMPORAL)
    await pagina.getByLabel('Capital pendiente').fill(DEUDA_TEMPORAL_SALDO)
    await pagina.getByRole('button', { name: 'Guardar', exact: true }).click()
    comprueba.comprueba(
      await cifraDeLaTarjeta('Deuda propia', '500,00 €'),
      'Una deuda nueva entra en el total',
    )

    // Se borra desde la LISTA, que es donde está el botón de añadir: si se puede añadir una deuda
    // ahí, se tiene que poder quitar ahí. Antes solo se podía desde dentro del formulario de
    // edición, y eso no se encuentra (duda real de Óscar).
    const tarjetaTemporal = pagina.locator('.tarjeta').filter({ hasText: DEUDA_TEMPORAL })
    await tarjetaTemporal.getByRole('button', { name: 'Borrar', exact: true }).click()
    comprueba.comprueba(
      (await aparece('Confirmar borrado')) && (await pagina.getByText(DEUDA_TEMPORAL).count()) > 0,
      'Borrar una deuda desde la lista pide confirmación y todavía no la borra',
    )
    await tarjetaTemporal.getByRole('button', { name: 'Confirmar borrado' }).click()
    comprueba.comprueba(
      await desaparece(DEUDA_TEMPORAL),
      'Y el segundo toque la borra de verdad',
    )

    comprueba.comprueba(
      (await pagina.locator('.cifra').first().innerText()) !== netoAntesDeLasDeudas,
      'El patrimonio neto cambia al corregir las deudas',
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

    // =====================================================================
    // 9. Ajustes: los objetivos y las dos operaciones destructivas
    // =====================================================================
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByText('Copia de seguridad', { exact: true }).waitFor({ timeout: 10_000 })

    // --- Los objetivos se guardan al salir del campo ---
    const objetivoInversion = pagina.getByLabel(/Inversión mensual/)
    await objetivoInversion.fill('250')
    await objetivoInversion.blur()
    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    comprueba.comprueba(
      await aparece('/ 250,00'),
      'El objetivo de inversión se guarda solo al salir del campo y sale en Inicio',
    )

    // --- Volver a los datos de partida (antes: "recargar el histórico del Excel") ---
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByRole('button', { name: 'Volver a los datos de partida' }).click()
    await pagina.getByRole('button', { name: 'Confirmar: se borra lo que hayas apuntado' }).click()
    comprueba.comprueba(
      await aparece('Datos de partida restaurados'),
      'Volver a los datos de partida pide confirmación antes de borrar nada',
    )

    await pagina.getByRole('button', { name: 'Inicio', exact: true }).click()
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    // Se ha llegado a Inicio (con sus pestañas), no a la pantalla de bienvenida, y la app queda
    // vacía: 21 categorías y 6 cuentas genéricas, sin nada de la prueba.
    comprueba.comprueba(
      await aparece('Está vacía porque no lleva tus datos dentro'),
      'Y no vuelve a salir la pantalla de bienvenida: la app queda vacía y lo dice en Inicio',
    )

    await pagina.getByRole('button', { name: 'Ver todos' }).click()
    comprueba.comprueba(
      await aparece('0 movimientos'),
      'Los datos vuelven a estar como el primer día (0 movimientos: el histórico del Excel ya no existe)',
    )

    // --- Borrar todos los datos ---
    await pagina.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await pagina.getByRole('button', { name: 'Borrar todos los datos' }).click()
    await pagina.getByRole('button', { name: 'Confirmar: borrar TODO' }).click()
    comprueba.comprueba(
      await aparece('Empezar apuntando un gasto'),
      'Borrar todos los datos deja la app como recién instalada (vuelve la bienvenida)',
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
