/**
 * Pruebas de `src/lib/recurrentes.ts`: detección de suscripciones y gastos que se repiten.
 *
 * Lo importante aquí no es solo que detecte la cuota mensual, sino que **no** llame suscripción
 * a la compra del supermercado (tres cargos al mes no son una cuota) ni a dos compras sueltas en
 * la misma tienda.
 *
 * Todo lo de abajo son datos inventados: `src/datos/ejemplo.ts` para el bloque que trabaja contra
 * un histórico completo, y movimientos sueltos escritos en cada prueba. Este repositorio es
 * público, así que aquí no puede haber ni un concepto ni un importe de una persona.
 */

import { describe, expect, it } from 'vitest'
import type { Movimiento, Recurrente, TipoMovimiento } from '../types'
import { MOVIMIENTOS_EJEMPLO } from '../datos/ejemplo'
import {
  costeFijoAnual,
  costeFijoMensual,
  detectaRecurrentes,
  mediana,
  normalizaConcepto,
  periodicidadDe,
} from './recurrentes'

function mov(
  fecha: string,
  importe: number,
  concepto: string,
  tipo: TipoMovimiento = 'gasto',
  categoria = 'Suscripciones',
): Movimiento {
  return { fecha, tipo, importe, concepto, categoria, origen: 'manual', creado: `${fecha}T12:00:00.000Z` }
}

/** Suscripción mensual: un cargo al mes, el mismo día, el mismo importe. */
function suscripcion(concepto: string, importe: number, dia = 5, meses = ['2026-01', '2026-02', '2026-03', '2026-04']): Movimiento[] {
  return meses.map((mes) => mov(`${mes}-${String(dia).padStart(2, '0')}`, importe, concepto))
}

/** Compra de supermercado: varias veces al mes, todo el año. */
function supermercado(concepto: string, meses = ['2026-01', '2026-02', '2026-03', '2026-04']): Movimiento[] {
  return meses.flatMap((mes) => [
    mov(`${mes}-03`, 42.1, concepto, 'gasto', 'Alimentación'),
    mov(`${mes}-12`, 18.75, concepto, 'gasto', 'Alimentación'),
    mov(`${mes}-25`, 63.4, concepto, 'gasto', 'Alimentación'),
  ])
}

function recurrente(parcial: Partial<Recurrente> & Pick<Recurrente, 'tipo' | 'importe' | 'periodicidadMeses' | 'costeAnual'>): Recurrente {
  return {
    concepto: 'concepto',
    etiqueta: 'Concepto',
    categoria: 'Suscripciones',
    meses: 3,
    fechas: [],
    diaHabitual: 1,
    variable: false,
    ...parcial,
  }
}

describe('normalizaConcepto', () => {
  it('pasa a minúsculas', () => {
    expect(normalizaConcepto('COMPRA DE EJEMPLO')).toBe('compra de ejemplo')
  })

  it('quita las tildes, que es lo que separa "Café" de "cafe" al agrupar', () => {
    expect(normalizaConcepto('Alimentación')).toBe('alimentacion')
    expect(normalizaConcepto('Ünïcödé')).toBe('unicode')
  })

  it('quita los signos y deja un solo espacio', () => {
    expect(normalizaConcepto('Ejemplo.com (2026)')).toBe('ejemplo com 2026')
    expect(normalizaConcepto('Café  con   Leche')).toBe('cafe con leche')
  })

  it('recorta los espacios de los extremos', () => {
    expect(normalizaConcepto('  Compra de ejemplo  ')).toBe('compra de ejemplo')
  })

  it('dos formas de escribir lo mismo dan la misma clave', () => {
    expect(normalizaConcepto('Cena de ejemplo')).toBe(normalizaConcepto('cena  de  EJEMPLO '))
  })

  it('una cadena vacía o de espacios da cadena vacía', () => {
    expect(normalizaConcepto('')).toBe('')
    expect(normalizaConcepto('   ')).toBe('')
  })
})

describe('mediana', () => {
  it('con la lista vacía devuelve 0', () => {
    expect(mediana([])).toBe(0)
  })

  it('con un número impar de valores devuelve el del centro', () => {
    expect(mediana([3, 1, 2])).toBe(2)
    expect(mediana([7])).toBe(7)
  })

  it('con un número par de valores devuelve la media de los dos del centro', () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
  })

  it('no le afectan los valores raros, que es justo para lo que se usa', () => {
    // La media de [10, 20, 10, 500] seria 135; la mediana se queda en el valor tipico.
    expect(mediana([10, 20, 10, 500])).toBe(15)
  })

  it('no desordena la lista que recibe', () => {
    const valores = [3, 1, 2]
    mediana(valores)
    expect(valores).toEqual([3, 1, 2])
  })
})

