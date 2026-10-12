/**
 * Pruebas de `src/lib/patrimonio.ts`.
 *
 * Aquí está la prueba clave del proyecto: las 36 fotos del histórico real de Óscar,
 * extraídas de su Excel (`datos/historico.json`), tienen que cuadrar **exactamente** con lo
 * que calcula `totalBloque()` usando `CUENTAS_SEMILLA` y `FOTOS_SEMILLA`. Si esto falla, hay
 * una partida clasificada en el bloque equivocado o perdida por el camino, y el patrimonio
 * que enseña la app es mentira.
 *
 * OJO con la ruta: el JSON vive en `99 App Oikos/datos/`, fuera de la carpeta `oikos`.
 */

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { Cuenta, Deuda, FotoPatrimonio } from '../types'
import { DEUDAS_SEMILLA } from '../datos/catalogo'
import { CUENTAS_SEMILLA, FOTOS_SEMILLA } from '../datos/semilla'
import {
  calculaPatrimonio,
  seriePatrimonio,
  totalBloque,
  totalDeuda,
  ultimaFoto,
  ultimosValores,
  valorEn,
  variacionEntre,
} from './patrimonio'

interface ValorExcel {
  cuenta: string
  importe: number
}

interface FotoExcel {
  fecha: string
  liquidez: ValorExcel[]
  activos: ValorExcel[]
  pasivos: ValorExcel[]
  totalLiquidez: number
  totalActivos: number
  /** En tres fotos el extractor dejó `null` en vez de 0: ninguna de las dos cosas es deuda. */
  totalPasivos: number | null
  /** liquidez + activos, el "VALOR NETO TOTAL" del Excel (que no restaba deuda). */
  total: number
  neto: number
}

/*
 * EL HISTÓRICO NO ESTÁ EN EL REPOSITORIO, y esto se aprendió publicando.
 *
 * `datos/historico.json` son los datos personales de Óscar y se quedó fuera del repositorio a
 * propósito. Pero esta prueba lo leía nada más cargarse, así que en cualquier copia limpia
 * —incluido el flujo de GitHub Actions, que clona el repositorio— el fichero no existe, la
 * lectura revienta con ENOENT y **falla la publicación entera**. En el portátil de Óscar el
 * fichero está, así que pasaba siempre; el fallo solo aparecía al publicar, que es justo cuando
 * más caro sale.
 *
 * Ahora, si no está, la comprobación se SALTA y se dice. Sigue ejecutándose en su ordenador,
 * que es donde tiene sentido: sin el Excel no hay nada con lo que comparar.
 */
const RUTA_HISTORICO = fileURLToPath(new URL('../../../datos/historico.json', import.meta.url))
const hayHistorico = existsSync(RUTA_HISTORICO)

interface Historico {
  resumen: { fotosPatrimonio: number; descuadres: number; primeraFoto: string; ultimaFoto: string }
  patrimonio: FotoExcel[]
}

const historico = hayHistorico ? (JSON.parse(readFileSync(RUTA_HISTORICO, 'utf8')) as Historico) : null

/** `describe` normal si está el histórico, y saltado si no. */
const describeConHistorico = historico ? describe : describe.skip

/** Foto de patrimonio de prueba a partir de un mapa cuenta -> importe. */
function foto(fecha: string, valores: Record<string, number>): FotoPatrimonio {
  return {
    fecha,
    valores: Object.entries(valores).map(([cuenta, importe]) => ({ cuenta, importe })),
    origen: 'manual',
    fechaAproximada: false,
  }
}

const cuentas: Cuenta[] = [
  { nombre: 'Nómina', bloque: 'liquidez', orden: 0, activa: true },
  { nombre: 'Efectivo', bloque: 'liquidez', orden: 1, activa: true },
  { nombre: 'Fondo', bloque: 'activo', orden: 2, activa: true },
  { nombre: 'Cuenta antigua', bloque: 'activo', orden: 3, activa: false },
]

