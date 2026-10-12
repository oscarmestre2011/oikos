import type { ReactNode } from 'react'

interface PropsTarjeta {
  titulo?: string
  /** Accion a la derecha del titulo (normalmente un boton pequeno). */
  accion?: ReactNode
  children: ReactNode
  /** Resalta la tarjeta con el degradado y el borde dorado. */
  destacada?: boolean
  /** Para listas: quita el relleno y recorta las esquinas. */
  sinRelleno?: boolean
  /** Texto pequeno al pie, separado por una linea. */
  pie?: ReactNode
}

export function Tarjeta({ titulo, accion, children, destacada, sinRelleno, pie }: PropsTarjeta) {
  const clases = ['tarjeta']
  if (destacada) clases.push('tarjeta--destacada')
  if (sinRelleno) clases.push('tarjeta--sin-relleno')
  return (
    <section className={clases.join(' ')}>
      {titulo && (
        <h2 className={accion ? 'tarjeta__titulo tarjeta__titulo--accion' : 'tarjeta__titulo'}>
          <span>{titulo}</span>
          {accion}
        </h2>
      )}
      {children}
      {pie && <div className="tarjeta__pie">{pie}</div>}
    </section>
  )
}
