/**
 * Los tipos de la navegacion, en su propio fichero.
 *
 * Estan aqui (y no en App.tsx) para que las pantallas puedan importarlos sin crear un ciclo
 * de importaciones con el componente que las dibuja.
 */

import type { Movimiento } from './types'

export type Pantalla =
  | 'inicio'
  | 'apuntar'
  | 'mes'
  | 'movimientos'
  | 'patrimonio'
  | 'presupuestos'
  | 'ajustes'
  | 'ayuda'

/** Datos que se le pasan a una pantalla al abrirla. */
export interface OpcionesNavegacion {
  /** Mes concreto que se quiere ver ('2026-04'). */
  mes?: string
  /** Movimiento que se va a editar (si se llega desde la lista). */
  movimiento?: Movimiento
}

export interface Navegacion {
  ir: (pantalla: Pantalla, opciones?: OpcionesNavegacion) => void
  volver: () => void
  /** Ir a una pantalla de la barra de abajo, reiniciando el historial. */
  irARaiz: (pantalla: Pantalla) => void
  puedeVolver: boolean
  opciones: OpcionesNavegacion
}

/** Lo que recibe toda pantalla. */
export interface PropsPantalla {
  nav: Navegacion
  /** Fecha de hoy, para poder decir "Hoy"/"Ayer" y prorratear el mes. */
  hoy: string
}

export const TITULOS: Record<Pantalla, string> = {
  inicio: 'Oikos',
  apuntar: 'Apuntar',
  mes: 'El mes',
  movimientos: 'Movimientos',
  patrimonio: 'Patrimonio',
  presupuestos: 'Presupuestos',
  ajustes: 'Ajustes',
  ayuda: 'Ayuda',
}

/** Las cinco pestanas de la barra de abajo. */
export const PESTANAS: { pantalla: Pantalla; etiqueta: string; icono: string }[] = [
  { pantalla: 'inicio', etiqueta: 'Inicio', icono: '🏠' },
  { pantalla: 'apuntar', etiqueta: 'Apuntar', icono: '✏️' },
  { pantalla: 'mes', etiqueta: 'El mes', icono: '📅' },
  { pantalla: 'patrimonio', etiqueta: 'Patrimonio', icono: '📈' },
  { pantalla: 'ajustes', etiqueta: 'Ajustes', icono: '⚙️' },
]
