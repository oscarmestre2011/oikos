import { useMemo } from 'react'
import { Aviso } from '../components/Aviso'
import { BarraPresupuesto } from '../components/BarraPresupuesto'
import { Cifra } from '../components/Cifra'
import { FilaMovimiento } from '../components/FilaMovimiento'
import { Tarjeta } from '../components/Tarjeta'
import { exportaCopia } from '../db/repository'
import {
  useAjusteNumero,
  useAjustes,
  useCuentas,
  useDeudas,
  useFotos,
  useMovimientos,
  usePresupuestos,
} from '../hooks'
import { comparteOFicha, nombreConFecha } from '../lib/descargas'
import { formateaImporte, formateaPorcentaje, redondea } from '../lib/dinero'
import { diasDelMes, diferenciaDias, formateaFecha, hoyISO, mesDe, nombreMes } from '../lib/fechas'
import { calculaPatrimonio, seriePatrimonio, ultimaFoto } from '../lib/patrimonio'
import { calculaPresupuestos, compararConMedia, resumenMes } from '../lib/resumen'
import type { PropsPantalla } from '../navegacion'

export function Inicio({ nav, hoy }: PropsPantalla) {
  const movimientos = useMovimientos()
  const cuentas = useCuentas()
  const deudas = useDeudas()
  const fotos = useFotos()
  const presupuestos = usePresupuestos()
  const ajustes = useAjustes()
  const objetivoInversion = useAjusteNumero('objetivoInversion', 200)
  const objetivoAmortizacion = useAjusteNumero('objetivoAmortizacion', 200)
  const copiaCadaDias = useAjusteNumero('copiaCadaDias', 7)

  const mes = mesDe(hoy)
  const resumen = useMemo(() => resumenMes(movimientos, mes, hoy), [movimientos, mes, hoy])
  const comparativa = useMemo(() => compararConMedia(movimientos, mes, hoy), [movimientos, mes, hoy])
  const seguimiento = useMemo(
    () => calculaPresupuestos(movimientos, presupuestos, mes).filter((p) => p.estado !== 'holgado'),
    [movimientos, presupuestos, mes],
  )
  const fotoActual = useMemo(() => ultimaFoto(fotos), [fotos])
  const patrimonio = useMemo(
    () => calculaPatrimonio(fotoActual ?? undefined, cuentas, deudas),
    [fotoActual, cuentas, deudas],
  )
  const serie = useMemo(() => seriePatrimonio(fotos, cuentas), [fotos, cuentas])

  const dias = Number(hoy.slice(8, 10))
  const porcentajeMes = redondea((dias / diasDelMes(mes)) * 100)

  // Solo se avisa de la copia si hay algo que perder: recien instalada no molesta.
  const hayDatos = movimientos.length > 0 || fotos.length > 0
  const ultimaCopia = ajustes['ultimaCopia']
  const diasSinCopia = ultimaCopia ? diferenciaDias(ultimaCopia.slice(0, 10), hoy) : null
  const tocaCopia = hayDatos && (diasSinCopia === null ? true : diasSinCopia >= copiaCadaDias)

  const ultimaVariacion = serie.length >= 2 ? serie[serie.length - 1].variacion : null

  // Las tres categorias que mas se desvian de tu media, que son las que interesa mirar.
  const desviaciones = comparativa
    .filter((c) => c.mesesComparados > 0 && c.actual > 0 && c.variacion !== null)
    .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia))
    .slice(0, 4)

  const compartirCopia = async () => {
    const copia = await exportaCopia()
    await comparteOFicha(
      nombreConFecha('oikos', 'json', hoyISO()),
      JSON.stringify(copia, null, 2),
      'application/json',
      'Copia de Oikos',
    )
  }

  return (
    <div>
      {/*
        Guía de cuando la app está recién instalada. Aparece solo si NO hay nada: ni movimientos,
        ni fotos, ni deudas. Sin esto, alguien que abre la app por primera vez ve ceros por todas
        partes y no sabe si está rota o es que le falta cargar sus datos.
      */}
      {movimientos.length === 0 && fotos.length === 0 && deudas.length === 0 && (
        <Tarjeta titulo="Está vacía porque no lleva tus datos dentro" destacada>
          <p className="texto-suave" style={{ marginTop: 0 }}>
            Oikos se publica en internet y no puede llevar dentro tus saldos, tu nómina ni tu hipoteca.
            Tu histórico entra desde un archivo tuyo, y se hace una sola vez.
          </p>
          <button
            type="button"
            className="boton boton--principal boton--ancho"
            onClick={() => nav.irARaiz('ajustes')}
          >
            📥 Cargar mi histórico
          </button>
          <p className="texto-tenue" style={{ marginBottom: 0, marginTop: 10 }}>
            Ajustes → Copia de seguridad → Importar una copia → «Reemplazar todo por la copia». Si
            prefieres empezar de cero, añade tus cuentas en Ajustes y apunta el primer gasto.
          </p>
        </Tarjeta>
      )}

      <Tarjeta destacada>
        <span className="cifra__etiqueta">{nombreMes(mes)} · día {dias} de {diasDelMes(mes)}</span>
        <Cifra valor={formateaImporte(resumen.gastos)} etiqueta="Gastado este mes" />
        <div className="rejilla rejilla--3" style={{ marginTop: 12 }}>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Ingresos</span>
            <div className="cifra cifra--pequena cifra--positiva">{formateaImporte(resumen.ingresos)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Ahorro e inversión</span>
            <div className="cifra cifra--pequena cifra--dorada">
              {formateaImporte(redondea(resumen.inversion + resumen.amortizacion))}
            </div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Queda libre</span>
            <div
              className={
                resumen.disponible < 0 ? 'cifra cifra--pequena cifra--negativa' : 'cifra cifra--pequena'
              }
            >
              {formateaImporte(resumen.disponible)}
            </div>
          </div>
        </div>
        <p className="texto-tenue" style={{ marginBottom: 0, marginTop: 10 }}>
          Vas por el {formateaPorcentaje(porcentajeMes)} del mes · gastas {formateaImporte(resumen.gastoMedioDiario)} al día
        </p>
      </Tarjeta>

      {tocaCopia && (
        <Aviso tono="atencion">
          <strong>Hace tiempo que no guardas una copia.</strong> Los datos viven solo en este móvil.{' '}
          <button type="button" className="tarjeta__accion" onClick={compartirCopia}>
            Compartir copia ahora
          </button>
          {diasSinCopia !== null && ` · última: hace ${diasSinCopia} días`}
        </Aviso>
      )}

      <button
        type="button"
        className="boton boton--principal boton--ancho"
        style={{ marginBottom: 12 }}
        onClick={() => nav.irARaiz('apuntar')}
      >
        ✏️ Apuntar un movimiento
      </button>

      <Tarjeta
        titulo="Patrimonio"
        accion={
          <button type="button" className="tarjeta__accion" onClick={() => nav.irARaiz('patrimonio')}>
            Ver detalle
          </button>
        }
        pie={
          fotoActual
            ? `Última foto: ${formateaFecha(fotoActual.fecha)}${
                ultimaVariacion !== null ? ` · variación ${formateaImporte(ultimaVariacion)}` : ''
              }`
            : 'Todavía no hay ninguna foto del patrimonio'
        }
      >
        <Cifra valor={formateaImporte(patrimonio.neto)} etiqueta="Neto (con deuda)" tono="auto" />
        <div className="rejilla rejilla--2" style={{ marginTop: 12 }}>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Cuentas y activos</span>
            <div className="cifra cifra--pequena">{formateaImporte(patrimonio.bruto)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Deuda</span>
            <div className="cifra cifra--pequena cifra--negativa">−{formateaImporte(patrimonio.deuda)}</div>
          </div>
        </div>
        {patrimonio.neto < 0 && (
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            El neto es negativo porque entra la deuda. Es el número real: el Excel de antes sumaba
            las cuentas y no restaba nada.
          </p>
        )}
      </Tarjeta>

      {(objetivoInversion > 0 || objetivoAmortizacion > 0) && (
        <Tarjeta titulo="Tu objetivo del mes">
          {objetivoInversion > 0 && (
            <div className="fila-barra" style={{ padding: '4px 0 10px' }}>
              <div className="fila-barra__cabeza">
                <span>Inversión</span>
                <span className="fila-barra__importe">
                  {formateaImporte(resumen.inversion)} / {formateaImporte(objetivoInversion)}
                </span>
              </div>
              <div className="barra">
                <div
                  className={`barra__relleno ${
                    resumen.inversion >= objetivoInversion ? 'barra__relleno--holgado' : ''
                  }`}
                  style={{ width: `${Math.min(100, (resumen.inversion / objetivoInversion) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {objetivoAmortizacion > 0 && (
            <div className="fila-barra" style={{ padding: '4px 0 0' }}>
              <div className="fila-barra__cabeza">
                <span>Amortización de hipoteca</span>
                <span className="fila-barra__importe">
                  {formateaImporte(resumen.amortizacion)} / {formateaImporte(objetivoAmortizacion)}
                </span>
              </div>
              <div className="barra">
                <div
                  className={`barra__relleno ${
                    resumen.amortizacion >= objetivoAmortizacion ? 'barra__relleno--holgado' : ''
                  }`}
                  style={{ width: `${Math.min(100, (resumen.amortizacion / objetivoAmortizacion) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            Tus objetivos del mes: {formateaImporte(objetivoInversion)} de inversión y{' '}
            {formateaImporte(objetivoAmortizacion)} de amortización de deuda. Se cambian en Ajustes.
          </p>
        </Tarjeta>
      )}

      {desviaciones.length > 0 && (
        <Tarjeta
          titulo="Comparado con tu media"
          accion={
            <button type="button" className="tarjeta__accion" onClick={() => nav.irARaiz('mes')}>
              Ver el mes
            </button>
          }
        >
          <div className="lista">
            {desviaciones.map((linea) => (
              <div className="fila" key={linea.categoria} style={{ padding: '9px 0' }}>
                <span className="fila__principal">
                  <span className="fila__titulo">{linea.categoria}</span>
                  <span className="fila__detalle">
                    media {formateaImporte(linea.mediaAjustada)} a estas alturas
                  </span>
                </span>
                <span
                  className={
                    linea.diferencia > 0 ? 'fila__importe fila__importe--gasto' : 'fila__importe fila__importe--ingreso'
                  }
                >
                  {linea.diferencia > 0 ? '+' : ''}
                  {formateaImporte(linea.diferencia)}
                </span>
              </div>
            ))}
          </div>
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            La media se ajusta a los días que llevas de mes, para no comparar el día {dias} con un mes entero.
          </p>
        </Tarjeta>
      )}

      {seguimiento.length > 0 && (
        <Tarjeta
          titulo="Presupuestos que vigilar"
          sinRelleno
          accion={
            <button type="button" className="tarjeta__accion" onClick={() => nav.ir('presupuestos')}>
              Todos
            </button>
          }
        >
          <div className="lista">
            {seguimiento.slice(0, 3).map((linea) => (
              <BarraPresupuesto key={linea.categoria} comparativa={linea} />
            ))}
          </div>
        </Tarjeta>
      )}

      <Tarjeta
        titulo="Últimos movimientos"
        sinRelleno
        accion={
          <button type="button" className="tarjeta__accion" onClick={() => nav.ir('movimientos')}>
            Ver todos
          </button>
        }
      >
        {resumen.movimientos.length === 0 ? (
          <p className="vacio">
            Todavía no has apuntado nada este mes.
            <br />
            <button type="button" className="boton boton--pequeno" style={{ marginTop: 10 }} onClick={() => nav.irARaiz('apuntar')}>
              Apuntar el primero
            </button>
          </p>
        ) : (
          <div className="lista">
            {resumen.movimientos.slice(0, 6).map((movimiento) => (
              <FilaMovimiento
                key={movimiento.id}
                movimiento={movimiento}
                hoy={hoy}
                onPulsar={(elegido) => nav.ir('apuntar', { movimiento: elegido })}
              />
            ))}
          </div>
        )}
      </Tarjeta>

      <p className="texto-tenue" style={{ textAlign: 'center' }}>
        Histórico del Excel cargado hasta el{' '}
        {fotos.length > 0 ? formateaFecha(fotos[fotos.length - 1].fecha) : '—'} · {movimientos.length}{' '}
        movimientos
      </p>
    </div>
  )
}
