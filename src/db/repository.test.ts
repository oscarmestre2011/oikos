/**
 * Pruebas de `src/db/repository.ts`: sembrado de los datos de partida, borrado y copia de
 * seguridad.
 *
 * Se ejecuta con `jsdom` (ver `vite.config.ts`) y con `fake-indexeddb` en memoria, así que
 * el banco de pruebas es una app recién instalada, sin depender del navegador ni del reloj.
 * `fake-indexeddb/auto` tiene que ir el primero: Dexie lee `indexedDB` al cargarse.
 *
 * Los datos personales de Óscar NO están aquí ni en el repositorio: la app arranca con el
 * catálogo genérico de `src/datos/catalogo.ts`, las pruebas trabajan con los datos inventados de
 * `src/datos/ejemplo.ts`, y su histórico solo entra por el fichero de copia, que vive fuera del
 * repositorio. Lo único que se comprueba de ese fichero es que se puede importar entero, y se
 * salta cuando no está.
 */

import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Ajuste, Categoria, Cuenta, Deuda, FotoPatrimonio, Movimiento, Presupuesto } from '../types'
import { AJUSTES_INICIALES, CATEGORIAS_INICIALES, CUENTAS_INICIALES, DEUDAS_INICIALES } from '../datos/catalogo'
import { COMPRAS_REALES, MOVIMIENTOS_REALES, copiaPersonal, hayCopiaPersonal } from '../datos/ayuda-pruebas'
import { CUENTAS_EJEMPLO, DEUDAS_EJEMPLO, FOTOS_EJEMPLO, MOVIMIENTOS_EJEMPLO } from '../datos/ejemplo'
import { db } from './index'
import {
  CLAVE_SEMILLA,
  DATOS_DE_PARTIDA,
  borraMovimiento,
  borrarTodo,
  escribeAjuste,
  estadisticas,
  exportaCopia,
  guardaFoto,
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

/** Foto de patrimonio de una sola cuenta, para las pruebas que necesitan fotos propias. */
function fotoConCuenta(fecha: string, cuenta: string, importe: number): FotoPatrimonio {
  return { fecha, valores: [{ cuenta, importe }], origen: 'manual', fechaAproximada: false }
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
 * Copia de ejemplo, con el mismo formato que exporta la app.
 *
 * Se usa para el viaje de ida y vuelta: con el catálogo genérico recién sembrado las tablas de
 * datos están vacías y esas pruebas no comprobarían nada. Los datos son inventados (ver
 * `src/datos/ejemplo.ts`): este repositorio es público.
 */
function copiaDeEjemplo(parcial: Partial<CopiaOikos> = {}): CopiaOikos {
  return copiaMinima({
    movimientos: MOVIMIENTOS_EJEMPLO,
    categorias: CATEGORIAS_INICIALES,
    cuentas: CUENTAS_EJEMPLO,
    deudas: DEUDAS_EJEMPLO,
    fotos: FOTOS_EJEMPLO,
    ajustes: AJUSTES_INICIALES,
    ...parcial,
  })
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
  it('mete el catálogo genérico la primera vez', async () => {
    await expect(sembrarSiHaceFalta()).resolves.toBe(true)

    expect(await db.categorias.count()).toBe(CATEGORIAS_INICIALES.length)
    expect(await db.cuentas.count()).toBe(CUENTAS_INICIALES.length)
    expect(await db.deudas.count()).toBe(0)
    // Ni movimientos, ni fotos, ni compras de Bitcoin: eso es el histórico de cada persona, y
    // llega importando su copia.
    expect(await db.movimientos.count()).toBe(0)
    expect(await db.fotos.count()).toBe(0)
    expect(await db.bitcoin.count()).toBe(0)
    // Los presupuestos tampoco vienen sembrados: son cosa del usuario.
    expect(await db.presupuestos.count()).toBe(0)
    expect((await db.ajustes.get(CLAVE_SEMILLA))?.valor).toBe('1')
  })

  it('lo que siembra es exactamente el catálogo, sin recortes ni cambios', async () => {
    await sembrarSiHaceFalta()

    const categorias = await db.categorias.toArray()
    expect(categorias).toHaveLength(CATEGORIAS_INICIALES.length)
    categorias.forEach((categoria, i) => expect(categoria).toMatchObject(CATEGORIAS_INICIALES[i]))

    const cuentas = await db.cuentas.toArray()
    expect(cuentas).toHaveLength(CUENTAS_INICIALES.length)
    cuentas.forEach((cuenta, i) => expect(cuenta).toMatchObject(CUENTAS_INICIALES[i]))

    // Y nada más: ninguna deuda, ningún movimiento y ninguna foto de nadie.
    expect(await db.deudas.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
    expect(await db.fotos.count()).toBe(0)
    expect(await db.bitcoin.count()).toBe(0)

    const ajustes = await db.ajustes.toArray()
    expect(ajustes.map((a) => a.clave).sort()).toEqual([...AJUSTES_INICIALES.map((a) => a.clave), CLAVE_SEMILLA].sort())
  })

  it('sembrar dos veces no duplica nada', async () => {
    await sembrarSiHaceFalta()
    await expect(sembrarSiHaceFalta()).resolves.toBe(false)

    expect(await db.categorias.count()).toBe(CATEGORIAS_INICIALES.length)
    expect(await db.cuentas.count()).toBe(CUENTAS_INICIALES.length)
    expect(await db.deudas.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
  })

  it('no vuelve a sembrar encima de los datos del usuario aunque falte la marca', async () => {
    // El caso real: alguien borra sus datos a propósito. La app debe quedarse como está y
    // limitarse a dejar la marca, no rellenarle la base por la cara.
    await borrarTodo(false)
    await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 42.5))

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
    // Los ajustes de partida más la marca del sembrado, que va con ellos.
    expect(await db.ajustes.count()).toBe(AJUSTES_INICIALES.length + 1)
  })

  it('con conservarAjustes en false también se lleva los ajustes', async () => {
    await sembrarSiHaceFalta()
    await borrarTodo(false)

    expect(await db.ajustes.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
  })
})

describe('reiniciarConSemilla', () => {
  it('deja otra vez el catálogo de partida y borra lo que se había añadido', async () => {
    await sembrarSiHaceFalta()
    await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 42.5))
    await escribeAjuste('objetivoInversion', '999')

    await reiniciarConSemilla()

    expect(await db.movimientos.count()).toBe(0)
    expect(await db.fotos.count()).toBe(0)
    expect(await db.categorias.count()).toBe(CATEGORIAS_INICIALES.length)
    expect(await db.cuentas.count()).toBe(CUENTAS_INICIALES.length)
    expect(await leeAjuste('objetivoInversion')).toBe('200')
  })

  it('se puede reiniciar sobre una base vacía sin que se queje', async () => {
    await reiniciarConSemilla()
    expect(await db.categorias.count()).toBe(CATEGORIAS_INICIALES.length)
    expect(await db.cuentas.count()).toBe(CUENTAS_INICIALES.length)
    expect(await db.deudas.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
  })
})

describe('exportaCopia', () => {
  it('exporta todas las tablas y se identifica como copia de Oikos', async () => {
    await sembrarSiHaceFalta()
    const copia = await exportaCopia()

    expect(copia.app).toBe('oikos')
    expect(copia.version).toBe(1)
    expect(Number.isNaN(Date.parse(copia.exportado))).toBe(false)
    expect(copia.categorias).toHaveLength(CATEGORIAS_INICIALES.length)
    expect(copia.cuentas).toHaveLength(CUENTAS_INICIALES.length)
    expect(copia.ajustes).toHaveLength(AJUSTES_INICIALES.length + 1)
    // Recién sembrada, la app no tiene datos de nadie: listas vacías, nunca nulos.
    expect(copia.movimientos).toEqual([])
    expect(copia.fotos).toEqual([])
    expect(copia.deudas).toEqual([])
    expect(copia.presupuestos).toEqual([])
    expect(copia.bitcoin).toEqual([])
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
      movimientos: [{ fecha: '2026-06-30', importe: '12,50' }],
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
    const resultado = validaCopia(copiaMinima({ movimientos: [nuevoMovimiento('2026-06-30', 'Compra de ejemplo', 12.5)] }))
    expect(resultado.valida).toBe(true)
    expect(resultado.copia?.movimientos).toHaveLength(1)
  })
})

describe('viaje de ida y vuelta de la copia', () => {
  it('exportar, borrar, validar e importar en modo reemplazar deja exactamente lo mismo', async () => {
    // Se mete la copia de ejemplo y se exporta: así el viaje trabaja con datos (21 movimientos,
    // 4 fotos, 3 deudas) en vez de con listas vacías, que no comprobarían nada.
    await importaCopia(copiaDeEjemplo(), 'reemplazar')
    const copia = await exportaCopia()
    expect(copia.movimientos).toHaveLength(MOVIMIENTOS_EJEMPLO.length)
    expect(copia.fotos).toHaveLength(FOTOS_EJEMPLO.length)
    expect(copia.deudas).toHaveLength(DEUDAS_EJEMPLO.length)

    await borrarTodo(false)
    expect(await db.movimientos.count()).toBe(0)
    expect(await db.ajustes.count()).toBe(0)

    const validacion = validaCopia(copia)
    expect(validacion.valida).toBe(true)
    const resultado = await importaCopia(validacion.copia as CopiaOikos, 'reemplazar')
    expect(resultado.movimientosAnadidos).toBe(MOVIMIENTOS_EJEMPLO.length)
    expect(resultado.fotosAnadidas).toBe(FOTOS_EJEMPLO.length)

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
    await importaCopia(copiaMinima({ movimientos: [nuevoMovimiento('2026-06-30', 'Solo este', 1)] }), 'reemplazar')

    expect(await db.fotos.count()).toBe(0)
    expect(await db.cuentas.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(1)
    expect((await db.movimientos.toArray())[0].concepto).toBe('Solo este')
  })

  it('importar dos veces la misma copia en modo combinar no duplica nada', async () => {
    await importaCopia(copiaDeEjemplo(), 'reemplazar')
    const copia = await exportaCopia()

    const resultado = await importaCopia(copia, 'combinar')
    expect(resultado).toEqual({
      movimientosAnadidos: 0,
      movimientosRepetidos: MOVIMIENTOS_EJEMPLO.length,
      fotosAnadidas: 0,
      fotosRepetidas: FOTOS_EJEMPLO.length,
      categoriasAnadidas: 0,
      cuentasAnadidas: 0,
      deudasAnadidas: 0,
      presupuestosAnadidos: 0,
    })
    expect(await db.movimientos.count()).toBe(MOVIMIENTOS_EJEMPLO.length)
    expect(await db.fotos.count()).toBe(FOTOS_EJEMPLO.length)
    expect(await db.cuentas.count()).toBe(CUENTAS_EJEMPLO.length)
    expect(await db.deudas.count()).toBe(DEUDAS_EJEMPLO.length)
  })

  it('en modo combinar solo entra lo que faltaba', async () => {
    await importaCopia(copiaDeEjemplo(), 'reemplazar')
    const copia = await exportaCopia()

    const nuevaFoto: FotoPatrimonio = { fecha: '2026-05-31', valores: [], origen: 'manual', fechaAproximada: false }
    const nuevaCategoria: Categoria = { nombre: 'Mascotas de ejemplo', ambito: 'gasto', esencial: false, historica: false, activa: true, orden: 90 }
    const nuevaCuenta: Cuenta = { nombre: 'Cuenta nueva de ejemplo', bloque: 'liquidez', orden: 99, activa: true }
    const nuevaDeuda: Deuda = { nombre: 'Deuda nueva de ejemplo', saldo: 250, fechaSaldo: '2026-05-31', compartida: false, activa: true }
    const nuevoPresupuesto: Presupuesto = { categoria: 'Mascotas de ejemplo', importe: 50, activo: true }
    const ampliada = copiaMinima({
      movimientos: [...copia.movimientos, nuevoMovimiento('2026-05-02', 'Compra nueva de ejemplo', 42.5)],
      fotos: [...copia.fotos, nuevaFoto],
      categorias: [...copia.categorias, nuevaCategoria],
      cuentas: [...copia.cuentas, nuevaCuenta],
      deudas: [...copia.deudas, nuevaDeuda],
      presupuestos: [nuevoPresupuesto],
    })

    const resultado = await importaCopia(ampliada, 'combinar')
    expect(resultado).toEqual({
      movimientosAnadidos: 1,
      movimientosRepetidos: MOVIMIENTOS_EJEMPLO.length,
      fotosAnadidas: 1,
      fotosRepetidas: FOTOS_EJEMPLO.length,
      categoriasAnadidas: 1,
      cuentasAnadidas: 1,
      deudasAnadidas: 1,
      presupuestosAnadidos: 1,
    })

    expect(await db.movimientos.count()).toBe(MOVIMIENTOS_EJEMPLO.length + 1)
    expect(await db.fotos.count()).toBe(FOTOS_EJEMPLO.length + 1)
    expect(await db.cuentas.count()).toBe(CUENTAS_EJEMPLO.length + 1)
    expect(await db.presupuestos.count()).toBe(1)
    expect((await db.movimientos.orderBy('fecha').last())?.concepto).toBe('Compra nueva de ejemplo')
  })

  it('tampoco duplica si el mismo movimiento viene repetido dentro de la propia copia', async () => {
    const movimiento = nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 42.5)
    const resultado = await importaCopia(copiaMinima({ movimientos: [movimiento, { ...movimiento }] }), 'combinar')

    expect(resultado.movimientosAnadidos).toBe(1)
    expect(resultado.movimientosRepetidos).toBe(1)
    expect(await db.movimientos.count()).toBe(1)
  })

  it('considera repetido el movimiento con la misma fecha, tipo, categoría, concepto e importe', async () => {
    await importaCopia(copiaMinima({ movimientos: [nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 42.5)] }), 'combinar')
    // Mismo movimiento pero con otro importe: son dos compras distintas y entran las dos.
    const resultado = await importaCopia(
      copiaMinima({ movimientos: [nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 43)] }),
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
    const primero = await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 40))
    await guardaMovimiento(nuevoMovimiento('2026-05-10', 'compra de ejemplo', 55))
    await guardaMovimiento(nuevoMovimiento('2026-04-01', 'Compra de ejemplo', 30))

    expect(await db.movimientos.count()).toBe(3)

    const ultimo = await ultimoConConcepto('  COMPRA DE EJEMPLO ')
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
    const id = await guardaMovimiento(nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 40))
    await borraMovimiento(id)
    expect(await db.movimientos.count()).toBe(0)
  })
})

