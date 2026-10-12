import { formateaImporte } from '../lib/dinero'
import { etiquetaDia } from '../lib/fechas'
import type { Movimiento, TipoMovimiento } from '../types'

export const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  inversion: 'Inversión',
  amortizacion: 'Amortización',
}

export const ICONO_TIPO: Record<TipoMovimiento, string> = {
  ingreso: '↑',
  gasto: '↓',
  inversion: '🏦',
  amortizacion: '🏠',
}

/**
 * El signo con el que se enseña cada tipo.
 *
 * Invertir y amortizar llevan flecha en vez de signo a proposito: no son ni un ingreso ni
 * un gasto, son dinero que cambia de sitio. Ponerles un "-" los haria parecer un gasto, y
 * justo eso es lo que hacia el excel de partida.
 */
export const SIGNO_TIPO: Record<TipoMovimiento, string> = {
  ingreso: '+',
  gasto: '−',
  inversion: '→',
  amortizacion: '→',
}

interface PropsFilaMovimiento {
  movimiento: Movimiento
  /** Fecha de hoy, para poder decir "Hoy" o "Ayer" (se pasa para poder probarlo). */
  hoy?: string
  onPulsar?: (movimiento: Movimiento) => void
}

export function FilaMovimiento({ movimiento, hoy, onPulsar }: PropsFilaMovimiento) {
  const detalle = [movimiento.categoria, movimiento.cuenta].filter(Boolean).join(' · ')
  const Etiqueta = onPulsar ? 'button' : 'div'

  return (
    <Etiqueta
      className="fila"
      {...(onPulsar ? { type: 'button' as const, onClick: () => onPulsar(movimiento) } : {})}
    >
      <span className={`fila__importe fila__importe--${movimiento.tipo}`} aria-hidden="true">
        {SIGNO_TIPO[movimiento.tipo]}
      </span>
      <span className="fila__principal">
        <span className="fila__titulo">{movimiento.concepto || movimiento.categoria}</span>
        <span className="fila__detalle">
          {detalle}
          {hoy ? ` · ${etiquetaDia(movimiento.fecha, hoy)}` : ` · ${movimiento.fecha}`}
        </span>
      </span>
      <span className={`fila__importe fila__importe--${movimiento.tipo}`}>
        {formateaImporte(movimiento.importe)}
      </span>
    </Etiqueta>
  )
}
