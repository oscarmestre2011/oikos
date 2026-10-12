import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Ajustes } from './screens/Ajustes'
import { Apuntar } from './screens/Apuntar'
import { Ayuda } from './screens/Ayuda'
import { Bienvenida } from './screens/Bienvenida'
import { Inicio } from './screens/Inicio'
import { Mes } from './screens/Mes'
import { Movimientos } from './screens/Movimientos'
import { Patrimonio } from './screens/Patrimonio'
import { Presupuestos } from './screens/Presupuestos'
import { db } from './db'
import { escribeAjuste } from './db/repository'
import { hoyISO } from './lib/fechas'
import { PESTANAS, TITULOS, type Navegacion, type OpcionesNavegacion, type Pantalla } from './navegacion'

interface Entrada {
  pantalla: Pantalla
  opciones: OpcionesNavegacion
}

/** Espera a que la base este consultable, para no enseñar un parpadeo de "no hay datos". */
function useBaseLista(): boolean {
  const marca = useLiveQuery(() => db.ajustes.get('versionSemilla'), [])
  return marca !== undefined
}

/**
 * El armazon de la app: cabecera, pantalla actual y barra de abajo.
 *
 * La navegacion es una pila propia (sin libreria de rutas): en una app de tres pantallas,
 * meter react-router solo añade peso, y ademas asi se controla exactamente que pasa al
 * pulsar "atras" en el movil, que es donde estas librerias dan sorpresas.
 */