describe('valorEn', () => {
  const fotoPrueba = foto('2026-09-22', { Nómina: 100.5, Fondo: 0 })

  it('devuelve el importe de la cuenta pedida', () => {
    expect(valorEn(fotoPrueba, 'Nómina')).toBe(100.5)
  })

  it('devuelve 0 (no undefined) cuando la cuenta vale 0', () => {
    // Un 0 es un dato, no un hueco: la pantalla no debe pedir que se rellene.
    expect(valorEn(fotoPrueba, 'Fondo')).toBe(0)
  })

  it('devuelve undefined si la cuenta no está en la foto', () => {
    expect(valorEn(fotoPrueba, 'Mintos')).toBeUndefined()
  })

  it('devuelve undefined si no hay foto', () => {
    expect(valorEn(undefined, 'Nómina')).toBeUndefined()
  })
})

describe('totalBloque', () => {
  const fotoPrueba = foto('2026-09-22', {
    Nómina: 100.1,
    Efectivo: 50.25,
    Fondo: 300,
    'Cuenta antigua': 5,
    Fantasma: 999,
  })

  it('suma solo las cuentas del bloque pedido', () => {
    expect(totalBloque(fotoPrueba, cuentas, 'liquidez')).toBe(150.35)
  })

  it('suma el bloque de activos aunque la cuenta esté marcada como no activa', () => {
    // `activa` significa "la uso hoy", no "esta cuenta no cuenta": las fotos antiguas del
    // Excel siguen trayendo ese dinero y tiene que aparecer en el total.
    expect(totalBloque(fotoPrueba, cuentas, 'activo')).toBe(305)
  })

  it('ignora una cuenta que no esté en el catálogo, en vez de meterla en un bloque al azar', () => {
    // 'Fantasma' vale 999: si se colara en el total, dejaría de cuadrar con el Excel.
    const sinFantasma = foto('2026-09-22', { Nómina: 100.1, Efectivo: 50.25 })
    expect(totalBloque(fotoPrueba, cuentas, 'liquidez')).toBe(totalBloque(sinFantasma, cuentas, 'liquidez'))
  })

  it('sin foto o sin cuentas devuelve 0', () => {
    expect(totalBloque(undefined, cuentas, 'liquidez')).toBe(0)
    expect(totalBloque(fotoPrueba, [], 'liquidez')).toBe(0)
  })

  it('no arrastra la cola del float al sumar', () => {
    const conCola = foto('2026-09-22', { Nómina: 0.1, Efectivo: 0.2 })
    expect(totalBloque(conCola, cuentas, 'liquidez')).toBe(0.3)
  })
})

describe('totalDeuda', () => {
  it('cuadra con las cuatro deudas del Plan de libertad financiera', () => {
    expect(totalDeuda(DEUDAS_SEMILLA)).toEqual({
      propia: 91953.13,
      compartida: 12969,
      total: 104922.13,
    })
  })

  it('separa la deuda compartida de la propia', () => {
    const deudas: Deuda[] = [
      { nombre: 'Hipoteca', saldo: 1000, fechaSaldo: '2026-09-22', compartida: false, activa: true },
      { nombre: 'Préstamo de ella', saldo: 500, fechaSaldo: '2026-09-22', compartida: true, activa: true },
    ]
    expect(totalDeuda(deudas)).toEqual({ propia: 1000, compartida: 500, total: 1500 })
  })

  it('ignora las deudas desactivadas, que son las ya canceladas', () => {
    const deudas: Deuda[] = [
      { nombre: 'Hipoteca', saldo: 1000, fechaSaldo: '2026-09-22', compartida: false, activa: true },
      { nombre: 'Pignoración cancelada', saldo: 7184.29, fechaSaldo: '2026-09-22', compartida: false, activa: false },
    ]
    expect(totalDeuda(deudas).propia).toBe(1000)
  })

  it('sin deudas todo son ceros', () => {
    expect(totalDeuda([])).toEqual({ propia: 0, compartida: 0, total: 0 })
  })
})

