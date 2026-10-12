/**
 * Pruebas de `src/db/repository.ts`: sembrado del histórico, borrado y copia de seguridad.
 *
 * Se ejecuta con `jsdom` (ver `vite.config.ts`) y con `fake-indexeddb` en memoria, así que
 * el banco de pruebas es una app recién instalada, sin depender del navegador ni del reloj.
 * `fake-indexeddb/auto` tiene que ir el primero: Dexie lee `indexedDB` al cargarse.
 */

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Ajuste, Categoria, Cuenta, Deuda, FotoPatrimonio, Movimiento, Presupuesto } from '../types'
import { AJUSTES_SEMILLA, CATEGORIAS_SEMILLA, DEUDAS_SEMILLA } from '../datos/catalogo'
import { COMPRAS_BITCOIN_SEMILLA, CUENTAS_SEMILLA, FOTOS_SEMILLA, MOVIMIENTOS_SEMILLA } from '../datos/semilla'
import { db } from './index'
import {
  CLAVE_SEMILLA,
  ORIGEN_HISTORICO,
  borraMovimiento,
  borrarTodo,
  escribeAjuste,
  estadisticas,
  exportaCopia,
  guardaMovimiento,
  guardaPresupuesto,
  importaCopia,
  leeAjuste,
  leeAjusteNumero,
  leeAjustes,
  reiniciarConSemilla,
  renombraCategoria,
  renombraCuenta,
  sembrarSiHaceFalta,
  ultimoConConcepto,
  validaCopia,
  type CopiaOikos,
} from './repository'

/** Base limpia y reabierta en cada prueba, para que no se contaminen entre ellas. */
beforeEach(async () => {
  await db.delete()
  await db.open()
})

function nuevoMovimiento(fecha: string, concepto: string, importe: number): Movimiento {
  return {
    fecha,
    tipo: 'gasto',
    categoria: 'Alimentación',
    concepto,
    importe,
    origen: 'manual',
    creado: `${fecha}T10:00:00.000Z`,
  }
}

/** Copia vacía pero válida, para ir metiéndole cosas en cada prueba. */
function copiaMinima(parcial: Partial<CopiaOikos> = {}): CopiaOikos {
  return {
    app: 'oikos',
    version: 1,
    exportado: '2026-10-01T00:00:00.000Z',
    movimientos: [],
    categorias: [],
    cuentas: [],
    deudas: [],
    fotos: [],
    presupuestos: [],
    ajustes: [],
    bitcoin: [],
    ...parcial,
  }
}

/**
 * Quita los `id` para poder comparar dos copias.
 *
 * La importación los reasigna a propósito (Dexie los borra antes de insertar, para que no
 * choquen con los que ya hay) y el contador de IndexedDB no vuelve a 1 tras un `clear()`.
 * Lo que sí tiene que coincidir es el contenido y el orden de cada tabla.
 */
function sinIds<T>(lista: T[]): Array<Omit<T, 'id'>> {
  return lista.map((elemento) => {
    const copia = { ...elemento } as Record<string, unknown>
    delete copia.id
    return copia as Omit<T, 'id'>
  })
}

