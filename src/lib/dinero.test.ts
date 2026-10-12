/**
 * Pruebas de `src/lib/dinero.ts`.
 *
 * El dinero es lo unico de la app que no admite "casi": un centimo perdido en un reparto o
 * un importe mal leido al teclear se ve en el resumen del mes y en el patrimonio.
 */

import { describe, expect, it } from 'vitest'
import {
  aCampoNumerico,
  formateaCompacto,
  formateaImporte,
  formateaImporteCorto,
  formateaNumero,
  formateaPorcentaje,
  formateaTecleo,
  parseaImporte,
  redondea,
  reparte,
  suma,
} from './dinero'

/**
 * `Intl` separa la cifra y el simbolo del euro con un espacio duro (U+00A0). Se normaliza
 * para que las expectativas se lean como lo que ve el usuario y no como un codigo ASCII.
 */
function normaliza(texto: string): string {
  return texto.replace(/\s/g, ' ')
}

describe('parseaImporte', () => {
  it('lee la coma decimal española', () => {
    expect(parseaImporte('12,50')).toBe(12.5)
  })

  it('lee el punto decimal anglosajón', () => {
    expect(parseaImporte('12.50')).toBe(12.5)
  })

  it('en "1.234,56" el punto es de miles y la coma decimal', () => {
    expect(parseaImporte('1.234,56')).toBe(1234.56)
  })

  it('en "1,234.56" la coma es de miles y el punto decimal', () => {
    expect(parseaImporte('1,234.56')).toBe(1234.56)
  })

  it('ignora el símbolo del euro y los espacios de alrededor', () => {
    expect(parseaImporte(' 12 €')).toBe(12)
    expect(parseaImporte('12€')).toBe(12)
  })

  it('lee "1.234" como mil doscientos treinta y cuatro (grupo de tres cifras = miles)', () => {
    expect(parseaImporte('1.234')).toBe(1234)
  })

  it('lee "12.5" como doce con cinco (una sola cifra tras el punto = decimal)', () => {
    expect(parseaImporte('12.5')).toBe(12.5)
  })

  it('lee "1.000.000" como un millón', () => {
    expect(parseaImporte('1.000.000')).toBe(1000000)
  })

  it('devuelve null cuando no hay ningún número reconocible', () => {
    expect(parseaImporte('')).toBeNull()
    expect(parseaImporte('   ')).toBeNull()
    expect(parseaImporte('abc')).toBeNull()
    expect(parseaImporte('12abc')).toBeNull()
    expect(parseaImporte('.')).toBeNull()
  })

  it('devuelve 0, no null, al teclear "0"', () => {
    // Un 0 silencioso y un null se tratan distinto en la pantalla: si esto se rompe, el
    // aviso de "importe no valido" saltaria al escribir un cero legitimo.
    expect(parseaImporte('0')).toBe(0)
    expect(parseaImporte('0,00')).toBe(0)
  })

  it('respeta el signo negativo', () => {
    expect(parseaImporte('-5')).toBe(-5)
    expect(parseaImporte('-1.234,56')).toBe(-1234.56)
  })

  it('acepta el signo positivo explícito', () => {
    expect(parseaImporte('+3,5')).toBe(3.5)
  })

  it('redondea a dos decimales lo que se teclea de más', () => {
    expect(parseaImporte('12,349')).toBe(12.35)
    expect(parseaImporte('12,344')).toBe(12.34)
  })
})

