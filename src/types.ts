/**
 * Modelo de datos de Oikos.
 *
 * La decision mas importante de todo el modelo: **invertir y amortizar no son gasto**.
 * En el excel de partida, meter 200 EUR en un fondo aparecia mezclado con comprar
 * en el supermercado, y asi el resumen de "en que se me va el dinero" miente: ese dinero no se
 * va, cambia de sitio (de la cuenta corriente al fondo, o del bolsillo al banco bajando
 * la hipoteca). Por eso hay cuatro tipos de movimiento y el resumen del mes los separa:
 *
 *   ingreso       -> entra dinero
 *   gasto         -> sale y NO vuelve (alimentacion, ocio, hipoteca, transporte...)
 *   inversion     -> sale de la cuenta pero se convierte en patrimonio tuyo
 *   amortizacion  -> sale de la cuenta pero reduce lo que debes
 *
 * El "disponible" del mes es ingresos - gastos - inversion - amortizacion: lo que de
 * verdad queda libre.
 */

/** Los cuatro tipos de movimiento. */
export type TipoMovimiento = 'ingreso' | 'gasto' | 'inversion' | 'amortizacion'

/** Estados del semaforo de un presupuesto. */
export type EstadoPresupuesto = 'holgado' | 'ajustado' | 'pasado'

/** De donde sale un movimiento: lo apuntado a mano o lo sembrado del historico. */
export type OrigenMovimiento = 'manual' | 'historico'

/** Un movimiento economico puntual. */
export interface Movimiento {
  id?: number
  /** Fecha del movimiento, en formato YYYY-MM-DD (nunca la fecha de creacion). */
  fecha: string
  tipo: TipoMovimiento
  /** Nombre de la categoria. Se guarda el nombre, no un id, para que la copia de
   *  seguridad se lea entera sin necesidad de cruzar tablas. */
  categoria: string
  concepto: string
  /** Siempre en positivo. El signo lo pone el tipo, nunca el usuario. */
  importe: number
  cuenta?: string
  notas?: string
  origen: OrigenMovimiento
  /** Momento en que se apunto (ISO), para desempatar y para auditar. */
  creado: string
}

/** Categoria de un movimiento. Editable por el usuario. */
export interface Categoria {
  id?: number
  nombre: string
  /** A que tipo de movimiento pertenece. */
  ambito: TipoMovimiento
  /** Los gastos esenciales (vivienda, comida, suministros) van primero en los avisos. */
  esencial: boolean
  /** Venia del registro real de gastos de la persona (no es una sugerencia de la app). */
  historica: boolean
  activa: boolean
  orden: number
}

/** Una cuenta o producto del patrimonio. */
export interface Cuenta {
  id?: number
  nombre: string
  bloque: BloquePatrimonio
  orden: number
  activa: boolean
}

export type BloquePatrimonio = 'liquidez' | 'activo'

/**
 * Una deuda.
 *
 * Existe como tabla propia (y no como una linea mas de la foto de patrimonio) porque el excel de
 * partida NO registraba ninguna deuda: su "VALOR NETO TOTAL" sumaba las cuentas y los fondos sin
 * restar lo que se debia, asi que daba un patrimonio mucho mas alto del real. Ademas el saldo de
 * una hipoteca cambia todos los meses, asi que necesita su propia fecha de saldo.
 */
export interface Deuda {
  id?: number
  nombre: string
  /** Capital pendiente, en positivo. */
  saldo: number
  /** Fecha a la que corresponde ese saldo. */
  fechaSaldo: string
  /** Tipo de interes anual en %, solo informativo. */
  interes?: number
  /** Fecha de vencimiento, si la tiene. */
  vence?: string
  /** La paga otra persona, pero el riesgo es tuyo: se muestra aparte. */
  compartida: boolean
  notas?: string
  activa: boolean
}

/** Foto del patrimonio en una fecha concreta: cuanto habia en cada cuenta. */
export interface FotoPatrimonio {
  id?: number
  fecha: string
  /** Valor de cada cuenta ese dia. */
  valores: ValorCuenta[]
  notas?: string
  origen: 'excel' | 'manual'
  /** La fecha del excel no era fiable al 100% (se dedujo del mes). */
  fechaAproximada: boolean
}

