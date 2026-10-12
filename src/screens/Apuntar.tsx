import { useEffect, useMemo, useState } from 'react'
import { Aviso } from '../components/Aviso'
import { Tarjeta } from '../components/Tarjeta'
import { Teclado } from '../components/Teclado'
import { borraMovimiento, guardaMovimiento } from '../db/repository'
import { useAjusteNumero, useCategorias, useCuentas, useMovimientos } from '../hooks'
import { formateaImporte, parseaImporte } from '../lib/dinero'
import { hoyISO, sumaDias } from '../lib/fechas'
import { categoriasMasUsadas, conceptosRecientes, resumenMes } from '../lib/resumen'
import type { PropsPantalla } from '../navegacion'
import type { Movimiento, TipoMovimiento } from '../types'

interface Props extends PropsPantalla {
  onError: (mensaje: string) => void
}

/** Los cuatro tipos, en el orden en que se usan: gastar es lo mas frecuente. */
const TIPOS: { tipo: TipoMovimiento; etiqueta: string; clase: string }[] = [
  { tipo: 'gasto', etiqueta: 'Gasto', clase: 'chip--gasto' },
  { tipo: 'ingreso', etiqueta: 'Ingreso', clase: 'chip--ingreso' },
  { tipo: 'inversion', etiqueta: 'Inversión', clase: 'chip--inversion' },
  { tipo: 'amortizacion', etiqueta: 'Amortización', clase: 'chip--inversion' },
]

