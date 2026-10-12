import { Tarjeta } from '../components/Tarjeta'
import { DATOS_DE_PARTIDA } from '../db/repository'
import type { Pantalla } from '../navegacion'

interface Props {
  onEmpezar: (destino: Pantalla) => void | Promise<void>
}

/**
 * La pantalla que se ve UNA sola vez, la primera vez que se abre la app.
 *
 * Explica tres cosas: que hace la app, que **arranca vacía a propósito** (y por qué), y cómo se
 * cargan los datos de cada uno. La tercera es la mas importante desde que la app se publica:
 * antes el historico de Oscar viajaba dentro del codigo, y eso lo puso en un repositorio publico.
 * Ahora los datos se importan desde un archivo que no sale de sus dispositivos.
 */
export function Bienvenida({ onEmpezar }: Props) {
  return (
    <div className="app">
      <main className="contenido" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <img src="./logo-mark-grande.png" alt="" style={{ width: 96, height: 96 }} />
          <h1 style={{ fontSize: '1.8rem', margin: '6px 0 0' }}>Oikos</h1>
          <p className="texto-suave" style={{ marginTop: 4 }}>
            Tus cuentas, en tu móvil.
          </p>
        </div>

        <Tarjeta>
          <p style={{ marginTop: 0 }}>
            Aquí apuntas <strong>lo que entra y lo que sale</strong> para ver en qué se te va el dinero,
            y además llevas la <strong>foto mensual de tu patrimonio</strong>, que es lo que hacías en el
            Excel.
          </p>
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Invertir y amortizar hipoteca <strong>no cuentan como gasto</strong>: ese dinero no se va,
            cambia de sitio. Separarlo es lo que hace que el resumen del mes diga la verdad.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Arranca vacía, y es a propósito">
          <p className="texto-suave" style={{ marginTop: 0 }}>
            La app trae lo justo para funcionar —{DATOS_DE_PARTIDA.categorias} categorías y{' '}
            {DATOS_DE_PARTIDA.cuentas} cuentas genéricas— y <strong>ninguna cifra tuya</strong>. No es un
            olvido: esta app se publica en internet, y si llevara dentro tus saldos, tu nómina o tu
            hipoteca, los estaría publicando con ella.
          </p>
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Tus datos viajan aparte, en un archivo tuyo, y entran cuando tú quieras.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Cómo cargar tu histórico">
          <ol style={{ paddingLeft: 20, margin: '0 0 10px' }}>
            <li>
              Ten a mano el archivo <code>{DATOS_DE_PARTIDA.archivoDeCopia}</code> (te lo paso yo, y
              conviene que lo guardes en el móvil y en algún sitio más).
            </li>
            <li>
              Ve a <strong>Ajustes → Copia de seguridad → Importar una copia</strong>.
            </li>
            <li>
              Elige <strong>Reemplazar todo por la copia</strong> y selecciona el archivo.
            </li>
          </ol>
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            Tarda un segundo y deja dentro tus cuentas con sus valores, tus movimientos, tus deudas y
            tus compras de Bitcoin. Si no tienes el archivo, también puedes empezar de cero y apuntar
            tus propias cuentas: se crean en Ajustes.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Tus datos no salen de aquí">
          <p className="texto-suave" style={{ marginTop: 0, marginBottom: 0 }}>
            <strong>Sin cuenta, sin nube y sin publicidad.</strong> Todo se guarda en este móvil y funciona
            sin cobertura. Nadie más ve tus cuentas. A cambio, si borras los datos del navegador se
            pierden: por eso la app te recuerda hacer copia, y la copia se comparte fuera del móvil.
          </p>
        </Tarjeta>

        <button
          type="button"
          className="boton boton--principal boton--ancho"
          onClick={() => onEmpezar('ajustes')}
        >
          📥 Cargar mi histórico
        </button>
        <button
          type="button"
          className="boton boton--ancho"
          style={{ marginTop: 10 }}
          onClick={() => onEmpezar('apuntar')}
        >
          ✏️ Empezar apuntando un gasto
        </button>
        <button
          type="button"
          className="boton boton--ancho"
          style={{ marginTop: 10 }}
          onClick={() => onEmpezar('inicio')}
        >
          Entrar en la app
        </button>

        <p className="texto-tenue" style={{ textAlign: 'center', marginTop: 14 }}>
          Esta pantalla solo se ve una vez. Está todo explicado en Ajustes → Ayuda.
        </p>
      </main>
    </div>
  )
}
