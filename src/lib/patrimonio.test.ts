/**
 * Pruebas de `src/lib/patrimonio.ts`.
 *
 * Aquí está la prueba clave del proyecto: las fotos de patrimonio tienen que cuadrar
 * **exactamente** con lo que calcula `totalBloque()` usando el catálogo de cuentas. Si esto
 * falla, hay una partida clasificada en el bloque equivocado o perdida por el camino, y el
 * patrimonio que enseña la app es mentira.
 *
 * Se comprueba con `src/datos/ejemplo.ts`, que son datos inventados y con cifras redondas: este
 * repositorio es público y no puede llevar ni un saldo de nadie. La comprobación de que el
 * histórico real cuadra con su Excel vive en `scripts/generar-copia-personal.ts`, que es donde
 * corresponde (es una propiedad de la extracción, no de la app).
 */

import { describe, expect, it } from 'vitest'
import type { Cuenta, Deuda, FotoPatrimonio } from '../types'
import { CUENTAS_REALES, DEUDAS_REALES, FOTOS_REALES, hayCopiaPersonal } from '../datos/ayuda-pruebas'
import { CUENTAS_EJEMPLO, DEUDAS_EJEMPLO, FOTOS_EJEMPLO } from '../datos/ejemplo'
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
  const fotoPrueba = foto('2026-06-30', { Nómina: 100.5, Fondo: 0 })

  it('devuelve el importe de la cuenta pedida', () => {
    expect(valorEn(fotoPrueba, 'Nómina')).toBe(100.5)
  })

  it('devuelve 0 (no undefined) cuando la cuenta vale 0', () => {
    // Un 0 es un dato, no un hueco: la pantalla no debe pedir que se rellene.
    expect(valorEn(fotoPrueba, 'Fondo')).toBe(0)
  })

  it('devuelve undefined si la cuenta no está en la foto', () => {
    expect(valorEn(fotoPrueba, 'Una cuenta que no existe')).toBeUndefined()
  })

  it('devuelve undefined si no hay foto', () => {
    expect(valorEn(undefined, 'Nómina')).toBeUndefined()
  })
})

describe('totalBloque', () => {
  const fotoPrueba = foto('2026-06-30', {
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
    // `activa` significa "la uso hoy", no "esta cuenta no cuenta": las fotos antiguas siguen
    // trayendo ese dinero y tiene que aparecer en el total.
    expect(totalBloque(fotoPrueba, cuentas, 'activo')).toBe(305)
  })

  it('ignora una cuenta que no esté en el catálogo, en vez de meterla en un bloque al azar', () => {
    // 'Fantasma' vale 999: si se colara en el total, los números dejarían de cuadrar.
    const sinFantasma = foto('2026-06-30', { Nómina: 100.1, Efectivo: 50.25 })
    expect(totalBloque(fotoPrueba, cuentas, 'liquidez')).toBe(totalBloque(sinFantasma, cuentas, 'liquidez'))
  })

  it('sin foto o sin cuentas devuelve 0', () => {
    expect(totalBloque(undefined, cuentas, 'liquidez')).toBe(0)
    expect(totalBloque(fotoPrueba, [], 'liquidez')).toBe(0)
  })

  it('no arrastra la cola del float al sumar', () => {
    const conCola = foto('2026-06-30', { Nómina: 0.1, Efectivo: 0.2 })
    expect(totalBloque(conCola, cuentas, 'liquidez')).toBe(0.3)
  })
})

describe('totalDeuda', () => {
  it('suma la deuda propia y separa la compartida', () => {
    expect(totalDeuda(DEUDAS_EJEMPLO)).toEqual({
      propia: 2000,
      compartida: 500,
      total: 2500,
    })
  })

  it('cuenta la deuda aunque venga en una lista sin más', () => {
    const deudas: Deuda[] = [
      { nombre: 'Deuda A de ejemplo', saldo: 1000, fechaSaldo: '2026-04-30', compartida: false, activa: true },
      { nombre: 'Deuda B de ejemplo', saldo: 500, fechaSaldo: '2026-04-30', compartida: true, activa: true },
    ]
    expect(totalDeuda(deudas)).toEqual({ propia: 1000, compartida: 500, total: 1500 })
  })

  it('ignora las deudas desactivadas, que son las ya canceladas', () => {
    const deudas: Deuda[] = [
      { nombre: 'Deuda viva de ejemplo', saldo: 1000, fechaSaldo: '2026-04-30', compartida: false, activa: true },
      { nombre: 'Deuda cancelada de ejemplo', saldo: 700, fechaSaldo: '2026-04-30', compartida: false, activa: false },
    ]
    expect(totalDeuda(deudas).propia).toBe(1000)
  })

  it('sin deudas todo son ceros', () => {
    expect(totalDeuda([])).toEqual({ propia: 0, compartida: 0, total: 0 })
  })
})