describe('redondea', () => {
  it('mata la cola del float clásico 0.1 + 0.2', () => {
    expect(redondea(0.1 + 0.2)).toBe(0.3)
  })

  it('redondea a dos decimales hacia arriba y hacia abajo', () => {
    expect(redondea(1.239)).toBe(1.24)
    expect(redondea(1.231)).toBe(1.23)
  })

  it('redondea también los negativos', () => {
    expect(redondea(-1.239)).toBe(-1.24)
  })

  it('devuelve 0 en vez de NaN o Infinity, para no ensuciar los totales', () => {
    expect(redondea(Number.NaN)).toBe(0)
    expect(redondea(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('deja intacto lo que ya está redondeado', () => {
    expect(redondea(45.9)).toBe(45.9)
  })
})

describe('suma', () => {
  it('suma sin arrastrar la cola del float', () => {
    expect(suma([0.1, 0.2])).toBe(0.3)
  })

  it('suma más de dos importes con cola', () => {
    expect(suma([0.1, 0.2, 0.3, 0.4])).toBe(1)
  })

  it('devuelve 0 con la lista vacía', () => {
    expect(suma([])).toBe(0)
  })

  it('ignora lo que no es un número finito en vez de devolver NaN', () => {
    expect(suma([1, Number.NaN, 2])).toBe(3)
  })
})

describe('formateaImporte', () => {
  it('usa el formato español: punto de miles y coma decimal', () => {
    expect(normaliza(formateaImporte(12345.67))).toBe('12.345,67 €')
  })

  it('escribe siempre dos decimales', () => {
    expect(normaliza(formateaImporte(0.5))).toBe('0,50 €')
    expect(normaliza(formateaImporte(3))).toBe('3,00 €')
  })

  it('no agrupa los millares de cuatro cifras: es lo que hace es-ES, no un fallo', () => {
    // El español solo mete separador de miles a partir de cinco cifras (CLDR
    // minimumGroupingDigits = 2). Si alguien "arregla" esto a mano, aqui salta.
    expect(normaliza(formateaImporte(1234.5))).toBe('1234,50 €')
  })

  it('pone el signo menos delante del símbolo', () => {
    expect(normaliza(formateaImporte(-5))).toBe('-5,00 €')
  })

  it('redondea antes de formatear, así que no enseña colas de float', () => {
    expect(normaliza(formateaImporte(0.1 + 0.2))).toBe('0,30 €')
  })
})

describe('formateaImporteCorto', () => {
  it('quita los céntimos', () => {
    expect(normaliza(formateaImporteCorto(999.4))).toBe('999 €')
  })

  it('redondea al euro al quitar los céntimos', () => {
    expect(normaliza(formateaImporteCorto(1234.5))).toBe('1235 €')
  })

  it('mantiene el separador de miles', () => {
    expect(normaliza(formateaImporteCorto(12345.67))).toBe('12.346 €')
  })
})

describe('formateaNumero', () => {
  it('no pone el símbolo del euro, para tablas y Markdown', () => {
    expect(formateaNumero(12345.67)).toBe('12.345,67')
  })

  it('escribe dos decimales aunque el número sea entero', () => {
    expect(formateaNumero(1234.5)).toBe('1234,50')
  })
})

describe('aCampoNumerico', () => {
  it('usa punto decimal y sin separador de miles, que es lo que exige el input number', () => {
    expect(aCampoNumerico(1234.567)).toBe('1234.57')
  })

  it('rellena a dos decimales', () => {
    expect(aCampoNumerico(12.5)).toBe('12.50')
    expect(aCampoNumerico(0)).toBe('0.00')
  })

  it('devuelve cadena vacía si no hay número, para no escribir "NaN" en el campo', () => {
    expect(aCampoNumerico(null)).toBe('')
    expect(aCampoNumerico(undefined)).toBe('')
    expect(aCampoNumerico(Number.NaN)).toBe('')
    expect(aCampoNumerico(Number.POSITIVE_INFINITY)).toBe('')
  })
})

describe('formateaCompacto', () => {
  it('deja las cifras pequeñas tal cual', () => {
    expect(formateaCompacto(0)).toBe('0')
    expect(formateaCompacto(999)).toBe('999')
  })

  it('abrevia los miles', () => {
    expect(formateaCompacto(1000)).toBe('1 mil')
    expect(formateaCompacto(1200)).toBe('1,2 mil')
    expect(formateaCompacto(15000)).toBe('15 mil')
  })

  it('abrevia los millones', () => {
    expect(formateaCompacto(1_000_000)).toBe('1 M')
    expect(formateaCompacto(1_250_000)).toBe('1,3 M')
  })

  it('respeta el signo', () => {
    expect(formateaCompacto(-1500)).toBe('-1,5 mil')
    expect(formateaCompacto(-1_500_000)).toBe('-1,5 M')
  })
})

describe('reparte', () => {
  it('reparte lo que no es divisible y no pierde ni un céntimo', () => {
    const partes = reparte(10, 3)
    expect(partes).toEqual([3.34, 3.33, 3.33])
    expect(suma(partes)).toBe(10)
  })

  it('reparte céntimos sueltos', () => {
    const partes = reparte(0.05, 2)
    expect(partes).toEqual([0.03, 0.02])
    expect(suma(partes)).toBe(0.05)
  })

  it('reparte exacto cuando toca', () => {
    expect(reparte(100, 4)).toEqual([25, 25, 25, 25])
  })

  it('devuelve lista vacía si no hay partes', () => {
    expect(reparte(10, 0)).toEqual([])
  })

  it('la suma de las partes es siempre el importe original', () => {
    // La propiedad que de verdad importa: el reparto de un año en 12 meses no puede
    // descuadrar un solo céntimo respecto al total.
    for (const importe of [1234.56, 0.01, 99.99, 100000]) {
      for (const partes of [1, 2, 3, 7, 12]) {
        expect(suma(reparte(importe, partes))).toBe(redondea(importe))
      }
    }
  })
})

describe('formateaPorcentaje', () => {
  it('redondea a entero por defecto', () => {
    expect(formateaPorcentaje(12.5)).toBe('13 %')
    expect(formateaPorcentaje(12.4)).toBe('12 %')
  })

  it('admite decimales a petición', () => {
    expect(formateaPorcentaje(8.25, 1)).toBe('8,3 %')
  })

  it('devuelve una raya cuando el valor no es un número', () => {
    expect(formateaPorcentaje(Number.NaN)).toBe('—')
  })
})

describe('formateaTecleo', () => {
  it('deja vacío el campo cuando no hay nada escrito', () => {
    expect(formateaTecleo('')).toBe('')
  })

  it('no toca lo que se está tecleando', () => {
    expect(formateaTecleo('12,5')).toBe('12,5')
  })
})
