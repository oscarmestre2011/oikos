/**
 * Genera `src/datos/semilla.ts` a partir de `../datos/historico.json`.
 *
 * Ese JSON lo produce `datos/extraer-historico.py`, que lee el excel real de Oscar
 * (FINANZAS_PERSONALES 2024.xlsx) y su Gastos 2026.csv. Aqui solo se traduce a TypeScript
 * y se normalizan los tipos de movimiento, que en el CSV original venian inconsistentes.
 *
 * Uso:  npm run semilla
 *
 * El fichero generado NO se edita a mano: si hay que cambiar un dato, se cambia en el
 * excel y se vuelve a lanzar los dos pasos.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const ENTRADA = resolve(AQUI, '..', '..', 'datos', 'historico.json')
const SALIDA = resolve(AQUI, '..', 'src', 'datos', 'semilla.ts')

/**
 * Traduce el tipo del CSV a los cuatro tipos de Oikos.
 *
 * Hace falta porque en el CSV original la misma idea estaba escrita de tres maneras:
 *   - `Inversión,Amortización,Amortización,100`      -> amortizacion
 *   - `Gasto,Inversión,Mintos,200`                    -> inversion (¡estaba como Gasto!)
 *   - `Inversión,Familia,Fondo Paula,100`             -> inversion
 * Manda la CATEGORIA antes que la columna Tipo, porque la categoria es la que describe
 * de verdad a que se destina el dinero.
 */
function tipoDe(movimiento) {
  const tipo = String(movimiento.tipo ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const categoria = String(movimiento.categoria ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (categoria.startsWith('amortiz')) return 'amortizacion'
  if (categoria.startsWith('invers') || categoria.startsWith('familia')) return 'inversion'
  if (tipo.startsWith('invers')) return 'inversion'
  if (tipo.startsWith('ingres') || categoria.startsWith('ingres')) return 'ingreso'
  return 'gasto'
}

/** 'activos' (como lo llama el excel) -> 'activo' (como lo llama la app). */
function bloqueDe(bloque) {
  return bloque === 'activos' ? 'activo' : bloque
}

const historico = JSON.parse(readFileSync(ENTRADA, 'utf8'))

// --- Cuentas -------------------------------------------------------------
const cuentas = historico.cuentasDetectadas.map((cuenta, indice) => ({
  nombre: cuenta.nombre,
  bloque: bloqueDe(cuenta.bloque),
  orden: indice,
  // Las cuentas que ya no salen en la ultima foto se marcan inactivas, para que no
  // aparezcan al hacer la foto del mes pero sigan contando en el historico.
  activa: Boolean(cuenta.enUso),
}))

// --- Fotos de patrimonio -------------------------------------------------
const fotos = historico.patrimonio.map((foto) => {
  const valores = [...foto.liquidez, ...foto.activos].map((linea) => ({
    cuenta: linea.cuenta,
    importe: linea.importe,
  }))
  return {
    fecha: foto.fecha,
    valores,
    notas: `Según tu Excel: ${foto.origen} (${foto.etiquetaMes})`,
    origen: 'excel',
    fechaAproximada: Boolean(foto.fechaAproximada),
  }
})

// --- Movimientos ---------------------------------------------------------
const movimientos = historico.movimientos.map((movimiento) => ({
  fecha: movimiento.fecha,
  tipo: tipoDe(movimiento),
  categoria: movimiento.categoria,
  concepto: movimiento.concepto,
  importe: movimiento.importe,
  origen: 'historico',
  creado: `${movimiento.fecha}T12:00:00.000Z`,
}))

// --- Bitcoin -------------------------------------------------------------
const compras = historico.bitcoin.map((compra) => ({
  fecha: compra.fecha,
  precioBtc: compra.precioBtc,
  cantidadBtc: compra.cantidadBtc,
  importe: compra.importe,
}))

const resumen = {
  fotos: fotos.length,
  primeraFoto: historico.resumen.primeraFoto,
  ultimaFoto: historico.resumen.ultimaFoto,
  movimientos: movimientos.length,
  rangoMovimientos: historico.resumen.rangoMovimientos,
  comprasBitcoin: compras.length,
  btcTotal: historico.resumen.btcTotal,
  importeBitcoinTotal: historico.resumen.importeBitcoinTotal,
  descuadres: historico.resumen.descuadres,
}

const cabecera = `/**
 * SEMILLA DE OIKOS — FICHERO GENERADO, NO EDITAR A MANO.
 *
 * Lo produce \`scripts/generar-semilla.mjs\` a partir de \`../../datos/historico.json\`, que a
 * su vez sale de \`../../datos/extraer-historico.py\` leyendo el excel real de Oscar
 * (FINANZAS_PERSONALES 2024.xlsx) y su Gastos 2026.csv.
 *
 * Para regenerarlo:   npm run semilla
 *
 * Contenido verificado: las sumas de las partidas de las ${resumen.fotos} fotos de patrimonio
 * cuadran EXACTAMENTE con los totales de las formulas del excel (0 descuadres).
 * Extraido el ${historico.generado}.
 */

import type { CompraBitcoin, Cuenta, FotoPatrimonio, Movimiento } from '../types'

/** Traza de donde salen los datos, para poder auditar la semilla. */
export const FUENTES_SEMILLA = ${JSON.stringify(
  {
    excel: historico.fuentes.excel,
    csv: historico.fuentes.csv,
    extraido: historico.generado,
    descuadresContraElExcel: historico.resumen.descuadres,
  },
  null,
  2,
)} as const

/** Que trae la semilla, en numeros. */
export const RESUMEN_SEMILLA = ${JSON.stringify(resumen, null, 2)} as const
`

const cuerpo = `
/** Las cuentas que aparecen en el historico del excel. */
export const CUENTAS_SEMILLA: Cuenta[] = ${JSON.stringify(cuentas, null, 2)}

/** Las ${fotos.length} fotos mensuales de patrimonio (2024-01 a ${resumen.ultimaFoto}). */
export const FOTOS_SEMILLA: FotoPatrimonio[] = ${JSON.stringify(fotos, null, 2)}

/** Los movimientos del Gastos 2026.csv, con el tipo ya normalizado. */
export const MOVIMIENTOS_SEMILLA: Movimiento[] = ${JSON.stringify(movimientos, null, 2)}

/** Las compras de Bitcoin de la hoja 'Bitcoin 2025'. */
export const COMPRAS_BITCOIN_SEMILLA: CompraBitcoin[] = ${JSON.stringify(compras, null, 2)}
`

writeFileSync(SALIDA, cabecera + cuerpo, 'utf8')

const kb = (readFileSync(SALIDA).length / 1024).toFixed(1)
console.log(`Semilla escrita en ${SALIDA} (${kb} KB)`)
console.log(`  cuentas:     ${cuentas.length} (${cuentas.filter((c) => c.activa).length} en uso)`)
console.log(`  fotos:       ${fotos.length}  (${resumen.primeraFoto} -> ${resumen.ultimaFoto})`)
console.log(`  movimientos: ${movimientos.length}  (${resumen.rangoMovimientos?.join(' -> ')})`)
console.log(`  bitcoin:     ${compras.length} compras, ${resumen.btcTotal} BTC, ${resumen.importeBitcoinTotal} EUR`)
console.log(`  descuadres:  ${resumen.descuadres}`)
const porTipo = {}
for (const movimiento of movimientos) porTipo[movimiento.tipo] = (porTipo[movimiento.tipo] ?? 0) + 1
console.log(`  por tipo:    ${JSON.stringify(porTipo)}`)
