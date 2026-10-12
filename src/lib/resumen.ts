/**
 * Los calculos del mes: en que se va el dinero, cuanto queda y como se compara con lo
 * que sueles gastar.
 */

import type {
  ComparativaCategoria,
  ComparativaPresupuesto,
  EstadoPresupuesto,
  GastoPorCategoria,
  Movimiento,
  Presupuesto,
  ResumenMes,
  TipoMovimiento,
} from '../types'
import { redondea, suma } from './dinero'
import { diasDelMes, diasTranscurridos, esMesActual, hoyISO, mesDe } from './fechas'

/** Los movimientos de un mes concreto. */
export function movimientosDeMes(movimientos: Movimiento[], mes: string): Movimiento[] {
  return movimientos.filter((m) => mesDe(m.fecha) === mes)
}

/** Total de un tipo de movimiento. */
export function totalPorTipo(movimientos: Movimiento[], tipo: TipoMovimiento): number {
  return suma(movimientos.filter((m) => m.tipo === tipo).map((m) => m.importe))
}

/** Gasto agrupado por categoria, de mayor a menor. */
export function gastosPorCategoria(movimientos: Movimiento[]): GastoPorCategoria[] {
  const mapa = new Map<string, GastoPorCategoria>()
  for (const movimiento of movimientos) {
    if (movimiento.tipo !== 'gasto') continue
    const actual = mapa.get(movimiento.categoria)
    if (actual) {
      actual.importe = redondea(actual.importe + movimiento.importe)
      actual.numero += 1
    } else {
      mapa.set(movimiento.categoria, {
        categoria: movimiento.categoria,
        importe: redondea(movimiento.importe),
        numero: 1,
      })
    }
  }
  return [...mapa.values()].sort((a, b) => b.importe - a.importe)
}

/**
 * El resumen completo de un mes.
 *
 * `hoy` se pasa como parametro (en vez de leer el reloj dentro) para poder probar el
 * comportamiento de un mes en curso sin depender del dia en que se ejecuten las pruebas.
 */
export function resumenMes(movimientos: Movimiento[], mes: string, hoy: string = hoyISO()): ResumenMes {
  const delMes = movimientosDeMes(movimientos, mes)
  const ingresos = totalPorTipo(delMes, 'ingreso')
  const gastos = totalPorTipo(delMes, 'gasto')
  const inversion = totalPorTipo(delMes, 'inversion')
  const amortizacion = totalPorTipo(delMes, 'amortizacion')

  const dias = diasTranscurridos(mes, hoy)
  const diasConActividad = new Set(delMes.map((m) => m.fecha)).size

  return {
    mes,
    ingresos,
    gastos,
    inversion,
    amortizacion,
    disponible: redondea(ingresos - gastos - inversion - amortizacion),
    tasaAhorro: ingresos > 0 ? redondea(((inversion + amortizacion) / ingresos) * 100) : 0,
    gastosPorCategoria: gastosPorCategoria(delMes),
    movimientos: [...delMes].sort(ordenDescendente),
    diasConActividad,
    gastoMedioDiario: dias > 0 ? redondea(gastos / dias) : 0,
  }
}

/** Del mas reciente al mas antiguo; a igualdad de fecha, lo apuntado despues va antes. */
export function ordenDescendente(a: Movimiento, b: Movimiento): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1
  return (b.id ?? 0) - (a.id ?? 0)
}

/** El resumen de cada mes que tenga algun movimiento, del mas reciente al mas antiguo. */
export function resumenesPorMes(movimientos: Movimiento[], hoy: string = hoyISO()): ResumenMes[] {
  const meses = [...new Set(movimientos.map((m) => mesDe(m.fecha)))].sort().reverse()
  return meses.map((mes) => resumenMes(movimientos, mes, hoy))
}

/**
 * Compara el gasto de este mes con lo que sueles gastar.
 *
 * La media se calcula con los meses ANTERIORES que tengan gastos (el mes actual no entra
 * en su propia media, que si no se compararia consigo mismo). Si el mes esta en curso, la
 * media se prorratea por los dias transcurridos: comparar lo gastado el dia 8 contra la
 * media de un mes entero diria siempre que vas fenomenal.
 */
