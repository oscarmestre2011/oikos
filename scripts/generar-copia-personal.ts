/**
 * Genera la COPIA PERSONAL de Óscar: el archivo que se importa una vez en el móvil para tener
 * dentro todo su histórico.
 *
 * POR QUE EXISTE ESTE SCRIPT, Y NO UNA SEMILLA DENTRO DE LA APP
 *
 * Antes, el histórico iba dentro del código de la app (`src/datos/semilla.ts`). Eso funciona,
 * pero tiene un problema que se descubrió al publicar: **el repositorio es público**, así que
 * los saldos de todas sus cuentas, su nómina, su hipoteca y su patrimonio neto quedaban
 * legibles por cualquiera. Y encima la app dice en su ayuda que "nadie más los ve", que era
 * mentira mientras el histórico viajara dentro.
 *
 * Ahora la app se publica SIN datos personales y este script construye, aparte, un archivo de
 * copia de seguridad que Óscar importa en su móvil (Ajustes → Importar copia → Reemplazar). El
 * archivo vive en `99 App Oikos/datos/`, FUERA del repositorio, así que no se publica nunca.
 *
 * Además, aquí se hace la comprobación que antes estaba en las pruebas: que cada una de las
 * fotos de patrimonio cuadre EXACTAMENTE con los totales del Excel. Es mejor sitio: es una
 * propiedad de la extracción, no de la app.
 *
 * Uso:  npm run copia:personal
 *
 * Entradas (las dos fuera del repositorio):
 *   ../datos/historico.json   patrimonio, movimientos y compras de Bitcoin
 *   ../datos/deudas.json      las deudas
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AJUSTES_INICIALES, CATEGORIAS_INICIALES } from '../src/datos/catalogo'
import type { CompraBitcoin, Cuenta, Deuda, FotoPatrimonio, Movimiento } from '../src/types'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DATOS = resolve(AQUI, '..', '..', 'datos')
const ENTRADA_HISTORICO = join(DATOS, 'historico.json')
const ENTRADA_DEUDAS = join(DATOS, 'deudas.json')
const SALIDA = join(DATOS, 'oikos-mi-historial.json')

interface FotoExcel {
  fecha: string
  fechaAproximada: boolean
  origen: string
  etiquetaMes: string
  liquidez: { etiqueta: string; cuenta: string; importe: number }[]
  activos: { etiqueta: string; cuenta: string; importe: number }[]
  sumaLiquidez: number
  sumaActivos: number
  totalLiquidez: number | null
  totalActivos: number | null
  neto: number | null
}

interface Historico {
  generado: string
  fuentes: { excel: string; csv: string }
  patrimonio: FotoExcel[]
  bitcoin: CompraBitcoin[]
  movimientos: { fecha: string; tipo: string; categoria: string; concepto: string; importe: number }[]
  cuentasDetectadas: { nombre: string; bloque: string; primera: string; ultima: string; enUso: boolean }[]
  descuadres: unknown[]
  resumen: Record<string, unknown>
}

/**
 * Traduce el tipo del CSV a los cuatro tipos de Oikos.
 *
 * En el CSV original la misma idea estaba escrita de tres maneras (unas aportaciones a inversión
 * venian marcadas como `Gasto`, cuando no lo son). Manda la CATEGORIA antes que la columna Tipo,
 * porque es la categoria la que dice de verdad a qué se destina el dinero.
 */
function tipoDe(movimiento: { tipo: string; categoria: string }): Movimiento['tipo'] {
  const limpiar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const tipo = limpiar(movimiento.tipo)
  const categoria = limpiar(movimiento.categoria)
  if (categoria.startsWith('amortiz')) return 'amortizacion'
  if (categoria.startsWith('invers') || categoria.startsWith('familia')) return 'inversion'
  if (tipo.startsWith('invers')) return 'inversion'
  if (tipo.startsWith('ingres') || categoria.startsWith('ingres')) return 'ingreso'
  return 'gasto'
}

