/**
 * Pruebas de `src/lib/resumen.ts`: el resumen del mes, el gasto por categoría, la
 * comparación con la media y los presupuestos.
 *
 * La decisión central que se comprueba aquí es la del modelo: **invertir y amortizar no son
 * gasto**. Si eso se rompe, el resumen infla el gasto del mes en todo lo que se aparta para
 * inversión y amortización, que no se ha gastado: sigue siendo patrimonio.
 *
 * Todo lo de abajo son datos inventados: `src/datos/ejemplo.ts` para los bloques que trabajan
 * contra varios meses de histórico, y movimientos sueltos escritos en cada prueba. Este
 * repositorio es público, así que aquí no puede haber ni un concepto ni un importe de una
 * persona.
 *
 * Nada depende del reloj: donde la función admite `hoy` se le pasa, y donde no, se congela
 * con `vi.setSystemTime`.
 */

import { describe, expect, it } from 'vitest'
import type { Movimiento, Presupuesto, TipoMovimiento } from '../types'
import { MOVIMIENTOS_EJEMPLO } from '../datos/ejemplo'
import {
  calculaPresupuestos,
  categoriasMasUsadas,
  compararConMedia,
  conceptosRecientes,
  estadoDe,
  gastoTotalDelMes,
  gastosPorCategoria,
  movimientosDeMes,
  ordenDescendente,
  resumenMes,
  resumenesPorMes,
  totalPorTipo,
} from './resumen'

/** Movimiento de prueba con lo mínimo relleno. */
function mov(
  fecha: string,
  tipo: TipoMovimiento,
  importe: number,
  categoria = 'Alimentación',
  concepto = 'Concepto de ejemplo',
  id?: number,
): Movimiento {
  return { id, fecha, tipo, importe, categoria, concepto, origen: 'manual', creado: `${fecha}T12:00:00.000Z` }
}

describe('movimientosDeMes y totalPorTipo', () => {
  const movimientos = [
    mov('2026-04-01', 'gasto', 10),
    mov('2026-04-15', 'gasto', 20, 'Ocio'),
    mov('2026-04-20', 'inversion', 100, 'Inversión'),
    mov('2026-03-31', 'gasto', 999, 'Ocio'),
  ]

  it('separa los movimientos por mes', () => {
    expect(movimientosDeMes(movimientos, '2026-04')).toHaveLength(3)
    expect(movimientosDeMes(movimientos, '2026-03')).toHaveLength(1)
    expect(movimientosDeMes(movimientos, '2026-05')).toEqual([])
  })

  it('suma solo el tipo pedido, sin filtrar por mes (eso lo hace movimientosDeMes)', () => {
    expect(totalPorTipo(movimientosDeMes(movimientos, '2026-04'), 'gasto')).toBe(30)
    expect(totalPorTipo(movimientos, 'gasto')).toBe(1029)
    expect(totalPorTipo(movimientos, 'inversion')).toBe(100)
    expect(totalPorTipo(movimientos, 'ingreso')).toBe(0)
  })
})

describe('gastosPorCategoria', () => {
  it('agrupa, cuenta y ordena de mayor a menor', () => {
    const movimientos = [
      mov('2026-04-01', 'gasto', 100, 'Alimentación'),
      mov('2026-04-02', 'gasto', 20, 'Ocio'),
      mov('2026-04-03', 'gasto', 30, 'Alimentación'),
      mov('2026-04-04', 'gasto', 5, 'Ocio'),
    ]
    expect(gastosPorCategoria(movimientos)).toEqual([
      { categoria: 'Alimentación', importe: 130, numero: 2 },
      { categoria: 'Ocio', importe: 25, numero: 2 },
    ])
  })

  it('ignora ingresos, inversiones y amortizaciones: no son gasto', () => {
    const movimientos = [
      mov('2026-04-01', 'gasto', 100, 'Alimentación'),
      mov('2026-04-01', 'ingreso', 2000, 'Ingreso'),
      mov('2026-04-01', 'inversion', 300, 'Inversión'),
      mov('2026-04-01', 'amortizacion', 400, 'Amortización'),
    ]
    expect(gastosPorCategoria(movimientos)).toEqual([{ categoria: 'Alimentación', importe: 100, numero: 1 }])
  })

  it('devuelve lista vacía si no hay gastos', () => {
    expect(gastosPorCategoria([mov('2026-04-01', 'ingreso', 10, 'Ingreso')])).toEqual([])
  })
})