describe('renombraCategoria y renombraCuenta', () => {
  it('renombrar una categoría arrastra sus movimientos y su presupuesto', async () => {
    // Los movimientos guardan el NOMBRE de la categoría, no un id: si el renombrado no los
    // actualizara, esos gastos desaparecerían de los resúmenes y del presupuesto.
    await sembrarSiHaceFalta()
    // La app ya no trae histórico dentro, así que los movimientos que hay que arrastrar los
    // crea la propia prueba: sin ellos, el renombrado no tendría nada que actualizar.
    for (let dia = 1; dia <= 6; dia += 1) {
      await guardaMovimiento(nuevoMovimiento(`2026-05-0${dia}`, `Compra ${dia} de ejemplo`, 10 + dia))
    }
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
    // Las fotos también las crea la prueba: el histórico real no viaja en el repositorio.
    await guardaFoto(fotoConCuenta('2026-01-31', 'Efectivo', 100))
    await guardaFoto(fotoConCuenta('2026-02-28', 'Efectivo', 120))
    await guardaFoto(fotoConCuenta('2026-03-31', 'Efectivo', 90))

    const afectadas = await renombraCuenta('Efectivo', 'Efectivo en casa')

    expect(afectadas).toBe(3)
    expect(await db.cuentas.where('nombre').equals('Efectivo en casa').count()).toBe(1)
    expect(await db.cuentas.where('nombre').equals('Efectivo').count()).toBe(0)
    const antiguos = (await db.fotos.toArray()).flatMap((f) => f.valores).filter((v) => v.cuenta === 'Efectivo')
    expect(antiguos).toEqual([])
    const nuevos = (await db.fotos.toArray()).flatMap((f) => f.valores).filter((v) => v.cuenta === 'Efectivo en casa')
    expect(nuevos).toHaveLength(3)
  })

  it('renombrar una cuenta arrastra también los movimientos que la llevan apuntada', async () => {
    // Este caso destapó el bug: `cuenta` no está indexado en movimientos y la consulta por
    // índice lanzaba un SchemaError, así que renombrar una cuenta no funcionaba nunca.
    await guardaMovimiento({ ...nuevoMovimiento('2026-05-01', 'Compra de ejemplo', 42.5), cuenta: 'Efectivo' })
    await guardaMovimiento({ ...nuevoMovimiento('2026-05-02', 'Otra compra de ejemplo', 20), cuenta: 'Cuenta de ejemplo' })

    await renombraCuenta('Efectivo', 'Efectivo en casa')

    const movimientos = await db.movimientos.orderBy('fecha').toArray()
    expect(movimientos.map((m) => m.cuenta)).toEqual(['Efectivo en casa', 'Cuenta de ejemplo'])
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
      movimientos: 0,
      fotos: 0,
      categorias: CATEGORIAS_INICIALES.length,
      cuentas: CUENTAS_INICIALES.length,
      deudas: 0,
      presupuestos: 0,
      comprasBitcoin: 0,
      primerMovimiento: null,
      ultimoMovimiento: null,
      primeraFoto: null,
      ultimaFoto: null,
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

describe('trazabilidad de los datos de partida', () => {
  it('la marca de sembrado está donde se espera', () => {
    expect(CLAVE_SEMILLA).toBe('versionSemilla')
  })

  it('la app no lleva deudas de nadie dentro: el histórico llega por el archivo de copia', () => {
    // El repositorio es público. Si aquí hubiera deudas, se publicarían los saldos de una
    // persona; el histórico entra importando su copia, y esa es la razón de `archivoDeCopia`.
    expect(DEUDAS_INICIALES).toEqual([])
    expect(DATOS_DE_PARTIDA.deudas).toBe(0)
    expect(DATOS_DE_PARTIDA.archivoDeCopia).toBe('oikos-mi-historial.json')
    expect(DATOS_DE_PARTIDA.categorias).toBe(CATEGORIAS_INICIALES.length)
    expect(DATOS_DE_PARTIDA.cuentas).toBe(CUENTAS_INICIALES.length)
  })

  it('los ajustes de partida son los objetivos mensuales por defecto', () => {
    const porClave = new Map<string, Ajuste>(AJUSTES_INICIALES.map((a) => [a.clave, a]))
    expect(porClave.get('objetivoInversion')?.valor).toBe('200')
    expect(porClave.get('objetivoAmortizacion')?.valor).toBe('200')
    expect(porClave.get('recurrenteMinimoMeses')?.valor).toBe('3')
    expect(porClave.get('copiaCadaDias')?.valor).toBe('7')
  })
})

/*
 * LA PRUEBA DEL FICHERO QUE ÓSCAR IMPORTA DE VERDAD.
 *
 * `datos/oikos-mi-historial.json` es su histórico real y vive FUERA del repositorio. En una copia
 * limpia —y en el flujo de publicación de GitHub, que clona el repositorio— no está, así que este
 * bloque se SALTA con `describe.skipIf` en vez de reventar. En su ordenador sí corre, y es la
 * única prueba que comprueba que el archivo que va a importar en el móvil entra entero.
 *
 * Aquí no se escribe ni una cifra suya: todo lo esperado se calcula a partir del propio fichero
 * (`copiaPersonal`). Sus saldos y sus movimientos están en su fichero, no en el repositorio.
 */
describe.skipIf(!hayCopiaPersonal)('la copia personal es importable', () => {
  /** La copia personal, ya validada y con el tipo que espera `importaCopia`. */
  function copiaValidada(): CopiaOikos {
    if (!copiaPersonal) throw new Error('Esta prueba necesita la copia personal de Óscar.')
    const validacion = validaCopia(copiaPersonal)
    expect(validacion.valida).toBe(true)
    if (!validacion.copia) throw new Error('La copia personal no ha pasado la validación.')
    return validacion.copia
  }

  it('valida y deja dentro exactamente lo que trae el fichero', async () => {
    const copia = copiaValidada()
    expect(validaCopia(copiaPersonal).error).toBeUndefined()

    const resultado = await importaCopia(copia, 'reemplazar')
    expect(resultado.movimientosAnadidos).toBe(copia.movimientos.length)
    expect(resultado.fotosAnadidas).toBe(copia.fotos.length)

    expect(await db.movimientos.count()).toBe(copia.movimientos.length)
    expect(await db.fotos.count()).toBe(copia.fotos.length)
    expect(await db.deudas.count()).toBe(copia.deudas.length)
    expect(await db.cuentas.count()).toBe(copia.cuentas.length)
    expect(await db.categorias.count()).toBe(copia.categorias.length)
    expect(await db.bitcoin.count()).toBe(copia.bitcoin.length)

    // Y algo más que los números: lo que queda es el contenido de la copia, en su orden.
    expect(sinIds(await db.movimientos.toArray())).toEqual(sinIds(MOVIMIENTOS_REALES))
    expect(sinIds(await db.fotos.toArray())).toEqual(sinIds(copia.fotos))
    expect(sinIds(await db.bitcoin.toArray())).toEqual(sinIds(COMPRAS_REALES))
  })

  it('importar su copia no deja la base a medias: las fechas van de la primera a la última', async () => {
    const copia = copiaValidada()
    await importaCopia(copia, 'reemplazar')

    const resumen = await estadisticas()
    const fechasMovimientos = copia.movimientos.map((m) => m.fecha).sort()
    const fechasFotos = copia.fotos.map((f) => f.fecha).sort()

    expect(resumen.primerMovimiento).toBe(fechasMovimientos[0])
    expect(resumen.ultimoMovimiento).toBe(fechasMovimientos[fechasMovimientos.length - 1])
    expect(resumen.primeraFoto).toBe(fechasFotos[0])
    expect(resumen.ultimaFoto).toBe(fechasFotos[fechasFotos.length - 1])
  })
})