describe('periodicidadDe', () => {
  it('con menos de dos cargos no hay periodicidad que deducir: mensual', () => {
    expect(periodicidadDe([])).toBe(1)
    expect(periodicidadDe(['2026-01-05'])).toBe(1)
  })

  it('detecta la periodicidad mensual', () => {
    expect(periodicidadDe(['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'])).toBe(1)
  })

  it('detecta la trimestral', () => {
    expect(periodicidadDe(['2026-01-05', '2026-04-05', '2026-07-05'])).toBe(3)
  })

  it('detecta la semestral', () => {
    expect(periodicidadDe(['2026-01-05', '2026-07-05'])).toBe(6)
  })

  it('detecta la anual cruzando el año', () => {
    expect(periodicidadDe(['2024-01-15', '2025-01-15', '2026-01-15'])).toBe(12)
  })

  it('con huecos irregulares se queda en mensual', () => {
    expect(periodicidadDe(['2026-01-05', '2026-02-20'])).toBe(1)
  })

  it('no le importa el orden en que le lleguen las fechas', () => {
    expect(periodicidadDe(['2026-07-05', '2026-01-05', '2026-04-05'])).toBe(3)
  })
})

describe('detectaRecurrentes', () => {
  it('detecta una suscripción mensual y no el supermercado', () => {
    const movimientos = [mov('2026-02-14', 30, 'Gasolina', 'gasto', 'Transporte')]
    const detectados = detectaRecurrentes([...suscripcion('Cuota de ejemplo', 10), ...supermercado('Supermercado de ejemplo'), ...movimientos])
    expect(detectados).toHaveLength(1)
    expect(detectados[0].concepto).toBe('cuota de ejemplo')
  })

  it('rellena bien todos los campos de la suscripción', () => {
    const [cuota] = detectaRecurrentes(suscripcion('Cuota de ejemplo', 10))
    expect(cuota).toEqual({
      concepto: 'cuota de ejemplo',
      etiqueta: 'Cuota de ejemplo',
      categoria: 'Suscripciones',
      tipo: 'gasto',
      importe: 10,
      meses: 4,
      fechas: ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'],
      costeAnual: 120,
      diaHabitual: 5,
      variable: false,
      periodicidadMeses: 1,
    })
  })

  it('no llama suscripción a dos compras en la misma tienda', () => {
    const movimientos = [mov('2026-01-10', 50, 'Tienda de ejemplo'), mov('2026-02-10', 50, 'Tienda de ejemplo')]
    expect(detectaRecurrentes(movimientos)).toEqual([])
  })

  it('respeta el mínimo de meses, por defecto 3', () => {
    const dosMeses = suscripcion('Cuota de ejemplo', 10, 5, ['2026-03', '2026-04'])
    expect(detectaRecurrentes(dosMeses)).toEqual([])
    expect(detectaRecurrentes(dosMeses, { minimoMeses: 2 })).toHaveLength(1)
  })

  it('con el mínimo subido a 4, tres meses ya no bastan', () => {
    const tresMeses = suscripcion('Cuota de ejemplo', 10, 5, ['2026-02', '2026-03', '2026-04'])
    expect(detectaRecurrentes(tresMeses)).toHaveLength(1)
    expect(detectaRecurrentes(tresMeses, { minimoMeses: 4 })).toEqual([])
  })

  it('marca como variable lo que baila más de un 10 %', () => {
    const importes = [10, 20, 10, 20]
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const movimientos = meses.map((mes, i) => mov(`${mes}-05`, importes[i], 'Luz de ejemplo', 'gasto', 'Suministros'))
    const [luz] = detectaRecurrentes(movimientos)
    expect(luz.importe).toBe(15)
    expect(luz.variable).toBe(true)
  })

  it('no marca variable lo que baila menos de un 10 %', () => {
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const importes = [100, 105, 100, 105]
    const movimientos = meses.map((mes, i) => mov(`${mes}-05`, importes[i], 'Luz de ejemplo', 'gasto', 'Suministros'))
    const [luz] = detectaRecurrentes(movimientos)
    expect(luz.importe).toBe(102.5)
    expect(luz.variable).toBe(false)
  })

  it('la tolerancia es configurable', () => {
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const importes = [100, 105, 100, 105]
    const movimientos = meses.map((mes, i) => mov(`${mes}-05`, importes[i], 'Luz de ejemplo', 'gasto', 'Suministros'))
    expect(detectaRecurrentes(movimientos, { tolerancia: 0.01 })[0].variable).toBe(true)
  })

  it('agrupa el mismo concepto escrito de formas distintas', () => {
    const movimientos = [
      mov('2026-01-10', 13, 'Cena de ejemplo', 'gasto', 'Ocio'),
      mov('2026-02-10', 13, 'cena  de  ejemplo', 'gasto', 'Ocio'),
      mov('2026-03-10', 13, 'CENA DE EJEMPLO', 'gasto', 'Ocio'),
      mov('2026-04-10', 13, 'Cena   de ejemplo', 'gasto', 'Ocio'),
    ]
    const detectados = detectaRecurrentes(movimientos)
    expect(detectados).toHaveLength(1)
    expect(detectados[0].concepto).toBe('cena de ejemplo')
    expect(detectados[0].meses).toBe(4)
    // La etiqueta que se enseña es la última forma en que se escribió.
    expect(detectados[0].etiqueta).toBe('Cena   de ejemplo')
  })

  it('el mismo nombre con distinto tipo son dos cosas distintas', () => {
    const inversion = ['2026-01', '2026-02', '2026-03'].map((mes) => mov(`${mes}-01`, 200, 'Fondo de ejemplo', 'inversion', 'Inversión'))
    const gasto = ['2026-01', '2026-02', '2026-03'].map((mes) => mov(`${mes}-02`, 50, 'Fondo de ejemplo'))
    const detectados = detectaRecurrentes([...inversion, ...gasto])
    expect(detectados.map((r) => r.tipo).sort()).toEqual(['gasto', 'inversion'])
  })

  it('detecta las aportaciones de inversión, que no son gasto pero interesa fichar', () => {
    const [fondo] = detectaRecurrentes(suscripcion('Aportación de ejemplo', 200, 1).map((m) => ({ ...m, tipo: 'inversion' as const, categoria: 'Inversión' })))
    expect(fondo.tipo).toBe('inversion')
    expect(fondo.costeAnual).toBe(2400)
  })

  it('por defecto no mira los ingresos', () => {
    const nomina = ['2026-01', '2026-02', '2026-03'].map((mes) => mov(`${mes}-28`, 2000, 'Nómina de ejemplo', 'ingreso', 'Ingreso'))
    expect(detectaRecurrentes(nomina)).toEqual([])
    expect(detectaRecurrentes(nomina, { tipos: ['ingreso'] })).toHaveLength(1)
  })

  it('permite limitar los tipos que se miran', () => {
    const movimientos = [...suscripcion('Cuota de ejemplo', 10), ...suscripcion('Aportación de ejemplo', 200, 1).map((m) => ({ ...m, tipo: 'inversion' as const }))]
    expect(detectaRecurrentes(movimientos, { tipos: ['inversion'] })).toHaveLength(1)
    expect(detectaRecurrentes(movimientos, { tipos: ['inversion'] })[0].concepto).toBe('aportacion de ejemplo')
    expect(detectaRecurrentes(movimientos, { tipos: ['gasto'] })[0].concepto).toBe('cuota de ejemplo')
  })

  it('ignora los importes que no son positivos', () => {
    const meses = ['2026-01', '2026-02', '2026-03']
    expect(detectaRecurrentes(meses.map((mes) => mov(`${mes}-10`, 0, 'Devolución de ejemplo')))).toEqual([])
  })

  it('ordena por lo que cuesta al año, de mayor a menor', () => {
    const movimientos = [
      ...suscripcion('Cuota de ejemplo', 10),
      ...['2026-01', '2026-04', '2026-07'].map((mes) => mov(`${mes}-20`, 60, 'Cuota trimestral de ejemplo')),
      ...['2024-01', '2025-01', '2026-01'].map((anio) => mov(`${anio}-15`, 300, 'Seguro de ejemplo')),
    ]
    const detectados = detectaRecurrentes(movimientos)
    expect(detectados.map((r) => [r.concepto, r.periodicidadMeses, r.costeAnual])).toEqual([
      ['seguro de ejemplo', 12, 300],
      ['cuota trimestral de ejemplo', 3, 240],
      ['cuota de ejemplo', 1, 120],
    ])
  })

  it('el día habitual es el de la mediana de los cargos', () => {
    const movimientos = [
      mov('2026-01-04', 20, 'Recibo de ejemplo'),
      mov('2026-02-05', 20, 'Recibo de ejemplo'),
      mov('2026-03-06', 20, 'Recibo de ejemplo'),
    ]
    expect(detectaRecurrentes(movimientos)[0].diaHabitual).toBe(5)
  })
})

