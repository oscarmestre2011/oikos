interface Punto {
  /** Etiqueta del eje X (normalmente 'sep 26'). */
  etiqueta: string
  valor: number
}

interface PropsGrafica {
  puntos: Punto[]
  /** Cuantos puntos se enseñan como maximo (se cogen los ultimos). */
  maximo?: number
  /** Texto del valor para el tooltip accesible. */
  formatea?: (valor: number) => string
  /** Dibuja una linea roja discontinua en el cero (patrimonio negativo). */
  marcarCero?: boolean
  /** Etiqueta para lectores de pantalla. */
  titulo: string
}

const ANCHO = 320
const ALTO = 148
const MARGEN = { arriba: 14, derecha: 10, abajo: 22, izquierda: 40 }

/**
 * Grafica de linea en SVG, sin librerias.
 *
 * Se dibuja a mano a proposito: una libreria de graficas pesa mas que toda la app junta y
 * para una linea con sus etiquetas no hace falta. El SVG se estira al ancho del movil
 * (`viewBox` + `width: 100%`), asi que se ve bien en cualquier pantalla.
 */
export function Grafica({ puntos, maximo = 24, formatea, marcarCero = false, titulo }: PropsGrafica) {
  const visibles = puntos.slice(-maximo)
  if (visibles.length < 2) {
    return <p className="texto-suave">Hacen falta al menos dos fotos para dibujar la evolución.</p>
  }

  const valores = visibles.map((p) => p.valor)
  const minimoReal = Math.min(...valores)
  const maximoReal = Math.max(...valores)
  const base = marcarCero ? Math.min(0, minimoReal) : minimoReal
  const tope = Math.max(maximoReal, base + 1)

  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo

  const x = (indice: number) =>
    MARGEN.izquierda + (visibles.length === 1 ? anchoUtil / 2 : (indice / (visibles.length - 1)) * anchoUtil)
  const y = (valor: number) => MARGEN.arriba + altoUtil - ((valor - base) / (tope - base)) * altoUtil

  const linea = visibles.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.valor).toFixed(1)}`).join(' ')
  const area = `${linea} L ${x(visibles.length - 1).toFixed(1)} ${(MARGEN.arriba + altoUtil).toFixed(1)} L ${x(0).toFixed(1)} ${(MARGEN.arriba + altoUtil).toFixed(1)} Z`

  const formato = formatea ?? ((v: number) => String(Math.round(v)))
  const etiquetas = [tope, (tope + base) / 2, base]

  return (
    <svg className="grafica" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={titulo}>
      {etiquetas.map((valor) => (
        <g key={valor}>
          <line
            className="grafica__rejilla"
            x1={MARGEN.izquierda}
            x2={ANCHO - MARGEN.derecha}
            y1={y(valor)}
            y2={y(valor)}
          />
          <text className="grafica__texto" x={MARGEN.izquierda - 4} y={y(valor) + 3} textAnchor="end">
            {formato(valor)}
          </text>
        </g>
      ))}

      {marcarCero && base < 0 && (
        <line
          className="grafica__cero"
          x1={MARGEN.izquierda}
          x2={ANCHO - MARGEN.derecha}
          y1={y(0)}
          y2={y(0)}
        />
      )}

      <path className="grafica__area" d={area} />
      <path className="grafica__linea" d={linea} />

      <circle className="grafica__punto" cx={x(visibles.length - 1)} cy={y(visibles[visibles.length - 1].valor)} r={3.5} />

      <text className="grafica__texto" x={MARGEN.izquierda} y={ALTO - 6}>
        {visibles[0].etiqueta}
      </text>
      <text className="grafica__texto" x={ANCHO - MARGEN.derecha} y={ALTO - 6} textAnchor="end">
        {visibles[visibles.length - 1].etiqueta}
      </text>
    </svg>
  )
}
