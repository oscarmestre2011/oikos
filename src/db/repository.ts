/**
 * El acceso a los datos: lo unico que hablan las pantallas con la base.
 *
 * Toda la logica de "que hay que hacer" vive aqui, no en las pantallas, para que se pueda
 * probar sin dibujar nada y para que no haya dos sitios que hagan lo mismo de forma distinta.
 */

import { db } from './index'
import { AJUSTES_SEMILLA, CATEGORIAS_SEMILLA, DEUDAS_SEMILLA } from '../datos/catalogo'
import {
  COMPRAS_BITCOIN_SEMILLA,
  CUENTAS_SEMILLA,
  FOTOS_SEMILLA,
  FUENTES_SEMILLA,
  MOVIMIENTOS_SEMILLA,
  RESUMEN_SEMILLA,
} from '../datos/semilla'
import type {
  Ajuste,
  Categoria,
  CompraBitcoin,
  Cuenta,
  Deuda,
  FotoPatrimonio,
  Movimiento,
  Presupuesto,
} from '../types'

/** Clave del ajuste que dice que la semilla ya se metio. */
export const CLAVE_SEMILLA = 'versionSemilla'

/**
 * Mete el historico real la primera vez que se abre la app.
 *
 * Se comprueba la marca `versionSemilla` Y que las tablas esten vacias: si alguien ha
 * borrado sus datos a proposito, la app no se los vuelve a meter por la cara.
 */
export async function sembrarSiHaceFalta(): Promise<boolean> {
  const marca = await db.ajustes.get(CLAVE_SEMILLA)
  if (marca) return false

  const yaHayDatos =
    (await db.movimientos.count()) > 0 ||
    (await db.fotos.count()) > 0 ||
    (await db.categorias.count()) > 0

  if (yaHayDatos) {
    await db.ajustes.put({ clave: CLAVE_SEMILLA, valor: '1' })
    return false
  }

  await db.transaction('rw', [db.movimientos, db.categorias, db.cuentas, db.deudas, db.fotos, db.presupuestos, db.ajustes, db.bitcoin], async () => {
    await db.categorias.bulkAdd(CATEGORIAS_SEMILLA)
    await db.cuentas.bulkAdd(CUENTAS_SEMILLA)
    await db.deudas.bulkAdd(DEUDAS_SEMILLA)
    await db.fotos.bulkAdd(FOTOS_SEMILLA)
    await db.movimientos.bulkAdd(MOVIMIENTOS_SEMILLA)
    await db.bitcoin.bulkAdd(COMPRAS_BITCOIN_SEMILLA)
    await db.ajustes.bulkPut(AJUSTES_SEMILLA)
  })
  return true
}

/** Vuelve a dejar la app con el historico de partida (borra lo que hubiera). */
export async function reiniciarConSemilla(): Promise<void> {
  await borrarTodo(false)
  await db.transaction('rw', [db.movimientos, db.categorias, db.cuentas, db.deudas, db.fotos, db.presupuestos, db.ajustes, db.bitcoin], async () => {
    await db.categorias.bulkAdd(CATEGORIAS_SEMILLA)
    await db.cuentas.bulkAdd(CUENTAS_SEMILLA)
    await db.deudas.bulkAdd(DEUDAS_SEMILLA)
    await db.fotos.bulkAdd(FOTOS_SEMILLA)
    await db.movimientos.bulkAdd(MOVIMIENTOS_SEMILLA)
    await db.bitcoin.bulkAdd(COMPRAS_BITCOIN_SEMILLA)
    await db.ajustes.bulkPut(AJUSTES_SEMILLA)
  })
}

/** Borra todo. `conservarAjustes` deja los objetivos y preferencias en su sitio. */
export async function borrarTodo(conservarAjustes = true): Promise<void> {
  await db.transaction('rw', [db.movimientos, db.categorias, db.cuentas, db.deudas, db.fotos, db.presupuestos, db.ajustes, db.bitcoin], async () => {
    await Promise.all([
      db.movimientos.clear(),
      db.categorias.clear(),
      db.cuentas.clear(),
      db.deudas.clear(),
      db.fotos.clear(),
      db.presupuestos.clear(),
      db.bitcoin.clear(),
    ])
    if (!conservarAjustes) await db.ajustes.clear()
  })
}

