import { useMemo, useState } from 'react'
import { Aviso } from '../components/Aviso'
import { Cifra } from '../components/Cifra'
import { Grafica } from '../components/Grafica'
import { Tarjeta } from '../components/Tarjeta'
import { borraDeuda, borraFoto, guardaDeuda, guardaFoto } from '../db/repository'
import { useComprasBitcoin, useCuentas, useDeudas, useFotos } from '../hooks'
import { formateaCompacto, formateaImporte, parseaImporte, redondea } from '../lib/dinero'
import { diferenciaDias, formateaFecha, formateaFechaCorta, nombreMesCorto, mesDe } from '../lib/fechas'
import { calculaPatrimonio, seriePatrimonio, totalDeuda, ultimaFoto, ultimosValores, valorEn } from '../lib/patrimonio'
import type { PropsPantalla } from '../navegacion'
import type { Deuda, FotoPatrimonio, ValorCuenta } from '../types'

interface Props extends PropsPantalla {
  onError: (mensaje: string) => void
}

type Modo = 'ver' | 'foto'

export function Patrimonio({ hoy, onError }: Props) {
  const cuentas = useCuentas()
  const deudas = useDeudas()
  const fotos = useFotos()
  const comprasBitcoin = useComprasBitcoin()

  const [modo, setModo] = useState<Modo>('ver')
  const [fechaFoto, setFechaFoto] = useState(hoy)
  const [notasFoto, setNotasFoto] = useState('')
  const [borrador, setBorrador] = useState<Record<string, string>>({})
  const [deudaEnEdicion, setDeudaEnEdicion] = useState<Deuda | 'nueva' | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState<number | null>(null)

  const fotoActual = useMemo(() => ultimaFoto(fotos), [fotos])
  const serie = useMemo(() => seriePatrimonio(fotos, cuentas), [fotos, cuentas])
  const patrimonio = useMemo(
    () => calculaPatrimonio(fotoActual ?? undefined, cuentas, deudas),
    [fotoActual, cuentas, deudas],
  )
  const deudaTotal = useMemo(() => totalDeuda(deudas), [deudas])

  /** Cuántas deudas hay de cada clase, para poder decirlo en la tarjeta del total. */
  const deudasActivas = deudas.filter((d) => d.activa).length
  const deudasPropias = deudas.filter((d) => d.activa && !d.compartida).length
  const ultimos = useMemo(() => ultimosValores(fotos), [fotos])

  const cuentasActivas = cuentas.filter((c) => c.activa)
  /**
   * Las cuentas que salen en la lista: las activas y, además, las desactivadas que TODAVÍA tienen
   * valor en la última foto.
   *
   * Esas siguen contando en el total bruto (el total de cada mes se calcula con todas las cuentas,
   * para no reescribir el pasado), así que si no se listaran, las cuentas de la lista no sumarían
   * el total... que es exactamente lo que parece un error de la app.
   */
  const cuentasEnLaLista = cuentas.filter(
    (c) => c.activa || (fotoActual ? valorEn(fotoActual, c.nombre) !== undefined : false),
  )
  const liquidez = cuentasEnLaLista.filter((c) => c.bloque === 'liquidez')
  const activos = cuentasEnLaLista.filter((c) => c.bloque === 'activo')

  const bitcoinTotal = useMemo(() => {
    const cantidad = comprasBitcoin.reduce((t, c) => t + c.cantidadBtc, 0)
    const invertido = comprasBitcoin.reduce((t, c) => t + (c.importe ?? 0), 0)
    const valorActual = valorEn(fotoActual ?? undefined, 'Bitcoin') ?? 0
    return {
      cantidad,
      invertido: redondea(invertido),
      precioMedio: cantidad > 0 ? redondea(invertido / cantidad) : 0,
      valorActual,
      resultado: redondea(valorActual - invertido),
    }
  }, [comprasBitcoin, fotoActual])

  const abrirFoto = () => {
    // Se precarga con lo que valian las cuentas la ultima vez: casi todos los meses basta
    // con corregir dos o tres numeros.
    const inicial: Record<string, string> = {}
    for (const cuenta of cuentasActivas) {
      const valor = fotoActual ? valorEn(fotoActual, cuenta.nombre) ?? ultimos[cuenta.nombre] : ultimos[cuenta.nombre]
      inicial[cuenta.nombre] = valor === undefined ? '' : String(valor).replace('.', ',')
    }
    setBorrador(inicial)
    setFechaFoto(hoy)
    setNotasFoto('')
    setModo('foto')
  }

  const guardarFotoActual = async () => {
    const valores: ValorCuenta[] = []
    for (const cuenta of cuentasActivas) {
      const texto = borrador[cuenta.nombre]
      if (!texto || !texto.trim()) continue
      const importe = parseaImporte(texto)
      if (importe === null) {
        onError(`El valor de "${cuenta.nombre}" no se entiende.`)
        return
      }
      valores.push({ cuenta: cuenta.nombre, importe })
    }
    if (valores.length === 0) {
      onError('No hay ningún valor que guardar.')
      return
    }

    const yaExiste = fotos.find((f) => f.fecha === fechaFoto)
    const foto: FotoPatrimonio = {
      fecha: fechaFoto,
      valores,
      notas: notasFoto.trim() || undefined,
      origen: 'manual',
      fechaAproximada: false,
      ...(yaExiste?.id ? { id: yaExiste.id } : {}),
    }
    try {
      await guardaFoto(foto)
      setModo('ver')
    } catch (error) {
      onError(`No se pudo guardar la foto: ${(error as Error).message}`)
    }
  }

  const borrarFotoDelDia = async (id: number) => {
    try {
      await borraFoto(id)
    } catch (error) {
      onError(`No se pudo borrar: ${(error as Error).message}`)
    }
  }

  const guardarDeuda = async (deuda: Deuda) => {
    try {
      await guardaDeuda(deuda)
      setDeudaEnEdicion(null)
    } catch (error) {
      onError(`No se pudo guardar la deuda: ${(error as Error).message}`)
    }
  }

  // ---------------------------------------------------------------- Modo foto
  if (modo === 'foto') {
    return (
      <div>
        <Tarjeta titulo="Foto del patrimonio">
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="fecha-foto">
              Fecha de la foto
            </label>
            <input
              id="fecha-foto"
              className="entrada"
              type="date"
              value={fechaFoto}
              onChange={(evento) => setFechaFoto(evento.target.value)}
            />
          </div>
          {fotos.some((f) => f.fecha === fechaFoto) && (
            <Aviso tono="atencion">
              Ya hay una foto de ese día. Si guardas, se <strong>reemplaza</strong> por estos valores.
            </Aviso>
          )}
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            Vienen rellenadas con los valores de la última foto. Corrige lo que haya cambiado y deja
            en blanco lo que no quieras guardar.
          </p>
        </Tarjeta>

        {[
          { titulo: 'Liquidez', lista: liquidez },
          { titulo: 'Inversiones y activos', lista: activos },
        ].map((bloque) => (
          <Tarjeta key={bloque.titulo} titulo={bloque.titulo}>
            {bloque.lista.map((cuenta) => {
              // El `id` se hace con el numero de cuenta y NO con su nombre: los nombres llevan
              // espacios, tildes y parentesis ("Cuenta corriente (banco)"), y aunque un `id` asi es
              // legal en HTML, cualquier selector CSS se rompe con ellos. Se descubrio al
              // escribir una prueba que intentaba localizar el campo.
              const indice = cuentasActivas.indexOf(cuenta)
              return (
                <div className="campo" key={cuenta.nombre}>
                  <label className="campo__etiqueta" htmlFor={`foto-cuenta-${indice}`}>
                    {cuenta.nombre}
                  </label>
                  <input
                    id={`foto-cuenta-${indice}`}
                    className="entrada"
                    type="text"
                    inputMode="decimal"
                    value={borrador[cuenta.nombre] ?? ''}
                    onChange={(evento) =>
                      setBorrador((anterior) => ({ ...anterior, [cuenta.nombre]: evento.target.value }))
                    }
                  />
                </div>
              )
            })}
          </Tarjeta>
        ))}

        <Tarjeta titulo="Notas">
          <textarea
            className="entrada"
            rows={2}
            value={notasFoto}
            placeholder="Por ejemplo: mes con la extra de junio"
            onChange={(evento) => setNotasFoto(evento.target.value)}
          />
        </Tarjeta>

        <button type="button" className="boton boton--principal boton--ancho" onClick={guardarFotoActual}>
          Guardar la foto
        </button>
        <button
          type="button"
          className="boton boton--ancho"
          style={{ marginTop: 10 }}
          onClick={() => setModo('ver')}
        >
          Cancelar
        </button>
      </div>
    )
  }

  /**
   * Las deudas, como una seccion mas de Patrimonio y NO como una pantalla aparte.
   *
   * Estaban detras de un boton ("Revisar las deudas") y no se encontraban, con razon: son algo que
   * se toca todos los meses (la hipoteca baja sola, y los prestamos se amortizan y desaparecen) y
   * estaban a dos toques de distancia y sin ninguna pista de por donde se entraba. Ahora se ven al
   * abrir Patrimonio, cada una con su boton de editar.
   */
  const seccionDeDeudas = () => (
    <>
        <Tarjeta titulo="Mis deudas">
          <Cifra valor={formateaImporte(deudaTotal.propia)} etiqueta="Deuda propia" tono="negativa" />
          {/*
            El desglose tiene que verse, y no es un detalle: el numero grande NO es la suma de todo
            lo de la lista de abajo. La deuda compartida (la que paga otra persona, aunque el riesgo
            sea tuyo) no se resta del patrimonio. Sin decirlo, la lista parece no cuadrar, y con
            razon: sumando las cuatro deudas sale mas que el total. Paso de verdad.
          */}
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Es la que se resta del patrimonio: {deudasPropias}{' '}
            {deudasPropias === 1 ? 'deuda' : 'deudas'} de la lista de abajo.
          </p>
          {deudaTotal.compartida > 0 && (
            <>
              <div className="separador" />
              <div className="reparte">
                <span className="fila__principal">
                  <span className="fila__titulo">Deuda compartida</span>
                  <span className="fila__detalle">
                    No se resta: la paga otra persona, aunque el riesgo es tuyo
                  </span>
                </span>
                <span className="fila__importe">{formateaImporte(deudaTotal.compartida)}</span>
              </div>
              <div className="reparte">
                <span className="fila__principal">
                  <span className="fila__titulo">Total apuntado</span>
                  <span className="fila__detalle">
                    Las {deudasActivas} deudas de la lista, sumadas
                  </span>
                </span>
                <span className="fila__importe">{formateaImporte(deudaTotal.total)}</span>
              </div>
            </>
          )}
        </Tarjeta>

        {deudas.map((deuda) =>
          deudaEnEdicion !== 'nueva' && deudaEnEdicion?.id === deuda.id ? (
            <FormularioDeuda
              key={deuda.id}
              inicial={deuda}
              onGuardar={guardarDeuda}
              onCancelar={() => setDeudaEnEdicion(null)}
              onBorrar={async () => {
                if (confirmarBorrado !== deuda.id) {
                  setConfirmarBorrado(deuda.id ?? null)
                  return
                }
                if (deuda.id) await borraDeuda(deuda.id)
                setDeudaEnEdicion(null)
                setConfirmarBorrado(null)
              }}
              confirmarBorrado={confirmarBorrado === deuda.id}
            />
          ) : (
            <Tarjeta key={deuda.id}>
              <div className="reparte">
                <span className="fila__principal">
                  <span className="fila__titulo">{deuda.nombre}</span>
                  <span className="fila__detalle">
                    saldo a {formateaFechaCorta(deuda.fechaSaldo)}
                    {deuda.interes ? ` · ${deuda.interes} %` : ''}
                    {deuda.vence ? ` · vence ${formateaFechaCorta(deuda.vence)}` : ''}
                  </span>
                  {/*
                    Las etiquetas van en su propia linea, y NO dentro del titulo: el titulo se corta
                    con puntos suspensivos cuando el nombre es largo ("Préstamo solidario
                    (Bankinter)..."), y la etiqueta "compartida" desaparecia con el. Justo la que
                    explica por que esa deuda no suma en el total.
                  */}
                  {deuda.compartida && (
                    <span className="fila__detalle">
                      <span className="etiqueta">compartida</span>
                    </span>
                  )}
                  {/*
                    Un saldo de hace mas de mes y medio suele estar mal: las hipotecas bajan todos
                    los meses y los prestamos se amortizan. Se avisa en vez de dar por bueno un
                    numero viejo, que es lo que hacia la hoja de calculo.
                  */}
                  {deuda.activa && diferenciaDias(deuda.fechaSaldo, hoy) > 45 && (
                    <span className="fila__detalle">
                      <span className="etiqueta">saldo antiguo</span>
                    </span>
                  )}
                  {!deuda.activa && (
                    <span className="fila__detalle">
                      <span className="etiqueta">pagada</span>
                    </span>
                  )}
                </span>
                <span className="fila__importe fila__importe--gasto">{formateaImporte(deuda.saldo)}</span>
              </div>
              {deuda.notas && <p className="texto-tenue">{deuda.notas}</p>}
              <div className="en-linea" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="boton boton--pequeno"
                  onClick={() => {
                    setConfirmarBorrado(null)
                    setDeudaEnEdicion(deuda)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="boton boton--pequeno"
                  onClick={async () => {
                    setConfirmarBorrado(null)
                    await guardaDeuda({ ...deuda, activa: !deuda.activa })
                  }}
                >
                  {deuda.activa ? 'Marcar como pagada' : 'Volver a activar'}
                </button>
                {/*
                  Borrar está aquí, en la lista, y no solo dentro del formulario de edición. Estaba
                  únicamente allí (había que pulsar Editar y bajar por el formulario), y eso no se
                  encuentra: si se puede añadir una deuda desde la lista, se tiene que poder quitar
                  desde la lista. Pide confirmación en el segundo toque, porque borrar no se deshace.
                */}
                <button
                  type="button"
                  className="boton boton--pequeno boton--peligro"
                  onClick={async () => {
                    if (confirmarBorrado !== deuda.id) {
                      setConfirmarBorrado(deuda.id ?? null)
                      return
                    }
                    if (deuda.id) await borraDeuda(deuda.id)
                    setConfirmarBorrado(null)
                  }}
                >
                  {confirmarBorrado === deuda.id ? 'Confirmar borrado' : 'Borrar'}
                </button>
              </div>
            </Tarjeta>
          ),
        )}

        {deudaEnEdicion === 'nueva' ? (
          <FormularioDeuda
            inicial={{
              nombre: '',
              saldo: 0,
              fechaSaldo: hoy,
              compartida: false,
              activa: true,
            }}
            onGuardar={guardarDeuda}
            onCancelar={() => setDeudaEnEdicion(null)}
          />
        ) : (
          <button
            type="button"
            className="boton boton--ancho"
            onClick={() => {
              setConfirmarBorrado(null)
              setDeudaEnEdicion('nueva')
            }}
          >
            + Añadir una deuda
          </button>
        )}
    </>
  )

  // ------------------------------------------------------------------ Modo ver
  const primera = serie[0]
  const ultima = serie[serie.length - 1]

  return (
    <div>
      <Tarjeta destacada>
        <span className="cifra__etiqueta">
          Patrimonio neto {fotoActual ? `· ${formateaFecha(fotoActual.fecha)}` : ''}
        </span>
        <Cifra valor={formateaImporte(patrimonio.neto)} tono="auto" />
        <div className="rejilla rejilla--3" style={{ marginTop: 12 }}>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Cuentas</span>
            <div className="cifra cifra--pequena">{formateaImporte(patrimonio.liquidez)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Inversiones</span>
            <div className="cifra cifra--pequena">{formateaImporte(patrimonio.activos)}</div>
          </div>
          <div className="rejilla__celda">
            <span className="cifra__etiqueta">Deuda</span>
            <div className="cifra cifra--pequena cifra--negativa">−{formateaImporte(patrimonio.deuda)}</div>
          </div>
        </div>
        {patrimonio.neto < 0 && (
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Sale negativo, y es correcto: debes más de lo que tienes. Lo que <em>no</em> es correcto es
            el número del Excel, que sumaba las cuentas y los fondos pero no restaba ni la hipoteca.
          </p>
        )}
      </Tarjeta>

      {/*
        Este aviso cambia según haya deudas o no, y no es un detalle: sin deudas apuntadas, el
        "neto" que enseña la app es en realidad el patrimonio BRUTO, o sea el mismo número
        engañoso que daba el Excel. Hay que decirlo en vez de dejar creer que ya está todo.
      */}
      {deudas.filter((d) => d.activa && !d.compartida).length === 0 ? (
        <Aviso tono="atencion">
          <strong>Todavía no has apuntado ninguna deuda.</strong> Sin ellas, el neto que ves arriba es en
          realidad lo que tienes, sin restar lo que debes: justo el número engañoso que daba el Excel.
          Añade la hipoteca, los préstamos y las tarjetas, con su saldo, y el patrimonio dirá la verdad.{' '}
          <button
            type="button"
            className="tarjeta__accion"
            onClick={() => {
              setConfirmarBorrado(null)
              setDeudaEnEdicion('nueva')
            }}
          >
            Añadir mis deudas
          </button>
        </Aviso>
      ) : (
        <Aviso tono="info">
          Tienes <strong>{deudas.filter((d) => d.activa).length}</strong>{' '}
          {deudas.filter((d) => d.activa).length === 1 ? 'deuda apuntada' : 'deudas apuntadas'}, aquí
          abajo. Actualízalas cuando amortices: cada vez que cambia un saldo, el patrimonio neto cambia
          con él.
        </Aviso>
      )}

      {seccionDeDeudas()}

      <Tarjeta
        titulo="Evolución"
        accion={
          <button type="button" className="tarjeta__accion" onClick={abrirFoto}>
            📸 Hacer la foto de hoy
          </button>
        }
      >
        {serie.length >= 2 && (
          <>
            <Grafica
              titulo="Evolución del patrimonio"
              puntos={serie.map((punto) => ({ etiqueta: nombreMesCorto(mesDe(punto.fecha)), valor: punto.bruto }))}
              formatea={formateaCompacto}
              maximo={18}
            />
            <div className="rejilla rejilla--3" style={{ marginTop: 10 }}>
              <div className="rejilla__celda">
                <span className="cifra__etiqueta">Primera · {nombreMesCorto(mesDe(primera.fecha))}</span>
                <div className="cifra cifra--pequena">{formateaImporte(primera.bruto)}</div>
              </div>
              <div className="rejilla__celda">
                <span className="cifra__etiqueta">Última · {nombreMesCorto(mesDe(ultima.fecha))}</span>
                <div className="cifra cifra--pequena">{formateaImporte(ultima.bruto)}</div>
              </div>
              <div className="rejilla__celda">
                <span className="cifra__etiqueta">Diferencia</span>
                <div className={`cifra cifra--pequena ${ultima.bruto - primera.bruto < 0 ? 'cifra--negativa' : 'cifra--positiva'}`}>
                  {formateaImporte(redondea(ultima.bruto - primera.bruto))}
                </div>
              </div>
            </div>
            <p className="texto-tenue" style={{ marginBottom: 0 }}>
              Esta línea es patrimonio BRUTO (cuentas + inversiones). La deuda no se puede restar hacia
              atrás: tu Excel no la registraba y no hay forma de saber cuánto se debía en cada mes.
              Inventarlo sería peor que no enseñarlo.
            </p>
          </>
        )}
      </Tarjeta>

      <Tarjeta titulo="Mis cuentas" sinRelleno>
        {[
          { titulo: 'Liquidez', lista: liquidez },
          { titulo: 'Inversiones', lista: activos },
        ].map((bloque) => (
          <div key={bloque.titulo}>
            <div className="cabecera-dia">{bloque.titulo}</div>
            {bloque.lista.map((cuenta) => {
              const valor = fotoActual ? valorEn(fotoActual, cuenta.nombre) : undefined
              return (
                <div className="fila" key={cuenta.nombre}>
                  <span className="fila__principal">
                    <span className="fila__titulo">{cuenta.nombre}</span>
                    <span className="fila__detalle">
                      {valor === undefined ? 'sin valor en la última foto' : `el ${formateaFechaCorta(fotoActual!.fecha)}`}
                      {!cuenta.activa ? ' · desactivada, pero cuenta en el total de esos meses' : ''}
                    </span>
                  </span>
                  <span className="fila__importe">{valor === undefined ? '—' : formateaImporte(valor)}</span>
                </div>
              )
            })}
          </div>
        ))}
        <div className="fila">
          <span className="fila__principal">
            <span className="fila__titulo">Total bruto</span>
          </span>
          <span className="fila__importe">{formateaImporte(patrimonio.bruto)}</span>
        </div>
      </Tarjeta>

      {comprasBitcoin.length > 0 && (
        <Tarjeta titulo="Bitcoin">
          <Cifra
            valor={`${bitcoinTotal.cantidad.toFixed(8)} BTC`}
            etiqueta="Compras anotadas (oct-dic 2025)"
            tamano="mediana"
          />
          <div className="rejilla rejilla--2" style={{ marginTop: 12 }}>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Invertido</span>
              <div className="cifra cifra--pequena">{formateaImporte(bitcoinTotal.invertido)}</div>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Precio medio de compra</span>
              <div className="cifra cifra--pequena">{formateaImporte(bitcoinTotal.precioMedio)}</div>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Valor en la última foto</span>
              <div className="cifra cifra--pequena">{formateaImporte(bitcoinTotal.valorActual)}</div>
            </div>
            <div className="rejilla__celda">
              <span className="cifra__etiqueta">Resultado</span>
              <div className={bitcoinTotal.resultado < 0 ? 'cifra cifra--pequena cifra--negativa' : 'cifra cifra--pequena cifra--positiva'}>
                {formateaImporte(bitcoinTotal.resultado)}
              </div>
            </div>
          </div>
          <p className="texto-tenue" style={{ marginBottom: 0 }}>
            Estas {comprasBitcoin.length} compras son las que vienen en tu copia, y pueden no ser todas:
            si has comprado Bitcoin en otro sitio o en otras fechas, faltarán aquí. El total de verdad es
            el que pongas en la cuenta Bitcoin al hacer la foto del mes, que es el que suma en el
            patrimonio.
          </p>
        </Tarjeta>
      )}

      <Tarjeta titulo="Fotos guardadas" sinRelleno>
        <div className="lista">
          {[...fotos]
            .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
            .slice(0, 12)
            .map((foto) => (
              <div className="fila" key={foto.id ?? foto.fecha}>
                <span className="fila__principal">
                  <span className="fila__titulo">{formateaFecha(foto.fecha)}</span>
                  <span className="fila__detalle">
                    {foto.origen === 'excel' ? (
                      <span className="etiqueta etiqueta--excel">del Excel</span>
                    ) : (
                      <span className="etiqueta">apuntada a mano</span>
                    )}
                    {foto.fechaAproximada && ' · fecha deducida del mes'}
                    {foto.notas ? ` · ${foto.notas}` : ''}
                  </span>
                </span>
                <span className="fila__importe">
                  {formateaImporte(
                    fotos.length > 0
                      ? redondea(foto.valores.reduce((total, valor) => total + valor.importe, 0))
                      : 0,
                  )}
                </span>
                {foto.id && foto.origen === 'manual' && (
                  <button
                    type="button"
                    className="boton boton--pequeno boton--peligro"
                    onClick={() => borrarFotoDelDia(foto.id!)}
                    aria-label={`Borrar la foto del ${foto.fecha}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
        </div>
        <div className="tarjeta__pie">
          {fotos.length} fotos · desde {fotos.length > 0 ? formateaFecha(fotos[0].fecha) : '—'} ·{' '}
          <button type="button" className="tarjeta__accion" onClick={abrirFoto}>
            Añadir una
          </button>
        </div>
      </Tarjeta>

      <p className="texto-tenue" style={{ textAlign: 'center' }}>
        La primera foto (enero de 2024) y todas las del Excel son las que había en tu hoja de cálculo.
        Solo se pueden borrar las que apuntes aquí.
      </p>
    </div>
  )
}

interface PropsFormularioDeuda {
  inicial: Deuda
  onGuardar: (deuda: Deuda) => void
  onCancelar: () => void
  onBorrar?: () => void
  confirmarBorrado?: boolean
}

function FormularioDeuda({ inicial, onGuardar, onCancelar, onBorrar, confirmarBorrado }: PropsFormularioDeuda) {
  const [nombre, setNombre] = useState(inicial.nombre)
  const [saldo, setSaldo] = useState(inicial.saldo ? String(inicial.saldo).replace('.', ',') : '')
  const [fechaSaldo, setFechaSaldo] = useState(inicial.fechaSaldo)
  const [interes, setInteres] = useState(inicial.interes ? String(inicial.interes).replace('.', ',') : '')
  const [vence, setVence] = useState(inicial.vence ?? '')
  const [compartida, setCompartida] = useState(inicial.compartida)
  const [notas, setNotas] = useState(inicial.notas ?? '')

  return (
    <Tarjeta titulo={inicial.id ? 'Editar deuda' : 'Nueva deuda'}>
      <div className="campo">
        <label className="campo__etiqueta" htmlFor="deuda-nombre">
          Nombre
        </label>
        <input
          id="deuda-nombre"
          className="entrada"
          value={nombre}
          placeholder="Hipoteca, préstamo, tarjeta…"
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>
      <div className="campo">
        <label className="campo__etiqueta" htmlFor="deuda-saldo">
          Capital pendiente
        </label>
        <input
          id="deuda-saldo"
          className="entrada"
          inputMode="decimal"
          value={saldo}
          onChange={(evento) => setSaldo(evento.target.value)}
        />
      </div>
      <div className="campo">
        <label className="campo__etiqueta" htmlFor="deuda-fecha">
          Saldo a fecha de
        </label>
        <input
          id="deuda-fecha"
          className="entrada"
          type="date"
          value={fechaSaldo}
          onChange={(evento) => setFechaSaldo(evento.target.value)}
        />
      </div>
      <div className="rejilla rejilla--2">
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="deuda-interes">
            Interés anual (%)
          </label>
          <input
            id="deuda-interes"
            className="entrada"
            inputMode="decimal"
            value={interes}
            onChange={(evento) => setInteres(evento.target.value)}
          />
        </div>
        <div className="campo">
          <label className="campo__etiqueta" htmlFor="deuda-vence">
            Vence
          </label>
          <input
            id="deuda-vence"
            className="entrada"
            type="date"
            value={vence}
            onChange={(evento) => setVence(evento.target.value)}
          />
        </div>
      </div>
      <div className="campo">
        <label className="campo__etiqueta" htmlFor="deuda-notas">
          Notas
        </label>
        <textarea
          id="deuda-notas"
          className="entrada"
          rows={2}
          value={notas}
          onChange={(evento) => setNotas(evento.target.value)}
        />
      </div>
      <label className="en-linea" style={{ marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={compartida}
          onChange={(evento) => setCompartida(evento.target.checked)}
        />
        <span>
          La paga otra persona
          <br />
          <span className="texto-tenue">
            Se enseña aparte y no se resta del neto, pero queda fichada como riesgo tuyo.
          </span>
        </span>
      </label>

      <button
        type="button"
        className="boton boton--principal boton--ancho"
        onClick={() => {
          const importe = parseaImporte(saldo)
          if (!nombre.trim() || importe === null) return
          onGuardar({
            ...inicial,
            nombre: nombre.trim(),
            saldo: Math.abs(importe),
            fechaSaldo,
            interes: interes ? (parseaImporte(interes) ?? undefined) : undefined,
            vence: vence || undefined,
            compartida,
            notas: notas.trim() || undefined,
          })
        }}
      >
        Guardar
      </button>
      {onBorrar && (
        <button type="button" className="boton boton--peligro boton--ancho" style={{ marginTop: 10 }} onClick={onBorrar}>
          {confirmarBorrado ? 'Confirmar borrado' : 'Borrar'}
        </button>
      )}
      <button type="button" className="boton boton--ancho" style={{ marginTop: 10 }} onClick={onCancelar}>
        Cancelar
      </button>
    </Tarjeta>
  )
}