describe('resumenMes con datos sintéticos', () => {
  const movimientos = [
    mov('2026-04-01', 'ingreso', 2000, 'Ingreso', 'Nómina de ejemplo'),
    mov('2026-04-02', 'gasto', 100, 'Alimentación', 'Compra de ejemplo'),
    mov('2026-04-03', 'gasto', 50, 'Ocio', 'Cena de ejemplo'),
    mov('2026-04-05', 'inversion', 300, 'Inversión', 'Aportación de ejemplo'),
    mov('2026-04-06', 'amortizacion', 150, 'Amortización', 'Amortización de ejemplo'),
    mov('2026-03-31', 'gasto', 999, 'Alimentación', 'Se cuela de marzo'),
  ]

  it('calcula los cuatro totales del mes', () => {
    const resumen = resumenMes(movimientos, '2026-04', '2026-04-30')
    expect(resumen.ingresos).toBe(2000)
    expect(resumen.gastos).toBe(150)
    expect(resumen.inversion).toBe(300)
    expect(resumen.amortizacion).toBe(150)
  })

  it('el disponible resta también la inversión y la amortización', () => {
    // 2000 - 150 de gasto - 300 de inversión - 150 de amortización. Si la inversión y la
    // amortización no restaran, el "disponible" diría 1850 EUR que en realidad ya están
    // comprometidos.
    const resumen = resumenMes(movimientos, '2026-04', '2026-04-30')
    expect(resumen.disponible).toBe(1400)
    expect(resumen.gastos + resumen.inversion + resumen.amortizacion).toBe(600)
  })

  it('la tasa de ahorro es (inversión + amortización) / ingresos', () => {
    expect(resumenMes(movimientos, '2026-04', '2026-04-30').tasaAhorro).toBe(22.5)
  })

  it('sin ingresos la tasa de ahorro es 0 y no divide por cero', () => {
    const sinIngresos = [mov('2026-04-02', 'gasto', 100), mov('2026-04-05', 'inversion', 300, 'Inversión')]
    const resumen = resumenMes(sinIngresos, '2026-04', '2026-04-30')
    expect(resumen.ingresos).toBe(0)
    expect(resumen.tasaAhorro).toBe(0)
    expect(resumen.disponible).toBe(-400)
  })

  it('no mezcla movimientos de otros meses', () => {
    const resumen = resumenMes(movimientos, '2026-04', '2026-04-30')
    expect(resumen.movimientos).toHaveLength(5)
    expect(resumen.gastos).toBe(150)
  })

  it('cuenta los días con actividad y el gasto medio diario del mes entero', () => {
    const resumen = resumenMes(movimientos, '2026-04', '2026-04-30')
    expect(resumen.diasConActividad).toBe(5)
    expect(resumen.gastoMedioDiario).toBe(5)
  })

  it('en un mes en curso el gasto medio diario se calcula con los días transcurridos', () => {
    // Mismo gasto (150) y mismo mes, pero a día 10 de 30: 15 EUR/día, no 5.
    const resumen = resumenMes(movimientos, '2026-04', '2026-04-10')
    expect(resumen.gastoMedioDiario).toBe(15)
  })

  it('en un mes futuro no divide por cero', () => {
    expect(resumenMes(movimientos, '2026-05', '2026-04-10').gastoMedioDiario).toBe(0)
  })

  it('ordena los movimientos del más reciente al más antiguo', () => {
    const fechas = resumenMes(movimientos, '2026-04', '2026-04-30').movimientos.map((m) => m.fecha)
    expect(fechas).toEqual(['2026-04-06', '2026-04-05', '2026-04-03', '2026-04-02', '2026-04-01'])
  })

  it('agrupa el gasto por categoría dentro del resumen', () => {
    expect(resumenMes(movimientos, '2026-04', '2026-04-30').gastosPorCategoria).toEqual([
      { categoria: 'Alimentación', importe: 100, numero: 1 },
      { categoria: 'Ocio', importe: 50, numero: 1 },
    ])
  })
})