describe('sembrarSiHaceFalta', () => {
  it('mete el histórico completo la primera vez', async () => {
    await expect(sembrarSiHaceFalta()).resolves.toBe(true)

    expect(await db.fotos.count()).toBe(36)
    expect(await db.movimientos.count()).toBe(24)
    expect(await db.cuentas.count()).toBe(18)
    expect(await db.deudas.count()).toBe(4)
    expect(await db.bitcoin.count()).toBe(89)
    expect(await db.categorias.count()).toBe(CATEGORIAS_SEMILLA.length)
    // Los presupuestos no vienen sembrados: son cosa del usuario.
    expect(await db.presupuestos.count()).toBe(0)
    expect((await db.ajustes.get(CLAVE_SEMILLA))?.valor).toBe('1')
  })

  it('lo que siembra es exactamente la semilla, sin recortes ni cambios', async () => {
    await sembrarSiHaceFalta()

    const fotos = await db.fotos.orderBy('fecha').toArray()
    expect(fotos).toHaveLength(FOTOS_SEMILLA.length)
    fotos.forEach((foto, i) => expect(foto).toMatchObject(FOTOS_SEMILLA[i]))

    const movimientos = await db.movimientos.orderBy('fecha').toArray()
    const ordenados = [...MOVIMIENTOS_SEMILLA].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
    movimientos.forEach((movimiento, i) => expect(movimiento).toMatchObject(ordenados[i]))

    const cuentas = await db.cuentas.toArray()
    cuentas.forEach((cuenta, i) => expect(cuenta).toMatchObject(CUENTAS_SEMILLA[i]))

    const deudas = await db.deudas.toArray()
    deudas.forEach((deuda, i) => expect(deuda).toMatchObject(DEUDAS_SEMILLA[i]))

    const bitcoin = await db.bitcoin.toArray()
    expect(bitcoin).toHaveLength(COMPRAS_BITCOIN_SEMILLA.length)
    bitcoin.forEach((compra, i) => expect(compra).toMatchObject(COMPRAS_BITCOIN_SEMILLA[i]))

    const ajustes = await db.ajustes.toArray()
    expect(ajustes.map((a) => a.clave).sort()).toEqual(AJUSTES_SEMILLA.map((a) => a.clave).sort())
  })

  it('las 89 compras de Bitcoin suman el total del histórico', async () => {
    await sembrarSiHaceFalta()
    const compras = await db.bitcoin.toArray()
    expect(compras).toHaveLength(89)
    // El histórico da 0,11623313 BTC comprados por 9.890,04 €.
    expect(compras.reduce((total, compra) => total + compra.cantidadBtc, 0)).toBeCloseTo(0.11623313, 8)
    expect(compras.reduce((total, compra) => total + compra.importe, 0)).toBeCloseTo(9890.04, 2)
  })

  it('sembrar dos veces no duplica nada', async () => {
    await sembrarSiHaceFalta()
    await expect(sembrarSiHaceFalta()).resolves.toBe(false)

    expect(await db.fotos.count()).toBe(36)
    expect(await db.movimientos.count()).toBe(24)
    expect(await db.cuentas.count()).toBe(18)
    expect(await db.deudas.count()).toBe(4)
    expect(await db.bitcoin.count()).toBe(89)
    expect(await db.categorias.count()).toBe(CATEGORIAS_SEMILLA.length)
  })

  it('no vuelve a sembrar encima de los datos del usuario aunque falte la marca', async () => {
    // El caso real: alguien borra sus datos a propósito. La app debe quedarse como está y
    // limitarse a dejar la marca, no rellenarle la base por la cara.
    await borrarTodo(false)
    await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Mercadona', 42.5))

    await expect(sembrarSiHaceFalta()).resolves.toBe(false)
    expect(await db.movimientos.count()).toBe(1)
    expect(await db.fotos.count()).toBe(0)
    expect(await db.cuentas.count()).toBe(0)
    expect((await db.ajustes.get(CLAVE_SEMILLA))?.valor).toBe('1')
  })
})

