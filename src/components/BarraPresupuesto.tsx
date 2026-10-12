import { formateaImporte, formateaPorcentaje } from '../lib/dinero'
import type { ComparativaPresupuesto } from '../types'

interface PropsBarraPresupuesto {
  comparativa: ComparativaPresupuesto
  /** Cuantos dias del mes llevan pasados, para poder decir el ritmo. */
  nota?: string
}

const SINONIMOS = {
  holgado: 'vas bien',
  ajustado: 'ojo, casi',
  pasado: 'te has pasado',
} as const

/**
 * Una barra de presupuesto consumido.
 *
 * Se limita el ancho de la barra al 100% aunque el gasto se pase: una barra que se sale del
 * marco se ve como un error de la app. El porcentaje real si se escribe, asi que pasar del
 * tope se entiende igual.
 */
export function BarraPresupuesto({ comparativa, nota }: PropsBarraPresupuesto) {
  const { categoria, presupuesto, gastado, restante, porcentaje, estado } = comparativa
  const ancho = Math.min(100, Math.max(0, porcentaje))

  return (
    <div className="fila-barra">
      <div className="fila-barra__cabeza">
        <span>{categoria}</span>
        <span className="fila-barra__importe">
          {formateaImporte(gastado)} <span className="texto-tenue">/ {formateaImporte(presupuesto)}</span>
        </span>
      </div>
      <div className="barra">
        <div className={`barra__relleno barra__relleno--${estado}`} style={{ width: `${ancho}%` }} />
      </div>
      <div className="fila-barra__nota">
        {formateaPorcentaje(porcentaje)} · {SINONIMOS[estado]}
        {restante >= 0
          ? ` · te quedan ${formateaImporte(restante)}`
          : ` · te has pasado ${formateaImporte(Math.abs(restante))}`}
        {nota ? ` · ${nota}` : ''}
      </div>
    </div>
  )
}