export interface ValorCuenta {
  cuenta: string
  importe: number
}

/** Tope de gasto mensual de una categoria. */
export interface Presupuesto {
  id?: number
  categoria: string
  /** Tope mensual en euros. */
  importe: number
  activo: boolean
}

/** Ajustes sueltos, en pares clave/valor. */
export interface Ajuste {
  clave: string
  valor: string
}

/**
 * Una compra de Bitcoin, importada de la hoja de criptomonedas de la hoja de cálculo de partida.
 *
 * Se guarda compra a compra (y no solo el total) porque permite calcular el precio medio
 * de entrada, que es el dato que de verdad se quiere saber cuando el precio se mueve.
 */
export interface CompraBitcoin {
  fecha: string
  /** Precio del BTC ese dia, en euros. */
  precioBtc: number
  cantidadBtc: number
  /** Lo que costo la compra, en euros. */
  importe: number
}

// ---------------------------------------------------------------------------
// Lo que devuelven los calculos
// ---------------------------------------------------------------------------

export interface GastoPorCategoria {
  categoria: string
  importe: number
  /** Numero de movimientos de esa categoria en el mes. */
  numero: number
}

export interface ResumenMes {
  /** Mes en formato YYYY-MM. */
  mes: string
  ingresos: number
  gastos: number
  inversion: number
  amortizacion: number
  /** Ingresos - gastos - inversion - amortizacion. Puede ser negativo. */
  disponible: number
  /** (inversion + amortizacion) / ingresos, en %. */
  tasaAhorro: number
  gastosPorCategoria: GastoPorCategoria[]
  /** Todos los movimientos del mes, del mas reciente al mas antiguo. */
  movimientos: Movimiento[]
  /** Cuantos dias del mes tienen algun movimiento. */
  diasConActividad: number
  /** Gasto medio por dia de los dias ya transcurridos del mes. */
  gastoMedioDiario: number
}

export interface ComparativaCategoria {
  categoria: string
  /** Gasto de este mes. */
  actual: number
  /** Media mensual completa de los meses anteriores con datos (sin contar el actual). */
  media: number
  /**
   * La media "hasta hoy".
   *
   * Comparar el dia 8 del mes con la media de un mes entero seria una trampa: siempre
   * saldria que vas gastando poco. Si el mes esta en curso, la media se prorratea por los
   * dias transcurridos, y es contra ESTA contra la que se compara.
   */
  mediaAjustada: number
  /** Cuantos meses entran en la media. */
  mesesComparados: number
  /** actual - media. */
  diferencia: number
  /** Variacion en %, o null si no hay media con la que comparar. */
  variacion: number | null
}

export interface Recurrente {
  /** Concepto normalizado que agrupa los cargos. */
  concepto: string
  /** Nombre tal cual se escribio la ultima vez, para enseñarlo bonito. */
  etiqueta: string
  categoria: string
  tipo: TipoMovimiento
  /** Importe tipico (la mediana de los cargos). */
  importe: number
  /** Cuantos meses distintos tienen un cargo de estos. */
  meses: number
  /** Fechas de los cargos, de la mas antigua a la mas reciente. */
  fechas: string[]
  /** Coste anual estimado, teniendo en cuenta cada cuanto se paga. */
  costeAnual: number
  /** Dia del mes en que suele caer. */
  diaHabitual: number
  /** true si el importe varia mas de un 10% entre cargos. */
  variable: boolean
  /** Cada cuantos meses se repite: 1 = mensual, 3 = trimestral, 12 = anual. */
  periodicidadMeses: number
}

export interface Patrimonio {
  liquidez: number
  activos: number
  /** liquidez + activos. */
  bruto: number
  /** Deuda total (sin las compartidas). */
  deuda: number
  /** Deuda que paga otra persona pero cuyo riesgo es tuyo. */
  deudaCompartida: number
  /** bruto - deuda. Puede ser negativo, y si lo es, se dice claramente. */
  neto: number
}

export interface ComparativaPresupuesto {
  categoria: string
  presupuesto: number
  gastado: number
  restante: number
  /** % consumido del presupuesto. */
  porcentaje: number
  estado: EstadoPresupuesto
}