describe('calculaPatrimonio', () => {
  const fotoPrueba = foto('2026-09-22', { Nómina: 1000, Fondo: 2000 })
  const deudas: Deuda[] = [
    { nombre: 'Hipoteca', saldo: 83738.84, fechaSaldo: '2026-09-22', compartida: false, activa: true },
    { nombre: 'Préstamo de ella', saldo: 12969, fechaSaldo: '2026-09-22', compartida: true, activa: true },
  ]

  it('suma liquidez y activos en el bruto', () => {
    const patrimonio = calculaPatrimonio(fotoPrueba, cuentas)
    expect(patrimonio.liquidez).toBe(1000)
    expect(patrimonio.activos).toBe(2000)
    expect(patrimonio.bruto).toBe(3000)
  })

  it('sin deudas el neto es el bruto', () => {
    expect(calculaPatrimonio(fotoPrueba, cuentas).neto).toBe(3000)
  })

  it('resta la deuda propia del neto', () => {
    const patrimonio = calculaPatrimonio(fotoPrueba, cuentas, deudas)
    expect(patrimonio.deuda).toBe(83738.84)
    expect(patrimonio.neto).toBe(3000 - 83738.84)
  })

  it('no resta la deuda compartida, pero la informa aparte', () => {
    const patrimonio = calculaPatrimonio(fotoPrueba, cuentas, deudas)
    expect(patrimonio.deudaCompartida).toBe(12969)
    expect(patrimonio.neto).not.toBe(3000 - 83738.84 - 12969)
  })

  it('con deudaIncluida en false enseña el mismo neto que decía el Excel', () => {
    // Sirve para poder poner las dos cifras juntas: lo que decía el Excel y la realidad.
    const conDeuda = calculaPatrimonio(fotoPrueba, cuentas, deudas, true)
    const sinDeuda = calculaPatrimonio(fotoPrueba, cuentas, deudas, false)
    expect(conDeuda.neto).toBe(-80738.84)
    expect(sinDeuda.neto).toBe(3000)
    // La deuda se sigue informando aunque no se reste: la pantalla la necesita.
    expect(sinDeuda.deuda).toBe(83738.84)
  })

  it('sin foto devuelve ceros y una deuda que no se puede pagar con nada', () => {
    const patrimonio = calculaPatrimonio(undefined, cuentas, deudas)
    expect(patrimonio).toEqual({
      liquidez: 0,
      activos: 0,
      bruto: 0,
      deuda: 83738.84,
      deudaCompartida: 12969,
      neto: -83738.84,
    })
  })

  it('el neto es negativo cuando la deuda supera al bruto: no se pone a cero ni en valor absoluto', () => {
    const patrimonio = calculaPatrimonio(fotoPrueba, cuentas, deudas)
    expect(patrimonio.neto).toBeLessThan(0)
    expect(patrimonio.neto).not.toBe(0)
    expect(patrimonio.neto).not.toBe(80738.84)
  })
})

