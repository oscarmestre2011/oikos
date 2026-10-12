import { useMemo, useState } from 'react'
import { Aviso } from '../components/Aviso'
import { Tarjeta } from '../components/Tarjeta'
import {
  borraCategoria,
  borraCuenta,
  empezarDeCero,
  escribeAjuste,
  estadisticas,
  exportaCopia,
  guardaCategoria,
  guardaCuenta,
  importaCopia,
  ORIGEN_HISTORICO,
  reiniciarConSemilla,
  renombraCategoria,
  renombraCuenta,
  validaCopia,
  type EstadisticasBase,
} from '../db/repository'
import { useAjuste, useAjustes, useCategorias, useCuentas, useDeudas, useFotos, useMovimientos, usePresupuestos } from '../hooks'
import { comparteOFicha, descargaTexto, nombreConFecha } from '../lib/descargas'
import { parseaImporte } from '../lib/dinero'
import { formateaFecha, hoyISO, mesDe, nombreMes } from '../lib/fechas'
import { markdownDelMes, markdownDelPatrimonio } from '../lib/markdown'
import { calculaPresupuestos, resumenMes } from '../lib/resumen'
import type { PropsPantalla } from '../navegacion'
import type { Categoria, Cuenta, TipoMovimiento } from '../types'
import { FECHA_VERSION, ULTIMA_NOTA, VERSION } from '../version'

interface Props extends PropsPantalla {
  onError: (mensaje: string) => void
}

const AMBITOS: { valor: TipoMovimiento; etiqueta: string }[] = [
  { valor: 'gasto', etiqueta: 'Gasto' },
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'inversion', etiqueta: 'Inversión' },
  { valor: 'amortizacion', etiqueta: 'Amortización' },
]

