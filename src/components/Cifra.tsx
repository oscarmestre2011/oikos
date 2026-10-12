interface PropsCifra {
  valor: string
  etiqueta?: string
  /** Color del numero. `auto` lo pinta verde si es positivo y rojo si es negativo. */
  tono?: 'normal' | 'positiva' | 'negativa' | 'dorada' | 'auto'
  tamano?: 'normal' | 'mediana' | 'pequena'
}

/** Un numero grande con su etiqueta debajo. Es la pieza con la que se lee la app. */
export function Cifra({ valor, etiqueta, tono = 'normal', tamano = 'normal' }: PropsCifra) {
  const clases = ['cifra']
  if (tamano === 'mediana') clases.push('cifra--mediana')
  if (tamano === 'pequena') clases.push('cifra--pequena')

  const esNegativo = valor.trim().startsWith('-')
  if (tono === 'auto') {
    clases.push(esNegativo ? 'cifra--negativa' : 'cifra--positiva')
  } else if (tono !== 'normal') {
    clases.push(`cifra--${tono}`)
  }

  return (
    <div>
      <span className={clases.join(' ')}>{valor}</span>
      {etiqueta && <span className="cifra__etiqueta">{etiqueta}</span>}
    </div>
  )
}
