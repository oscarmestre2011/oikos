import { useMemo, useState } from 'react'
import { FilaMovimiento, ETIQUETA_TIPO } from '../components/FilaMovimiento'
import { Tarjeta } from '../components/Tarjeta'
import { useMovimientos } from '../hooks'
import { formateaImporte } from '../lib/dinero'
import { etiquetaDia, mesesConDatos, mesDe, nombreMes } from '../lib/fechas'
import { ordenDescendente } from '../lib/resumen'
import type { PropsPantalla } from '../navegacion'
import type { TipoMovimiento } from '../types'

const FILTROS: { valor: TipoMovimiento | 'todos'; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'gasto', etiqueta: 'Gastos' },
  { valor: 'ingreso', etiqueta: 'Ingresos' },
  { valor: 'inversion', etiqueta: 'Inversión' },
  { valor: 'amortizacion', etiqueta: 'Amortización' },
]

export function Movimientos({ nav, hoy }: PropsPantalla) {
  const movimientos = useMovimientos()
  const [mes, setMes] = useState(nav.opciones.mes ?? '')
  const [tipo, setTipo] = useState<TipoMovimiento | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const meses = useMemo(() => mesesConDatos(movimientos.map((m) => m.fecha)).reverse(), [movimientos])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return movimientos
      .filter((m) => (mes ? mesDe(m.fecha) === mes : true))
      .filter((m) => (tipo === 'todos' ? true : m.tipo === tipo))
      .filter((m) =>
        texto
          ? m.concepto.toLowerCase().includes(texto) || m.categoria.toLowerCase().includes(texto)
          : true,
      )
      .sort(ordenDescendente)
  }, [movimientos, mes, tipo, busqueda])

  // Se agrupan por dia: es como se lee un extracto, y evita repetir la fecha en cada fila.
  const porDia = useMemo(() => {
    const grupos = new Map<string, typeof filtrados>()
    for (const movimiento of filtrados) {
      const lista = grupos.get(movimiento.fecha)
      if (lista) lista.push(movimiento)
      else grupos.set(movimiento.fecha, [movimiento])
    }
    return [...grupos.entries()]
  }, [filtrados])

  const totalFiltrado = useMemo(() => {
    const gastos = filtrados.filter((m) => m.tipo === 'gasto').reduce((t, m) => t + m.importe, 0)
    const ingresos = filtrados.filter((m) => m.tipo === 'ingreso').reduce((t, m) => t + m.importe, 0)
    return { gastos, ingresos }
  }, [filtrados])

  return (
    <div>
      <Tarjeta>
        <div className="campo">
          <input
            className="entrada"
            type="search"
            value={busqueda}
            placeholder="Buscar por concepto o categoría"
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>

        <div className="chips" style={{ marginBottom: 10 }}>
          <button type="button" className="chip" aria-pressed={mes === ''} onClick={() => setMes('')}>
            Todos los meses
          </button>
          {meses.map((valor) => (
            <button
              key={valor}
              type="button"
              className="chip"
              aria-pressed={mes === valor}
              onClick={() => setMes(valor)}
            >
              {nombreMes(valor)}
            </button>
          ))}
        </div>

        <div className="chips">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.valor}
              type="button"
              className="chip"
              aria-pressed={tipo === filtro.valor}
              onClick={() => setTipo(filtro.valor)}
            >
              {filtro.etiqueta}
            </button>
          ))}
        </div>
      </Tarjeta>

      <Tarjeta>
        <div className="reparte">
          <span>
            <span className="cifra__etiqueta">Gastos</span>
            <div className="cifra cifra--pequena cifra--negativa">{formateaImporte(totalFiltrado.gastos)}</div>
          </span>
          <span style={{ textAlign: 'right' }}>
            <span className="cifra__etiqueta">Ingresos</span>
            <div className="cifra cifra--pequena cifra--positiva">{formateaImporte(totalFiltrado.ingresos)}</div>
          </span>
        </div>
        <p className="texto-tenue" style={{ marginBottom: 0 }}>
          {filtrados.length} {filtrados.length === 1 ? 'movimiento' : 'movimientos'}
          {tipo !== 'todos' && ` · ${ETIQUETA_TIPO[tipo].toLowerCase()}`}
          {mes && ` · ${nombreMes(mes)}`}
        </p>
      </Tarjeta>

      {filtrados.length === 0 ? (
        <Tarjeta>
          <p className="vacio">
            No hay movimientos con esos filtros.
            <br />
            <span className="texto-tenue">
              Antes de marzo de 2026 el Excel solo guardaba el patrimonio mes a mes, no el detalle de
              cada gasto: de esos meses no hay nada que enseñar aquí.
            </span>
          </p>
        </Tarjeta>
      ) : (
        <Tarjeta sinRelleno>
          <div className="lista">
            {porDia.map(([fecha, lista]) => (
              <div key={fecha}>
                <div className="cabecera-dia">
                  {etiquetaDia(fecha, hoy)} · {fecha}
                </div>
                {lista.map((movimiento) => (
                  <FilaMovimiento
                    key={movimiento.id}
                    movimiento={movimiento}
                    onPulsar={(elegido) => nav.ir('apuntar', { movimiento: elegido })}
                  />
                ))}
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      <p className="texto-tenue" style={{ textAlign: 'center' }}>
        Toca cualquier movimiento para editarlo o borrarlo.
      </p>
    </div>
  )
}
