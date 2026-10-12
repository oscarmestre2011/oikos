/**
 * Pruebas de `src/lib/recurrentes.ts`: detección de suscripciones y gastos que se repiten.
 *
 * Lo importante aquí no es solo que detecte el Netflix, sino que **no** llame suscripción a
 * la compra del supermercado (tres cargos al mes no son una cuota) ni a dos compras sueltas
 * en la misma tienda.
 */

import { describe, expect, it } from 'vitest'
import type { Movimiento, Recurrente, TipoMovimiento } from '../types'
import { MOVIMIENTOS_SEMILLA } from '../datos/semilla'
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
  return { fecha, tipo, importe, concepto, categoria, origen: 'historico', creado: `${fecha}T12:00:00.000Z` }
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
    expect(normalizaConcepto('CERVEZAS')).toBe('cervezas')
  })

  it('quita las tildes, que es lo que separa "Café" de "cafe" al agrupar', () => {
    expect(normalizaConcepto('Alimentación')).toBe('alimentacion')
    expect(normalizaConcepto('Ünïcödé')).toBe('unicode')
  })

  it('quita los signos y deja un solo espacio', () => {
    expect(normalizaConcepto('Netflix.com (2026)')).toBe('netflix com 2026')
    expect(normalizaConcepto('Café  con   Leche')).toBe('cafe con leche')
  })

  it('recorta los espacios de los extremos', () => {
    expect(normalizaConcepto('  Mercadona  ')).toBe('mercadona')
  })

  it('dos formas de escribir lo mismo dan la misma clave', () => {
    expect(normalizaConcepto('Cerveza con Pere')).toBe(normalizaConcepto('cerveza  con  PERE '))
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
    const detectados = detectaRecurrentes([...suscripcion('Netflix', 12.99), ...supermercado('Mercadona'), ...movimientos])
    expect(detectados).toHaveLength(1)
    expect(detectados[0].concepto).toBe('netflix')
  })

  it('rellena bien todos los campos de la suscripción', () => {
    const [netflix] = detectaRecurrentes(suscripcion('Netflix', 12.99))
    expect(netflix).toEqual({
      concepto: 'netflix',
      etiqueta: 'Netflix',
      categoria: 'Suscripciones',
      tipo: 'gasto',
      importe: 12.99,
      meses: 4,
      fechas: ['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'],
      costeAnual: 155.88,
      diaHabitual: 5,
      variable: false,
      periodicidadMeses: 1,
    })
  })

  it('no llama suscripción a dos compras en la misma tienda', () => {
    const movimientos = [mov('2026-01-10', 50, 'Decathlon'), mov('2026-02-10', 50, 'Decathlon')]
    expect(detectaRecurrentes(movimientos)).toEqual([])
  })

  it('respeta el mínimo de meses, por defecto 3', () => {
    const dosMeses = suscripcion('Netflix', 12.99, 5, ['2026-03', '2026-04'])
    expect(detectaRecurrentes(dosMeses)).toEqual([])
    expect(detectaRecurrentes(dosMeses, { minimoMeses: 2 })).toHaveLength(1)
  })

  it('con el mínimo subido a 4, tres meses ya no bastan', () => {
    const tresMeses = suscripcion('Netflix', 12.99, 5, ['2026-02', '2026-03', '2026-04'])
    expect(detectaRecurrentes(tresMeses)).toHaveLength(1)
    expect(detectaRecurrentes(tresMeses, { minimoMeses: 4 })).toEqual([])
  })

  it('marca como variable lo que baila más de un 10 %', () => {
    const importes = [10, 20, 10, 20]
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const movimientos = meses.map((mes, i) => mov(`${mes}-05`, importes[i], 'Luz', 'gasto', 'Suministros'))
    const [luz] = detectaRecurrentes(movimientos)
    expect(luz.importe).toBe(15)
    expect(luz.variable).toBe(true)
  })

  it('no marca variable lo que baila menos de un 10 %', () => {
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const importes = [100, 105, 100, 105]
    const movimientos = meses.map((mes, i) => mov(`${mes}-05`, importes[i], 'Luz', 'gasto', 'Suministros'))
    const [luz] = detectaRecurrentes(movimientos)
    expect(luz.importe).toBe(102.5)
    expect(luz.variable).toBe(false)
  })

  it('la tolerancia es configurable', () => {
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const importes = [100, 105, 100, 105]
    const movimientos = meses.map((mes, i) => mov(`${mes}-05`, importes[i], 'Luz', 'gasto', 'Suministros'))
    expect(detectaRecurrentes(movimientos, { tolerancia: 0.01 })[0].variable).toBe(true)
  })

  it('agrupa el mismo concepto escrito de formas distintas', () => {
    const movimientos = [
      mov('2026-01-10', 13, 'Cerveza con Pere', 'gasto', 'Ocio'),
      mov('2026-02-10', 13, 'cerveza  con  pere', 'gasto', 'Ocio'),
      mov('2026-03-10', 13, 'CERVEZA CON PERE', 'gasto', 'Ocio'),
      mov('2026-04-10', 13, 'Cerveza   con Pere', 'gasto', 'Ocio'),
    ]
    const detectados = detectaRecurrentes(movimientos)
    expect(detectados).toHaveLength(1)
    expect(detectados[0].concepto).toBe('cerveza con pere')
    expect(detectados[0].meses).toBe(4)
    // La etiqueta que se enseña es la última forma en que se escribió.
    expect(detectados[0].etiqueta).toBe('Cerveza   con Pere')
  })

  it('el mismo nombre con distinto tipo son dos cosas distintas', () => {
    const inversion = ['2026-01', '2026-02', '2026-03'].map((mes) => mov(`${mes}-01`, 200, 'Mintos', 'inversion', 'Inversión'))
    const gasto = ['2026-01', '2026-02', '2026-03'].map((mes) => mov(`${mes}-02`, 50, 'Mintos'))
    const detectados = detectaRecurrentes([...inversion, ...gasto])
    expect(detectados.map((r) => r.tipo).sort()).toEqual(['gasto', 'inversion'])
  })

  it('detecta las aportaciones de inversión, que no son gasto pero interesa fichar', () => {
    const [msci] = detectaRecurrentes(suscripcion('MSCI World', 200, 1).map((m) => ({ ...m, tipo: 'inversion' as const, categoria: 'Inversión' })))
    expect(msci.tipo).toBe('inversion')
    expect(msci.costeAnual).toBe(2400)
  })

  it('por defecto no mira los ingresos', () => {
    const nomina = ['2026-01', '2026-02', '2026-03'].map((mes) => mov(`${mes}-28`, 2000, 'Nómina', 'ingreso', 'Ingreso'))
    expect(detectaRecurrentes(nomina)).toEqual([])
    expect(detectaRecurrentes(nomina, { tipos: ['ingreso'] })).toHaveLength(1)
  })

  it('permite limitar los tipos que se miran', () => {
    const movimientos = [...suscripcion('Netflix', 12.99), ...suscripcion('MSCI World', 200, 1).map((m) => ({ ...m, tipo: 'inversion' as const }))]
    expect(detectaRecurrentes(movimientos, { tipos: ['inversion'] })).toHaveLength(1)
    expect(detectaRecurrentes(movimientos, { tipos: ['inversion'] })[0].concepto).toBe('msci world')
    expect(detectaRecurrentes(movimientos, { tipos: ['gasto'] })[0].concepto).toBe('netflix')
  })

  it('ignora los importes que no son positivos', () => {
    const meses = ['2026-01', '2026-02', '2026-03']
    expect(detectaRecurrentes(meses.map((mes) => mov(`${mes}-10`, 0, 'Devolución')))).toEqual([])
  })

  it('ordena por lo que cuesta al año, de mayor a menor', () => {
    const movimientos = [
      ...suscripcion('Netflix', 12.99),
      ...['2026-01', '2026-04', '2026-07'].map((mes) => mov(`${mes}-20`, 60, 'Gimnasio')),
      ...['2024-01', '2025-01', '2026-01'].map((anio) => mov(`${anio}-15`, 300, 'Seguro coche')),
    ]
    const detectados = detectaRecurrentes(movimientos)
    expect(detectados.map((r) => [r.concepto, r.periodicidadMeses, r.costeAnual])).toEqual([
      ['seguro coche', 12, 300],
      ['gimnasio', 3, 240],
      ['netflix', 1, 155.88],
    ])
  })

  it('el día habitual es el de la mediana de los cargos', () => {
    const movimientos = [
      mov('2026-01-04', 20, 'Cuota'),
      mov('2026-02-05', 20, 'Cuota'),
      mov('2026-03-06', 20, 'Cuota'),
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
// Contra los movimientos reales de la semilla
// ---------------------------------------------------------------------------

describe('detectaRecurrentes con los movimientos reales', () => {
  it('con los dos meses del CSV no se atreve a llamar suscripción a nada', () => {
    // El CSV de Óscar solo cubre de 2026-03-26 a 2026-04-12: con dos meses no hay forma
    // de distinguir una cuota de una compra repetida, y la app prefiere no inventar.
    expect(detectaRecurrentes(MOVIMIENTOS_SEMILLA)).toEqual([])
  })

  it('bajando el mínimo a 2 meses solo sale la cerveza del bar, y marcada como variable', () => {
    const detectados = detectaRecurrentes(MOVIMIENTOS_SEMILLA, { minimoMeses: 2 })
    expect(detectados).toHaveLength(1)
    expect(detectados[0]).toEqual({
      concepto: 'cervezas',
      etiqueta: 'Cervezas',
      categoria: 'Ocio',
      tipo: 'gasto',
      importe: 9,
      meses: 2,
      fechas: ['2026-03-29', '2026-04-04'],
      costeAnual: 108,
      diaHabitual: 17,
      variable: true,
      periodicidadMeses: 1,
    })
  })

  it('el coste fijo de esos datos reales sale de la propia detección', () => {
    const detectados = detectaRecurrentes(MOVIMIENTOS_SEMILLA, { minimoMeses: 2 })
    expect(costeFijoMensual(detectados)).toBe(9)
    expect(costeFijoAnual(detectados)).toBe(108)
  })
})