// ---------------------------------------------------------------------------
// Movimientos
// ---------------------------------------------------------------------------

export async function guardaMovimiento(movimiento: Movimiento): Promise<number> {
  if (movimiento.id) {
    await db.movimientos.put(movimiento)
    return movimiento.id
  }
  const { id: _descartado, ...sinId } = movimiento
  return db.movimientos.add(sinId as Movimiento)
}

export async function borraMovimiento(id: number): Promise<void> {
  await db.movimientos.delete(id)
}

/** El ultimo movimiento apuntado con ese concepto, para repetir importe y categoria. */
export async function ultimoConConcepto(concepto: string): Promise<Movimiento | undefined> {
  const normalizado = concepto.trim().toLowerCase()
  const todos = await db.movimientos.orderBy('fecha').reverse().toArray()
  return todos.find((m) => m.concepto.trim().toLowerCase() === normalizado)
}

// ---------------------------------------------------------------------------
// Catalogos
// ---------------------------------------------------------------------------

export async function guardaCategoria(categoria: Categoria): Promise<number> {
  if (categoria.id) {
    await db.categorias.put(categoria)
    return categoria.id
  }
  const { id: _descartado, ...sinId } = categoria
  return db.categorias.add(sinId as Categoria)
}

export async function borraCategoria(id: number): Promise<void> {
  await db.categorias.delete(id)
}

export async function guardaCuenta(cuenta: Cuenta): Promise<number> {
  if (cuenta.id) {
    await db.cuentas.put(cuenta)
    return cuenta.id
  }
  const { id: _descartado, ...sinId } = cuenta
  return db.cuentas.add(sinId as Cuenta)
}

export async function borraCuenta(id: number): Promise<void> {
  await db.cuentas.delete(id)
}

export async function guardaDeuda(deuda: Deuda): Promise<number> {
  if (deuda.id) {
    await db.deudas.put(deuda)
    return deuda.id
  }
  const { id: _descartado, ...sinId } = deuda
  return db.deudas.add(sinId as Deuda)
}

export async function borraDeuda(id: number): Promise<void> {
  await db.deudas.delete(id)
}

export async function guardaFoto(foto: FotoPatrimonio): Promise<number> {
  if (foto.id) {
    await db.fotos.put(foto)
    return foto.id
  }
  const { id: _descartado, ...sinId } = foto
  return db.fotos.add(sinId as FotoPatrimonio)
}

export async function borraFoto(id: number): Promise<void> {
  await db.fotos.delete(id)
}

export async function guardaPresupuesto(presupuesto: Presupuesto): Promise<number> {
  if (presupuesto.id) {
    await db.presupuestos.put(presupuesto)
    return presupuesto.id
  }
  const { id: _descartado, ...sinId } = presupuesto
  return db.presupuestos.add(sinId as Presupuesto)
}

export async function borraPresupuesto(id: number): Promise<void> {
  await db.presupuestos.delete(id)
}

/**
 * Renombra una categoria y ARRASTRA el cambio a todo lo que la usaba.
 *
 * Las categorias se guardan por nombre dentro de cada movimiento (y no por un id), para que
 * la copia de seguridad se pueda leer entera sin cruzar tablas. El precio de esa decision es
 * este: si se renombra, hay que actualizar los movimientos y los presupuestos a la vez, o
 * quedarian apuntando a una categoria que ya no existe y desapareceran de los resumenes.
 *
 * Devuelve cuantos movimientos se han actualizado.
 */
