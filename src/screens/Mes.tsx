import { useMemo } from 'react'
import { Aviso } from '../components/Aviso'
import { Cifra } from '../components/Cifra'
import { Tarjeta } from '../components/Tarjeta'
import { useAjusteNumero, useMovimientos } from '../hooks'
import { formateaImporte, formateaPorcentaje, redondea } from '../lib/dinero'
import { diasDelMes, diasTranscurridos, esMesActual, esMesFuturo, mesAnterior, mesDe, mesSiguiente, nombreMes, nombreMesCorto } from '../lib/fechas'
import { costeFijoAnual, costeFijoMensual, detectaRecurrentes } from '../lib/recurrentes'
import { compararConMedia, resumenMes } from '../lib/resumen'
import type { PropsPantalla } from '../navegacion'

export function Mes({ nav, hoy }: PropsPantalla) {
  const movimientos = useMovimientos()
  const minimoMeses = useAjusteNumero('recurrenteMinimoMeses', 3)
  const mes = nav.opciones.mes ?? mesDe(hoy)

  const resumen = useMemo(() => resumenMes(movimientos, mes, hoy), [movimientos, mes, hoy])
  const comparativa = useMemo(() => compararConMedia(movimientos, mes, hoy), [movimientos, mes, hoy])
  const recurrentes = useMemo(
    () => detectaRecurrentes(movimientos, { minimoMeses }),
    [movimientos, minimoMeses],
  )

  const mesesConMovimiento = useMemo(
    () => [...new Set(movimientos.map((m) => mesDe(m.fecha)))].sort(),
    [movimientos],
  )
  const hayMesesAntes = mesesConMovimiento.some((m) => m < mes)
  const totalGastos = resumen.gastos
  const mayorCategoria = resumen.gastosPorCategoria[0]?.importe ?? 0
  const dias = diasTranscurridos(mes, hoy)
  const enCurso = esMesActual(mes, hoy)

  // Solo las categorias con gasto ESTE mes: las que tienen media pero llevan 0 EUR serian
  // una lista de "-100 %" que no dice nada y tapa lo que importa.
  const categorias = comparativa.filter((c) => c.actual > 0)
  const sinGastarTodavia = comparativa.filter((c) => c.actual === 0 && c.media > 0).map((c) => c.categoria)
  const mesesComparados = comparativa[0]?.mesesComparados ?? 0
  const suscripciones = recurrentes.filter((r) => r.tipo === 'gasto')

  return (
    <div>
      <Tarjeta>
        <div className="reparte" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className="boton boton--pequeno"
            onClick={() => nav.ir('mes', { mes: mesAnterior(mes) })}
            aria-label="Mes anterior"
          >
            ←
          </button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="cifra cifra--mediana">{nombreMes(mes)}</div>
            <span className="cifra__etiqueta">
              {enCurso ? `día ${dias} de ${diasDelMes(mes)}` : `${resumen.diasConActividad} días con movimientos`}
            </span>
          </div>
          <button
            type="button"
            className="boton boton--pequeno"
            onClick={() => nav.ir('mes', { mes: mesSiguiente(mes) })}
            aria-label="Mes siguiente"
            disabled={esMesFuturo(mesSiguiente(mes), hoy)}
          >
            →
          </button>
        </div>

        <div className="separador" />

        <Cifra valor={formateaImporte(resumen.gastos)} etiqueta="Gastado" />
        <div className="rejilla rejilla--4" style={{ marginTop: 12 }}>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Ingresos</span>
            <div className="cifra cifra--pequena cifra--positiva">{formateaImporte(resumen.ingresos)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Inversión</span>
            <div className="cifra cifra--pequena cifra--dorada">{formateaImporte(resumen.inversion)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Amortización</span>
            <div className="cifra cifra--pequena cifra--dorada">{formateaImporte(resumen.amortizacion)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Queda libre</span>
            <div className={resumen.disponible < 0 ? 'cifra cifra--pequena cifra--negativa' : 'cifra cifra--pequena'}>
              {formateaImporte(resumen.disponible)}
            </div>
          </div>
        </div>

        {resumen.ingresos > 0 && (
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            De cada 100 € que entran, {formateaPorcentaje(resumen.tasaAhorro)} se van a ahorro e inversión.
          </p>
        )}
      </Tarjeta>

      {resumen.gastos === 0 && resumen.movimientos.length === 0 && (
        <Aviso tono="info">
          {enCurso
            ? 'Este mes todavía no tiene movimientos. Empieza apuntando el primero.'
            : 'De este mes no hay movimientos apuntados: antes de marzo de 2026 el Excel solo guardaba el patrimonio, no el detalle de gastos.'}
        </Aviso>
      )}

      {resumen.gastosPorCategoria.length > 0 && (
        <Tarjeta titulo="En qué se ha ido">
          <div className="lista">
            {resumen.gastosPorCategoria.map((linea) => {
              const porcentajeDelTotal = totalGastos > 0 ? (linea.importe / totalGastos) * 100 : 0
              return (
                <div className="fila-barra" key={linea.categoria} style={{ padding: '8px 0' }}>
                  <div className="fila-barra__cabeza">
                    <span>{linea.categoria}</span>
                    <span className="fila-barra__importe">
                      {formateaImporte(linea.importe)}{' '}
                      <span className="texto-tenue">{formateaPorcentaje(porcentajeDelTotal)}</span>
                    </span>
                  </div>
                  <div className="barra">
                    <div
                      className="barra__relleno"
                      style={{ width: `${mayorCategoria > 0 ? (linea.importe / mayorCategoria) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="fila-barra__nota">
                    {linea.numero} {linea.numero === 1 ? 'movimiento' : 'movimientos'}
                  </span>
                </div>
              )
            })}
          </div>
        </Tarjeta>
      )}

      {comparativa.length > 0 && (
        <Tarjeta titulo="Comparado con tu media">
          {!hayMesesAntes ? (
            <p className="texto-suave" style={{ marginBottom: 0 }}>
              Este es el primer mes con gastos apuntados: todavía no hay media con la que comparar.
              A partir del mes que viene esta tarjeta dirá si vas por encima o por debajo de lo tuyo.
            </p>
          ) : (
            <>
              {categorias.length === 0 && (
                <p className="texto-suave">
                  Este mes no has apuntado ningún gasto todavía, así que no hay nada que comparar.
                </p>
              )}
              <div className="lista">
                {categorias.map((linea) => (
                  <div className="fila" key={linea.categoria} style={{ padding: '9px 0' }}>
                    <span className="fila__principal">
                      <span className="fila__titulo">{linea.categoria}</span>
                      <span className="fila__detalle">
                        {formateaImporte(linea.actual)} · media {formateaImporte(linea.mediaAjustada)}
                        {linea.variacion !== null && ` (${linea.variacion > 0 ? '+' : ''}${formateaPorcentaje(linea.variacion)})`}
                      </span>
                    </span>
                    <span
                      className={
                        linea.diferencia > 0
                          ? 'fila__importe fila__importe--gasto'
                          : 'fila__importe fila__importe--ingreso'
                      }
                    >
                      {linea.diferencia > 0 ? '+' : ''}
                      {formateaImporte(linea.diferencia)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="texto-tenue" style={{ marginBottom: 0 }}>
                Media de {mesesComparados} {mesesComparados === 1 ? 'mes anterior' : 'meses anteriores'}
                {enCurso ? ', ajustada a los días que llevas de mes' : ''}.
              </p>
              {sinGastarTodavia.length > 0 && (
                <p className="texto-tenue" style={{ marginBottom: 0, marginTop: 6 }}>
                  Sin gastar todavía este mes: {sinGastarTodavia.join(', ')}. En cuanto apuntes algo de
                  estas, aparecerán aquí con su comparación.
                </p>
              )}
            </>
          )}
        </Tarjeta>
      )}

      {/*
        Esta tarjeta se enseña SIEMPRE, aunque esté vacía. Con los datos reales de Óscar sale
        vacía (el CSV solo tiene marzo y abril de 2026), y si se ocultara, la función de detectar
        suscripciones sería invisible: nadie echa de menos lo que no sabe que existe. Una tarjeta
        que explica por qué está vacía vale más que una tarjeta que no está.
      */}
      <Tarjeta titulo="Gastos que se repiten">
        {suscripciones.length === 0 ? (
          <>
            <p className="texto-suave" style={{ marginTop: 0 }}>
              Todavía no hay ninguno que se pueda dar por fijo. Para considerarlo hacen falta al menos{' '}
              <strong>{minimoMeses} meses distintos</strong> con el mismo concepto y, como mucho, un cargo
              al mes (así no se confunde la compra del supermercado con una suscripción).
            </p>
            <p className="texto-tenue" style={{ marginBottom: 0 }}>
              Ahora hay {mesesConMovimiento.length}{' '}
              {mesesConMovimiento.length === 1 ? 'mes' : 'meses'} con movimientos
              {mesesConMovimiento.length > 0 && ` (${mesesConMovimiento.map(nombreMesCorto).join(', ')})`}, así
              que esta tarjeta empezará a llenarse sola en cuanto apuntes unos meses más. Es lo que
              permitirá saber de un vistazo cuánto te cuestan al año las cuotas y las suscripciones.
            </p>
          </>
        ) : (
          <>
            <Cifra
              valor={formateaImporte(costeFijoMensual(recurrentes))}
              etiqueta="Te cuestan al mes (solo gastos)"
              tamano="mediana"
            />
            <div className="lista" style={{ marginTop: 10 }}>
              {suscripciones.slice(0, 8).map((recurrente) => (
                <div className="fila" key={`${recurrente.tipo}-${recurrente.concepto}`} style={{ padding: '9px 0' }}>
                  <span className="fila__principal">
                    <span className="fila__titulo">{recurrente.etiqueta}</span>
                    <span className="fila__detalle">
                      {recurrente.categoria} · día {recurrente.diaHabitual} ·{' '}
                      {recurrente.periodicidadMeses === 1
                        ? 'cada mes'
                        : `cada ${recurrente.periodicidadMeses} meses`}
                      {recurrente.variable && ' · importe variable'}
                    </span>
                  </span>
                  <span className="fila__importe">{formateaImporte(recurrente.importe)}</span>
                </div>
              ))}
            </div>
            <p className="texto-tenue" style={{ marginBottom: 0 }}>
              Al año son {formateaImporte(costeFijoAnual(recurrentes))}. Se considera fijo lo que aparece en{' '}
              {minimoMeses} meses distintos o más, y una vez al mes como mucho.
            </p>
          </>
        )}
      </Tarjeta>

      <button
        type="button"
        className="boton boton--ancho"
        onClick={() => nav.ir('movimientos', { mes })}
      >
        {resumen.movimientos.length === 1
          ? `Ver el movimiento de ${nombreMes(mes)}`
          : resumen.movimientos.length === 0
            ? `Ver los movimientos de ${nombreMes(mes)}`
            : `Ver los ${resumen.movimientos.length} movimientos de ${nombreMes(mes)}`}
      </button>

      {redondea(resumen.inversion + resumen.amortizacion) > 0 && (
        <p className="texto-tenue" style={{ textAlign: 'center', marginTop: 12 }}>
          Inversión y amortización no cuentan como gasto: ese dinero no se va, cambia de sitio.
        </p>
      )}
    </div>
  )
}