describe('ordenDescendente', () => {
  it('pone delante la fecha más reciente', () => {
    const reciente = mov('2026-06-30', 'gasto', 5)
    const antiguo = mov('2026-06-29', 'gasto', 5)
    expect(ordenDescendente(reciente, antiguo)).toBeLessThan(0)
    expect(ordenDescendente(antiguo, reciente)).toBeGreaterThan(0)
  })

  it('a igualdad de fecha pone delante lo apuntado después (id mayor)', () => {
    const primero = mov('2026-06-30', 'gasto', 5, 'Ocio', 'A', 1)
    const segundo = mov('2026-06-30', 'gasto', 5, 'Ocio', 'B', 2)
    expect(ordenDescendente(primero, segundo)).toBeGreaterThan(0)
    expect(ordenDescendente(segundo, primero)).toBeLessThan(0)
  })

  it('sin id no desempata y mantiene el orden de entrada', () => {
    expect(ordenDescendente(mov('2026-06-30', 'gasto', 5), mov('2026-06-30', 'gasto', 5))).toBe(0)
  })

  it('el resumen lo usa de verdad: con la misma fecha, el id mayor va antes', () => {
    const movimientos = [
      mov('2026-06-30', 'gasto', 5, 'Ocio', 'Primero', 1),
      mov('2026-06-30', 'gasto', 5, 'Ocio', 'Segundo', 2),
    ]
    expect(resumenMes(movimientos, '2026-06', '2026-06-30').movimientos.map((m) => m.concepto)).toEqual([
      'Segundo',
      'Primero',
    ])
  })
})

describe('resumenesPorMes', () => {
  it('devuelve un resumen por mes con datos, del más reciente al más antiguo', () => {
    const movimientos = [mov('2026-03-01', 'gasto', 10), mov('2026-04-01', 'gasto', 20), mov('2026-04-02', 'gasto', 5)]
    const resumenes = resumenesPorMes(movimientos, '2026-04-30')
    expect(resumenes.map((r) => r.mes)).toEqual(['2026-04', '2026-03'])
    expect(resumenes[0].gastos).toBe(25)
    expect(resumenes[1].gastos).toBe(10)
  })

  it('sin movimientos no devuelve ningún resumen', () => {
    expect(resumenesPorMes([], '2026-04-30')).toEqual([])
  })
})

