import { formateaImporte } from '../lib/dinero'

interface PropsTeclado {
  /** Lo que se lleva tecleado, como texto ("12,5"). Cadena vacia = nada. */
  valor: string
  onCambio: (valor: string) => void
}

const MAX_ENTERO = 8

/**
 * Teclado numerico propio, en lugar del teclado del sistema.
 *
 * Motivo: en el movil, el teclado del sistema tapa media pantalla, cambia de sitio segun el
 * telefono y muchas veces no ofrece la coma. Con este, apuntar un gasto son tres toques
 * siempre iguales, sin mirar. Ademas acepta coma o punto indistintamente, sin pelearse con
 * la configuracion regional del movil.
 */
export function Teclado({ valor, onCambio }: PropsTeclado) {
  const teclear = (tecla: string) => {
    if (tecla === 'borrar') {
      onCambio(valor.slice(0, -1))
      return
    }

    if (tecla === ',') {
      if (valor.includes(',')) return
      onCambio(valor === '' ? '0,' : `${valor},`)
      return
    }

    // Un digito mas.
    const [entero, decimales] = valor.split(',')
    if (decimales !== undefined) {
      // Ya hay coma: como mucho dos decimales.
      if (decimales.length >= 2) return
      onCambio(`${entero},${decimales}${tecla}`)
      return
    }
    // Sin coma: se evita el "0" a la izquierda ("01" no es un importe).
    if (entero === '0') {
      onCambio(tecla)
      return
    }
    if (entero.length >= MAX_ENTERO) return
    onCambio(`${entero}${tecla}`)
  }

  const moneda = valor === '' ? 0 : Number(valor.replace(',', '.'))
  const vista = valor === '' ? '0' : valor

  return (
    <div>
      <div className="pantalla-importe">
        <span
          className={valor === '' ? 'pantalla-importe__valor pantalla-importe__vacio' : 'pantalla-importe__valor'}
          aria-live="polite"
          aria-label={`Importe: ${formateaImporte(Number.isFinite(moneda) ? moneda : 0)}`}
        >
          {vista}
        </span>
        <span className="pantalla-importe__moneda">€</span>
      </div>

      <div className="teclado">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((tecla) => (
          <button key={tecla} type="button" className="teclado__tecla" onClick={() => teclear(tecla)}>
            {tecla}
          </button>
        ))}
        <button type="button" className="teclado__tecla" onClick={() => teclear(',')} aria-label="Coma decimal">
          ,
        </button>
        <button type="button" className="teclado__tecla" onClick={() => teclear('0')}>
          0
        </button>
        <button
          type="button"
          className="teclado__tecla teclado__tecla--accion"
          onClick={() => teclear('borrar')}
          aria-label="Borrar"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