describe('borrarTodo', () => {
  it('deja la base de datos vacía pero conserva los ajustes por defecto', async () => {
    await sembrarSiHaceFalta()
    await borrarTodo()

    expect(await db.movimientos.count()).toBe(0)
    expect(await db.fotos.count()).toBe(0)
    expect(await db.cuentas.count()).toBe(0)
    expect(await db.deudas.count()).toBe(0)
    expect(await db.categorias.count()).toBe(0)
    expect(await db.presupuestos.count()).toBe(0)
    expect(await db.bitcoin.count()).toBe(0)
    expect(await db.ajustes.count()).toBe(AJUSTES_SEMILLA.length)
  })

  it('con conservarAjustes en false también se lleva los ajustes', async () => {
    await sembrarSiHaceFalta()
    await borrarTodo(false)

    expect(await db.ajustes.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
  })
})

describe('reiniciarConSemilla', () => {
  it('deja otra vez el histórico de partida y borra lo que se había añadido', async () => {
    await sembrarSiHaceFalta()
    await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Mercadona', 42.5))
    await escribeAjuste('objetivoInversion', '999')

    await reiniciarConSemilla()

    expect(await db.movimientos.count()).toBe(24)
    expect(await db.fotos.count()).toBe(36)
    expect(await leeAjuste('objetivoInversion')).toBe('200')
  })

  it('se puede reiniciar sobre una base vacía sin que se queje', async () => {
    await reiniciarConSemilla()
    expect(await db.fotos.count()).toBe(36)
    expect(await db.movimientos.count()).toBe(24)
  })
})

describe('exportaCopia', () => {
  it('exporta todas las tablas y se identifica como copia de Oikos', async () => {
    await sembrarSiHaceFalta()
    const copia = await exportaCopia()

    expect(copia.app).toBe('oikos')
    expect(copia.version).toBe(1)
    expect(Number.isNaN(Date.parse(copia.exportado))).toBe(false)
    expect(copia.movimientos).toHaveLength(24)
    expect(copia.fotos).toHaveLength(36)
    expect(copia.cuentas).toHaveLength(18)
    expect(copia.deudas).toHaveLength(4)
    expect(copia.bitcoin).toHaveLength(89)
    expect(copia.categorias).toHaveLength(CATEGORIAS_SEMILLA.length)
    expect(copia.ajustes).toHaveLength(AJUSTES_SEMILLA.length)
    expect(copia.presupuestos).toHaveLength(0)
  })

  it('la copia que exporta la app pasa su propia validación', async () => {
    await sembrarSiHaceFalta()
    const validacion = validaCopia(await exportaCopia())
    expect(validacion.valida).toBe(true)
    expect(validacion.error).toBeUndefined()
    expect(validacion.copia).toBeDefined()
  })
})

describe('validaCopia', () => {
  it('rechaza lo que ni siquiera es un objeto', () => {
    for (const basura of [null, undefined, 'texto', 42, true]) {
      const resultado = validaCopia(basura)
      expect(resultado.valida).toBe(false)
      expect(resultado.copia).toBeUndefined()
    }
  })

  it('rechaza un archivo de otro programa', () => {
    const resultado = validaCopia({
      app: 'kairos',
      movimientos: [],
      categorias: [],
      cuentas: [],
      fotos: [],
    })
    expect(resultado.valida).toBe(false)
    expect(resultado.error).toContain('Oikos')
    expect(resultado.copia).toBeUndefined()
  })

  it('rechaza una copia a la que le falta una lista', () => {
    const sinFotos = validaCopia({ app: 'oikos', movimientos: [], categorias: [], cuentas: [] })
    expect(sinFotos.valida).toBe(false)
    expect(sinFotos.error).toContain('fotos')

    const sinMovimientos = validaCopia({ app: 'oikos', categorias: [], cuentas: [], fotos: [] })
    expect(sinMovimientos.valida).toBe(false)
    expect(sinMovimientos.error).toContain('movimientos')
  })

  it('rechaza una copia con movimientos que no se entienden', () => {
    const resultado = validaCopia({
      app: 'oikos',
      movimientos: [{ fecha: '2026-09-22', importe: '12,50' }],
      categorias: [],
      cuentas: [],
      fotos: [],
    })
    expect(resultado.valida).toBe(false)
    expect(resultado.error).toContain('formato')
  })

  it('acepta las listas opcionales que falten (deudas, presupuestos, bitcoin)', () => {
    const resultado = validaCopia({ app: 'oikos', movimientos: [], categorias: [], cuentas: [], fotos: [] })
    expect(resultado.valida).toBe(true)
    expect(resultado.copia?.movimientos).toEqual([])
  })

  it('acepta movimientos bien formados', () => {
    const resultado = validaCopia(copiaMinima({ movimientos: [nuevoMovimiento('2026-09-22', 'Mercadona', 12.5)] }))
    expect(resultado.valida).toBe(true)
    expect(resultado.copia?.movimientos).toHaveLength(1)
  })
})

describe('viaje de ida y vuelta de la copia', () => {
  it('exportar, borrar, validar e importar en modo reemplazar deja exactamente lo mismo', async () => {
    await sembrarSiHaceFalta()
    const copia = await exportaCopia()

    await borrarTodo(false)
    expect(await db.movimientos.count()).toBe(0)
    expect(await db.ajustes.count()).toBe(0)

    const validacion = validaCopia(copia)
    expect(validacion.valida).toBe(true)
    const resultado = await importaCopia(validacion.copia as CopiaOikos, 'reemplazar')
    expect(resultado.movimientosAnadidos).toBe(24)
    expect(resultado.fotosAnadidas).toBe(36)

    const despues = await exportaCopia()
    // `exportado` es la hora del momento y los `id` se reasignan: lo que no puede cambiar
    // ni un ápice es lo demás, tabla por tabla y en el mismo orden.
    expect(sinIds(despues.movimientos)).toEqual(sinIds(copia.movimientos))
    expect(sinIds(despues.fotos)).toEqual(sinIds(copia.fotos))
    expect(sinIds(despues.cuentas)).toEqual(sinIds(copia.cuentas))
    expect(sinIds(despues.deudas)).toEqual(sinIds(copia.deudas))
    expect(sinIds(despues.categorias)).toEqual(sinIds(copia.categorias))
    expect(sinIds(despues.bitcoin)).toEqual(sinIds(copia.bitcoin))
    expect(despues.ajustes).toEqual(copia.ajustes)
    expect(despues.presupuestos).toEqual(copia.presupuestos)
  })

  it('en modo reemplazar la copia manda: lo que había antes desaparece', async () => {
    await sembrarSiHaceFalta()
    await importaCopia(copiaMinima({ movimientos: [nuevoMovimiento('2026-09-22', 'Solo este', 1)] }), 'reemplazar')

    expect(await db.fotos.count()).toBe(0)
    expect(await db.cuentas.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(1)
    expect((await db.movimientos.toArray())[0].concepto).toBe('Solo este')
  })

  it('importar dos veces la misma copia en modo combinar no duplica nada', async () => {
    await sembrarSiHaceFalta()
    const copia = await exportaCopia()

    const resultado = await importaCopia(copia, 'combinar')
    expect(resultado).toEqual({
      movimientosAnadidos: 0,
      movimientosRepetidos: 24,
      fotosAnadidas: 0,
      fotosRepetidas: 36,
      categoriasAnadidas: 0,
      cuentasAnadidas: 0,
      deudasAnadidas: 0,
      presupuestosAnadidos: 0,
    })
    expect(await db.movimientos.count()).toBe(24)
    expect(await db.fotos.count()).toBe(36)
    expect(await db.cuentas.count()).toBe(18)
    expect(await db.deudas.count()).toBe(4)
  })

  it('en modo combinar solo entra lo que faltaba', async () => {
    await sembrarSiHaceFalta()
    const copia = await exportaCopia()

    const nuevaFoto: FotoPatrimonio = { fecha: '2026-10-20', valores: [], origen: 'manual', fechaAproximada: false }
    const nuevaCategoria: Categoria = { nombre: 'Mascotas', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 90 }
    const nuevaCuenta: Cuenta = { nombre: 'Cuenta TEST', bloque: 'liquidez', orden: 99, activa: true }
    const nuevaDeuda: Deuda = { nombre: 'Deuda TEST', saldo: 250, fechaSaldo: '2026-09-23', compartida: false, activa: true }
    const nuevoPresupuesto: Presupuesto = { categoria: 'Mascotas', importe: 50, activo: true }
    const ampliada = copiaMinima({
      movimientos: [...copia.movimientos, nuevoMovimiento('2026-05-02', 'Mercadona', 42.5)],
      fotos: [...copia.fotos, nuevaFoto],
      categorias: [...copia.categorias, nuevaCategoria],
      cuentas: [...copia.cuentas, nuevaCuenta],
      deudas: [...copia.deudas, nuevaDeuda],
      presupuestos: [nuevoPresupuesto],
    })

    const resultado = await importaCopia(ampliada, 'combinar')
    expect(resultado).toEqual({
      movimientosAnadidos: 1,
      movimientosRepetidos: 24,
      fotosAnadidas: 1,
      fotosRepetidas: 36,
      categoriasAnadidas: 1,
      cuentasAnadidas: 1,
      deudasAnadidas: 1,
      presupuestosAnadidos: 1,
    })

    expect(await db.movimientos.count()).toBe(25)
    expect(await db.fotos.count()).toBe(37)
    expect(await db.cuentas.count()).toBe(19)
    expect(await db.presupuestos.count()).toBe(1)
    expect((await db.movimientos.orderBy('fecha').last())?.concepto).toBe('Mercadona')
  })

  it('tampoco duplica si el mismo movimiento viene repetido dentro de la propia copia', async () => {
    const movimiento = nuevoMovimiento('2026-05-01', 'Mercadona', 42.5)
    const resultado = await importaCopia(copiaMinima({ movimientos: [movimiento, { ...movimiento }] }), 'combinar')

    expect(resultado.movimientosAnadidos).toBe(1)
    expect(resultado.movimientosRepetidos).toBe(1)
    expect(await db.movimientos.count()).toBe(1)
  })

  it('considera repetido el movimiento con la misma fecha, tipo, categoría, concepto e importe', async () => {
    await importaCopia(copiaMinima({ movimientos: [nuevoMovimiento('2026-05-01', 'Mercadona', 42.5)] }), 'combinar')
    // Mismo movimiento pero con otro importe: son dos compras distintas y entran las dos.
    const resultado = await importaCopia(
      copiaMinima({ movimientos: [nuevoMovimiento('2026-05-01', 'Mercadona', 43)] }),
      'combinar',
    )
    expect(resultado.movimientosAnadidos).toBe(1)
    expect(await db.movimientos.count()).toBe(2)
  })
})

describe('ajustes', () => {
  it('lee con valor por defecto lo que no existe', async () => {
    expect(await leeAjuste('noExiste')).toBe('')
    expect(await leeAjuste('noExiste', '7')).toBe('7')
  })

  it('escribe y vuelve a leer', async () => {
    await escribeAjuste('objetivoInversion', '250')
    expect(await leeAjuste('objetivoInversion')).toBe('250')
  })

  it('lee un ajuste numérico y cae al valor por defecto si no es un número', async () => {
    await sembrarSiHaceFalta()
    expect(await leeAjusteNumero('objetivoInversion')).toBe(200)

    await escribeAjuste('objetivoInversion', 'no es un número')
    expect(await leeAjusteNumero('objetivoInversion', 200)).toBe(200)

    // La coma decimal española no la entiende Number: mejor el valor por defecto que un NaN.
    await escribeAjuste('objetivoInversion', '250,5')
    expect(await leeAjusteNumero('objetivoInversion', 200)).toBe(200)

    await escribeAjuste('objetivoInversion', '250.5')
    expect(await leeAjusteNumero('objetivoInversion')).toBe(250.5)
  })

  it('lee el mapa completo de ajustes', async () => {
    await sembrarSiHaceFalta()
    const ajustes: Record<string, string> = await leeAjustes()
    expect(ajustes).toEqual({
      objetivoInversion: '200',
      objetivoAmortizacion: '200',
      recurrenteMinimoMeses: '3',
      copiaCadaDias: '7',
      versionSemilla: '1',
    })
  })
})

describe('movimientos sueltos', () => {
  it('guarda movimientos nuevos y actualiza los que ya tienen id', async () => {
    const primero = await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Mercadona', 40))
    await guardaMovimiento(nuevoMovimiento('2026-05-10', 'mercadona', 55))
    await guardaMovimiento(nuevoMovimiento('2026-04-01', 'Mercadona', 30))

    expect(await db.movimientos.count()).toBe(3)

    const ultimo = await ultimoConConcepto('  MERCADONA ')
    expect(ultimo?.fecha).toBe('2026-05-10')
    expect(ultimo?.importe).toBe(55)

    // Guardar con id actualiza en vez de crear otro: el contador no sube.
    await guardaMovimiento({ ...(ultimo as Movimiento), importe: 60 })
    expect(await db.movimientos.count()).toBe(3)
    expect((await db.movimientos.get(ultimo?.id as number))?.importe).toBe(60)
    expect((await db.movimientos.get(primero))?.importe).toBe(40)
  })

  it('sin movimientos de ese concepto devuelve undefined', async () => {
    expect(await ultimoConConcepto('nada')).toBeUndefined()
  })

  it('borra un movimiento por su id', async () => {
    const id = await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Mercadona', 40))
    await borraMovimiento(id)
    expect(await db.movimientos.count()).toBe(0)
  })
})

describe('renombraCategoria y renombraCuenta', () => {
  it('renombrar una categoría arrastra sus movimientos y su presupuesto', async () => {
    // Los movimientos guardan el NOMBRE de la categoría, no un id: si el renombrado no los
    // actualizara, esos gastos desaparecerían de los resúmenes y del presupuesto.
    await sembrarSiHaceFalta()
    await guardaPresupuesto({ categoria: 'Alimentación', importe: 300, activo: true })

    const afectados = await renombraCategoria('Alimentación', '  Comida  ')

    expect(afectados).toBe(6)
    expect(await db.movimientos.where('categoria').equals('Comida').count()).toBe(6)
    expect(await db.movimientos.where('categoria').equals('Alimentación').count()).toBe(0)
    expect(await db.categorias.where('nombre').equals('Comida').count()).toBe(1)
    expect((await db.presupuestos.toArray())[0].categoria).toBe('Comida')
  })

  it('renombrar una categoría a vacío o a lo mismo no hace nada', async () => {
    await sembrarSiHaceFalta()
    expect(await renombraCategoria('Alimentación', '   ')).toBe(0)
    expect(await renombraCategoria('Alimentación', 'Alimentación')).toBe(0)
    expect(await db.categorias.where('nombre').equals('Alimentación').count()).toBe(1)
  })

  it('renombrar una cuenta la actualiza también dentro de las fotos de patrimonio', async () => {
    await sembrarSiHaceFalta()

    const afectadas = await renombraCuenta('Efectivo', 'Efectivo en casa')

    expect(afectadas).toBe(36)
    expect(await db.cuentas.where('nombre').equals('Efectivo en casa').count()).toBe(1)
    expect(await db.cuentas.where('nombre').equals('Efectivo').count()).toBe(0)
    const antiguos = (await db.fotos.toArray()).flatMap((f) => f.valores).filter((v) => v.cuenta === 'Efectivo')
    expect(antiguos).toEqual([])
    const nuevos = (await db.fotos.toArray()).flatMap((f) => f.valores).filter((v) => v.cuenta === 'Efectivo en casa')
    expect(nuevos).toHaveLength(36)
  })

  it('renombrar una cuenta arrastra también los movimientos que la llevan apuntada', async () => {
    // Este caso destapó el bug: `cuenta` no está indexado en movimientos y la consulta por
    // índice lanzaba un SchemaError, así que renombrar una cuenta no funcionaba nunca.
    await guardaMovimiento({ ...nuevoMovimiento('2026-05-01', 'Mercadona', 42.5), cuenta: 'Efectivo' })
    await guardaMovimiento({ ...nuevoMovimiento('2026-05-02', 'Aldi', 20), cuenta: 'Revolut' })

    await renombraCuenta('Efectivo', 'Efectivo en casa')

    const movimientos = await db.movimientos.orderBy('fecha').toArray()
    expect(movimientos.map((m) => m.cuenta)).toEqual(['Efectivo en casa', 'Revolut'])
  })

  it('renombrar una cuenta a vacío o a lo mismo no hace nada', async () => {
    await sembrarSiHaceFalta()
    expect(await renombraCuenta('Efectivo', '  ')).toBe(0)
    expect(await renombraCuenta('Efectivo', 'Efectivo')).toBe(0)
    expect(await db.cuentas.where('nombre').equals('Efectivo').count()).toBe(1)
  })
})

describe('estadisticas', () => {
  it('resume lo que hay en la base para la pantalla de Ajustes', async () => {
    await sembrarSiHaceFalta()
    expect(await estadisticas()).toEqual({
      movimientos: 24,
      fotos: 36,
      categorias: CATEGORIAS_SEMILLA.length,
      cuentas: 18,
      deudas: 4,
      presupuestos: 0,
      comprasBitcoin: 89,
      primerMovimiento: '2026-03-26',
      ultimoMovimiento: '2026-04-12',
      primeraFoto: '2024-01-01',
      ultimaFoto: '2026-09-22',
    })
  })

  it('con la base vacía cuenta ceros y no inventa fechas', async () => {
    expect(await estadisticas()).toEqual({
      movimientos: 0,
      fotos: 0,
      categorias: 0,
      cuentas: 0,
      deudas: 0,
      presupuestos: 0,
      comprasBitcoin: 0,
      primerMovimiento: null,
      ultimoMovimiento: null,
      primeraFoto: null,
      ultimaFoto: null,
    })
  })
})

describe('trazabilidad del histórico', () => {
  it('la marca de sembrado y la procedencia de los datos están donde se espera', () => {
    expect(CLAVE_SEMILLA).toBe('versionSemilla')
    expect(ORIGEN_HISTORICO.fotos).toBe(36)
    expect(ORIGEN_HISTORICO.movimientos).toBe(24)
    expect(ORIGEN_HISTORICO.descuadres).toBe(0)
  })

  it('los ajustes de la semilla son los del plan de libertad financiera', () => {
    const porClave = new Map<string, Ajuste>(AJUSTES_SEMILLA.map((a) => [a.clave, a]))
    expect(porClave.get('objetivoInversion')?.valor).toBe('200')
    expect(porClave.get('objetivoAmortizacion')?.valor).toBe('200')
    expect(porClave.get('versionSemilla')?.valor).toBe('1')
  })
})