describe('compararConMedia', () => {
  const categoria = 'Alimentación'
  const mesesPrevios = ['2026-01-05', '2026-02-05', '2026-03-05'].map((fecha) =>
    mov(fecha, 'gasto', 300, categoria, 'Compra de ejemplo'),
  )

  it('en un mes ya cerrado compara contra la media mensual entera', () => {
    const movimientos = [...mesesPrevios, mov('2026-04-05', 'gasto', 250, categoria, 'Compra de ejemplo')]
    const [alimentacion] = compararConMedia(movimientos, '2026-04', '2026-04-30')
    expect(alimentacion.media).toBe(300)
    expect(alimentacion.mediaAjustada).toBe(300)
    expect(alimentacion.diferencia).toBe(-50)
    expect(alimentacion.variacion).toBe(-16.67)
    expect(alimentacion.mesesComparados).toBe(3)
  })

  it('en un mes en curso prorratea la media por los días transcurridos', () => {
    // A día 15 de un mes de 30, la media de referencia es la mitad (150). Comparar los
    // 150 EUR gastados contra los 300 de un mes entero diría que va fenomenal, y no es
    // verdad: va exactamente al ritmo de siempre.
    const movimientos = [...mesesPrevios, mov('2026-04-05', 'gasto', 150, categoria, 'Compra de ejemplo')]
    const [alimentacion] = compararConMedia(movimientos, '2026-04', '2026-04-15')
    expect(alimentacion.actual).toBe(150)
    expect(alimentacion.media).toBe(300)
    expect(alimentacion.mediaAjustada).toBe(150)
    expect(alimentacion.diferencia).toBe(0)
    expect(alimentacion.variacion).toBe(0)
  })

  it('el propio mes no entra en su media', () => {
    const movimientos = [...mesesPrevios, mov('2026-04-05', 'gasto', 900, categoria, 'Compra de ejemplo')]
    const [alimentacion] = compararConMedia(movimientos, '2026-04', '2026-04-30')
    expect(alimentacion.actual).toBe(900)
    expect(alimentacion.media).toBe(300)
  })

  it('los meses anteriores sin gastos no cuentan ni diluyen la media', () => {
    const movimientos = [
      mov('2026-01-05', 'gasto', 300, categoria, 'Compra de ejemplo'),
      mov('2026-02-05', 'ingreso', 2000, 'Ingreso', 'Nómina de ejemplo'),
      mov('2026-03-05', 'gasto', 300, categoria, 'Compra de ejemplo'),
      mov('2026-04-05', 'gasto', 100, categoria, 'Compra de ejemplo'),
    ]
    const [alimentacion] = compararConMedia(movimientos, '2026-04', '2026-04-30')
    expect(alimentacion.mesesComparados).toBe(2)
    expect(alimentacion.media).toBe(300)
  })

  it('sin meses anteriores no hay media ni variación, pero sí el gasto real', () => {
    const movimientos = [mov('2026-04-05', 'gasto', 100, categoria, 'Compra de ejemplo')]
    const [alimentacion] = compararConMedia(movimientos, '2026-04', '2026-04-30')
    expect(alimentacion.actual).toBe(100)
    expect(alimentacion.media).toBe(0)
    expect(alimentacion.mediaAjustada).toBe(0)
    expect(alimentacion.mesesComparados).toBe(0)
    expect(alimentacion.variacion).toBeNull()
  })

  it('incluye las categorías que ya no se gastan este mes, para ver que han bajado a 0', () => {
    const movimientos = [...mesesPrevios, mov('2026-04-05', 'gasto', 100, 'Ocio', 'Cena de ejemplo')]
    const comparativas = compararConMedia(movimientos, '2026-04', '2026-04-30')
    const alimentacion = comparativas.find((c) => c.categoria === categoria)
    expect(alimentacion?.actual).toBe(0)
    expect(alimentacion?.media).toBe(300)
    expect(alimentacion?.variacion).toBe(-100)
  })

  it('ordena por gasto actual de mayor a menor', () => {
    const movimientos = [
      ...mesesPrevios,
      mov('2026-04-05', 'gasto', 100, 'Ocio', 'Cena de ejemplo'),
      mov('2026-04-06', 'gasto', 250, categoria, 'Compra de ejemplo'),
    ]
    expect(compararConMedia(movimientos, '2026-04', '2026-04-30').map((c) => c.categoria)).toEqual([
      categoria,
      'Ocio',
    ])
  })
})

describe('estadoDe', () => {
  it('holgado por debajo del 80 %', () => {
    expect(estadoDe(0, 100)).toBe('holgado')
    expect(estadoDe(79.99, 100)).toBe('holgado')
  })

  it('ajustado a partir del 80 %', () => {
    expect(estadoDe(80, 100)).toBe('ajustado')
    expect(estadoDe(99.99, 100)).toBe('ajustado')
  })

  it('pasado al llegar al 100 %', () => {
    expect(estadoDe(100, 100)).toBe('pasado')
    expect(estadoDe(250, 100)).toBe('pasado')
  })

  it('sin presupuesto no hay nada que pasar', () => {
    expect(estadoDe(500, 0)).toBe('holgado')
  })
})