export function compararConMedia(
  movimientos: Movimiento[],
  mes: string,
  hoy: string = hoyISO(),
): ComparativaCategoria[] {
  const gastosDelMes = movimientosDeMes(movimientos, mes).filter((m) => m.tipo === 'gasto')
  const actuales = new Map<string, number>()
  for (const movimiento of gastosDelMes) {
    actuales.set(movimiento.categoria, redondea((actuales.get(movimiento.categoria) ?? 0) + movimiento.importe))
  }

  const mesesPrevios = [...new Set(movimientos.filter((m) => m.tipo === 'gasto').map((m) => mesDe(m.fecha)))]
    .filter((m) => m < mes)
  const mesesValidos = mesesPrevios.filter((m) => totalPorTipo(movimientosDeMes(movimientos, m), 'gasto') > 0)
  const numeroMeses = mesesValidos.length

  const acumulado = new Map<string, number>()
  for (const previo of mesesValidos) {
    for (const movimiento of movimientosDeMes(movimientos, previo)) {
      if (movimiento.tipo !== 'gasto') continue
      acumulado.set(movimiento.categoria, redondea((acumulado.get(movimiento.categoria) ?? 0) + movimiento.importe))
    }
  }

  const factor = esMesActual(mes, hoy) ? diasTranscurridos(mes, hoy) / diasDelMes(mes) : 1
  const categorias = new Set([...actuales.keys(), ...(numeroMeses > 0 ? acumulado.keys() : [])])

  const comparativas: ComparativaCategoria[] = []
  for (const categoria of categorias) {
    const actual = actuales.get(categoria) ?? 0
    const media = numeroMeses > 0 ? redondea((acumulado.get(categoria) ?? 0) / numeroMeses) : 0
    const mediaAjustada = redondea(media * factor)
    const diferencia = redondea(actual - mediaAjustada)
    comparativas.push({
      categoria,
      actual,
      media,
      mediaAjustada,
      mesesComparados: numeroMeses,
      diferencia,
      variacion: mediaAjustada > 0 ? redondea((diferencia / mediaAjustada) * 100) : null,
    })
  }

  return comparativas.sort((a, b) => b.actual - a.actual || b.media - a.media)
}

/** Una categoria esta "pasada" a partir del 100%, "ajustada" a partir del 80%. */
export function estadoDe(gastado: number, presupuesto: number): EstadoPresupuesto {
  if (presupuesto <= 0) return 'holgado'
  const porcentaje = (gastado / presupuesto) * 100
  if (porcentaje >= 100) return 'pasado'
  if (porcentaje >= 80) return 'ajustado'
  return 'holgado'
}

/** Como va cada presupuesto en el mes indicado. */
export function calculaPresupuestos(
  movimientos: Movimiento[],
  presupuestos: Presupuesto[],
  mes: string,
): ComparativaPresupuesto[] {
  const delMes = movimientosDeMes(movimientos, mes)
  const gastadoPorCategoria = new Map<string, number>()
  for (const movimiento of delMes) {
    if (movimiento.tipo !== 'gasto') continue
    gastadoPorCategoria.set(
      movimiento.categoria,
      redondea((gastadoPorCategoria.get(movimiento.categoria) ?? 0) + movimiento.importe),
    )
  }

  return presupuestos
    .filter((p) => p.activo && p.importe > 0)
    .map((presupuesto) => {
      const gastado = gastadoPorCategoria.get(presupuesto.categoria) ?? 0
      return {
        categoria: presupuesto.categoria,
        presupuesto: presupuesto.importe,
        gastado,
        restante: redondea(presupuesto.importe - gastado),
        porcentaje: presupuesto.importe > 0 ? redondea((gastado / presupuesto.importe) * 100) : 0,
        estado: estadoDe(gastado, presupuesto.importe),
      }
    })
    .sort((a, b) => b.porcentaje - a.porcentaje)
}

/**
 * Los conceptos que mas se repiten, para ofrecerlos como atajo al apuntar.
 * Se devuelven los ultimos usados (no los mas frecuentes de siempre): si has cambiado de
 * supermercado, el atajo debe apuntar al nuevo.
 */
export function conceptosRecientes(
  movimientos: Movimiento[],
  tipo: TipoMovimiento,
  limite = 8,
): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []
  for (const movimiento of [...movimientos].filter((m) => m.tipo === tipo).sort(ordenDescendente)) {
    const clave = movimiento.concepto.trim().toLowerCase()
    if (!clave || vistos.has(clave)) continue
    vistos.add(clave)
    resultado.push(movimiento.concepto.trim())
    if (resultado.length >= limite) break
  }
  return resultado
}

/** Las categorias mas usadas de un ambito, para ordenar los botones al apuntar. */
export function categoriasMasUsadas(movimientos: Movimiento[], ambito: TipoMovimiento): string[] {
  const cuenta = new Map<string, number>()
  for (const movimiento of movimientos) {
    if (movimiento.tipo !== ambito) continue
    cuenta.set(movimiento.categoria, (cuenta.get(movimiento.categoria) ?? 0) + 1)
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([categoria]) => categoria)
}

/** Lo que se lleva gastado de un mes, en total. Atajo para la pantalla de Inicio. */
export function gastoTotalDelMes(movimientos: Movimiento[], mes: string): number {
  return totalPorTipo(movimientosDeMes(movimientos, mes), 'gasto')
}