describe('seriePatrimonio', () => {
  const fotos = [
    foto('2026-03-01', { Nómina: 100, Fondo: 200 }),
    foto('2026-01-01', { Nómina: 50, Fondo: 100 }),
    foto('2026-02-01', { Nómina: 80, Fondo: 150 }),
  ]

  it('ordena las fotos de más antigua a más reciente', () => {
    expect(seriePatrimonio(fotos, cuentas).map((p) => p.fecha)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })

  it('calcula bruto y variación de cada punto', () => {
    const serie = seriePatrimonio(fotos, cuentas)
    expect(serie.map((p) => p.bruto)).toEqual([150, 230, 300])
    expect(serie.map((p) => p.variacion)).toEqual([null, 80, 70])
  })

  it('la primera foto no tiene variación, porque no hay con qué compararla', () => {
    expect(seriePatrimonio(fotos, cuentas)[0].variacion).toBeNull()
  })

  it('no reordena la lista que recibe', () => {
    const copia = [...fotos]
    seriePatrimonio(fotos, cuentas)
    expect(fotos).toEqual(copia)
    expect(fotos[0].fecha).toBe('2026-03-01')
  })

  it('sin fotos devuelve una serie vacía', () => {
    expect(seriePatrimonio([], cuentas)).toEqual([])
  })
})

describe('ultimosValores', () => {
  it('se queda con el último valor conocido de cada cuenta', () => {
    const fotos = [foto('2026-01-01', { Nómina: 10, Fondo: 100 }), foto('2026-02-01', { Nómina: 20, Mintos: 5 })]
    expect(ultimosValores(fotos)).toEqual({ Nómina: 20, Fondo: 100, Mintos: 5 })
  })

  it('no le importa el orden en que le lleguen las fotos', () => {
    const fotos = [foto('2026-02-01', { Nómina: 20 }), foto('2026-01-01', { Nómina: 10 })]
    expect(ultimosValores(fotos)).toEqual({ Nómina: 20 })
  })

  it('sin fotos devuelve un objeto vacío', () => {
    expect(ultimosValores([])).toEqual({})
  })

  it('mantiene el valor de una cuenta que ya no aparece en la última foto', () => {
    const fotos = [foto('2026-01-01', { Degiro: 206.85 }), foto('2026-02-01', { Nómina: 20 })]
    expect(ultimosValores(fotos)).toEqual({ Degiro: 206.85, Nómina: 20 })
  })
})

describe('ultimaFoto', () => {
  it('devuelve la foto más reciente aunque la lista venga desordenada', () => {
    const fotos = [foto('2026-02-01', { Nómina: 1 }), foto('2026-03-01', { Nómina: 2 }), foto('2026-01-01', { Nómina: 3 })]
    expect(ultimaFoto(fotos)?.fecha).toBe('2026-03-01')
  })

  it('sin fotos devuelve null', () => {
    expect(ultimaFoto([])).toBeNull()
  })

  it('no reordena la lista que recibe', () => {
    const fotos = [foto('2026-02-01', { Nómina: 1 }), foto('2026-01-01', { Nómina: 3 })]
    ultimaFoto(fotos)
    expect(fotos.map((f) => f.fecha)).toEqual(['2026-02-01', '2026-01-01'])
  })
})

describe('variacionEntre', () => {
  const fotos = [
    foto('2026-01-01', { Nómina: 100 }),
    foto('2026-02-01', { Nómina: 150 }),
    foto('2026-03-01', { Nómina: 120 }),
  ]

  it('resta el bruto de la foto de inicio al de la foto de fin', () => {
    expect(variacionEntre(fotos, cuentas, '2026-01-01', '2026-03-01')).toBe(20)
    expect(variacionEntre(fotos, cuentas, '2026-02-01', '2026-03-01')).toBe(-30)
  })

  it('entre la misma fecha la variación es 0', () => {
    expect(variacionEntre(fotos, cuentas, '2026-02-01', '2026-02-01')).toBe(0)
  })

  it('coge la foto anterior más cercana, sin inventar valores intermedios', () => {
    expect(variacionEntre(fotos, cuentas, '2026-01-15', '2026-03-15')).toBe(20)
  })

  it('devuelve null si alguna de las dos fechas es anterior a la primera foto', () => {
    expect(variacionEntre(fotos, cuentas, '2025-12-31', '2026-03-01')).toBeNull()
    expect(variacionEntre(fotos, cuentas, '2026-01-01', '2025-12-31')).toBeNull()
  })

  it('sin fotos devuelve null', () => {
    expect(variacionEntre([], cuentas, '2026-01-01', '2026-03-01')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// La prueba clave: las 36 fotos del Excel de Óscar
// ---------------------------------------------------------------------------

describeConHistorico('las 36 fotos del histórico real cuadran con el Excel', () => {
  const fotosExcel: [string, FotoExcel][] = (historico?.patrimonio ?? []).map((f) => [f.fecha, f])

  it('el histórico trae las 36 fotos y la extracción no reconoce ningún descuadre', () => {
    expect(historico.patrimonio).toHaveLength(36)
    expect(historico.resumen.descuadres).toBe(0)
    expect(FOTOS_SEMILLA).toHaveLength(36)
  })

  it('la semilla tiene una foto para cada una de las 36 fechas del Excel y ninguna de más', () => {
    const fechasExcel = historico.patrimonio.map((f) => f.fecha)
    const fechasSemilla = FOTOS_SEMILLA.map((f) => f.fecha)
    expect(fechasSemilla).toEqual(fechasExcel)
  })

  it.each(fotosExcel)('%s: totalBloque reproduce totalLiquidez y totalActivos del Excel', (fecha, delExcel) => {
    const deSemilla = FOTOS_SEMILLA.find((f) => f.fecha === fecha)
    expect(deSemilla, `falta la foto ${fecha} en FOTOS_SEMILLA`).toBeDefined()
    expect(totalBloque(deSemilla, CUENTAS_SEMILLA, 'liquidez')).toBe(delExcel.totalLiquidez)
    expect(totalBloque(deSemilla, CUENTAS_SEMILLA, 'activo')).toBe(delExcel.totalActivos)
  })

  it('ninguna de las 36 fotos descuadra: el listado de fallos está vacío', () => {
    // Se recogen todos los descuadres en una lista para que, si algún día falla, el mensaje
    // diga exactamente qué mes y qué bloque se ha ido, en vez de parar en el primero.
    const descuadres: string[] = []
    for (const delExcel of historico.patrimonio) {
      const deSemilla = FOTOS_SEMILLA.find((f) => f.fecha === delExcel.fecha)
      const liquidez = totalBloque(deSemilla, CUENTAS_SEMILLA, 'liquidez')
      const activos = totalBloque(deSemilla, CUENTAS_SEMILLA, 'activo')
      if (liquidez !== delExcel.totalLiquidez) {
        descuadres.push(`${delExcel.fecha}: liquidez ${liquidez} != Excel ${delExcel.totalLiquidez}`)
      }
      if (activos !== delExcel.totalActivos) {
        descuadres.push(`${delExcel.fecha}: activos ${activos} != Excel ${delExcel.totalActivos}`)
      }
    }
    expect(descuadres).toEqual([])
  })

  it('cada cuenta del Excel está clasificada en el mismo bloque en la semilla', () => {
    // El bloque no lo decide el Excel al leerlo, lo decide CUENTAS_SEMILLA: si una cuenta
    // estuviera en el bloque contrario, los dos totales seguirían cuadrando por separado
    // solo de casualidad, así que se comprueba cuenta por cuenta.
    const bloqueEnSemilla = new Map(CUENTAS_SEMILLA.map((c) => [c.nombre, c.bloque]))
    const malClasificadas = new Set<string>()
    for (const delExcel of historico.patrimonio) {
      for (const valor of delExcel.liquidez) {
        if (bloqueEnSemilla.get(valor.cuenta) !== 'liquidez') malClasificadas.add(valor.cuenta)
      }
      for (const valor of delExcel.activos) {
        if (bloqueEnSemilla.get(valor.cuenta) !== 'activo') malClasificadas.add(valor.cuenta)
      }
    }
    expect([...malClasificadas]).toEqual([])
  })

  it('ninguna partida se pierde por el camino: toda cuenta está en el catálogo', () => {
    const nombres = new Set(CUENTAS_SEMILLA.map((c) => c.nombre))
    const desconocidas = new Set<string>()
    for (const deSemilla of FOTOS_SEMILLA) {
      for (const valor of deSemilla.valores) {
        if (!nombres.has(valor.cuenta)) desconocidas.add(valor.cuenta)
      }
    }
    expect([...desconocidas]).toEqual([])
  })

  it('el Excel no registraba ninguna deuda: sus pasivos están vacíos y su neto es el total', () => {
    for (const delExcel of historico.patrimonio) {
      expect(delExcel.pasivos).toEqual([])
      expect(delExcel.totalPasivos ?? 0).toBe(0)
      expect(delExcel.neto).toBe(delExcel.total)
    }
  })

  it('el bruto de la app coincide con el "VALOR NETO TOTAL" del Excel en las 36 fotos', () => {
    const descuadres: string[] = []
    for (const delExcel of historico.patrimonio) {
      const deSemilla = FOTOS_SEMILLA.find((f) => f.fecha === delExcel.fecha)
      const { bruto } = calculaPatrimonio(deSemilla, CUENTAS_SEMILLA, DEUDAS_SEMILLA, false)
      if (bruto !== delExcel.total) descuadres.push(`${delExcel.fecha}: ${bruto} != ${delExcel.total}`)
    }
    expect(descuadres).toEqual([])
  })

  it('la primera foto suma 15.970,74 € y la última 45.283,34 €', () => {
    const primera = calculaPatrimonio(FOTOS_SEMILLA[0], CUENTAS_SEMILLA, [], false)
    const ultima = calculaPatrimonio(ultimaFoto(FOTOS_SEMILLA) as FotoPatrimonio, CUENTAS_SEMILLA, [], false)
    expect(primera.bruto).toBe(15970.74)
    expect(ultima.bruto).toBe(45283.34)
    // Sin el redondeo de `bruto`, sumar los bloques a mano arrastra la cola del float.
    expect(primera.liquidez + primera.activos).toBeCloseTo(15970.74, 2)
    expect(ultima.liquidez + ultima.activos).toBeCloseTo(45283.34, 2)
  })

  it('el patrimonio bruto crece, pero el neto real es negativo', () => {
    // La corrección central de Oikos frente al Excel: el bruto (45.283,34) es real, pero
    // con las deudas sembradas (91.953,13 propias) el neto es -46.669,79 €.
    const ultima = ultimaFoto(FOTOS_SEMILLA) as FotoPatrimonio
    const conDeuda = calculaPatrimonio(ultima, CUENTAS_SEMILLA, DEUDAS_SEMILLA)
    const comoElExcel = calculaPatrimonio(ultima, CUENTAS_SEMILLA, DEUDAS_SEMILLA, false)
    expect(comoElExcel.neto).toBe(45283.34)
    expect(conDeuda.neto).toBe(-46669.79)
    expect(conDeuda.deuda).toBe(91953.13)
    expect(conDeuda.deudaCompartida).toBe(12969)
    expect(conDeuda.neto).toBeLessThan(0)
  })

  it('la serie del histórico tiene 36 puntos y sus variaciones suman el crecimiento total', () => {
    const serie = seriePatrimonio(FOTOS_SEMILLA, CUENTAS_SEMILLA)
    expect(serie).toHaveLength(36)
    expect(serie[0].variacion).toBeNull()
    expect(serie[35].bruto).toBe(45283.34)
    expect(serie[35].variacion).toBe(3572.58)
    const crecimiento = serie.reduce((total, punto) => total + (punto.variacion ?? 0), 0)
    expect(Number(crecimiento.toFixed(2))).toBe(29312.6)
  })

  it('la variación de todo el histórico y la del último año largo', () => {
    expect(variacionEntre(FOTOS_SEMILLA, CUENTAS_SEMILLA, '2024-01-01', '2026-09-22')).toBe(29312.6)
    expect(variacionEntre(FOTOS_SEMILLA, CUENTAS_SEMILLA, '2025-01-19', '2026-09-22')).toBe(20712.16)
  })

  it('los últimos valores conocidos de cada cuenta son los de la última foto', () => {
    const valores = ultimosValores(FOTOS_SEMILLA)
    expect(valores['Cuenta nómina (ING)']).toBe(1190.4)
    expect(valores['Bitcoin']).toBe(14687.82)
    expect(valores['MyInvestor fondos']).toBe(14996.65)
    expect(valores['Trading']).toBe(199.43)
    // Degiro y el préstamo recibido ya no están en la última foto, pero se conserva lo
    // último que se supo de ellos: es lo que precarga la pantalla al hacer la foto nueva.
    expect(valores['Degiro']).toBe(206.85)
    expect(valores['Préstamo recibido']).toBe(7900)
  })

  it('la última foto es la del 2026-09-22', () => {
    expect(ultimaFoto(FOTOS_SEMILLA)?.fecha).toBe('2026-09-22')
  })

  it('el catálogo trae las 18 cuentas del histórico, 13 de ellas en uso', () => {
    expect(CUENTAS_SEMILLA).toHaveLength(18)
    expect(CUENTAS_SEMILLA.filter((c) => c.activa)).toHaveLength(13)
    expect(CUENTAS_SEMILLA.filter((c) => c.bloque === 'liquidez')).toHaveLength(8)
    expect(CUENTAS_SEMILLA.filter((c) => c.bloque === 'activo')).toHaveLength(10)
  })

  it('la comparación es sensible a una sola cuenta mal clasificada', () => {
    // Comprobación de que la prueba clave sirve para algo: moviendo Bitcoin de bloque, la
    // comparación con el Excel tiene que romperse. Si esto no fallara, la prueba de las 36
    // fotos podría estar pasando por casualidad.
    const malClasificadas = CUENTAS_SEMILLA.map((cuenta): Cuenta =>
      cuenta.nombre === 'Bitcoin' ? { ...cuenta, bloque: 'liquidez' } : cuenta,
    )
    const ultima = FOTOS_SEMILLA.find((f) => f.fecha === '2026-09-22') as FotoPatrimonio
    const delExcel = historico.patrimonio.find((f) => f.fecha === '2026-09-22') as FotoExcel
    expect(totalBloque(ultima, CUENTAS_SEMILLA, 'liquidez')).toBe(delExcel.totalLiquidez)
    expect(totalBloque(ultima, malClasificadas, 'liquidez')).not.toBe(delExcel.totalLiquidez)
  })
})