describe('costeFijoMensual y costeFijoAnual', () => {
  const recurrentes: Recurrente[] = [
    recurrente({ tipo: 'gasto', importe: 10, periodicidadMeses: 1, costeAnual: 120 }),
    recurrente({ tipo: 'gasto', importe: 30, periodicidadMeses: 3, costeAnual: 120 }),
    recurrente({ tipo: 'inversion', importe: 200, periodicidadMeses: 1, costeAnual: 2400 }),
    recurrente({ tipo: 'amortizacion', importe: 100, periodicidadMeses: 1, costeAnual: 1200 }),
  ]

  it('suma solo los gastos, repartiendo por su periodicidad', () => {
    expect(costeFijoMensual(recurrentes)).toBe(20)
  })

  it('el anual usa el coste ya calculado de cada recurrente', () => {
    expect(costeFijoAnual(recurrentes)).toBe(240)
  })

  it('sin recurrentes el coste fijo es 0', () => {
    expect(costeFijoMensual([])).toBe(0)
    expect(costeFijoAnual([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Contra los cuatro meses de movimientos de ejemplo
// ---------------------------------------------------------------------------

describe('detectaRecurrentes con los movimientos de ejemplo', () => {
  const porConcepto = (): Map<string, Recurrente> =>
    new Map(detectaRecurrentes(MOVIMIENTOS_EJEMPLO).map((r) => [r.concepto, r]))

  it('detecta las cinco cosas que se repiten y ninguna más', () => {
    // «Cine de ejemplo» sale un solo mes, así que no es una cuota y no puede aparecer.
    expect([...porConcepto().keys()].sort()).toEqual([
      'amortizacion de ejemplo',
      'aportacion de ejemplo',
      'compra de ejemplo',
      'cuota de ejemplo',
      'luz de ejemplo',
    ])
  })

  it('la cuota sale clavada: 10 EUR los cuatro meses, y 120 al año', () => {
    expect(porConcepto().get('cuota de ejemplo')).toEqual({
      concepto: 'cuota de ejemplo',
      etiqueta: 'Cuota de ejemplo',
      categoria: 'Suscripciones',
      tipo: 'gasto',
      importe: 10,
      meses: 4,
      fechas: ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'],
      costeAnual: 120,
      diaHabitual: 5,
      variable: false,
      periodicidadMeses: 1,
    })
  })

  it('la luz y la compra salen marcadas como variables, porque bailan más de un 10 %', () => {
    expect(porConcepto().get('luz de ejemplo')?.importe).toBe(50)
    expect(porConcepto().get('luz de ejemplo')?.variable).toBe(true)
    expect(porConcepto().get('compra de ejemplo')?.importe).toBe(100)
    expect(porConcepto().get('compra de ejemplo')?.variable).toBe(true)
    expect(porConcepto().get('cuota de ejemplo')?.variable).toBe(false)
  })

  it('las aportaciones de inversión y las amortizaciones también se fichan', () => {
    expect(porConcepto().get('aportacion de ejemplo')?.tipo).toBe('inversion')
    expect(porConcepto().get('aportacion de ejemplo')?.costeAnual).toBe(2400)
    expect(porConcepto().get('amortizacion de ejemplo')?.tipo).toBe('amortizacion')
    expect(porConcepto().get('amortizacion de ejemplo')?.costeAnual).toBe(1200)
  })

  it('el coste fijo solo suma los gastos: 160 EUR al mes y 1.920 al año', () => {
    const detectados = detectaRecurrentes(MOVIMIENTOS_EJEMPLO)
    expect(costeFijoMensual(detectados)).toBe(160)
    expect(costeFijoAnual(detectados)).toBe(1920)
  })

  it('salen ordenados de lo que más cuesta al año a lo que menos', () => {
    const costes = detectaRecurrentes(MOVIMIENTOS_EJEMPLO).map((r) => r.costeAnual)
    expect(costes).toEqual([...costes].sort((a, b) => b - a))
    expect(costes[0]).toBe(2400)
    expect(costes[costes.length - 1]).toBe(120)
  })
})
