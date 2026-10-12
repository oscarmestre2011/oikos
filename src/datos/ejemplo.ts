/**
 * Datos de EJEMPLO: el juego de datos falso que usan las pruebas.
 *
 * **La app no usa este fichero.** Está aquí, y no en `catalogo.ts`, para que quede claro qué es
 * cada cosa: `catalogo.ts` son los datos de partida de una app recién instalada (categorías y
 * cuentas genéricas) y esto es un histórico inventado, con la misma forma que el de verdad, para
 * que las pruebas puedan comprobar cálculos concretos sin depender de los datos de nadie.
 *
 * Los datos históricos reales viven FUERA del repositorio, en `99 App Oikos/datos/`. Este
 * repositorio es público: ni saldos, ni movimientos, ni conceptos de una persona pueden viajar
 * aquí dentro. Por eso todo lo de abajo es evidentemente falso —«Cuenta de ejemplo», «Compra de
 * ejemplo»— y con cifras redondas: si algún día se cuela un dato de verdad, se ve de un vistazo.
 *
 * Si se usara desde `src/screens` o `src/db`, la app enseñaría patrimonio inventado a quien la
 * instale. Solo lo importan los ficheros `*.test.ts`.
 */

import type { Cuenta, Deuda, FotoPatrimonio, Movimiento, TipoMovimiento } from '../types'

/**
 * Cinco cuentas de ejemplo, repartidas entre los dos bloques del patrimonio.
 *
 * «Plan antiguo de ejemplo» está desactivada a propósito (ya no se usa, pero su dinero cuenta en
 * los totales de las fotos antiguas y en los cálculos de `totalBloque`).
 */
export const CUENTAS_EJEMPLO: Cuenta[] = [
  { nombre: 'Cuenta de ejemplo', bloque: 'liquidez', orden: 0, activa: true },
  { nombre: 'Cuenta de ahorro de ejemplo', bloque: 'liquidez', orden: 1, activa: true },
  { nombre: 'Efectivo de ejemplo', bloque: 'liquidez', orden: 2, activa: true },
  { nombre: 'Fondo de ejemplo', bloque: 'activo', orden: 3, activa: true },
  { nombre: 'Plan antiguo de ejemplo', bloque: 'activo', orden: 4, activa: false },
]

/**
 * Cuatro fotos de patrimonio, con totales redondos y calculables de cabeza.
 *
 *   fecha        liquidez  activos  bruto   variación
 *   2026-01-31      1.600    2.300   3.900         —
 *   2026-02-28      1.800    2.400   4.200      +300
 *   2026-03-31      1.700    2.300   4.000      -200
 *   2026-04-30      2.400    2.500   4.900      +900
 *
 * Se van 1.000 EUR de la primera a la última, y «Plan antiguo de ejemplo» desaparece de las dos
 * últimas fotos a propósito: así se puede comprobar que su último valor conocido no se pierde.
 */
export const FOTOS_EJEMPLO: FotoPatrimonio[] = [
  {
    fecha: '2026-01-31',
    valores: [
      { cuenta: 'Cuenta de ejemplo', importe: 1000 },
      { cuenta: 'Cuenta de ahorro de ejemplo', importe: 500 },
      { cuenta: 'Efectivo de ejemplo', importe: 100 },
      { cuenta: 'Fondo de ejemplo', importe: 2000 },
      { cuenta: 'Plan antiguo de ejemplo', importe: 300 },
    ],
    origen: 'manual',
    fechaAproximada: false,
  },
  {
    fecha: '2026-02-28',
    valores: [
      { cuenta: 'Cuenta de ejemplo', importe: 1200 },
      { cuenta: 'Cuenta de ahorro de ejemplo', importe: 500 },
      { cuenta: 'Efectivo de ejemplo', importe: 100 },
      { cuenta: 'Fondo de ejemplo', importe: 2100 },
      { cuenta: 'Plan antiguo de ejemplo', importe: 300 },
    ],
    origen: 'manual',
    fechaAproximada: false,
  },
  {
    fecha: '2026-03-31',
    valores: [
      { cuenta: 'Cuenta de ejemplo', importe: 1100 },
      { cuenta: 'Cuenta de ahorro de ejemplo', importe: 500 },
      { cuenta: 'Efectivo de ejemplo', importe: 100 },
      { cuenta: 'Fondo de ejemplo', importe: 2300 },
    ],
    origen: 'manual',
    fechaAproximada: false,
  },
  {
    fecha: '2026-04-30',
    valores: [
      { cuenta: 'Cuenta de ejemplo', importe: 1500 },
      { cuenta: 'Cuenta de ahorro de ejemplo', importe: 800 },
      { cuenta: 'Efectivo de ejemplo', importe: 100 },
      { cuenta: 'Fondo de ejemplo', importe: 2500 },
    ],
    origen: 'manual',
    fechaAproximada: false,
  },
]

