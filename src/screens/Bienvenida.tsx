import { Tarjeta } from '../components/Tarjeta'
import { ORIGEN_HISTORICO } from '../db/repository'
import { formateaImporte } from '../lib/dinero'
import { formateaFecha } from '../lib/fechas'
import { CUENTAS_SEMILLA, FOTOS_SEMILLA, MOVIMIENTOS_SEMILLA } from '../datos/semilla'
import { DEUDAS_SEMILLA } from '../datos/catalogo'
import type { Pantalla } from '../navegacion'

interface Props {
  onEmpezar: (destino: Pantalla) => void | Promise<void>
}

/**
 * La pantalla que se ve UNA sola vez, la primera vez que se abre la app.
 *
 * Explica tres cosas, en este orden: que hace la app, que ya trae dentro el historico real
 * (para que nadie se asuste al ver datos que no ha metido), y donde viven los datos. La
 * tercera importa mas de lo que parece: quien instala algo desconocido quiere saber si sus
 * numeros de cuenta se van a algun sitio.
 */
export function Bienvenida({ onEmpezar }: Props) {
  const ultimaFoto = FOTOS_SEMILLA[FOTOS_SEMILLA.length - 1]
  const brutoUltima = ultimaFoto
    ? ultimaFoto.valores.reduce((total, valor) => total + valor.importe, 0)
    : 0
  const deuda = DEUDAS_SEMILLA.filter((d) => d.activa && !d.compartida).reduce((t, d) => t + d.saldo, 0)

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

        <Tarjeta titulo="Ya viene con tu histórico dentro">
          <p className="texto-suave" style={{ marginTop: 0 }}>
            No empiezas de cero. Se ha cargado lo que había en tu Excel y en tu registro de gastos:
          </p>
          <div className="rejilla rejilla--2">
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Fotos de patrimonio</span>
              <div className="cifra cifra--pequena">{ORIGEN_HISTORICO.fotos}</div>
              <span className="texto-tenue">
                {formateaFecha(ORIGEN_HISTORICO.primeraFoto)} → {formateaFecha(ORIGEN_HISTORICO.ultimaFoto)}
              </span>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Movimientos</span>
              <div className="cifra cifra--pequena">{ORIGEN_HISTORICO.movimientos}</div>
              <span className="texto-tenue">del Gastos 2026.csv</span>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Compras de Bitcoin</span>
              <div className="cifra cifra--pequena">{ORIGEN_HISTORICO.comprasBitcoin}</div>
              <span className="texto-tenue">{ORIGEN_HISTORICO.btcTotal} BTC</span>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Cuentas</span>
              <div className="cifra cifra--pequena">{CUENTAS_SEMILLA.filter((c) => c.activa).length}</div>
              <span className="texto-tenue">de {CUENTAS_SEMILLA.length} detectadas</span>
            </div>
          </div>
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            {MOVIMIENTOS_SEMILLA.length} movimientos · descuadres contra las fórmulas de tu Excel:{' '}
            {ORIGEN_HISTORICO.descuadresContraElExcel}
          </p>
        </Tarjeta>

        <Tarjeta titulo="Y con una corrección importante">
          <p className="texto-suave" style={{ marginTop: 0 }}>
            Tu Excel decía que tenías <strong>{formateaImporte(brutoUltima)}</strong> de patrimonio, pero no
            restaba ni una deuda. Con las tuyas ({formateaImporte(deuda)} solo de hipoteca, pignoración y
            Firefish), el patrimonio real es <strong>negativo</strong>.
          </p>
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Oikos sí las resta. El número duele, pero es el bueno: el otro te daba la parte buena y callaba
            la mala. Las deudas vienen de tu Plan de libertad financiera, y se corrigen en dos toques.
          </p>
        </Tarjeta>

        <Tarjeta titulo="Tus datos no salen de aquí">
          <p className="texto-suave" style={{ marginTop: 0, marginBottom: 0 }}>
            <strong>Sin cuenta, sin nube y sin publicidad.</strong> Todo se guarda en este móvil y funciona
            sin cobertura. Nadie más ve tus cuentas. A cambio, si borras los datos del navegador se pierden:
            por eso la app te recuerda hacer copia, y la copia se comparte fuera del móvil.
          </p>
        </Tarjeta>

        <button type="button" className="boton boton--principal boton--ancho" onClick={() => onEmpezar('apuntar')}>
          ✏️ Apuntar mi primer gasto
        </button>
        <button
          type="button"
          className="boton boton--ancho"
          style={{ marginTop: 10 }}
          onClick={() => onEmpezar('patrimonio')}
        >
          📈 Ver mi patrimonio
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
