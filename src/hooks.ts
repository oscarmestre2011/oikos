/**
 * Consultas reactivas a la base.
 *
 * Dexie ofrece `useLiveQuery`, que vuelve a dibujar la pantalla sola cuando cambian los
 * datos. Aqui se envuelve para tener un sitio unico donde poner el valor por defecto
 * (`[]`) mientras la consulta no ha terminado: si se devolviera `undefined`, cada pantalla
 * tendria que acordarse de comprobarlo, y la que se olvidara reventaria al abrir.
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Ajuste, Categoria, CompraBitcoin, Cuenta, Deuda, FotoPatrimonio, Movimiento, Presupuesto } from './types'

const VACIO: never[] = []

export function useMovimientos(): Movimiento[] {
  return useLiveQuery(() => db.movimientos.toArray(), [], VACIO) as Movimiento[]
}

export function useCategorias(): Categoria[] {
  return useLiveQuery(() => db.categorias.orderBy('orden').toArray(), [], VACIO) as Categoria[]
}

export function useCuentas(): Cuenta[] {
  return useLiveQuery(() => db.cuentas.orderBy('orden').toArray(), [], VACIO) as Cuenta[]
}

export function useDeudas(): Deuda[] {
  return useLiveQuery(() => db.deudas.toArray(), [], VACIO) as Deuda[]
}

export function useFotos(): FotoPatrimonio[] {
  return useLiveQuery(() => db.fotos.orderBy('fecha').toArray(), [], VACIO) as FotoPatrimonio[]
}

export function usePresupuestos(): Presupuesto[] {
  return useLiveQuery(() => db.presupuestos.toArray(), [], VACIO) as Presupuesto[]
}

export function useComprasBitcoin(): CompraBitcoin[] {
  return useLiveQuery(() => db.bitcoin.orderBy('fecha').toArray(), [], VACIO) as CompraBitcoin[]
}

/** Todos los ajustes como objeto `clave -> valor`. */
export function useAjustes(): Record<string, string> {
  return useLiveQuery(async () => {
    const lista = (await db.ajustes.toArray()) as Ajuste[]
    return Object.fromEntries(lista.map((a) => [a.clave, a.valor]))
  }, [], {}) as Record<string, string>
}

/** Un ajuste numerico, con valor por defecto mientras carga. */
export function useAjusteNumero(clave: string, porDefecto: number): number {
  const ajustes = useAjustes()
  const valor = ajustes[clave]
  if (valor === undefined) return porDefecto
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : porDefecto
}

/** Un ajuste de texto. */
export function useAjuste(clave: string, porDefecto = ''): string {
  const ajustes = useAjustes()
  return ajustes[clave] ?? porDefecto
}
