import { useMemo, useState } from 'react'
import { Tarjeta } from '../components/Tarjeta'
import { AYUDA, buscaEnAyuda, TEMAS } from '../datos/ayuda'
import type { PropsPantalla } from '../navegacion'

export function Ayuda({ nav }: PropsPantalla) {
  const [busqueda, setBusqueda] = useState('')
  const [tema, setTema] = useState<string>('')

  const resultados = useMemo(() => buscaEnAyuda(busqueda), [busqueda])
  const visibles = useMemo(
    () => (tema ? resultados.filter((entrada) => entrada.tema === tema) : resultados),
    [resultados, tema],
  )

  const porTema = useMemo(() => {
    const grupos = new Map<string, typeof visibles>()
    for (const entrada of visibles) {
      const lista = grupos.get(entrada.tema)
      if (lista) lista.push(entrada)
      else grupos.set(entrada.tema, [entrada])
    }
    return [...grupos.entries()]
  }, [visibles])

  const temasDisponibles = useMemo(
    () => TEMAS.filter((nombre) => resultados.some((entrada) => entrada.tema === nombre)),
    [resultados],
  )

  return (
    <div>
      <Tarjeta>
        <div className="campo" style={{ marginBottom: 10 }}>
          <input
            className="entrada"
            type="search"
            value={busqueda}
            placeholder="Buscar: inversión, copia, deuda, cintura…"
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={tema === ''} onClick={() => setTema('')}>
            Todo ({resultados.length})
          </button>
          {temasDisponibles.map((nombre) => (
            <button
              key={nombre}
              type="button"
              className="chip"
              aria-pressed={tema === nombre}
              onClick={() => setTema(nombre)}
            >
              {nombre}
            </button>
          ))}
        </div>
      </Tarjeta>

      {visibles.length === 0 ? (
        <Tarjeta>
          <p className="vacio">
            No hay nada que responda a «{busqueda}».
            <br />
            <span className="texto-tenue">
              Prueba con una palabra suelta: copia, deuda, media, presupuesto, invertir.
            </span>
          </p>
        </Tarjeta>
      ) : (
        porTema.map(([nombreTema, entradas]) => (
          <Tarjeta key={nombreTema} titulo={nombreTema} sinRelleno>
            <div className="lista">
              {entradas.map((entrada) => (
                <details key={entrada.pregunta} style={{ borderBottom: '1px solid var(--borde)' }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      padding: '12px 14px',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                    }}
                  >
                    {entrada.pregunta}
                  </summary>
                  <p className="texto-suave" style={{ padding: '0 14px 14px', margin: 0 }}>
                    {entrada.respuesta}
                  </p>
                </details>
              ))}
            </div>
          </Tarjeta>
        ))
      )}

      <Tarjeta>
        <p className="texto-suave" style={{ marginBottom: 10 }}>
          ¿Falta algo? Si te surge una duda que no está aquí, dímela y la añado: la ayuda debería
          responder a lo que de verdad se pregunta.
        </p>
        <button type="button" className="boton boton--ancho" onClick={() => nav.volver()}>
          Volver
        </button>
        <p className="texto-tenue" style={{ marginBottom: 0, marginTop: 10 }}>
          {AYUDA.length} preguntas con respuesta.
        </p>
      </Tarjeta>
    </div>
  )
}