export async function renombraCategoria(antiguo: string, nuevo: string): Promise<number> {
  const limpio = nuevo.trim()
  if (!limpio || limpio === antiguo) return 0

  let afectados = 0
  await db.transaction('rw', [db.categorias, db.movimientos, db.presupuestos], async () => {
    const categoria = await db.categorias.where('nombre').equals(antiguo).first()
    if (categoria?.id) await db.categorias.update(categoria.id, { nombre: limpio })

    afectados = await db.movimientos.where('categoria').equals(antiguo).modify({ categoria: limpio })

    const presupuesto = await db.presupuestos.where('categoria').equals(antiguo).first()
    if (presupuesto?.id) await db.presupuestos.update(presupuesto.id, { categoria: limpio })
  })
  return afectados
}

/** Renombra una cuenta y actualiza su nombre en todas las fotos del patrimonio. */
export async function renombraCuenta(antiguo: string, nuevo: string): Promise<number> {
  const limpio = nuevo.trim()
  if (!limpio || limpio === antiguo) return 0

  let afectadas = 0
  await db.transaction('rw', [db.cuentas, db.fotos, db.movimientos], async () => {
    const cuenta = await db.cuentas.where('nombre').equals(antiguo).first()
    if (cuenta?.id) await db.cuentas.update(cuenta.id, { nombre: limpio })

    // Las fotos guardan `valores` como un array dentro del propio registro, y Dexie no
    // puede modificar un elemento suelto del array: hay que reescribir la foto entera.
    const fotos = await db.fotos.toArray()
    for (const foto of fotos) {
      if (!foto.valores.some((valor) => valor.cuenta === antiguo)) continue
      const valores = foto.valores.map((valor) =>
        valor.cuenta === antiguo ? { ...valor, cuenta: limpio } : valor,
      )
      await db.fotos.put({ ...foto, valores })
      afectadas += 1
    }

    // Los movimientos tambien pueden llevar la cuenta apuntada. `cuenta` no esta indexado
    // en la tabla de movimientos, asi que se filtra en memoria: `where('cuenta')` lanzaria
    // un SchemaError y dejaria el renombrado a medias.
    await db.movimientos.filter((movimiento) => movimiento.cuenta === antiguo).modify({ cuenta: limpio })
  })
  return afectadas
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

export async function leeAjuste(clave: string, porDefecto = ''): Promise<string> {
  const ajuste = await db.ajustes.get(clave)
  return ajuste?.valor ?? porDefecto
}

export async function leeAjusteNumero(clave: string, porDefecto = 0): Promise<number> {
  const valor = await leeAjuste(clave, String(porDefecto))
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : porDefecto
}

export async function escribeAjuste(clave: string, valor: string): Promise<void> {
  await db.ajustes.put({ clave, valor })
}

export async function leeAjustes(): Promise<Record<string, string>> {
  const todos = await db.ajustes.toArray()
  return Object.fromEntries(todos.map((a) => [a.clave, a.valor]))
}

// ---------------------------------------------------------------------------
// Copia de seguridad
// ---------------------------------------------------------------------------

export interface CopiaOikos {
  app: 'oikos'
  version: number
  exportado: string
  movimientos: Movimiento[]
  categorias: Categoria[]
  cuentas: Cuenta[]
  deudas: Deuda[]
  fotos: FotoPatrimonio[]
  presupuestos: Presupuesto[]
  ajustes: Ajuste[]
  bitcoin: CompraBitcoin[]
}

export async function exportaCopia(): Promise<CopiaOikos> {
  const [movimientos, categorias, cuentas, deudas, fotos, presupuestos, ajustes, bitcoin] = await Promise.all([
    db.movimientos.toArray(),
    db.categorias.toArray(),
    db.cuentas.toArray(),
    db.deudas.toArray(),
    db.fotos.toArray(),
    db.presupuestos.toArray(),
    db.ajustes.toArray(),
    db.bitcoin.toArray(),
  ])
  return {
    app: 'oikos',
    version: 1,
    exportado: new Date().toISOString(),
    movimientos,
    categorias,
    cuentas,
    deudas,
    fotos,
    presupuestos,
    ajustes,
    bitcoin,
  }
}

export interface ResultadoValidacion {
  valida: boolean
  error?: string
  copia?: CopiaOikos
}

/**
 * Comprueba que un archivo es una copia de Oikos antes de tocar la base.
 *
 * Se valida de verdad (no solo que el JSON se lea): un archivo de otro programa, o una
 * copia a medias, no debe poder dejar la app a medias.
 */
export function validaCopia(datos: unknown): ResultadoValidacion {
  if (!datos || typeof datos !== 'object') return { valida: false, error: 'El archivo no tiene datos.' }
  const copia = datos as Partial<CopiaOikos>
  if (copia.app !== 'oikos') {
    return { valida: false, error: 'Ese archivo no es una copia de Oikos.' }
  }
  for (const campo of ['movimientos', 'categorias', 'cuentas', 'fotos'] as const) {
    if (!Array.isArray(copia[campo])) {
      return { valida: false, error: `A la copia le falta la lista de ${campo}.` }
    }
  }
  const primera = copia.movimientos![0]
  if (primera && (typeof primera.fecha !== 'string' || typeof primera.importe !== 'number')) {
    return { valida: false, error: 'La copia tiene movimientos con un formato que no se entiende.' }
  }
  return { valida: true, copia: copia as CopiaOikos }
}

/** Clave natural de un movimiento, para no duplicar al combinar dos copias. */
export function claveMovimiento(movimiento: Movimiento): string {
  return [movimiento.fecha, movimiento.tipo, movimiento.categoria, movimiento.concepto, movimiento.importe].join('|')
}

export interface ResultadoImportacion {
  movimientosAnadidos: number
  movimientosRepetidos: number
  fotosAnadidas: number
  fotosRepetidas: number
  categoriasAnadidas: number
  cuentasAnadidas: number
  deudasAnadidas: number
  presupuestosAnadidos: number
}

/**
 * Importa una copia.
 *
 * - `combinar`: añade lo que falta y no toca lo que ya esta (no duplica movimientos ni
 *   fotos, que son los que se repetirian al juntar el movil y el portatil).
 * - `reemplazar`: deja exactamente lo que trae la copia.
 */
export async function importaCopia(
  copia: CopiaOikos,
  modo: 'combinar' | 'reemplazar',
): Promise<ResultadoImportacion> {
  const resultado: ResultadoImportacion = {
    movimientosAnadidos: 0,
    movimientosRepetidos: 0,
    fotosAnadidas: 0,
    fotosRepetidas: 0,
    categoriasAnadidas: 0,
    cuentasAnadidas: 0,
    deudasAnadidas: 0,
    presupuestosAnadidos: 0,
  }

  if (modo === 'reemplazar') {
    await borrarTodo(false)
    await db.transaction('rw', [db.movimientos, db.categorias, db.cuentas, db.deudas, db.fotos, db.presupuestos, db.ajustes, db.bitcoin], async () => {
      await db.movimientos.bulkAdd(sinIds(copia.movimientos))
      await db.categorias.bulkAdd(sinIds(copia.categorias))
      await db.cuentas.bulkAdd(sinIds(copia.cuentas))
      await db.deudas.bulkAdd(sinIds(copia.deudas ?? []))
      await db.fotos.bulkAdd(sinIds(copia.fotos))
      await db.presupuestos.bulkAdd(sinIds(copia.presupuestos ?? []))
      await db.bitcoin.bulkAdd(sinIds(copia.bitcoin ?? []))
      await db.ajustes.bulkPut(copia.ajustes ?? [])
    })
    resultado.movimientosAnadidos = copia.movimientos.length
    resultado.fotosAnadidas = copia.fotos.length
    return resultado
  }

  await db.transaction('rw', [db.movimientos, db.categorias, db.cuentas, db.deudas, db.fotos, db.presupuestos], async () => {
    const clavesExistentes = new Set((await db.movimientos.toArray()).map(claveMovimiento))
    const nuevos: Movimiento[] = []
    for (const movimiento of copia.movimientos) {
      const clave = claveMovimiento(movimiento)
      if (clavesExistentes.has(clave)) {
        resultado.movimientosRepetidos += 1
        continue
      }
      clavesExistentes.add(clave)
      nuevos.push(movimiento)
    }
    if (nuevos.length > 0) await db.movimientos.bulkAdd(sinIds(nuevos))
    resultado.movimientosAnadidos = nuevos.length

    const fechasFotos = new Set((await db.fotos.toArray()).map((f) => f.fecha))
    const fotosNuevas = copia.fotos.filter((f) => !fechasFotos.has(f.fecha))
    if (fotosNuevas.length > 0) await db.fotos.bulkAdd(sinIds(fotosNuevas))
    resultado.fotosAnadidas = fotosNuevas.length
    resultado.fotosRepetidas = copia.fotos.length - fotosNuevas.length

    const nombresCategorias = new Set((await db.categorias.toArray()).map((c) => c.nombre))
    const categoriasNuevas = (copia.categorias ?? []).filter((c) => !nombresCategorias.has(c.nombre))
    if (categoriasNuevas.length > 0) await db.categorias.bulkAdd(sinIds(categoriasNuevas))
    resultado.categoriasAnadidas = categoriasNuevas.length

    const nombresCuentas = new Set((await db.cuentas.toArray()).map((c) => c.nombre))
    const cuentasNuevas = (copia.cuentas ?? []).filter((c) => !nombresCuentas.has(c.nombre))
    if (cuentasNuevas.length > 0) await db.cuentas.bulkAdd(sinIds(cuentasNuevas))
    resultado.cuentasAnadidas = cuentasNuevas.length

    const nombresDeudas = new Set((await db.deudas.toArray()).map((d) => d.nombre))
    const deudasNuevas = (copia.deudas ?? []).filter((d) => !nombresDeudas.has(d.nombre))
    if (deudasNuevas.length > 0) await db.deudas.bulkAdd(sinIds(deudasNuevas))
    resultado.deudasAnadidas = deudasNuevas.length

    const categoriasConPresupuesto = new Set((await db.presupuestos.toArray()).map((p) => p.categoria))
    const presupuestosNuevos = (copia.presupuestos ?? []).filter(
      (p) => !categoriasConPresupuesto.has(p.categoria),
    )
    if (presupuestosNuevos.length > 0) await db.presupuestos.bulkAdd(sinIds(presupuestosNuevos))
    resultado.presupuestosAnadidos = presupuestosNuevos.length
  })

  return resultado
}

/** Quita los `id` para que la base asigne los suyos y no choquen con los existentes. */
function sinIds<T>(lista: T[]): T[] {
  return lista.map((elemento) => {
    const { id: _descartado, ...resto } = elemento as T & { id?: number }
    return resto as T
  })
}

// ---------------------------------------------------------------------------
// Informacion para la pantalla de Ajustes
// ---------------------------------------------------------------------------

export interface EstadisticasBase {
  movimientos: number
  fotos: number
  categorias: number
  cuentas: number
  deudas: number
  presupuestos: number
  comprasBitcoin: number
  primerMovimiento: string | null
  ultimoMovimiento: string | null
  primeraFoto: string | null
  ultimaFoto: string | null
}

export async function estadisticas(): Promise<EstadisticasBase> {
  const [movimientos, fotos, categorias, cuentas, deudas, presupuestos, comprasBitcoin] = await Promise.all([
    db.movimientos.orderBy('fecha').toArray(),
    db.fotos.orderBy('fecha').toArray(),
    db.categorias.count(),
    db.cuentas.count(),
    db.deudas.count(),
    db.presupuestos.count(),
    db.bitcoin.count(),
  ])
  return {
    movimientos: movimientos.length,
    fotos: fotos.length,
    categorias,
    cuentas,
    deudas,
    presupuestos,
    comprasBitcoin,
    primerMovimiento: movimientos[0]?.fecha ?? null,
    ultimoMovimiento: movimientos[movimientos.length - 1]?.fecha ?? null,
    primeraFoto: fotos[0]?.fecha ?? null,
    ultimaFoto: fotos[fotos.length - 1]?.fecha ?? null,
  }
}

/** De donde salio el historico, para poder enseñarlo en Ajustes y en la bienvenida. */
export const ORIGEN_HISTORICO = {
  ...FUENTES_SEMILLA,
  ...RESUMEN_SEMILLA,
}
