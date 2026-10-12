/**
 * Los calculos del patrimonio: cuanto tienes, cuanto debes y cuanto queda de verdad.
 *
 * Aqui esta la correccion mas importante respecto al excel de partida. El excel sumaba
 * cuentas y fondos y llamaba a eso "VALOR NETO TOTAL", sin restar ni una deuda: decia
 * 45.283 EUR cuando la hipoteca sola eran 83.738 EUR. En Oikos el neto resta siempre la
 * deuda, y cuando el resultado es negativo se dice con todas las letras en vez de
 * esconderlo.
 */

import type { BloquePatrimonio, Cuenta, Deuda, FotoPatrimonio, Patrimonio } from '../types'
import { redondea, suma } from './dinero'

/** Importe de una cuenta concreta en una foto. `undefined` si esa cuenta no aparece. */
export function valorEn(foto: FotoPatrimonio | undefined, cuenta: string): number | undefined {
  if (!foto) return undefined
  const encontrado = foto.valores.find((v) => v.cuenta === cuenta)
  return encontrado ? encontrado.importe : undefined
}

/** Total de un bloque (liquidez o activos) en una foto. */
export function totalBloque(foto: FotoPatrimonio | undefined, cuentas: Cuenta[], bloque: BloquePatrimonio): number {
  if (!foto) return 0
  const nombres = new Set(cuentas.filter((c) => c.bloque === bloque).map((c) => c.nombre))
  return suma(foto.valores.filter((v) => nombres.has(v.cuenta)).map((v) => v.importe))
}

/** La deuda total, separando la que paga otra persona pero cuyo riesgo es tuyo. */
export function totalDeuda(deudas: Deuda[]): { propia: number; compartida: number; total: number } {
  const activas = deudas.filter((d) => d.activa)
  const propia = suma(activas.filter((d) => !d.compartida).map((d) => d.saldo))
  const compartida = suma(activas.filter((d) => d.compartida).map((d) => d.saldo))
  return { propia, compartida, total: redondea(propia + compartida) }
}

/**
 * El patrimonio de una foto.
 *
 * `deudaIncluida` en false sirve para poder enseñar las dos cifras a la vez (lo que dice
 * el excel y la realidad), que es justo lo que hace falta para entender el desfase.
 */
export function calculaPatrimonio(
  foto: FotoPatrimonio | undefined,
  cuentas: Cuenta[],
  deudas: Deuda[] = [],
  deudaIncluida = true,
): Patrimonio {
  const liquidez = totalBloque(foto, cuentas, 'liquidez')
  const activos = totalBloque(foto, cuentas, 'activo')
  const bruto = redondea(liquidez + activos)
  const { propia, compartida } = totalDeuda(deudas)
  const deuda = deudaIncluida ? propia : 0
  return {
    liquidez,
    activos,
    bruto,
    deuda: propia,
    deudaCompartida: compartida,
    neto: redondea(bruto - deuda),
  }
}

export interface PuntoPatrimonio {
  fecha: string
  liquidez: number
  activos: number
  bruto: number
  /** Variacion del bruto respecto al punto anterior. */
  variacion: number | null
}

/**
 * La evolucion del patrimonio a lo largo de las fotos.
 *
 * OJO: es el patrimonio BRUTO (cuentas + inversiones). La deuda no se puede restar en el
 * historico porque el excel antiguo no la registraba y no hay forma de saber cuanto se
 * debia en cada mes: inventarlo seria peor que no enseñarlo. La pantalla lo dice.
 */
export function seriePatrimonio(fotos: FotoPatrimonio[], cuentas: Cuenta[]): PuntoPatrimonio[] {
  const ordenadas = [...fotos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
  const puntos: PuntoPatrimonio[] = []
  let anterior: number | null = null
  for (const foto of ordenadas) {
    const liquidez = totalBloque(foto, cuentas, 'liquidez')
    const activos = totalBloque(foto, cuentas, 'activo')
    const bruto = redondea(liquidez + activos)
    puntos.push({
      fecha: foto.fecha,
      liquidez,
      activos,
      bruto,
      variacion: anterior === null ? null : redondea(bruto - anterior),
    })
    anterior = bruto
  }
  return puntos
}

/**
 * El ultimo valor conocido de cada cuenta.
 *
 * Es lo que permite que hacer la foto del mes sea solo corregir cuatro numeros: la pantalla
 * precarga lo que valian el mes pasado.
 */
export function ultimosValores(fotos: FotoPatrimonio[]): Record<string, number> {
  const ordenadas = [...fotos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
  const valores: Record<string, number> = {}
  for (const foto of ordenadas) {
    for (const valor of foto.valores) {
      valores[valor.cuenta] = valor.importe
    }
  }
  return valores
}

/** Fecha de la foto mas reciente, o null si no hay ninguna. */
export function ultimaFoto(fotos: FotoPatrimonio[]): FotoPatrimonio | null {
  if (fotos.length === 0) return null
  return [...fotos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))[fotos.length - 1]
}

/**
 * Cuanto ha cambiado el patrimonio bruto entre dos fechas.
 * Devuelve null si no hay fotos suficientes.
 */
export function variacionEntre(fotos: FotoPatrimonio[], cuentas: Cuenta[], desde: string, hasta: string): number | null {
  const serie = seriePatrimonio(fotos, cuentas)
  const inicio = [...serie].reverse().find((p) => p.fecha <= desde)
  const fin = [...serie].reverse().find((p) => p.fecha <= hasta)
  if (!inicio || !fin) return null
  return redondea(fin.bruto - inicio.bruto)
}
