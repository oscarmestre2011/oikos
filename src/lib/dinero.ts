/**
 * Todo lo relacionado con escribir y leer cantidades de dinero.
 *
 * Regla de la app: los importes se guardan siempre en positivo y redondeados a 2
 * decimales. El signo lo decide el TIPO de movimiento, nunca el usuario: asi no puede
 * colarse un gasto en negativo que descuadre el resumen del mes.
 */

const FORMATO_EUROS = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const FORMATO_EUROS_SIN_DECIMALES = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const FORMATO_NUMERO = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Redondea a 2 decimales.
 *
 * Existe porque sumar float mete colas (0.1 + 0.2 = 0.30000000000000004) y en una app de
 * dinero eso acaba enseñando "1.234,5600000000002 EUR". Se redondea en cada operacion y
 * en los totales.
 */
export function redondea(valor: number): number {
  if (!Number.isFinite(valor)) return 0
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/** Suma una lista de importes redondeando el resultado. */
export function suma(importes: number[]): number {
  return redondea(importes.reduce((total, valor) => total + (Number.isFinite(valor) ? valor : 0), 0))
}

/** "1234.5" -> "1.234,50 €" */
export function formateaImporte(valor: number): string {
  return FORMATO_EUROS.format(redondea(valor))
}

/** "1234.5" -> "1.235 €" (para totales grandes, donde los centimos solo estorban) */
export function formateaImporteCorto(valor: number): string {
  return FORMATO_EUROS_SIN_DECIMALES.format(redondea(valor))
}

/** "1234.5" -> "1.234,50" (sin simbolo, para tablas y para el Markdown del vault) */
export function formateaNumero(valor: number): string {
  return FORMATO_NUMERO.format(redondea(valor))
}

/**
 * Convierte lo que escribe una persona en un numero.
 *
 * Acepta lo que de verdad se teclea en un movil español: "12,50", "12.50", "1.234,56",
 * " 12 ", "12€". Devuelve null si no hay ningun numero reconocible, para poder avisar
 * en vez de guardar un 0 silencioso.
 */
export function parseaImporte(texto: string): number | null {
  if (texto == null) return null
  let limpio = String(texto).trim()
  if (!limpio) return null

  limpio = limpio.replace(/[€\s]/g, '')
  const negativo = limpio.startsWith('-')
  limpio = limpio.replace(/^[+-]/, '')

  const tieneComa = limpio.includes(',')
  const tienePunto = limpio.includes('.')

  if (tieneComa && tienePunto) {
    // "1.234,56" (español) o "1,234.56" (anglosajon): manda el que este mas a la derecha.
    if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
      limpio = limpio.replace(/\./g, '').replace(',', '.')
    } else {
      limpio = limpio.replace(/,/g, '')
    }
  } else if (tieneComa) {
    limpio = limpio.replace(',', '.')
  } else if (tienePunto) {
    // "1.234" son mil doscientos treinta y cuatro; "12.5" son doce con cinco.
    const partes = limpio.split('.')
    const ultima = partes[partes.length - 1]
    if (partes.length > 2 || ultima.length === 3) {
      limpio = limpio.replace(/\./g, '')
    }
  }

  if (!/^\d*\.?\d*$/.test(limpio) || limpio === '' || limpio === '.') return null

  const valor = Number(limpio)
  if (!Number.isFinite(valor)) return null
  return redondea(negativo ? -valor : valor)
}

/**
 * Pasa un importe al formato que entiende un `<input type="number">`: sin separador de
 * miles y con PUNTO decimal. La coma se acepta al teclear, pero el campo necesita punto.
 */
export function aCampoNumerico(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return ''
  return redondea(valor).toFixed(2)
}

/** "12,5" -> "12,50"; y si esta vacio o es 0, cadena vacia (para no ensuciar el teclado). */
export function formateaTecleo(texto: string): string {
  if (!texto) return ''
  return texto
}

/** 12.5 -> "13 %" ; 8.25 -> "8,3 %" */
export function formateaPorcentaje(valor: number, decimales = 0): string {
  if (!Number.isFinite(valor)) return '—'
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor) + ' %'
}

/**
 * Importe abreviado para los ejes de las graficas: 1.200 -> "1,2 mil", 1250000 -> "1,3 M".
 * En una grafica de movil no cabe "1.234.567,89 EUR".
 */
export function formateaCompacto(valor: number): string {
  const absoluto = Math.abs(valor)
  const signo = valor < 0 ? '-' : ''
  if (absoluto >= 1_000_000) return `${signo}${formateaConComa(absoluto / 1_000_000)} M`
  if (absoluto >= 1_000) return `${signo}${formateaConComa(absoluto / 1_000)} mil`
  return `${signo}${formateaConComa(absoluto)}`
}

function formateaConComa(valor: number): string {
  const redondeado = Math.round(valor * 10) / 10
  const texto = Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1)
  return texto.replace('.', ',')
}

/** Reparte un importe entre varios meses sin perder centimos. Util para prorrateos. */
export function reparte(importe: number, partes: number): number[] {
  if (partes <= 0) return []
  const centimos = Math.round(redondea(importe) * 100)
  const base = Math.trunc(centimos / partes)
  const resto = centimos - base * partes
  return Array.from({ length: partes }, (_, i) => (base + (i < resto ? 1 : 0)) / 100)
}
