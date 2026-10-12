/**
 * La base de datos de Oikos, en el propio movil (IndexedDB, a traves de Dexie).
 *
 * Sin servidor, sin cuenta y sin nube: es lo que hace que la app funcione sin cobertura y
 * que nadie mas vea las cuentas de Oscar. El precio es el de siempre: si se borran los
 * datos de navegacion, se pierden, asi que la copia de seguridad en JSON no es un extra.
 *
 * El nombre de la base (`oikos`) NO se debe cambiar: los datos guardados van ligados a el,
 * igual que en Kairos paso con el nombre del repositorio.
 */

import Dexie, { type Table } from 'dexie'
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

export const NOMBRE_BASE = 'oikos'

export class BaseOikos extends Dexie {
  movimientos!: Table<Movimiento, number>
  categorias!: Table<Categoria, number>
  cuentas!: Table<Cuenta, number>
  deudas!: Table<Deuda, number>
  fotos!: Table<FotoPatrimonio, number>
  presupuestos!: Table<Presupuesto, number>
  ajustes!: Table<Ajuste, string>
  bitcoin!: Table<CompraBitcoin, number>

  constructor(nombre: string = NOMBRE_BASE) {
    super(nombre)
    this.version(1).stores({
      // Los indices son los que hacen falta para las consultas reales: por fecha (meses y
      // listados), por tipo y por categoria (resumenes, presupuestos y recurrentes).
      movimientos: '++id, fecha, tipo, categoria, concepto, [tipo+categoria]',
      categorias: '++id, nombre, ambito, activa, orden',
      cuentas: '++id, nombre, bloque, activa, orden',
      deudas: '++id, nombre, activa, compartida',
      fotos: '++id, fecha',
      presupuestos: '++id, categoria, activo',
      ajustes: 'clave',
      bitcoin: '++id, fecha',
    })
  }
}

export const db = new BaseOikos()