/**
 * Tres deudas de ejemplo: 2.000 EUR propios (más 100 de una tarjeta ya cancelada, que NO cuenta)
 * y 500 EUR compartidos, que se informan aparte y no se restan del neto.
 */
export const DEUDAS_EJEMPLO: Deuda[] = [
  {
    nombre: 'Hipoteca de ejemplo',
    saldo: 2000,
    fechaSaldo: '2026-04-30',
    compartida: false,
    activa: true,
  },
  {
    nombre: 'Préstamo compartido de ejemplo',
    saldo: 500,
    fechaSaldo: '2026-04-30',
    compartida: true,
    activa: true,
  },
  {
    nombre: 'Tarjeta cancelada de ejemplo',
    saldo: 100,
    fechaSaldo: '2026-04-30',
    compartida: false,
    activa: false,
  },
]

function mov(
  fecha: string,
  tipo: TipoMovimiento,
  importe: number,
  categoria: string,
  concepto: string,
): Movimiento {
  return { fecha, tipo, importe, categoria, concepto, origen: 'manual', creado: `${fecha}T12:00:00.000Z` }
}

/**
 * Cuatro meses de movimientos de ejemplo, con cifras redondas y pensados para que den de sí:
 *
 * - **Enero**: nómina de 2.000, gastos de 150, 200 de inversión y 100 de amortización. El
 *   disponible son 1.550 y la tasa de ahorro el 15 %.
 * - **Febrero**: lo mismo, pero con gastos de 190 (el disponible baja a 1.510).
 * - **Marzo**: gastos de 160, con un gasto de ocio que solo aparece este mes.
 * - **Abril**: sin nómina, para poder comprobar un mes que cierra en negativo (-70).
 *
 * Y tres conceptos que se repiten para la detección de gastos fijos: «Cuota de ejemplo» (10 EUR
 * todos los meses, importe clavado), «Luz de ejemplo» (40 o 60, o sea variable) y «Compra de
 * ejemplo» (100, 120 y 80: también variable). «Cine de ejemplo» sale un solo mes, así que no es
 * una cuota y no debe detectarse.
 */
export const MOVIMIENTOS_EJEMPLO: Movimiento[] = [
  // --- Enero de 2026: 2.000 - 150 - 200 - 100 = 1.550 de disponible ---
  mov('2026-01-01', 'ingreso', 2000, 'Ingreso', 'Nómina de ejemplo'),
  mov('2026-01-05', 'gasto', 10, 'Suscripciones', 'Cuota de ejemplo'),
  mov('2026-01-10', 'gasto', 100, 'Alimentación', 'Compra de ejemplo'),
  mov('2026-01-20', 'gasto', 40, 'Suministros', 'Luz de ejemplo'),
  mov('2026-01-25', 'inversion', 200, 'Inversión', 'Aportación de ejemplo'),
  mov('2026-01-28', 'amortizacion', 100, 'Amortización', 'Amortización de ejemplo'),

  // --- Febrero: 190 de gastos, disponible de 1.510 ---
  mov('2026-02-01', 'ingreso', 2000, 'Ingreso', 'Nómina de ejemplo'),
  mov('2026-02-05', 'gasto', 10, 'Suscripciones', 'Cuota de ejemplo'),
  mov('2026-02-12', 'gasto', 120, 'Alimentación', 'Compra de ejemplo'),
  mov('2026-02-20', 'gasto', 60, 'Suministros', 'Luz de ejemplo'),
  mov('2026-02-25', 'inversion', 200, 'Inversión', 'Aportación de ejemplo'),
  mov('2026-02-28', 'amortizacion', 100, 'Amortización', 'Amortización de ejemplo'),

  // --- Marzo: 160 de gastos y el único gasto de ocio, disponible de 1.540 ---
  mov('2026-03-01', 'ingreso', 2000, 'Ingreso', 'Nómina de ejemplo'),
  mov('2026-03-05', 'gasto', 10, 'Suscripciones', 'Cuota de ejemplo'),
  mov('2026-03-08', 'gasto', 80, 'Alimentación', 'Compra de ejemplo'),
  mov('2026-03-15', 'gasto', 30, 'Ocio', 'Cine de ejemplo'),
  mov('2026-03-20', 'gasto', 40, 'Suministros', 'Luz de ejemplo'),
  mov('2026-03-25', 'inversion', 200, 'Inversión', 'Aportación de ejemplo'),
  mov('2026-03-28', 'amortizacion', 100, 'Amortización', 'Amortización de ejemplo'),

  // --- Abril sin nómina: 70 de gastos y el mes cierra en -70 ---
  mov('2026-04-05', 'gasto', 10, 'Suscripciones', 'Cuota de ejemplo'),
  mov('2026-04-20', 'gasto', 60, 'Suministros', 'Luz de ejemplo'),
]
