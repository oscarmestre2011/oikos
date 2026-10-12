import type { ReactNode } from 'react'

type Tono = 'info' | 'atencion' | 'peligro' | 'bien'

const ICONOS: Record<Tono, string> = {
  info: 'ℹ️',
  atencion: '⚠️',
  peligro: '⛔',
  bien: '✅',
}

interface PropsAviso {
  tono?: Tono
  children: ReactNode
  /** Permite cambiar el icono por defecto. */
  icono?: string
}

/**
 * Un aviso dentro de una pantalla.
 *
 * `role="status"` en los avisos que no son de peligro: los lectores de pantalla los leen
 * sin interrumpir. Los de peligro llevan `role="alert"`, que si interrumpe, porque un
 * patrimonio en negativo o un presupuesto pasado merecen la interrupcion.
 */
export function Aviso({ tono = 'info', children, icono }: PropsAviso) {
  return (
    <div className={`aviso aviso--${tono}`} role={tono === 'peligro' ? 'alert' : 'status'}>
      <span className="aviso__icono" aria-hidden="true">
        {icono ?? ICONOS[tono]}
      </span>
      <div>{children}</div>
    </div>
  )
}