describe('calculaPatrimonio', () => {
  const fotoPrueba = foto('2026-06-30', { Nómina: 1000, Fondo: 2000 })
  const deudas: Deuda[] = [
    { nombre: 'Deuda propia de ejemplo', saldo: 1000, fechaSaldo: '2026-06-30', compartida: false, activa: true },
    { nombre: 'Deuda compartida de ejemplo', saldo: 500, fechaSaldo: '2026-06-30', compartida: true, activa: true },
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
    expect(patrimonio.deuda).toBe(1000)
    expect(patrimonio.neto).toBe(2000)
  })

  it('no resta la deuda compartida, pero la informa aparte', () => {
    const patrimonio = calculaPatrimonio(fotoPrueba, cuentas, deudas)
    expect(patrimonio.deudaCompartida).toBe(500)
    // 2.000 (solo la propia), no 1.500.
    expect(patrimonio.neto).toBe(2000)
    expect(patrimonio.neto).not.toBe(1500)
  })

  it('con deudaIncluida en false enseña el mismo neto que el bruto', () => {
    // Sirve para poder poner las dos cifras juntas: el bruto y la realidad.
    const conDeuda = calculaPatrimonio(fotoPrueba, cuentas, deudas, true)
    const sinDeuda = calculaPatrimonio(fotoPrueba, cuentas, deudas, false)
    expect(conDeuda.neto).toBe(2000)
    expect(sinDeuda.neto).toBe(3000)
    // La deuda se sigue informando aunque no se reste: la pantalla la necesita.
    expect(sinDeuda.deuda).toBe(1000)
  })

  it('sin foto devuelve ceros y una deuda que no se puede pagar con nada', () => {
    const patrimonio = calculaPatrimonio(undefined, cuentas, deudas)
    expect(patrimonio).toEqual({
      liquidez: 0,
      activos: 0,
      bruto: 0,
      deuda: 1000,
      deudaCompartida: 500,
      neto: -1000,
    })
  })

  it('el neto es negativo cuando la deuda supera al bruto: no se pone a cero ni en valor absoluto', () => {
    const conDeudaGrande: Deuda[] = [
      { nombre: 'Deuda grande de ejemplo', saldo: 5000, fechaSaldo: '2026-06-30', compartida: false, activa: true },
    ]
    const patrimonio = calculaPatrimonio(fotoPrueba, cuentas, conDeudaGrande)
    expect(patrimonio.neto).toBe(-2000)
    expect(patrimonio.neto).not.toBe(0)
    expect(patrimonio.neto).not.toBe(2000)
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
    const fotos = [foto('2026-01-01', { Nómina: 10, Fondo: 100 }), foto('2026-02-01', { Nómina: 20, Otro: 5 })]
    expect(ultimosValores(fotos)).toEqual({ Nómina: 20, Fondo: 100, Otro: 5 })
  })

  it('no le importa el orden en que le lleguen las fotos', () => {
    const fotos = [foto('2026-02-01', { Nómina: 20 }), foto('2026-01-01', { Nómina: 10 })]
    expect(ultimosValores(fotos)).toEqual({ Nómina: 20 })
  })

  it('sin fotos devuelve un objeto vacío', () => {
    expect(ultimosValores([])).toEqual({})
  })

  it('mantiene el valor de una cuenta que ya no aparece en la última foto', () => {
    const fotos = [foto('2026-01-01', { 'Fondo antiguo': 250 }), foto('2026-02-01', { Nómina: 20 })]
    expect(ultimosValores(fotos)).toEqual({ 'Fondo antiguo': 250, Nómina: 20 })
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
// La prueba clave, con los datos de ejemplo
// ---------------------------------------------------------------------------

describe('las fotos de ejemplo cuadran con sus totales', () => {
  const totalesEsperados: [string, number, number][] = [
    ['2026-01-31', 1600, 2300],
    ['2026-02-28', 1800, 2400],
    ['2026-03-31', 1700, 2300],
    ['2026-04-30', 2400, 2500],
  ]

  it.each(totalesEsperados)(
    '%s: cada bloque suma lo que dice el ejemplo (liquidez %d, activos %d)',
    (fecha, liquidez, activos) => {
      const delEjemplo = FOTOS_EJEMPLO.find((f) => f.fecha === fecha)
      expect(delEjemplo, `falta la foto ${fecha} en FOTOS_EJEMPLO`).toBeDefined()
      expect(totalBloque(delEjemplo, CUENTAS_EJEMPLO, 'liquidez')).toBe(liquidez)
      expect(totalBloque(delEjemplo, CUENTAS_EJEMPLO, 'activo')).toBe(activos)
    },
  )

  it('el ejemplo trae 4 fotos de fechas distintas y 5 cuentas repartidas en los dos bloques', () => {
    expect(FOTOS_EJEMPLO).toHaveLength(4)
    expect(new Set(FOTOS_EJEMPLO.map((f) => f.fecha)).size).toBe(4)
    expect(CUENTAS_EJEMPLO).toHaveLength(5)
    expect(CUENTAS_EJEMPLO.filter((c) => c.bloque === 'liquidez')).toHaveLength(3)
    expect(CUENTAS_EJEMPLO.filter((c) => c.bloque === 'activo')).toHaveLength(2)
  })

  it('ninguna partida se pierde por el camino: toda cuenta está en el catálogo', () => {
    const nombres = new Set(CUENTAS_EJEMPLO.map((c) => c.nombre))
    const desconocidas = new Set<string>()
    for (const delEjemplo of FOTOS_EJEMPLO) {
      for (const valor of delEjemplo.valores) {
        if (!nombres.has(valor.cuenta)) desconocidas.add(valor.cuenta)
      }
    }
    expect([...desconocidas]).toEqual([])
  })

  it('el bruto de la primera foto es 3.900 € y el de la última 4.900 €', () => {
    const primera = calculaPatrimonio(FOTOS_EJEMPLO[0], CUENTAS_EJEMPLO, [], false)
    const ultima = calculaPatrimonio(ultimaFoto(FOTOS_EJEMPLO) as FotoPatrimonio, CUENTAS_EJEMPLO, [], false)
    expect(primera.bruto).toBe(3900)
    expect(ultima.bruto).toBe(4900)
    // Sin el redondeo de `bruto`, sumar los bloques a mano arrastra la cola del float.
    expect(primera.liquidez + primera.activos).toBeCloseTo(3900, 2)
    expect(ultima.liquidez + ultima.activos).toBeCloseTo(4900, 2)
  })

  it('con las deudas de ejemplo el neto de la última foto baja de 4.900 a 2.900 €', () => {
    const ultima = ultimaFoto(FOTOS_EJEMPLO) as FotoPatrimonio
    const conDeuda = calculaPatrimonio(ultima, CUENTAS_EJEMPLO, DEUDAS_EJEMPLO)
    const sinDeuda = calculaPatrimonio(ultima, CUENTAS_EJEMPLO, DEUDAS_EJEMPLO, false)
    expect(sinDeuda.neto).toBe(4900)
    expect(conDeuda.neto).toBe(2900)
    expect(conDeuda.deuda).toBe(2000)
    // La compartida se informa, pero no se resta: 2.900, no 2.400.
    expect(conDeuda.deudaCompartida).toBe(500)
  })

  it('la serie del ejemplo tiene 4 puntos y sus variaciones suman el crecimiento total', () => {
    const serie = seriePatrimonio(FOTOS_EJEMPLO, CUENTAS_EJEMPLO)
    expect(serie).toHaveLength(4)
    expect(serie[0].variacion).toBeNull()
    expect(serie.map((p) => p.variacion)).toEqual([null, 300, -200, 900])
    const crecimiento = serie.reduce((total, punto) => total + (punto.variacion ?? 0), 0)
    expect(Number(crecimiento.toFixed(2))).toBe(1000)
  })

  it('la variación de todo el ejemplo es de 1.000 €', () => {
    expect(variacionEntre(FOTOS_EJEMPLO, CUENTAS_EJEMPLO, '2026-01-31', '2026-04-30')).toBe(1000)
  })

  it('los últimos valores conocidos son los de la última foto, y no se pierde una cuenta que ya no sale', () => {
    expect(ultimosValores(FOTOS_EJEMPLO)).toEqual({
      'Cuenta de ejemplo': 1500,
      'Cuenta de ahorro de ejemplo': 800,
      'Efectivo de ejemplo': 100,
      'Fondo de ejemplo': 2500,
      // Desaparece de las dos últimas fotos, pero se conserva lo último que se supo de ella.
      'Plan antiguo de ejemplo': 300,
    })
  })

  it('la última foto es la del 2026-04-30', () => {
    expect(ultimaFoto(FOTOS_EJEMPLO)?.fecha).toBe('2026-04-30')
  })

  it('cambiar una cuenta de bloque mueve los totales, así que la clasificación se usa de verdad', () => {
    // Comprobación de que la prueba clave sirve para algo: si `totalBloque` ignorara el bloque
    // del catálogo, los totales saldrían iguales y lo de arriba estaría pasando por casualidad.
    // Y el total de los dos bloques juntos no puede moverse: la cuenta solo cambia de sitio.
    const malClasificadas = CUENTAS_EJEMPLO.map((cuenta): Cuenta =>
      cuenta.nombre === 'Fondo de ejemplo' ? { ...cuenta, bloque: 'liquidez' } : cuenta,
    )
    const ultima = FOTOS_EJEMPLO[3]
    const liquidezBuena = totalBloque(ultima, CUENTAS_EJEMPLO, 'liquidez')
    const activosBuenos = totalBloque(ultima, CUENTAS_EJEMPLO, 'activo')
    expect(totalBloque(ultima, malClasificadas, 'liquidez')).not.toBe(liquidezBuena)
    expect(
      totalBloque(ultima, malClasificadas, 'liquidez') + totalBloque(ultima, malClasificadas, 'activo'),
    ).toBeCloseTo(liquidezBuena + activosBuenos, 2)
  })
})

// ---------------------------------------------------------------------------
// Coherencia de la copia personal (sin cifras suyas)
// ---------------------------------------------------------------------------

/*
 * La copia personal de Óscar vive fuera del repositorio (ver `ayuda-pruebas`). En una copia
 * limpia —y en el flujo de publicación de GitHub, que clona el repositorio— no está, así que
 * este bloque se SALTA con `describe.skipIf` en vez de reventar.
 *
 * Aquí no se escribe ni una cifra suya: son comprobaciones de relaciones (que no haya cuentas
 * huérfanas, que no haya dos fotos del mismo día). Sus números están en su fichero, y el
 * repositorio es público.
 */
describe.skipIf(!hayCopiaPersonal)('la copia personal es coherente', () => {
  it('todas las cuentas de sus fotos están en su catálogo', () => {
    const nombres = new Set(CUENTAS_REALES.map((c) => c.nombre))
    const desconocidas = new Set<string>()
    for (const fotoReal of FOTOS_REALES) {
      for (const valor of fotoReal.valores) {
        if (!nombres.has(valor.cuenta)) desconocidas.add(valor.cuenta)
      }
    }
    expect([...desconocidas]).toEqual([])
  })

  it('cada foto es de un día distinto y vienen de la más antigua a la más reciente', () => {
    const fechas = FOTOS_REALES.map((f) => f.fecha)
    expect(new Set(fechas).size).toBe(fechas.length)
    expect([...fechas].sort()).toEqual(fechas)
  })

  it('todas sus deudas traen saldo positivo y fecha del saldo', () => {
    expect(DEUDAS_REALES.length).toBeGreaterThan(0)
    for (const deuda of DEUDAS_REALES) {
      expect(deuda.saldo).toBeGreaterThan(0)
      expect(deuda.fechaSaldo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})