export function Ajustes({ nav, hoy, onError }: Props) {
  const movimientos = useMovimientos()
  const categorias = useCategorias()
  const cuentas = useCuentas()
  const fotos = useFotos()
  const deudas = useDeudas()
  const presupuestos = usePresupuestos()
  const ajustes = useAjustes()
  const ajusteInversion = useAjuste('objetivoInversion', '200')
  const ajusteAmortizacion = useAjuste('objetivoAmortizacion', '200')

  const [estado, setEstado] = useState<string | null>(null)
  const [estadisticasBase, setEstadisticasBase] = useState<EstadisticasBase | null>(null)
  const [modoImport, setModoImport] = useState<'combinar' | 'reemplazar'>('combinar')
  const [confirmarReinicio, setConfirmarReinicio] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)

  const mes = mesDe(hoy)

  const usoPorCategoria = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const movimiento of movimientos) {
      cuenta.set(movimiento.categoria, (cuenta.get(movimiento.categoria) ?? 0) + 1)
    }
    return cuenta
  }, [movimientos])

  const compartirCopia = async () => {
    try {
      const copia = await exportaCopia()
      const resultado = await comparteOFicha(
        nombreConFecha('oikos', 'json', hoyISO()),
        JSON.stringify(copia, null, 2),
        'application/json',
        'Copia de Oikos',
      )
      await escribeAjuste('ultimaCopia', new Date().toISOString())
      setEstado(
        resultado === 'compartido'
          ? 'Copia compartida. Ya está fuera del móvil.'
          : resultado === 'descartado'
            ? 'No se ha compartido nada. Puedes intentarlo otra vez.'
            : 'Copia descargada. Acuérdate de sacarla del móvil.',
      )
    } catch (error) {
      onError(`No se pudo crear la copia: ${(error as Error).message}`)
    }
  }

  const importar = async (archivo: File) => {
    try {
      const texto = await archivo.text()
      const validacion = validaCopia(JSON.parse(texto))
      if (!validacion.valida || !validacion.copia) {
        onError(validacion.error ?? 'Ese archivo no sirve como copia.')
        return
      }
      const resultado = await importaCopia(validacion.copia, modoImport)
      setEstado(
        modoImport === 'reemplazar'
          ? `Copia restaurada: ${resultado.movimientosAnadidos} movimientos y ${resultado.fotosAnadidas} fotos.`
          : `Combinada: ${resultado.movimientosAnadidos} movimientos nuevos, ${resultado.movimientosRepetidos} ya estaban, ` +
            `${resultado.fotosAnadidas} fotos nuevas y ${resultado.categoriasAnadidas} categorías añadidas.`,
      )
      setEstadisticasBase(await estadisticas())
    } catch (error) {
      onError(`No se pudo leer el archivo: ${(error as Error).message}`)
    }
  }

  const exportarMes = () => {
    const resumen = resumenMes(movimientos, mes, hoy)
    const seguimiento = calculaPresupuestos(movimientos, presupuestos, mes)
    descargaTexto(
      nombreConFecha(`oikos-cuentas-${mes}`, 'md', hoyISO()),
      markdownDelMes(mes, resumen, seguimiento),
      'text/markdown',
    )
    setEstado(`Markdown de ${nombreMes(mes)} descargado, listo para pegar en el vault.`)
  }

  const exportarPatrimonio = () => {
    descargaTexto(
      nombreConFecha('oikos-patrimonio', 'md', hoyISO()),
      markdownDelPatrimonio(fotos, cuentas, deudas),
      'text/markdown',
    )
    setEstado('Markdown del patrimonio descargado, con las deudas y el neto real.')
  }

  return (
    <div>
      {estado && <Aviso tono="bien">{estado}</Aviso>}

      <Tarjeta titulo="Tus objetivos del mes">
        <FilaAjuste
          etiqueta="Inversión mensual (MSCI World)"
          clave="objetivoInversion"
          inicial={ajusteInversion}
          onError={onError}
        />
        <FilaAjuste
          etiqueta="Amortización extra de hipoteca"
          clave="objetivoAmortizacion"
          inicial={ajusteAmortizacion}
          onError={onError}
        />
        <p className="texto-tenue" style={{ marginBottom: 0 }}>
          Se usan en la pantalla de Inicio para ver si cumples el plan. Ponlos a 0 para no verlos.
        </p>

        {/* Segunda puerta a los presupuestos, por si se busca desde Ajustes (que es donde estan
            los demas topes y objetivos). */}
        <button
          type="button"
          className="boton boton--ancho"
          style={{ marginTop: 12 }}
          onClick={() => nav.ir('presupuestos')}
        >
          🎯 Presupuestos por categoría
        </button>
      </Tarjeta>

      <Tarjeta titulo="Copia de seguridad">
        <Aviso tono="atencion">
          Los datos viven <strong>solo en este móvil</strong>. Si borras los datos de navegación o cambias de
          teléfono, se pierden. No hay nube: por eso nadie más los ve, y por eso la copia no es opcional.
        </Aviso>

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="cada-copia">
            Recordarme una copia cada
          </label>
          <select
            id="cada-copia"
            className="entrada"
            value={ajustes['copiaCadaDias'] ?? '7'}
            onChange={async (evento) => {
              await escribeAjuste('copiaCadaDias', evento.target.value)
            }}
          >
            <option value="1">día</option>
            <option value="7">semana</option>
            <option value="14">14 días</option>
            <option value="30">mes</option>
            <option value="3650">nunca</option>
          </select>
        </div>

        <button type="button" className="boton boton--principal boton--ancho" onClick={compartirCopia}>
          Compartir o descargar la copia (.json)
        </button>

        <div className="separador" />

        <div className="campo">
          <label className="campo__etiqueta" htmlFor="modo-import">
            Al importar, quiero…
          </label>
          <select
            id="modo-import"
            className="entrada"
            value={modoImport}
            onChange={(evento) => setModoImport(evento.target.value as 'combinar' | 'reemplazar')}
          >
            <option value="combinar">Combinar (añadir lo que falte, sin duplicar)</option>
            <option value="reemplazar">Reemplazar todo por la copia</option>
          </select>
        </div>

        <label className="boton boton--ancho" style={{ cursor: 'pointer' }}>
          Importar una copia
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (evento) => {
              const archivo = evento.target.files?.[0]
              if (archivo) await importar(archivo)
              // Se limpia para poder volver a elegir el mismo archivo si hace falta.
              evento.target.value = ''
            }}
          />
        </label>
        <p className="texto-tenue" style={{ marginBottom: 0 }}>
          {ajustes['ultimaCopia']
            ? `Última copia: ${formateaFecha(ajustes['ultimaCopia'].slice(0, 10))}.`
            : 'Todavía no has guardado ninguna copia.'}
        </p>
      </Tarjeta>

      <Tarjeta titulo="Exportar al vault">
        <p className="texto-suave" style={{ marginTop: 0 }}>
          Genera el texto en Markdown con el formato de tu vault (fechas <code>YYYY-MM-DD</code>, tablas,
          importes con coma). Oikos <strong>no escribe</strong> en el vault: lo descargas y lo pegas tú.
        </p>
        <button type="button" className="boton boton--ancho" onClick={exportarMes}>
          📄 Markdown de {nombreMes(mes)}
        </button>
        <button type="button" className="boton boton--ancho" style={{ marginTop: 10 }} onClick={exportarPatrimonio}>
          📈 Markdown del patrimonio
        </button>
      </Tarjeta>

      <details className="tarjeta">
        <summary style={{ cursor: 'pointer', fontWeight: 650 }}>
          Categorías ({categorias.filter((c) => c.activa).length} activas)
        </summary>
        <div style={{ marginTop: 12 }}>
          {AMBITOS.map((ambito) => {
            const lista = categorias.filter((c) => c.ambito === ambito.valor)
            if (lista.length === 0) return null
            return (
              <div key={ambito.valor} style={{ marginBottom: 14 }}>
                <div className="cabecera-dia" style={{ background: 'none', padding: '4px 0' }}>
                  {ambito.etiqueta}
                </div>
                {lista.map((categoria) => (
                  <FilaCategoria
                    key={categoria.id ?? categoria.nombre}
                    categoria={categoria}
                    usos={usoPorCategoria.get(categoria.nombre) ?? 0}
                    onError={onError}
                  />
                ))}
              </div>
            )
          })}
          <NuevaCategoria onError={onError} />
        </div>
      </details>

      <details className="tarjeta">
        <summary style={{ cursor: 'pointer', fontWeight: 650 }}>
          Cuentas del patrimonio ({cuentas.filter((c) => c.activa).length} activas)
        </summary>
        <div style={{ marginTop: 12 }}>
          {(['liquidez', 'activo'] as const).map((bloque) => (
            <div key={bloque} style={{ marginBottom: 14 }}>
              <div className="cabecera-dia" style={{ background: 'none', padding: '4px 0' }}>
                {bloque === 'liquidez' ? 'Liquidez' : 'Inversiones'}
              </div>
              {cuentas
                .filter((c) => c.bloque === bloque)
                .map((cuenta) => (
                  <FilaCuenta key={cuenta.id ?? cuenta.nombre} cuenta={cuenta} onError={onError} />
                ))}
            </div>
          ))}
          <NuevaCuenta onError={onError} />
        </div>
      </details>

      <Tarjeta titulo="Tus datos">
        <button
          type="button"
          className="boton boton--ancho"
          onClick={async () => setEstadisticasBase(await estadisticas())}
        >
          Ver qué hay guardado
        </button>
        {estadisticasBase && (
          <div className="rejilla rejilla--2" style={{ marginTop: 12 }}>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Movimientos</span>
              <div className="cifra cifra--pequena">{estadisticasBase.movimientos}</div>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Fotos de patrimonio</span>
              <div className="cifra cifra--pequena">{estadisticasBase.fotos}</div>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Compras de Bitcoin</span>
              <div className="cifra cifra--pequena">{estadisticasBase.comprasBitcoin}</div>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Deudas</span>
              <div className="cifra cifra--pequena">{estadisticasBase.deudas}</div>
            </div>
          </div>
        )}

        <div className="separador" />

        <p className="texto-suave">
          El histórico del Excel se puede volver a cargar tal cual: es útil si has hecho pruebas y quieres
          dejarlo como estaba.
        </p>
        <button
          type="button"
          className="boton boton--ancho"
          onClick={async () => {
            if (!confirmarReinicio) {
              setConfirmarReinicio(true)
              return
            }
            await reiniciarConSemilla()
            setConfirmarReinicio(false)
            setEstado('Histórico del Excel recargado. Lo que hubieras apuntado se ha borrado.')
          }}
        >
          {confirmarReinicio ? 'Confirmar: se borra lo que hayas apuntado' : 'Recargar el histórico del Excel'}
        </button>

        <button
          type="button"
          className="boton boton--peligro boton--ancho"
          style={{ marginTop: 10 }}
          onClick={async () => {
            if (!confirmarBorrado) {
              setConfirmarBorrado(true)
              return
            }
            await empezarDeCero()
            setConfirmarBorrado(false)
            setEstado('Todo borrado. La app queda vacía, lista para empezar de cero.')
          }}
        >
          {confirmarBorrado ? 'Confirmar: borrar TODO' : 'Borrar todos los datos'}
        </button>
        {confirmarBorrado && (
          <p className="texto-tenue">
            Antes de borrar, guarda una copia. Esto no se puede deshacer.
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Ayuda">
        <p className="texto-suave" style={{ marginTop: 0 }}>
          Qué significa cada número, por qué invertir no es gastar, cómo se detectan las suscripciones y
          cómo se instala en el móvil.
        </p>
        <button type="button" className="boton boton--ancho" onClick={() => nav.ir('ayuda')}>
          ❓ Abrir la ayuda
        </button>
      </Tarjeta>

      <details className="tarjeta">
        <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Acerca de Oikos</summary>
        <div style={{ marginTop: 12 }}>
          <p className="texto-suave">
            Versión <strong>{VERSION}</strong> · {formateaFecha(FECHA_VERSION)}
          </p>
          <p className="texto-suave">
            <strong>Sin cuenta, sin nube, sin publicidad.</strong> Todo se guarda en el navegador de este
            móvil (IndexedDB). Oikos no envía nada a ningún servidor, porque no hay servidor.
          </p>
          <div className="separador" />
          <p className="cifra__etiqueta">De dónde sale el histórico</p>
          <p className="texto-tenue">
            {ORIGEN_HISTORICO.fotos} fotos de patrimonio ({ORIGEN_HISTORICO.primeraFoto} →{' '}
            {ORIGEN_HISTORICO.ultimaFoto}), {ORIGEN_HISTORICO.movimientos} movimientos,{' '}
            {ORIGEN_HISTORICO.comprasBitcoin} compras de Bitcoin ({ORIGEN_HISTORICO.btcTotal} BTC).
            <br />
            Origen: <code>{ORIGEN_HISTORICO.csv}</code> y <code>{ORIGEN_HISTORICO.excel}</code>.
            <br />
            Extraído el {ORIGEN_HISTORICO.extraido.slice(0, 10)} · descuadres contra las fórmulas del
            Excel: {ORIGEN_HISTORICO.descuadresContraElExcel}.
          </p>
          <div className="separador" />
          <p className="cifra__etiqueta">Novedades de esta versión</p>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {ULTIMA_NOTA.cambios.map((cambio, indice) => (
              <li key={indice} className="texto-suave" style={{ marginBottom: 6 }}>
                <span className="etiqueta">{cambio.tipo}</span> {cambio.texto}
              </li>
            ))}
          </ul>
        </div>
      </details>

      <p className="texto-tenue" style={{ textAlign: 'center' }}>
        Oikos · la hermana de Kairós para el dinero
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FilaAjuste({
  etiqueta,
  clave,
  inicial,
  onError,
}: {
  etiqueta: string
  clave: string
  inicial: string
  onError: (mensaje: string) => void
}) {
  const [texto, setTexto] = useState(inicial)

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={`ajuste-${clave}`}>
        {etiqueta}
      </label>
      <input
        id={`ajuste-${clave}`}
        className="entrada"
        inputMode="decimal"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onBlur={async () => {
          const importe = parseaImporte(texto)
          if (importe === null) {
            onError(`"${texto}" no es una cantidad.`)
            return
          }
          await escribeAjuste(clave, String(Math.abs(importe)))
        }}
      />
    </div>
  )
}

function FilaCategoria({
  categoria,
  usos,
  onError,
}: {
  categoria: Categoria
  usos: number
  onError: (mensaje: string) => void
}) {
  const [nombre, setNombre] = useState(categoria.nombre)
  const [confirmar, setConfirmar] = useState(false)

  return (
    <div className="fila" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <input
        className="entrada"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
        onBlur={async () => {
          const limpio = nombre.trim()
          if (!limpio || limpio === categoria.nombre) {
            setNombre(categoria.nombre)
            return
          }
          try {
            await renombraCategoria(categoria.nombre, limpio)
          } catch (error) {
            onError(`No se pudo renombrar: ${(error as Error).message}`)
            setNombre(categoria.nombre)
          }
        }}
        aria-label={`Nombre de la categoría ${categoria.nombre}`}
      />
      <span className="texto-tenue" style={{ whiteSpace: 'nowrap' }}>
        {usos} mov.
      </span>
      <button
        type="button"
        className="boton boton--pequeno"
        onClick={async () => {
          if (categoria.id) await guardaCategoria({ ...categoria, activa: !categoria.activa })
        }}
        aria-label={categoria.activa ? 'Desactivar' : 'Activar'}
      >
        {categoria.activa ? '👁' : '🚫'}
      </button>
      <button
        type="button"
        className="boton boton--pequeno boton--peligro"
        onClick={async () => {
          if (!categoria.id) return
          if (!confirmar) {
            setConfirmar(true)
            return
          }
          if (usos > 0) {
            onError(
              `"${categoria.nombre}" tiene ${usos} movimientos. Renómbrala o desactívala en lugar de borrarla, para no dejar movimientos huérfanos.`,
            )
            setConfirmar(false)
            return
          }
          await borraCategoria(categoria.id)
        }}
        aria-label={`Borrar ${categoria.nombre}`}
      >
        {confirmar ? '¿?' : '×'}
      </button>
    </div>
  )
}

function NuevaCategoria({ onError }: { onError: (mensaje: string) => void }) {
  const [nombre, setNombre] = useState('')
  const [ambito, setAmbito] = useState<TipoMovimiento>('gasto')

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor="nueva-categoria">
        Añadir una categoría
      </label>
      <div className="en-linea">
        <input
          id="nueva-categoria"
          className="entrada"
          value={nombre}
          placeholder="Nombre"
          onChange={(evento) => setNombre(evento.target.value)}
        />
        <select
          className="entrada"
          value={ambito}
          onChange={(evento) => setAmbito(evento.target.value as TipoMovimiento)}
          aria-label="Tipo"
          style={{ maxWidth: 150 }}
        >
          {AMBITOS.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="boton boton--pequeno"
          onClick={async () => {
            const limpio = nombre.trim()
            if (!limpio) return
            try {
              await guardaCategoria({
                nombre: limpio,
                ambito,
                esencial: false,
                historica: false,
                activa: true,
                orden: 100,
              })
              setNombre('')
            } catch (error) {
              onError(`No se pudo crear: ${(error as Error).message}`)
            }
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}

function FilaCuenta({ cuenta, onError }: { cuenta: Cuenta; onError: (mensaje: string) => void }) {
  const [nombre, setNombre] = useState(cuenta.nombre)

  return (
    <div className="fila" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <input
        className="entrada"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
        onBlur={async () => {
          const limpio = nombre.trim()
          if (!limpio || limpio === cuenta.nombre) {
            setNombre(cuenta.nombre)
            return
          }
          try {
            await renombraCuenta(cuenta.nombre, limpio)
          } catch (error) {
            onError(`No se pudo renombrar la cuenta: ${(error as Error).message}`)
            setNombre(cuenta.nombre)
          }
        }}
        aria-label={`Nombre de la cuenta ${cuenta.nombre}`}
      />
      <button
        type="button"
        className="boton boton--pequeno"
        onClick={async () => {
          if (cuenta.id) await guardaCuenta({ ...cuenta, activa: !cuenta.activa })
        }}
        aria-label={cuenta.activa ? 'Desactivar' : 'Activar'}
      >
        {cuenta.activa ? '👁' : '🚫'}
      </button>
      <button
        type="button"
        className="boton boton--pequeno boton--peligro"
        onClick={async () => {
          if (cuenta.id) await borraCuenta(cuenta.id)
        }}
        aria-label={`Borrar ${cuenta.nombre}`}
      >
        ×
      </button>
    </div>
  )
}

function NuevaCuenta({ onError }: { onError: (mensaje: string) => void }) {
  const [nombre, setNombre] = useState('')
  const [bloque, setBloque] = useState<'liquidez' | 'activo'>('liquidez')

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor="nueva-cuenta">
        Añadir una cuenta
      </label>
      <div className="en-linea">
        <input
          id="nueva-cuenta"
          className="entrada"
          value={nombre}
          placeholder="Nombre"
          onChange={(evento) => setNombre(evento.target.value)}
        />
        <select
          className="entrada"
          value={bloque}
          onChange={(evento) => setBloque(evento.target.value as 'liquidez' | 'activo')}
          aria-label="Bloque"
          style={{ maxWidth: 150 }}
        >
          <option value="liquidez">Liquidez</option>
          <option value="activo">Inversión</option>
        </select>
        <button
          type="button"
          className="boton boton--pequeno"
          onClick={async () => {
            const limpio = nombre.trim()
            if (!limpio) return
            try {
              await guardaCuenta({ nombre: limpio, bloque, orden: 100, activa: true })
              setNombre('')
            } catch (error) {
              onError(`No se pudo crear: ${(error as Error).message}`)
            }
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}
