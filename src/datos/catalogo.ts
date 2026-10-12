/**
 * El catalogo inicial de Oikos: categorias, deudas y ajustes.
 *
 * Esto NO se genera del excel: son decisiones escritas a mano, y por eso estan separadas
 * de `semilla.ts`. Cada dato lleva anotado de donde sale.
 */

import type { Ajuste, Categoria, Deuda } from '../types'

/**
 * Categorias de partida.
 *
 * Las marcadas con `historica: true` son LAS TUYAS: salen tal cual del Gastos 2026.csv, con
 * el mismo nombre que les diste. Las que tienen `historica: false` son sugerencias para no
 * tener que crearlas a mano (suministros, seguros, salud...): se pueden borrar o renombrar
 * desde Ajustes sin que se rompa nada.
 */
export const CATEGORIAS_SEMILLA: Categoria[] = [
  // --- Gasto, las tuyas ---------------------------------------------------
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
  // Una sola categoria, la que usabas. El detalle (nomina, SME, devoluciones) va en el
  // concepto, que es donde ya lo tenias.
  { nombre: 'Ingreso', ambito: 'ingreso', esencial: false, historica: true, activa: true, orden: 30 },

  // --- Inversion y amortizacion -------------------------------------------
  { nombre: 'Inversión', ambito: 'inversion', esencial: false, historica: true, activa: true, orden: 40 },
  { nombre: 'Familia', ambito: 'inversion', esencial: false, historica: true, activa: true, orden: 41 },
  { nombre: 'Amortización', ambito: 'amortizacion', esencial: false, historica: true, activa: true, orden: 50 },
]

/**
 * Las deudas, copiadas de tu `Plan de libertad financiera 2026-2036` (30-09-2026).
 *
 * Existen en la app porque el excel de partida NO las registraba: su "VALOR NETO TOTAL"
 * decia +45.283 EUR cuando la hipoteca sola eran 83.738 EUR. Estas cuatro cifras son las
 * que aparecen en tu propio documento; si alguna ha cambiado, se corrige en la app en dos
 * toques (Patrimonio -> Mis deudas).
 */
export const DEUDAS_SEMILLA: Deuda[] = [
  {
    nombre: 'Hipoteca (ING)',
    saldo: 83738.84,
    fechaSaldo: '2026-09-23',
    interes: 3.67,
    vence: '2047-04-01',
    compartida: false,
    notas: 'Euríbor + 1,11 % · cuota 486,66 €/mes. Dato del Plan de libertad financiera 2026-2036.',
    activa: true,
  },
  {
    nombre: 'Préstamo solidario (Bankinter)',
    saldo: 12969.0,
    fechaSaldo: '2026-09-23',
    vence: '2029-03-08',
    compartida: true,
    notas: 'Lo paga ella, pero el riesgo es tuyo al 100 %. Por eso va marcado como compartido y se enseña aparte, sin mezclarlo con tus deudas.',
    activa: true,
  },
  {
    nombre: 'Pignoración (MyInvestor)',
    saldo: 7184.29,
    fechaSaldo: '2026-09-23',
    interes: 4.5,
    compartida: false,
    notas: 'Tu plan dice que se cancela en octubre de 2026. Comprueba si ya está cancelada y desactívala: si no, el patrimonio sale más bajo de lo que es.',
    activa: true,
  },
  {
    nombre: 'Firefish',
    saldo: 1030.0,
    fechaSaldo: '2026-09-23',
    vence: '2027-01-31',
    compartida: false,
    notas: 'Vence en enero de 2027. Colateral: 0,03923 BTC.',
    activa: true,
  },
]

/**
 * Ajustes de partida.
 *
 * Los objetivos de 200 + 200 EUR salen de tu plan ("lo que hago cada mes nada más cobrar"):
 * 200 EUR al MSCI World por MyInvestor y 200 EUR de amortización extra de hipoteca.
 */
export const AJUSTES_SEMILLA: Ajuste[] = [
  { clave: 'objetivoInversion', valor: '200' },
  { clave: 'objetivoAmortizacion', valor: '200' },
  { clave: 'recurrenteMinimoMeses', valor: '3' },
  { clave: 'copiaCadaDias', valor: '7' },
  { clave: 'versionSemilla', valor: '1' },
]