export function Apuntar({ nav, hoy, onError }: Props) {
  const movimientoEditado = nav.opciones.movimiento
  const movimientos = useMovimientos()
  const categorias = useCategorias()
  const cuentas = useCuentas()
  const objetivoInversion = useAjusteNumero('objetivoInversion', 200)
  const objetivoAmortizacion = useAjusteNumero('objetivoAmortizacion', 200)

  const [tecleo, setTecleo] = useState('')
  const [tipo, setTipo] = useState<TipoMovimiento>(movimientoEditado?.tipo ?? 'gasto')
  const [categoria, setCategoria] = useState(movimientoEditado?.categoria ?? '')
  const [concepto, setConcepto] = useState(movimientoEditado?.concepto ?? '')
  const [fecha, setFecha] = useState(movimientoEditado?.fecha ?? hoy)
  const [cuenta, setCuenta] = useState(movimientoEditado?.cuenta ?? '')
  const [notas, setNotas] = useState(movimientoEditado?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [pendienteDeBorrar, setPendienteDeBorrar] = useState(false)
  const [mostrarTodas, setMostrarTodas] = useState(false)

  // Si se llega desde la lista para EDITAR, se precarga el importe en el teclado.
  useEffect(() => {
    if (movimientoEditado) setTecleo(formateaTecleo(movimientoEditado.importe))
  }, [movimientoEditado])

  const delAmbito = useMemo(() => {
    const activas = categorias.filter((c) => c.activa && c.ambito === tipo)
    const usadas = categoriasMasUsadas(movimientos, tipo)
    const orden = new Map(usadas.map((nombre, indice) => [nombre, indice]))
    return activas.sort((a, b) => {
      const ia = orden.get(a.nombre) ?? 999
      const ib = orden.get(b.nombre) ?? 999
      if (ia !== ib) return ia - ib
      return a.orden - b.orden
    })
  }, [categorias, movimientos, tipo])

  // Al cambiar de tipo, la categoria elegida deja de valer: se pone la primera disponible
  // en lugar de dejar una categoria de otro tipo seleccionada en silencio.
  useEffect(() => {
    if (delAmbito.length === 0) {
      setCategoria('')
      return
    }
    if (!delAmbito.some((c) => c.nombre === categoria)) setCategoria(delAmbito[0].nombre)
  }, [delAmbito, categoria])

  const recientes = useMemo(() => conceptosRecientes(movimientos, tipo, 6), [movimientos, tipo])
  const importe = tecleo === '' ? 0 : (parseaImporte(tecleo) ?? 0)

  // Al apuntar solo salen las categorias que Oscar usa de verdad (las suyas y las que ya ha
  // gastado alguna vez). Las sugeridas que nunca ha tocado quedan detras de un "+ N mas":
  // si al abrir Apuntar salen 17 botones, elegir deja de ser un toque y pasa a ser un examen.
  const usadas = useMemo(
    () => new Set(categoriasMasUsadas(movimientos, tipo)),
    [movimientos, tipo],
  )
  const principales = delAmbito.filter((c) => c.historica || usadas.has(c.nombre))
  const secundarias = delAmbito.filter((c) => !c.historica && !usadas.has(c.nombre))
  // Si la categoria elegida esta entre las secundarias (por ejemplo al editar un movimiento
  // antiguo), la lista se despliega sola para que su boton se vea marcado.
  const desplegado = mostrarTodas || secundarias.some((c) => c.nombre === categoria)
  const visibles = desplegado ? delAmbito : principales

  // Lo que llevas este mes de inversion y amortizacion, para compararlo con tus objetivos.
  const resumenDelMes = useMemo(() => resumenMes(movimientos, fecha.slice(0, 7), hoy), [movimientos, fecha, hoy])

  const guardar = async () => {
    if (guardando) return
    if (importe <= 0) {
      onError('Pon un importe mayor que cero.')
      return
    }
    if (!categoria) {
      onError('Elige una categoría.')
      return
    }
    setGuardando(true)
    try {
      const movimiento: Movimiento = {
        fecha,
        tipo,
        categoria,
        concepto: concepto.trim() || categoria,
        importe,
        cuenta: cuenta || undefined,
        notas: notas.trim() || undefined,
        origen: 'manual',
        creado: new Date().toISOString(),
        ...(movimientoEditado?.id ? { id: movimientoEditado.id } : {}),
      }
      await guardaMovimiento(movimiento)
      if (movimientoEditado) nav.volver()
      else nav.irARaiz('inicio')
    } catch (error) {
      onError(`No se pudo guardar: ${(error as Error).message}`)
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async () => {
    if (!movimientoEditado?.id) return
    if (!pendienteDeBorrar) {
      setPendienteDeBorrar(true)
      return
    }
    try {
      await borraMovimiento(movimientoEditado.id)
      nav.volver()
    } catch (error) {
      onError(`No se pudo borrar: ${(error as Error).message}`)
    }
  }

  return (
    <div>
      <Tarjeta>
        <div className="chips" style={{ marginBottom: 4 }}>
          {TIPOS.map((opcion) => (
            <button
              key={opcion.tipo}
              type="button"
              className={`chip ${opcion.clase}`}
              aria-pressed={tipo === opcion.tipo}
              onClick={() => setTipo(opcion.tipo)}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>

        <Teclado valor={tecleo} onCambio={setTecleo} />

        {tipo === 'inversion' && objetivoInversion > 0 && (
          <p className="texto-tenue" style={{ textAlign: 'center', marginTop: 0 }}>
            Llevas {formateaImporte(resumenDelMes.inversion)} de {formateaImporte(objetivoInversion)} este mes
          </p>
        )}
        {tipo === 'amortizacion' && objetivoAmortizacion > 0 && (
          <p className="texto-tenue" style={{ textAlign: 'center', marginTop: 0 }}>
            Llevas {formateaImporte(resumenDelMes.amortizacion)} de {formateaImporte(objetivoAmortizacion)} este mes
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Categoría">
        <div className="chips">
          {visibles.map((opcion) => (
            <button
              key={opcion.nombre}
              type="button"
              className="chip"
              aria-pressed={categoria === opcion.nombre}
              onClick={() => setCategoria(opcion.nombre)}
            >
              {opcion.nombre}
              {!opcion.historica && <span className="texto-tenue">·sugerida</span>}
            </button>
          ))}
          {secundarias.length > 0 && (
            <button
              type="button"
              className="chip"
              aria-pressed={desplegado}
              onClick={() => setMostrarTodas((anterior) => !anterior)}
            >
              {desplegado ? '− Ocultar sugeridas' : `+ ${secundarias.length} sugeridas`}
            </button>
          )}
        </div>
        {delAmbito.length === 0 && (
          <p className="texto-suave">
            No hay ninguna categoría de este tipo. Se crean en Ajustes → Categorías.
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Concepto">
        <div className="campo">
          <input
            className="entrada"
            type="text"
            value={concepto}
            placeholder="Supermercado, gasolina, cuota…"
            onChange={(evento) => setConcepto(evento.target.value)}
          />
        </div>
        {recientes.length > 0 && (
          <div className="chips">
            {recientes.map((texto) => (
              <button
                key={texto}
                type="button"
                className="chip"
                aria-pressed={concepto.trim().toLowerCase() === texto.toLowerCase()}
                onClick={() => {
                  setConcepto(texto)
                  const anterior = [...movimientos]
                    .filter((m) => m.tipo === tipo && m.concepto.trim().toLowerCase() === texto.toLowerCase())
                    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0]
                  // Repetir el concepto de la ultima vez arrastra su categoria, que es lo
                  // que se quiere el 95% de las veces (Mercadona siempre es Alimentación).
                  if (anterior) setCategoria(anterior.categoria)
                }}
              >
                {texto}
              </button>
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Fecha">
        <div className="chips">
          <button type="button" className="chip" aria-pressed={fecha === hoy} onClick={() => setFecha(hoy)}>
            Hoy
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={fecha === sumaDias(hoy, -1)}
            onClick={() => setFecha(sumaDias(hoy, -1))}
          >
            Ayer
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={fecha === sumaDias(hoy, -2)}
            onClick={() => setFecha(sumaDias(hoy, -2))}
          >
            Anteayer
          </button>
        </div>
        <div className="campo" style={{ marginTop: 10, marginBottom: 0 }}>
          <input
            className="entrada"
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(evento) => setFecha(evento.target.value)}
          />
        </div>
      </Tarjeta>

      <details className="tarjeta">
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--texto-suave)' }}>
          Más datos (cuenta y notas)
        </summary>
        <div style={{ marginTop: 12 }}>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="cuenta-movimiento">
              Cuenta (opcional)
            </label>
            <select
              id="cuenta-movimiento"
              className="entrada"
              value={cuenta}
              onChange={(evento) => setCuenta(evento.target.value)}
            >
              <option value="">Sin especificar</option>
              {cuentas
                .filter((c) => c.activa && c.bloque === 'liquidez')
                .map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="notas-movimiento">
              Notas (opcional)
            </label>
            <textarea
              id="notas-movimiento"
              className="entrada"
              rows={2}
              value={notas}
              onChange={(evento) => setNotas(evento.target.value)}
            />
          </div>
        </div>
      </details>

      {pendienteDeBorrar && (
        <Aviso tono="peligro">
          Se va a borrar este movimiento. Pulsa otra vez <strong>Borrar</strong> para confirmarlo.
        </Aviso>
      )}

      <button
        type="button"
        className="boton boton--principal boton--ancho"
        onClick={guardar}
        disabled={guardando || importe <= 0}
      >
        {guardando ? 'Guardando…' : movimientoEditado ? 'Guardar cambios' : `Apuntar ${formateaImporte(importe)}`}
      </button>

      {movimientoEditado && (
        <button
          type="button"
          className="boton boton--peligro boton--ancho"
          style={{ marginTop: 10 }}
          onClick={borrar}
        >
          {pendienteDeBorrar ? 'Confirmar borrado' : 'Borrar movimiento'}
        </button>
      )}
    </div>
  )
}

/** El importe que se precarga al editar, con coma española y sin ceros de relleno. */
function formateaTecleo(importe: number): string {
  const conDosDecimales = importe.toFixed(2)
  const sinCeros = conDosDecimales.replace(/\.?0+$/, '')
  return sinCeros.replace('.', ',')
}
