import { useMemo, useState } from 'react'
import { BarraPresupuesto } from '../components/BarraPresupuesto'
import { Cifra } from '../components/Cifra'
import { Tarjeta } from '../components/Tarjeta'
import { borraPresupuesto, guardaPresupuesto } from '../db/repository'
import { useCategorias, useMovimientos, usePresupuestos } from '../hooks'
import { formateaImporte, parseaImporte, redondea } from '../lib/dinero'
import { mesDe, nombreMes } from '../lib/fechas'
import { calculaPresupuestos, compararConMedia } from '../lib/resumen'
import type { PropsPantalla } from '../navegacion'
import type { Presupuesto } from '../types'

export function Presupuestos({ hoy }: PropsPantalla) {
  const movimientos = useMovimientos()
  const categorias = useCategorias()
  const presupuestos = usePresupuestos()
  const [error, setError] = useState<string | null>(null)

  const mes = mesDe(hoy)
  const delMes = useMemo(() => calculaPresupuestos(movimientos, presupuestos, mes), [movimientos, presupuestos, mes])
  const comparativa = useMemo(() => compararConMedia(movimientos, mes, hoy), [movimientos, mes, hoy])
  const medias = useMemo(
    () => new Map(comparativa.map((c) => [c.categoria, c.media])),
    [comparativa],
  )

  const gasto = categorias.filter((c) => c.ambito === 'gasto' && c.activa)

  const totalPresupuestado = redondea(presupuestos.filter((p) => p.activo).reduce((t, p) => t + p.importe, 0))
  const totalGastado = redondea(delMes.reduce((t, p) => t + p.gastado, 0))

  const guardar = async (categoria: string, texto: string) => {
    const existente = presupuestos.find((p) => p.categoria === categoria)
    const importe = texto.trim() === '' ? 0 : parseaImporte(texto)

    if (importe === null) {
      setError(`El presupuesto de "${categoria}" no se entiende.`)
      return
    }
    setError(null)

    try {
      if (importe <= 0) {
        // Vaciar el campo quita el presupuesto: es la forma natural de deshacerlo.
        if (existente?.id) await borraPresupuesto(existente.id)
        return
      }
      const nuevo: Presupuesto = {
        categoria,
        importe: Math.abs(importe),
        activo: true,
        ...(existente?.id ? { id: existente.id } : {}),
      }
      await guardaPresupuesto(nuevo)
    } catch (fallo) {
      setError(`No se pudo guardar: ${(fallo as Error).message}`)
    }
  }

  return (
    <div>
      <Tarjeta destacada>
        <span className="cifra__etiqueta">{nombreMes(mes)}</span>
        <Cifra valor={formateaImporte(totalGastado)} etiqueta={`Gastado de ${formateaImporte(totalPresupuestado)} presupuestado`} />
        {totalPresupuestado > 0 && (
          <div className="barra" style={{ marginTop: 12 }}>
            <div
              className={`barra__relleno ${
                totalGastado >= totalPresupuestado ? 'barra__relleno--pasado' : ''
              }`}
              style={{ width: `${Math.min(100, (totalGastado / totalPresupuestado) * 100)}%` }}
            />
          </div>
        )}
      </Tarjeta>

      {totalPresupuestado === 0 && (
        <Tarjeta>
          <p className="texto-suave">
            Todavía no has puesto ningún tope. Escribe una cantidad en la categoría que quieras vigilar y
            la app te avisará al llegar al 80 % y al pasarte. Donde no pongas nada, no avisa.
          </p>
        </Tarjeta>
      )}

      {error && (
        <div className="aviso aviso--peligro" role="alert">
          <span className="aviso__icono" aria-hidden="true">
            ⛔
          </span>
          <div>{error}</div>
        </div>
      )}

      {delMes.length > 0 && (
        <Tarjeta titulo="Cómo vas este mes" sinRelleno>
          <div className="lista">
            {delMes.map((linea) => (
              <BarraPresupuesto key={linea.categoria} comparativa={linea} />
            ))}
          </div>
        </Tarjeta>
      )}

      <Tarjeta titulo="Topes por categoría">
        <p className="texto-tenue" style={{ marginTop: 0 }}>
          Deja el campo vacío para no vigilar esa categoría. La media es la de los meses anteriores,
          que sirve de referencia para saber qué tope tiene sentido.
        </p>
        {gasto.map((categoria) => (
          <FilaPresupuesto
            key={categoria.nombre}
            categoria={categoria.nombre}
            esencial={categoria.esencial}
            historica={categoria.historica}
            inicial={presupuestos.find((p) => p.categoria === categoria.nombre)?.importe ?? 0}
            media={medias.get(categoria.nombre) ?? 0}
            onGuardar={guardar}
          />
        ))}
      </Tarjeta>

      <Tarjeta titulo="Gastos que se repiten">
        <p className="texto-tenue" style={{ marginTop: 0 }}>
          Están en <strong>El mes → Gastos que se repiten</strong>, con el coste fijo mensual y anual ya
          sumado. Ahí se ve de un vistazo lo que cuestan las suscripciones sin tener que buscarlas.
        </p>
      </Tarjeta>
    </div>
  )
}

interface PropsFilaPresupuesto {
  categoria: string
  esencial: boolean
  historica: boolean
  inicial: number
  media: number
  onGuardar: (categoria: string, texto: string) => void
}

/**
 * Una fila con el tope de una categoria.
 *
 * El valor se guarda al salir del campo (y no con un boton "Guardar" general): en una lista
 * de veinte categorias, un boton unico obliga a rellenarlas todas antes de poder guardar
 * ninguna, y eso es justo lo que hace que nadie configure presupuestos.
 */
function FilaPresupuesto({ categoria, esencial, historica, inicial, media, onGuardar }: PropsFilaPresupuesto) {
  const [texto, setTexto] = useState(inicial > 0 ? String(inicial).replace('.', ',') : '')

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={`tope-${categoria}`}>
        {categoria}
        {esencial && <span className="etiqueta" style={{ marginLeft: 8 }}>esencial</span>}
        {!historica && <span className="etiqueta etiqueta--sugerida" style={{ marginLeft: 6 }}>sugerida</span>}
      </label>
      <div className="en-linea">
        <input
          id={`tope-${categoria}`}
          className="entrada"
          inputMode="decimal"
          placeholder="sin tope"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onBlur={() => onGuardar(categoria, texto)}
        />
        {media > 0 && <span className="texto-tenue" style={{ whiteSpace: 'nowrap' }}>media {formateaImporte(media)}</span>}
      </div>
    </div>
  )
}