describe('calculaPresupuestos', () => {
  const presupuestos: Presupuesto[] = [
    { categoria: 'Alimentación', importe: 100, activo: true },
    { categoria: 'Ocio', importe: 100, activo: true },
    { categoria: 'Deporte', importe: 100, activo: true },
    { categoria: 'Transporte', importe: 50, activo: false },
    { categoria: 'Ropa', importe: 0, activo: true },
  ]
  const movimientos = [
    mov('2026-04-01', 'gasto', 150, 'Alimentación'),
    mov('2026-04-02', 'gasto', 85, 'Ocio'),
    mov('2026-04-03', 'gasto', 20, 'Deporte'),
    mov('2026-04-04', 'gasto', 999, 'Transporte'),
    mov('2026-04-05', 'gasto', 999, 'Ropa'),
    mov('2026-04-06', 'inversion', 999, 'Inversión'),
    mov('2026-03-01', 'gasto', 999, 'Alimentación'),
  ]

  it('da los tres estados y el porcentaje consumido', () => {
    const resultado = calculaPresupuestos(movimientos, presupuestos, '2026-04')
    expect(resultado).toEqual([
      { categoria: 'Alimentación', presupuesto: 100, gastado: 150, restante: -50, porcentaje: 150, estado: 'pasado' },
      { categoria: 'Ocio', presupuesto: 100, gastado: 85, restante: 15, porcentaje: 85, estado: 'ajustado' },
      { categoria: 'Deporte', presupuesto: 100, gastado: 20, restante: 80, porcentaje: 20, estado: 'holgado' },
    ])
  })

  it('pone delante el que peor va', () => {
    const resultado = calculaPresupuestos(movimientos, presupuestos, '2026-04')
    expect(resultado.map((p) => p.categoria)).toEqual(['Alimentación', 'Ocio', 'Deporte'])
  })

  it('ignora los presupuestos desactivados y los de importe 0', () => {
    const categorias = calculaPresupuestos(movimientos, presupuestos, '2026-04').map((p) => p.categoria)
    expect(categorias).not.toContain('Transporte')
    expect(categorias).not.toContain('Ropa')
  })

  it('no mezcla el gasto de otros meses ni la inversión', () => {
    const resultado = calculaPresupuestos(movimientos, presupuestos, '2026-04')
    expect(resultado[0].gastado).toBe(150)
  })

  it('sin presupuestos devuelve lista vacía', () => {
    expect(calculaPresupuestos(movimientos, [], '2026-04')).toEqual([])
  })
})

describe('conceptosRecientes', () => {
  const movimientos = [
    mov('2026-04-10', 'gasto', 10, 'Alimentación', 'Supermercado de ejemplo'),
    mov('2026-04-08', 'gasto', 7, 'Alimentación', '  Compra de ejemplo  '),
    mov('2026-04-05', 'gasto', 12, 'Alimentación', 'supermercado de ejemplo'),
    mov('2026-04-02', 'ingreso', 2000, 'Ingreso', 'Nómina de ejemplo'),
    mov('2026-04-01', 'gasto', 5, 'Ocio', 'Cena de ejemplo'),
    mov('2026-03-20', 'gasto', 7, 'Alimentación', 'Compra de ejemplo'),
  ]

  it('devuelve los últimos conceptos usados, sin repetir y del más reciente al más antiguo', () => {
    expect(conceptosRecientes(movimientos, 'gasto')).toEqual([
      'Supermercado de ejemplo',
      'Compra de ejemplo',
      'Cena de ejemplo',
    ])
  })

  it('no distingue mayúsculas al deduplicar y se queda con la última grafía', () => {
    // "supermercado de ejemplo" del 5 de abril no aparece porque "Supermercado de ejemplo" del
    // 10 ya está en la lista.
    expect(conceptosRecientes(movimientos, 'gasto')).not.toContain('supermercado de ejemplo')
  })

  it('recorta los espacios de los conceptos', () => {
    expect(conceptosRecientes(movimientos, 'gasto')).toContain('Compra de ejemplo')
  })

  it('solo mira el tipo pedido', () => {
    expect(conceptosRecientes(movimientos, 'ingreso')).toEqual(['Nómina de ejemplo'])
  })

  it('respeta el límite', () => {
    expect(conceptosRecientes(movimientos, 'gasto', 2)).toEqual(['Supermercado de ejemplo', 'Compra de ejemplo'])
  })
})

describe('categoriasMasUsadas', () => {
  it('ordena las categorías por número de movimientos del ámbito pedido', () => {
    const movimientos = [
      mov('2026-04-01', 'gasto', 1, 'Ocio'),
      mov('2026-04-02', 'gasto', 1, 'Ocio'),
      mov('2026-04-03', 'gasto', 1, 'Alimentación'),
      mov('2026-04-04', 'inversion', 1, 'Inversión'),
    ]
    expect(categoriasMasUsadas(movimientos, 'gasto')).toEqual(['Ocio', 'Alimentación'])
    expect(categoriasMasUsadas(movimientos, 'inversion')).toEqual(['Inversión'])
  })

  it('sin movimientos de ese ámbito devuelve lista vacía', () => {
    expect(categoriasMasUsadas([mov('2026-04-01', 'gasto', 1)], 'ingreso')).toEqual([])
  })
})