function main() {
  if (!existsSync(ENTRADA_HISTORICO)) {
    console.error(`Falta ${ENTRADA_HISTORICO}. Se genera con: python datos/extraer-historico.py`)
    process.exit(1)
  }
  if (!existsSync(ENTRADA_DEUDAS)) {
    console.error(`Falta ${ENTRADA_DEUDAS}.`)
    process.exit(1)
  }

  const historico = JSON.parse(readFileSync(ENTRADA_HISTORICO, 'utf8')) as Historico
  const deudas = JSON.parse(readFileSync(ENTRADA_DEUDAS, 'utf8')) as Deuda[]

  // --- Cuentas ---------------------------------------------------------
  const cuentas: Cuenta[] = historico.cuentasDetectadas.map((cuenta, indice) => ({
    nombre: cuenta.nombre,
    bloque: cuenta.bloque === 'activos' ? 'activo' : 'liquidez',
    orden: indice,
    activa: Boolean(cuenta.enUso),
  }))

  // --- Fotos de patrimonio ---------------------------------------------
  const fotos: FotoPatrimonio[] = historico.patrimonio.map((foto) => ({
    fecha: foto.fecha,
    valores: [...foto.liquidez, ...foto.activos].map((linea) => ({
      cuenta: linea.cuenta,
      importe: linea.importe,
    })),
    notas: `Según tu Excel: ${foto.origen} (${foto.etiquetaMes})`,
    origen: 'excel',
    fechaAproximada: Boolean(foto.fechaAproximada),
  }))

  // --- COMPROBACION: cada foto tiene que cuadrar con el Excel ----------
  // Es la misma comprobación que hacía la prueba de `patrimonio.test.ts`, movida aquí: lo que
  // hay que garantizar es que ESTE archivo (el que Óscar va a importar) reproduce el Excel.
  const bloqueDe = new Map(cuentas.map((c) => [c.nombre, c.bloque]))
  const descuadres: string[] = []
  for (let i = 0; i < fotos.length; i += 1) {
    const generada = fotos[i]
    const delExcel = historico.patrimonio[i]
    let liquidez = 0
    let activos = 0
    for (const valor of generada.valores) {
      if (bloqueDe.get(valor.cuenta) === 'liquidez') liquidez += valor.importe
      else activos += valor.importe
    }
    const redondea = (n: number) => Math.round(n * 100) / 100
    if (delExcel.totalLiquidez !== null && redondea(liquidez) !== delExcel.totalLiquidez) {
      descuadres.push(`${generada.fecha} liquidez: ${redondea(liquidez)} != ${delExcel.totalLiquidez}`)
    }
    if (delExcel.totalActivos !== null && redondea(activos) !== delExcel.totalActivos) {
      descuadres.push(`${generada.fecha} activos: ${redondea(activos)} != ${delExcel.totalActivos}`)
    }
  }

  // --- Movimientos y Bitcoin -------------------------------------------
  const movimientos: Movimiento[] = historico.movimientos.map((movimiento) => ({
    fecha: movimiento.fecha,
    tipo: tipoDe(movimiento),
    categoria: movimiento.categoria,
    concepto: movimiento.concepto,
    importe: movimiento.importe,
    origen: 'historico',
    creado: `${movimiento.fecha}T12:00:00.000Z`,
  }))

  const bitcoin: CompraBitcoin[] = historico.bitcoin.map((compra) => ({
    fecha: compra.fecha,
    precioBtc: compra.precioBtc,
    cantidadBtc: compra.cantidadBtc,
    importe: compra.importe,
  }))

  // --- El archivo de copia, con el MISMO formato que exporta la app -----
  const copia = {
    app: 'oikos',
    version: 1,
    exportado: new Date().toISOString(),
    movimientos,
    categorias: CATEGORIAS_INICIALES,
    cuentas,
    deudas,
    fotos,
    presupuestos: [],
    ajustes: AJUSTES_INICIALES,
    bitcoin,
  }

  writeFileSync(SALIDA, JSON.stringify(copia, null, 2), 'utf8')

  const kb = (readFileSync(SALIDA).length / 1024).toFixed(1)
  const btc = bitcoin.reduce((t, c) => t + c.cantidadBtc, 0)
  console.log('')
  console.log(`Copia personal escrita en: ${SALIDA}  (${kb} KB)`)
  console.log('')
  console.log(`  fotos de patrimonio : ${fotos.length}   (${fotos[0]?.fecha} -> ${fotos[fotos.length - 1]?.fecha})`)
  console.log(`  movimientos         : ${movimientos.length}`)
  console.log(`  cuentas             : ${cuentas.length}  (${cuentas.filter((c) => c.activa).length} en uso)`)
  console.log(`  deudas              : ${deudas.length}`)
  console.log(`  compras de Bitcoin  : ${bitcoin.length}  (${btc.toFixed(8)} BTC)`)
  console.log(`  categorias          : ${CATEGORIAS_INICIALES.length}`)
  console.log('')
  console.log(`  COMPROBACION contra el Excel: ${descuadres.length === 0 ? 'las ' + fotos.length + ' fotos cuadran exactamente' : descuadres.length + ' DESCUADRES'}`)
  if (descuadres.length > 0) {
    for (const d of descuadres.slice(0, 10)) console.log(`    - ${d}`)
    console.error('')
    console.error('La copia NO se puede dar por buena: hay partidas mal clasificadas.')
    process.exit(1)
  }
}

main()