export function App() {
  const [pila, setPila] = useState<Entrada[]>([{ pantalla: 'inicio', opciones: {} }])
  const [hoy, setHoy] = useState(hoyISO())
  const [actualizarVersion, setActualizarVersion] = useState<null | (() => void)>(null)
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null)
  const baseLista = useBaseLista()
  const bienvenidaVista = useLiveQuery(() => db.ajustes.get('bienvenidaVista'), [])

  const actual = pila[pila.length - 1]

  const ir = useCallback((pantalla: Pantalla, opciones: OpcionesNavegacion = {}) => {
    // Cada pantalla que se apila añade una entrada al HISTORIAL del navegador. Sin esto, el
    // gesto de retroceso del móvil (o el botón atrás) sacaría al usuario de la app en lugar de
    // volver a la pantalla anterior. El `pushState` va AQUÍ y no dentro del `setPila`: React en
    // modo estricto ejecuta dos veces las funciones de actualización, y se duplicarían entradas.
    window.history.pushState({ oikos: pantalla }, '')
    setPila((anterior) => [...anterior, { pantalla, opciones }])
  }, [])

  const volver = useCallback(() => {
    // Se apoya en el historial (`back`) para que la pila y el historial no se separen: si se
    // cambiara la pila por un lado y el historial por otro, el botón atrás acabaría sacando de
    // la app. Si no hay ninguna entrada nuestra (primera pantalla), se hace a mano.
    if (window.history.state?.oikos) window.history.back()
    else setPila((anterior) => (anterior.length > 1 ? anterior.slice(0, -1) : anterior))
  }, [])

  const irARaiz = useCallback((pantalla: Pantalla) => {
    // `replaceState` y no `pushState`: volver a una pestaña reinicia la pila a un solo elemento,
    // así que el historial tampoco debe crecer.
    window.history.replaceState({ oikos: pantalla }, '')
    setPila([{ pantalla, opciones: {} }])
  }, [])

  useEffect(() => {
    // El gesto de retroceso del móvil y el botón atrás del navegador llegan aquí.
    const alRetroceder = () => {
      setPila((anterior) => (anterior.length > 1 ? anterior.slice(0, -1) : anterior))
    }
    window.addEventListener('popstate', alRetroceder)
    return () => window.removeEventListener('popstate', alRetroceder)
  }, [])

  useEffect(() => {
    // Si la app se queda abierta toda la noche, al volver hay que refrescar "hoy".
    const alVolver = () => setHoy(hoyISO())
    document.addEventListener('visibilitychange', alVolver)
    return () => document.removeEventListener('visibilitychange', alVolver)
  }, [])

  useEffect(() => {
    const alHaberVersion = (suceso: Event) => {
      const detalle = (suceso as CustomEvent<{ actualizar: () => void }>).detail
      setActualizarVersion(() => detalle.actualizar)
    }
    window.addEventListener('oikos:version-nueva', alHaberVersion)
    return () => window.removeEventListener('oikos:version-nueva', alHaberVersion)
  }, [])

  const nav: Navegacion = {
    ir,
    volver,
    irARaiz,
    puedeVolver: pila.length > 1,
    opciones: actual.opciones,
  }

  if (!baseLista) {
    return (
      <div className="cargando">
        <p>Preparando tus cuentas…</p>
      </div>
    )
  }

  // Primera vez que se abre: se explica que es y de donde salen los datos que trae dentro.
  if (!bienvenidaVista?.valor) {
    return (
      <Bienvenida
        onEmpezar={async (destino) => {
          await escribeAjuste('bienvenidaVista', new Date().toISOString())
          setPila([{ pantalla: destino, opciones: {} }])
        }}
      />
    )
  }

  const props = { nav, hoy }

  return (
    <div className="app">
      <header className="cabecera">
        {nav.puedeVolver && (
          <button type="button" className="boton boton--pequeno" onClick={volver} aria-label="Volver">
            ←
          </button>
        )}
        {!nav.puedeVolver && <img className="cabecera__marca" src="./logo-mark.png" alt="" />}
        <h1 className="cabecera__titulo">
          {TITULOS[actual.pantalla]}
          {actual.pantalla === 'inicio' && <span className="cabecera__subtitulo">Tus cuentas, en tu móvil</span>}
        </h1>
      </header>

      {actualizarVersion && (
        <div style={{ padding: '10px 14px 0' }}>
          <div className="aviso aviso--atencion" role="status">
            <span className="aviso__icono" aria-hidden="true">
              🔄
            </span>
            <div>
              Hay una versión nueva.{' '}
              <button
                type="button"
                className="tarjeta__accion"
                onClick={() => {
                  actualizarVersion()
                  setActualizarVersion(null)
                }}
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {errorGlobal && (
        <div style={{ padding: '10px 14px 0' }}>
          <div className="aviso aviso--peligro" role="alert">
            <span className="aviso__icono" aria-hidden="true">
              ⛔
            </span>
            <div>{errorGlobal}</div>
          </div>
        </div>
      )}

      <main className="contenido">
        <Pantalla
          entrada={actual}
          props={props}
          onError={(mensaje) => {
            setErrorGlobal(mensaje)
            window.setTimeout(() => setErrorGlobal(null), 6000)
          }}
        />
      </main>

      <nav className="barra-inferior" aria-label="Secciones">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.pantalla}
            type="button"
            className="barra-inferior__boton"
            aria-current={actual.pantalla === pestana.pantalla ? 'page' : undefined}
            onClick={() => irARaiz(pestana.pantalla)}
          >
            <span className="barra-inferior__icono" aria-hidden="true">
              {pestana.icono}
            </span>
            {pestana.etiqueta}
          </button>
        ))}
      </nav>
    </div>
  )
}

interface PropsPantallaActual {
  entrada: Entrada
  props: { nav: Navegacion; hoy: string }
  onError: (mensaje: string) => void
}

function Pantalla({ entrada, props, onError }: PropsPantallaActual) {
  switch (entrada.pantalla) {
    case 'inicio':
      return <Inicio {...props} />
    case 'apuntar':
      return <Apuntar {...props} onError={onError} />
    case 'mes':
      return <Mes {...props} />
    case 'movimientos':
      return <Movimientos {...props} />
    case 'patrimonio':
      return <Patrimonio {...props} onError={onError} />
    case 'presupuestos':
      return <Presupuestos {...props} />
    case 'ajustes':
      return <Ajustes {...props} onError={onError} />
    case 'ayuda':
      return <Ayuda {...props} />
  }
}
