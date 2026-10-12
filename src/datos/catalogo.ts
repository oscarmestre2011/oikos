/**
 * El catalogo inicial de Oikos: categorias, cuentas de partida, deudas y ajustes.
 *
 * ESTE FICHERO VA DENTRO DEL REPOSITORIO PUBLICO, asi que aqui NO puede haber ni un dato
 * personal: ni saldos, ni movimientos, ni deudas. Las cuentas son genericas y las deudas estan
 * vacias a proposito.
 *
 * El historico real de Oscar vive FUERA del repositorio, en `99 App Oikos/datos/`, y llega a la
 * app por el archivo de copia que genera `scripts/generar-copia-personal.ts` (ver el README).
 * Antes ese historico estaba aqui dentro, en `src/datos/semilla.ts`, y al publicar el
 * repositorio quedaron publicos sus saldos, su nomina y su hipoteca. No vuelve a pasar.
 */

import type { Ajuste, Categoria, Cuenta, Deuda } from '../types'

/**
 * Categorias de partida.
 *
 * Las de `historica: true` son las que Oscar usaba en su registro de gastos, con el mismo
 * nombre que les dio. Las de `historica: false` son sugerencias para no tener que crearlas a
 * mano: se pueden borrar o renombrar desde Ajustes sin que se rompa nada.
 */
export const CATEGORIAS_INICIALES: Categoria[] = [
  // --- Gasto, las suyas ---------------------------------------------------
  { nombre: 'Alimentación', ambito: 'gasto', esencial: true, historica: true, activa: true, orden: 0 },
  { nombre: 'Hipoteca', ambito: 'gasto', esencial: true, historica: true, activa: true, orden: 1 },
  { nombre: 'Transporte', ambito: 'gasto', esencial: true, historica: true, activa: true, orden: 2 },
  { nombre: 'Deporte', ambito: 'gasto', esencial: false, historica: true, activa: true, orden: 3 },
  { nombre: 'Ocio', ambito: 'gasto', esencial: false, historica: true, activa: true, orden: 4 },

  // --- Gasto, sugeridas ---------------------------------------------------
  { nombre: 'Suministros', ambito: 'gasto', esencial: true, historica: false, activa: true, orden: 10 },
  { nombre: 'Seguros', ambito: 'gasto', esencial: true, historica: false, activa: true, orden: 11 },
  { nombre: 'Casa', ambito: 'gasto', esencial: true, historica: false, activa: true, orden: 12 },
  { nombre: 'Salud', ambito: 'gasto', esencial: true, historica: false, activa: true, orden: 13 },
  { nombre: 'Restaurantes', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 14 },
  { nombre: 'Ropa', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 15 },
  { nombre: 'Tecnología', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 16 },
  { nombre: 'Suscripciones', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 17 },
  { nombre: 'Educación', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 18 },
  { nombre: 'Vacaciones', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 19 },
  { nombre: 'Impuestos', ambito: 'gasto', esencial: true, historica: false, activa: true, orden: 20 },
  { nombre: 'Otros', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 21 },

  // --- Ingreso ------------------------------------------------------------
  // Una sola categoria. El detalle (nomina, extras, devoluciones) va en el concepto.
  { nombre: 'Ingreso', ambito: 'ingreso', esencial: false, historica: true, activa: true, orden: 30 },

  // --- Inversion y amortizacion -------------------------------------------
  { nombre: 'Inversión', ambito: 'inversion', esencial: false, historica: true, activa: true, orden: 40 },
  { nombre: 'Familia', ambito: 'inversion', esencial: false, historica: true, activa: true, orden: 41 },
  { nombre: 'Amortización', ambito: 'amortizacion', esencial: false, historica: true, activa: true, orden: 50 },
]

/**
 * Cuentas de partida, GENÉRICAS.
 *
 * Son las mínimas para que la pantalla de patrimonio tenga sentido desde el primer día y para
 * que se entienda qué se espera de ella (una cuenta corriente, una de ahorro, efectivo, y los
 * productos de inversión típicos). Se renombran, se borran y se añaden desde Ajustes.
 *
 * Cuando se importa una copia en modo "reemplazar", esta lista se sustituye entera por la que
 * traiga la copia, así que no estorba.
 */
export const CUENTAS_INICIALES: Cuenta[] = [
  { nombre: 'Cuenta corriente', bloque: 'liquidez', orden: 0, activa: true },
  { nombre: 'Cuenta de ahorro', bloque: 'liquidez', orden: 1, activa: true },
  { nombre: 'Efectivo', bloque: 'liquidez', orden: 2, activa: true },
  { nombre: 'Fondo de inversión', bloque: 'activo', orden: 3, activa: true },
  { nombre: 'Plan de pensiones', bloque: 'activo', orden: 4, activa: true },
  { nombre: 'Bitcoin', bloque: 'activo', orden: 5, activa: true },
]

/**
 * Deudas de partida: NINGUNA.
 *
 * Las deudas son datos personales (cuanto debes y a quien) y viajan en la copia de cada uno, no
 * aqui: el repositorio de la app es publico. Se deja vacio a proposito, y la pantalla de
 * patrimonio invita a anadirlas, con sus saldos. Hasta entonces el patrimonio se ensena como
 * "bruto", avisando de que falta restar lo que se debe.
 */
export const DEUDAS_INICIALES: Deuda[] = []

/**
 * Ajustes de partida.
 *
 * Los objetivos son 200 EUR de inversion y 200 EUR de amortizacion: cifras redondas, de ejemplo,
 * que se cambian en Ajustes en dos toques. No revelan nada de nadie.
 */
export const AJUSTES_INICIALES: Ajuste[] = [
  { clave: 'objetivoInversion', valor: '200' },
  { clave: 'objetivoAmortizacion', valor: '200' },
  { clave: 'recurrenteMinimoMeses', valor: '3' },
  { clave: 'copiaCadaDias', valor: '7' },
]
