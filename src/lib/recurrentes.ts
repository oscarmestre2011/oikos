/**
 * Deteccion de gastos que se repiten: suscripciones, seguros, cuotas y tambien las
 * aportaciones fijas de inversion (que no son un gasto, pero interesa tenerlas fichadas).
 *
 * La idea: agrupar por concepto y buscar el mismo cargo en meses distintos. Lo que se
 * repite todos los meses con un importe parecido es un coste fijo, y sumado da una cifra
 * que casi nunca se tiene en la cabeza ("pago 47 EUR al mes en suscripciones").
 *
 * Se pide un minimo de meses (3 por defecto) para no llamar "suscripcion" a haber comprado
 * dos veces en la misma tienda.
 */

import type { Movimiento, Recurrente, TipoMovimiento } from '../types'
import { redondea } from './dinero'
import { diaDe, mesDe } from './fechas'

export interface OpcionesRecurrentes {
  /** Meses distintos en los que tiene que aparecer para considerarlo fijo. */
  minimoMeses?: number
  /** Variacion de importe tolerada (0,1 = 10%) antes de marcarlo como variable. */
  tolerancia?: number
  /** Tipos de movimiento que se miran. */
  tipos?: TipoMovimiento[]
}

const TIPOS_POR_DEFECTO: TipoMovimiento[] = ['gasto', 'inversion', 'amortizacion']

/**
 * Normaliza un concepto para agrupar: minusculas, sin tildes, sin signos y con un solo
 * espacio. "Cafe con Ana" y "cafe  con  ana" son el mismo concepto.
 */
export function normalizaConcepto(texto: string): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** La mediana de una lista de numeros. Aguanta mejor los valores raros que la media. */
export function mediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const medio = Math.floor(ordenados.length / 2)
  if (ordenados.length % 2 === 1) return ordenados[medio]
  return (ordenados[medio - 1] + ordenados[medio]) / 2
}

/** Diferencia entre dos meses 'YYYY-MM' medida en meses. */
function mesesDeDiferencia(desde: string, hasta: string): number {
  const [a1, m1] = desde.split('-').map(Number)
  const [a2, m2] = hasta.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

/**
 * La periodicidad mas probable a partir de los huecos entre cargos: 1 = mensual,
 * 3 = trimestral, 6 = semestral, 12 = anual. Si los huecos no son regulares, devuelve 1.
 */
export function periodicidadDe(fechas: string[]): number {
  if (fechas.length < 2) return 1
  const ordenadas = [...fechas].sort()
  const huecos: number[] = []
  for (let i = 1; i < ordenadas.length; i += 1) {
    huecos.push(mesesDeDiferencia(mesDe(ordenadas[i - 1]), mesDe(ordenadas[i])))
  }
  const tipico = Math.round(mediana(huecos))
  if (tipico <= 0) return 1
  if (tipico <= 2) return 1
  if (tipico <= 4) return 3
  if (tipico <= 8) return 6
  return 12
}

/**
 * Los cargos que se repiten.
 *
 * Se descartan los conceptos que aparecen muchas veces dentro del mismo mes: eso es la
 * compra del supermercado, no una suscripcion. El limite es la mediana de cargos por mes.
 */
export function detectaRecurrentes(
  movimientos: Movimiento[],
  opciones: OpcionesRecurrentes = {},
): Recurrente[] {
  const minimoMeses = opciones.minimoMeses ?? 3
  const tolerancia = opciones.tolerancia ?? 0.1
  const tipos = opciones.tipos ?? TIPOS_POR_DEFECTO

  const grupos = new Map<string, Movimiento[]>()
  for (const movimiento of movimientos) {
    if (!tipos.includes(movimiento.tipo)) continue
    if (!(movimiento.importe > 0)) continue
    const clave = `${movimiento.tipo}|${normalizaConcepto(movimiento.concepto)}`
    if (!clave.endsWith('|')) {
      const lista = grupos.get(clave)
      if (lista) lista.push(movimiento)
      else grupos.set(clave, [movimiento])
    }
  }

  const recurrentes: Recurrente[] = []

  for (const [clave, lista] of grupos) {
    const [tipo, concepto] = clave.split('|') as [TipoMovimiento, string]

    const porMes = new Map<string, Movimiento[]>()
    for (const movimiento of lista) {
      const mes = mesDe(movimiento.fecha)
      const delMes = porMes.get(mes)
      if (delMes) delMes.push(movimiento)
      else porMes.set(mes, [movimiento])
    }

    const meses = [...porMes.keys()].sort()
    if (meses.length < minimoMeses) continue

    // Si el concepto aparece varias veces casi todos los meses, no es una cuota fija.
    const cargosPorMes = meses.map((mes) => porMes.get(mes)!.length)
    if (mediana(cargosPorMes) > 1) continue

    // Un cargo por mes: se toma el importe de cada mes.
    const importes = meses.map((mes) => redondea(sumaDelMes(porMes.get(mes)!)))
    const tipico = redondea(mediana(importes))
    if (tipico <= 0) continue

    const minimo = Math.min(...importes)
    const maximo = Math.max(...importes)
    const variable = (maximo - minimo) / tipico > tolerancia

    const fechas = lista.map((m) => m.fecha).sort()
    const periodicidadMeses = periodicidadDe(fechas)

    recurrentes.push({
      concepto,
      etiqueta: etiquetaMasReciente(lista),
      categoria: categoriaMasReciente(lista),
      tipo,
      importe: tipico,
      meses: meses.length,
      fechas,
      costeAnual: redondea(tipico * (12 / periodicidadMeses)),
      diaHabitual: Math.round(mediana(lista.map((m) => diaDe(m.fecha)))),
      variable,
      periodicidadMeses,
    })
  }

  // Primero los que mas cuestan al año.
  return recurrentes.sort((a, b) => b.costeAnual - a.costeAnual)
}

/** Suma de los importes de los cargos de un mismo mes. */
function sumaDelMes(lista: Movimiento[]): number {
  return lista.reduce((total, movimiento) => total + movimiento.importe, 0)
}

function etiquetaMasReciente(lista: Movimiento[]): string {
  let mejor = lista[0]
  for (const movimiento of lista) {
    if (movimiento.fecha > mejor.fecha) mejor = movimiento
  }
  return mejor.concepto.trim()
}

function categoriaMasReciente(lista: Movimiento[]): string {
  let mejor = lista[0]
  for (const movimiento of lista) {
    if (movimiento.fecha > mejor.fecha) mejor = movimiento
  }
  return mejor.categoria
}

/** El coste fijo mensual: lo que se repite cada mes, sumado. */
export function costeFijoMensual(recurrentes: Recurrente[]): number {
  return redondea(
    recurrentes
      .filter((r) => r.tipo === 'gasto')
      .reduce((total, r) => total + r.importe * (1 / r.periodicidadMeses), 0),
  )
}

/** El coste fijo anual. */
export function costeFijoAnual(recurrentes: Recurrente[]): number {
  return redondea(recurrentes.filter((r) => r.tipo === 'gasto').reduce((total, r) => total + r.costeAnual, 0))
}
