/**
 * Datos REALES para las pruebas. **La app no usa este fichero.**
 *
 * Los lee de la copia personal de Óscar (`99 App Oikos/datos/oikos-mi-historial.json`), que vive
 * FUERA del repositorio porque son sus datos. Eso da dos comportamientos:
 *
 * - En su ordenador, el fichero está y las pruebas se ejecutan contra sus 36 fotos, sus 24
 *   movimientos y sus 4 deudas de verdad. Es la prueba más exigente que hay.
 * - En cualquier copia limpia (y en el flujo de publicación de GitHub, que clona el
 *   repositorio), el fichero no está: los vectores salen VACÍOS y las pruebas que dependen de
 *   ellos se SALTAN con `describe.skipIf(!hayCopiaPersonal)`. No se saltan por comodidad: sin
 *   los datos no hay nada que comprobar, y reventar la publicación por eso fue un error que ya
 *   se cometió una vez.
 *
 * Si algo de aquí se usara desde la app, sus datos personales acabarían en el paquete publicado.
 * Por eso el fichero se llama "ayuda-pruebas" y nada de `src/screens` ni de `src/db` lo importa.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Ajuste, Categoria, CompraBitcoin, Cuenta, Deuda, FotoPatrimonio, Movimiento, Presupuesto } from '../types'

/** Copia de seguridad completa, con el mismo formato que exporta la app. */
export interface CopiaPersonal {
  app: string
  version: number
  exportado: string
  movimientos: Movimiento[]
  categorias: Categoria[]
  cuentas: Cuenta[]
  deudas: Deuda[]
  fotos: FotoPatrimonio[]
  presupuestos: Presupuesto[]
  ajustes: Ajuste[]
  bitcoin: CompraBitcoin[]
}

export const RUTA_COPIA_PERSONAL = fileURLToPath(
  new URL('../../../datos/oikos-mi-historial.json', import.meta.url),
)

/** ¿Está la copia personal en este equipo? Si no, las pruebas que la necesitan se saltan. */
export const hayCopiaPersonal = existsSync(RUTA_COPIA_PERSONAL)

export const copiaPersonal: CopiaPersonal | null = hayCopiaPersonal
  ? (JSON.parse(readFileSync(RUTA_COPIA_PERSONAL, 'utf8')) as CopiaPersonal)
  : null

/** Los 24 movimientos del histórico real (vacíos si no está la copia). */
export const MOVIMIENTOS_REALES: Movimiento[] = copiaPersonal?.movimientos ?? []

/** Las 18 cuentas del histórico real, con su bloque (liquidez o inversión). */
export const CUENTAS_REALES: Cuenta[] = copiaPersonal?.cuentas ?? []

/** Las 4 deudas. */
export const DEUDAS_REALES: Deuda[] = copiaPersonal?.deudas ?? []

/** Las 36 fotos de patrimonio. */
export const FOTOS_REALES: FotoPatrimonio[] = copiaPersonal?.fotos ?? []

/** Las 89 compras de Bitcoin. */
export const COMPRAS_REALES: CompraBitcoin[] = copiaPersonal?.bitcoin ?? []