describe('gastoTotalDelMes', () => {
  it('suma solo los gastos del mes pedido', () => {
    const movimientos = [
      mov('2026-04-01', 'gasto', 10),
      mov('2026-04-02', 'inversion', 300, 'Inversión'),
      mov('2026-03-01', 'gasto', 999),
    ]
    expect(gastoTotalDelMes(movimientos, '2026-04')).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// Contra los cuatro meses de movimientos de ejemplo
// ---------------------------------------------------------------------------

describe('resumenMes con los movimientos de ejemplo', () => {
  const hoy = '2026-04-30'

  it('el ejemplo trae 12 gastos, 3 ingresos, 3 inversiones y 3 amortizaciones', () => {
    const cuenta = (tipo: TipoMovimiento) => MOVIMIENTOS_EJEMPLO.filter((m) => m.tipo === tipo).length
    expect(cuenta('gasto')).toBe(12)
    expect(cuenta('ingreso')).toBe(3)
    expect(cuenta('inversion')).toBe(3)
    expect(cuenta('amortizacion')).toBe(3)
    expect(MOVIMIENTOS_EJEMPLO).toHaveLength(21)
  })

  it('enero cuadra: 2.000 de ingresos, 150 de gastos y 1.550 de disponible', () => {
    const resumen = resumenMes(MOVIMIENTOS_EJEMPLO, '2026-01', hoy)
    expect(resumen.ingresos).toBe(2000)
    expect(resumen.gastos).toBe(150)
    expect(resumen.inversion).toBe(200)
    expect(resumen.amortizacion).toBe(100)
    expect(resumen.disponible).toBe(1550)
    expect(resumen.tasaAhorro).toBe(15)
    expect(resumen.diasConActividad).toBe(6)
    expect(resumen.movimientos).toHaveLength(6)
  })

  it('la inversión y la amortización salen de la cuenta, pero no son gasto', () => {
    // Los 300 EUR de inversión y amortización de enero salen de la cuenta corriente, pero
    // siguen siendo patrimonio: si contaran como gasto, el resumen mentiría.
    const resumen = resumenMes(MOVIMIENTOS_EJEMPLO, '2026-01', hoy)
    expect(resumen.gastos).toBe(150)
    expect(resumen.inversion + resumen.amortizacion).toBe(300)
    expect(resumen.gastosPorCategoria).toEqual([
      { categoria: 'Alimentación', importe: 100, numero: 1 },
      { categoria: 'Suministros', importe: 40, numero: 1 },
      { categoria: 'Suscripciones', importe: 10, numero: 1 },
    ])
  })

  it('el gasto medio diario de un mes ya cerrado reparte entre sus 31 días', () => {
    expect(resumenMes(MOVIMIENTOS_EJEMPLO, '2026-01', hoy).gastoMedioDiario).toBe(4.84)
  })

  it('abril cierra en negativo porque no hubo nómina', () => {
    const resumen = resumenMes(MOVIMIENTOS_EJEMPLO, '2026-04', '2026-05-31')
    expect(resumen.ingresos).toBe(0)
    expect(resumen.gastos).toBe(70)
    expect(resumen.inversion).toBe(0)
    expect(resumen.amortizacion).toBe(0)
    expect(resumen.disponible).toBe(-70)
    expect(resumen.tasaAhorro).toBe(0)
    expect(resumen.diasConActividad).toBe(2)
    expect(resumen.movimientos).toHaveLength(2)
    expect(resumen.gastosPorCategoria).toEqual([
      { categoria: 'Suministros', importe: 60, numero: 1 },
      { categoria: 'Suscripciones', importe: 10, numero: 1 },
    ])
  })

  it('los cuatro meses del ejemplo suman los 21 movimientos', () => {
    const meses = ['2026-01', '2026-02', '2026-03', '2026-04']
    const total = meses.reduce((suma, mes) => suma + resumenMes(MOVIMIENTOS_EJEMPLO, mes, hoy).movimientos.length, 0)
    expect(total).toBe(21)
  })
})

describe('compararConMedia con los movimientos de ejemplo', () => {
  it('compara abril (ya cerrado) contra la media de enero, febrero y marzo', () => {
    const comparativas = compararConMedia(MOVIMIENTOS_EJEMPLO, '2026-04', '2026-04-30')
    const suministros = comparativas.find((c) => c.categoria === 'Suministros')
    // 40 + 60 + 40 = 140 en tres meses: 46,67 de media, y en abril van 60.
    expect(suministros).toEqual({
      categoria: 'Suministros',
      actual: 60,
      media: 46.67,
      mediaAjustada: 46.67,
      mesesComparados: 3,
      diferencia: 13.33,
      variacion: 28.56,
    })
  })

  it('con el mes en curso a día 15 la media se prorratea', () => {
    const comparativas = compararConMedia(MOVIMIENTOS_EJEMPLO, '2026-03', '2026-03-15')
    const alimentacion = comparativas.find((c) => c.categoria === 'Alimentación')
    const suministros = comparativas.find((c) => c.categoria === 'Suministros')
    // 15 días de 31: la media de enero y febrero se queda en menos de la mitad.
    expect(alimentacion?.media).toBe(110)
    expect(alimentacion?.mediaAjustada).toBe(53.23)
    expect(suministros?.mediaAjustada).toBe(24.19)
    // El gasto real del mes no cambia por mirarlo antes o después.
    expect(alimentacion?.actual).toBe(80)
  })

  it('marca el ocio como bajado a cero respecto a los meses anteriores', () => {
    const comparativas = compararConMedia(MOVIMIENTOS_EJEMPLO, '2026-04', '2026-04-30')
    const ocio = comparativas.find((c) => c.categoria === 'Ocio')
    expect(ocio?.actual).toBe(0)
    // El cine de marzo (30) repartido entre enero, febrero y marzo: 10 de media.
    expect(ocio?.media).toBe(10)
    expect(ocio?.variacion).toBe(-100)
  })

  it('sin meses anteriores no inventa media (enero es el primer mes con datos)', () => {
    const comparativas = compararConMedia(MOVIMIENTOS_EJEMPLO, '2026-01', '2026-04-30')
    expect(comparativas).toHaveLength(3)
    expect(comparativas.every((c) => c.mesesComparados === 0 && c.variacion === null)).toBe(true)
  })

  it('ordena por gasto actual de mayor a menor', () => {
    expect(compararConMedia(MOVIMIENTOS_EJEMPLO, '2026-03', '2026-04-30').map((c) => c.categoria)).toEqual([
      'Alimentación',
      'Suministros',
      'Ocio',
      'Suscripciones',
    ])
  })
})

describe('categoriasMasUsadas y gastoTotalDelMes con los movimientos de ejemplo', () => {
  it('las categorías más usadas del ejemplo', () => {
    // Suscripciones y Suministros empatan a cuatro movimientos: el empate lo rompe el orden en
    // que aparecen por primera vez (la cuota es del día 5 y la luz del 20).
    expect(categoriasMasUsadas(MOVIMIENTOS_EJEMPLO, 'gasto')).toEqual([
      'Suscripciones',
      'Suministros',
      'Alimentación',
      'Ocio',
    ])
    expect(categoriasMasUsadas(MOVIMIENTOS_EJEMPLO, 'ingreso')).toEqual(['Ingreso'])
  })

  it('el gasto total de enero y de abril', () => {
    expect(gastoTotalDelMes(MOVIMIENTOS_EJEMPLO, '2026-01')).toBe(150)
    expect(gastoTotalDelMes(MOVIMIENTOS_EJEMPLO, '2026-04')).toBe(70)
  })

  it('los conceptos recientes salen del ejemplo, del más nuevo al más viejo', () => {
    expect(conceptosRecientes(MOVIMIENTOS_EJEMPLO, 'gasto', 3)).toEqual([
      'Luz de ejemplo',
      'Cuota de ejemplo',
      'Cine de ejemplo',
    ])
  })
})
