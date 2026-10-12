/**
 * Pruebas de `src/lib/fechas.ts`.
 *
 * Todo el modelo guarda fechas como texto `YYYY-MM-DD`, y la trampa clasica esta en
 * convertirlas a `Date`: `new Date('2026-09-22')` es medianoche UTC y en un huso negativo
 * devuelve el dia 21. Estas pruebas fijan el dia correcto y el rechazo de fechas imposibles.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  aFecha,
  aISO,
  diaDe,
  diasDelMes,
  diasTranscurridos,
  diferenciaDias,
  esFechaValida,
  esMesActual,
  esMesFuturo,
  etiquetaDia,
  formateaFecha,
  formateaFechaCorta,
  formateaFechaLarga,
  hoyISO,
  listaMeses,
  mesAnterior,
  mesDe,
  mesSiguiente,
  mesesConDatos,
  nombreMes,
  nombreMesCorto,
  nombreMesSolo,
  primerDia,
  sumaDias,
  ultimoDia,
} from './fechas'

describe('aFecha / aISO', () => {
  it('devuelve el día 22, no el 21, sea cual sea el huso horario', () => {
    const fecha = aFecha('2026-09-22')
    expect(fecha).not.toBeNull()
    expect(fecha?.getFullYear()).toBe(2026)
    expect(fecha?.getMonth()).toBe(8)
    expect(fecha?.getDate()).toBe(22)
  })

  it('construye la fecha a medianoche local, no a medianoche UTC', () => {
    // Si se construyera con `new Date('2026-09-22')` (UTC), en España la hora local seria
    // la 01:00 o 02:00 y en un huso negativo el dia seria el 21.
    expect(aFecha('2026-09-22')?.getHours()).toBe(0)
  })

  it('ida y vuelta sin desplazamiento de día, incluido el 1 de enero', () => {
    for (const iso of ['2024-01-01', '2025-12-31', '2026-09-22', '2024-02-29']) {
      expect(aISO(aFecha(iso) as Date)).toBe(iso)
    }
  })

  it('rechaza fechas imposibles en vez de desbordarlas al mes siguiente', () => {
    expect(aFecha('2026-02-31')).toBeNull()
    expect(aFecha('2026-04-31')).toBeNull()
    expect(aFecha('2026-13-01')).toBeNull()
    expect(aFecha('2026-00-10')).toBeNull()
    expect(aFecha('2026-09-00')).toBeNull()
    expect(aFecha('2023-02-29')).toBeNull()
  })

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(aISO(aFecha('2024-02-29') as Date)).toBe('2024-02-29')
  })

  it('rechaza formatos que no sean YYYY-MM-DD', () => {
    expect(aFecha('22-09-2026')).toBeNull()
    expect(aFecha('2026-9-22')).toBeNull()
    expect(aFecha('2026/09/22')).toBeNull()
    expect(aFecha('')).toBeNull()
    expect(aFecha('hoy')).toBeNull()
  })

  it('aISO usa la fecha local, no toISOString', () => {
    expect(aISO(new Date(2026, 8, 22, 23, 30))).toBe('2026-09-22')
    expect(aISO(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
  })

  it('hoyISO acepta la fecha que se le pase, para poder probar sin reloj', () => {
    expect(hoyISO(new Date(2026, 0, 5, 18, 0))).toBe('2026-01-05')
  })

  it('esFechaValida resume aFecha', () => {
    expect(esFechaValida('2026-09-22')).toBe(true)
    expect(esFechaValida('2026-02-31')).toBe(false)
  })
})

describe('mesDe y nombres de mes', () => {
  it('recorta la fecha al mes', () => {
    expect(mesDe('2026-09-22')).toBe('2026-09')
  })

  it('escribe el mes en largo', () => {
    expect(nombreMes('2026-09')).toBe('septiembre de 2026')
    expect(nombreMes('2026-01')).toBe('enero de 2026')
  })

  it('escribe el mes en corto para ejes y listas', () => {
    expect(nombreMesCorto('2026-09')).toBe('sep 26')
    expect(nombreMesCorto('2024-01')).toBe('ene 24')
    expect(nombreMesCorto('2007-12')).toBe('dic 07')
  })

  it('escribe el mes suelto y en mayúscula inicial', () => {
    expect(nombreMesSolo('2026-09')).toBe('Septiembre')
  })

  it('si el mes no vale, devuelve lo que le llegó en vez de "undefined"', () => {
    expect(nombreMes('vaya')).toBe('vaya')
    expect(nombreMesCorto('vaya')).toBe('vaya')
    expect(nombreMesSolo('vaya')).toBe('vaya')
  })
})

describe('mesAnterior y mesSiguiente', () => {
  it('retrocede un mes dentro del mismo año', () => {
    expect(mesAnterior('2026-03')).toBe('2026-02')
  })

  it('cruza el cambio de año hacia atrás', () => {
    expect(mesAnterior('2026-01')).toBe('2025-12')
    expect(mesAnterior('2000-01')).toBe('1999-12')
  })

  it('avanza un mes dentro del mismo año', () => {
    expect(mesSiguiente('2026-09')).toBe('2026-10')
  })

  it('cruza el cambio de año hacia delante', () => {
    expect(mesSiguiente('2026-12')).toBe('2027-01')
    expect(mesSiguiente('1999-12')).toBe('2000-01')
  })

  it('volver y deshacer deja el mes donde estaba', () => {
    for (const mes of ['2026-01', '2026-09', '2026-12']) {
      expect(mesAnterior(mesSiguiente(mes))).toBe(mes)
    }
  })
})

describe('listaMeses', () => {
  it('incluye los dos extremos', () => {
    expect(listaMeses('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('devuelve un solo mes si coinciden', () => {
    expect(listaMeses('2026-09', '2026-09')).toEqual(['2026-09'])
  })

  it('devuelve lista vacía si el rango está al revés', () => {
    expect(listaMeses('2026-10', '2026-09')).toEqual([])
  })

  it('cubre las 36 fotos del histórico sin saltarse ningún mes', () => {
    expect(listaMeses('2024-01', '2026-09')).toHaveLength(33)
  })
})

describe('diasDelMes', () => {
  it('cuenta los días de un mes de 30 y de 31', () => {
    expect(diasDelMes('2026-09')).toBe(30)
    expect(diasDelMes('2026-01')).toBe(31)
  })

  it('cuenta febrero en año normal y en bisiesto', () => {
    expect(diasDelMes('2026-02')).toBe(28)
    expect(diasDelMes('2024-02')).toBe(29)
    expect(diasDelMes('2100-02')).toBe(28)
    expect(diasDelMes('2000-02')).toBe(29)
  })

  it('devuelve 30 si el mes no vale, para no romper los cálculos que lo usan', () => {
    expect(diasDelMes('nada')).toBe(30)
    expect(diasDelMes('')).toBe(30)
  })
})

describe('diasTranscurridos', () => {
  it('en un mes ya cerrado cuenta el mes entero', () => {
    expect(diasTranscurridos('2026-03', '2026-09-22')).toBe(31)
    expect(diasTranscurridos('2026-02', '2026-09-22')).toBe(28)
  })

  it('en el mes en curso cuenta los días que han pasado', () => {
    expect(diasTranscurridos('2026-09', '2026-09-22')).toBe(22)
    expect(diasTranscurridos('2026-09', '2026-09-01')).toBe(1)
  })

  it('en un mes futuro no ha pasado ninguno', () => {
    expect(diasTranscurridos('2026-10', '2026-09-22')).toBe(0)
  })

  it('sin pasarle "hoy" usa el reloj, y ahí sí se congela la fecha', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
    try {
      expect(diasTranscurridos('2026-09')).toBe(22)
      expect(esMesActual('2026-09')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('esMesActual y esMesFuturo', () => {
  it('comparan contra el mes de la fecha de referencia', () => {
    expect(esMesActual('2026-09', '2026-09-22')).toBe(true)
    expect(esMesActual('2026-08', '2026-09-22')).toBe(false)
    expect(esMesFuturo('2026-10', '2026-09-22')).toBe(true)
    expect(esMesFuturo('2026-09', '2026-09-22')).toBe(false)
  })
})

describe('diaDe y formateos', () => {
  it('saca el día del mes', () => {
    expect(diaDe('2026-09-22')).toBe(22)
    expect(diaDe('2026-09-01')).toBe(1)
  })

  it('escribe la fecha en largo con el día de la semana', () => {
    expect(formateaFechaLarga('2026-09-22')).toBe('martes 22 de septiembre')
    expect(formateaFechaLarga('2026-08-01')).toBe('sábado 1 de agosto')
  })

  it('escribe la fecha media y corta', () => {
    expect(formateaFecha('2026-09-22')).toBe('22 sep 2026')
    expect(formateaFechaCorta('2026-09-22')).toBe('22/09/2026')
    expect(formateaFechaCorta('2026-01-05')).toBe('05/01/2026')
  })

  it('devuelve el texto original si la fecha no vale', () => {
    expect(formateaFechaLarga('nada')).toBe('nada')
    expect(formateaFecha('nada')).toBe('nada')
    expect(formateaFechaCorta('nada')).toBe('nada')
  })

  it('primerDia y ultimoDia acotan el mes', () => {
    expect(primerDia('2026-09')).toBe('2026-09-01')
    expect(ultimoDia('2026-09')).toBe('2026-09-30')
    expect(ultimoDia('2024-02')).toBe('2024-02-29')
  })
})

describe('diferenciaDias', () => {
  it('cuenta los días entre dos fechas (b - a)', () => {
    expect(diferenciaDias('2026-09-01', '2026-09-22')).toBe(21)
    expect(diferenciaDias('2026-09-22', '2026-09-01')).toBe(-21)
    expect(diferenciaDias('2026-09-22', '2026-09-22')).toBe(0)
  })

  it('no se descoloca al cambiar la hora (fin del horario de verano)', () => {
    // El 25 de octubre de 2026 el día dura 25 horas en España: sin `Math.round`, la resta
    // de milisegundos daría 1,958 días en vez de 2.
    expect(diferenciaDias('2026-10-24', '2026-10-26')).toBe(2)
    expect(diferenciaDias('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('devuelve 0 si alguna fecha no vale', () => {
    expect(diferenciaDias('nada', '2026-09-22')).toBe(0)
  })
})

describe('sumaDias', () => {
  it('suma días dentro del mes', () => {
    expect(sumaDias('2026-09-01', 5)).toBe('2026-09-06')
  })

  it('cruza el cambio de mes y de año', () => {
    expect(sumaDias('2026-09-22', 9)).toBe('2026-10-01')
    expect(sumaDias('2026-01-01', -1)).toBe('2025-12-31')
    expect(sumaDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('respeta el 29 de febrero bisiesto y salta el no bisiesto', () => {
    expect(sumaDias('2024-02-28', 1)).toBe('2024-02-29')
    expect(sumaDias('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('devuelve la fecha original si no vale', () => {
    expect(sumaDias('nada', 1)).toBe('nada')
  })
})

describe('etiquetaDia', () => {
  it('dice Hoy, Ayer y Mañana', () => {
    expect(etiquetaDia('2026-09-22', '2026-09-22')).toBe('Hoy')
    expect(etiquetaDia('2026-09-21', '2026-09-22')).toBe('Ayer')
    expect(etiquetaDia('2026-09-23', '2026-09-22')).toBe('Mañana')
  })

  it('cuenta los días de la última semana', () => {
    expect(etiquetaDia('2026-09-19', '2026-09-22')).toBe('Hace 3 días')
    expect(etiquetaDia('2026-09-16', '2026-09-22')).toBe('Hace 6 días')
  })

  it('a partir de una semana usa la fecha larga, que es más útil que "Hace 20 días"', () => {
    expect(etiquetaDia('2026-09-15', '2026-09-22')).toBe('martes 15 de septiembre')
  })

  it('sin pasarle "hoy" usa el reloj', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
    try {
      expect(etiquetaDia('2026-09-22')).toBe('Hoy')
      expect(etiquetaDia('2026-09-21')).toBe('Ayer')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('mesesConDatos', () => {
  it('devuelve los meses sin repetir y ordenados', () => {
    expect(mesesConDatos(['2026-09-22', '2026-03-31', '2026-09-01'])).toEqual(['2026-03', '2026-09'])
  })

  it('ignora los huecos vacíos', () => {
    expect(mesesConDatos(['', '2026-09-01'])).toEqual(['2026-09'])
    expect(mesesConDatos([])).toEqual([])
  })
})

describe('reloj congelado (por si alguna función lee la hora sin parámetro)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 22, 10, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hoyISO sin argumentos devuelve la fecha congelada', () => {
    expect(hoyISO()).toBe('2026-09-22')
  })
})
