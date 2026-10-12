/**
 * Fechas de Oikos.
 *
 * Todo se maneja como texto `YYYY-MM-DD` (el mismo formato que usa el vault de Oscar, para
 * que exportar e importar no cambie nada) y los meses como `YYYY-MM`.
 *
 * CUIDADO con la trampa clasica: `new Date('2026-09-22')` se interpreta como medianoche UTC,
 * y en un pais con huso negativo eso devuelve el dia 21. Aqui las fechas SIEMPRE se
 * construyen con `new Date(anio, mes - 1, dia)`, que es hora local.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** Fecha de hoy en formato YYYY-MM-DD, en hora local. */
export function hoyISO(ahora: Date = new Date()): string {
  return aISO(ahora)
}

/** Convierte un Date a YYYY-MM-DD usando hora local (nunca toISOString, que va en UTC). */
export function aISO(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** 'YYYY-MM-DD' -> Date local. Devuelve null si el texto no vale. */
export function aFecha(iso: string): Date | null {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim())
  if (!coincide) return null
  const [, anio, mes, dia] = coincide
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia))
  // Rechaza fechas imposibles como 2026-02-31 (JavaScript las desborda a marzo).
  if (fecha.getFullYear() !== Number(anio) || fecha.getMonth() !== Number(mes) - 1 || fecha.getDate() !== Number(dia)) {
    return null
  }
  return fecha
}

/** ¿Es una fecha valida en formato YYYY-MM-DD? */
export function esFechaValida(iso: string): boolean {
  return aFecha(iso) !== null
}

/** '2026-09-22' -> '2026-09' */
export function mesDe(fecha: string): string {
  return String(fecha ?? '').slice(0, 7)
}

/** '2026-09' -> 'septiembre de 2026' */
export function nombreMes(mes: string): string {
  const [anio, m] = String(mes ?? '').split('-')
  const indice = Number(m) - 1
  if (!MESES[indice]) return String(mes ?? '')
  return `${MESES[indice]} de ${anio}`
}

/** '2026-09' -> 'sep 26' (para ejes de graficas y listas apretadas) */
export function nombreMesCorto(mes: string): string {
  const [anio, m] = String(mes ?? '').split('-')
  const indice = Number(m) - 1
  if (!MESES_CORTOS[indice]) return String(mes ?? '')
  return `${MESES_CORTOS[indice]} ${String(anio).slice(2)}`
}

/** '2026-09' -> 'Septiembre' (sin el año, cuando ya se sabe de que año es) */
export function nombreMesSolo(mes: string): string {
  const indice = Number(String(mes ?? '').split('-')[1]) - 1
  const nombre = MESES[indice]
  return nombre ? nombre.charAt(0).toUpperCase() + nombre.slice(1) : String(mes ?? '')
}

/** '2026-09-22' -> 'martes 22 de septiembre' */
export function formateaFechaLarga(fecha: string): string {
  const d = aFecha(fecha)
  if (!d) return fecha
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

/** '2026-09-22' -> '22 sep 2026' */
export function formateaFecha(fecha: string): string {
  const d = aFecha(fecha)
  if (!d) return fecha
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`
}

/** '2026-09-22' -> '22/09/2026' */
export function formateaFechaCorta(fecha: string): string {
  const d = aFecha(fecha)
  if (!d) return fecha
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** Cuantos dias tiene el mes 'YYYY-MM'. */
export function diasDelMes(mes: string): number {
  const [anio, m] = String(mes ?? '').split('-').map(Number)
  if (!anio || !m) return 30
  return new Date(anio, m, 0).getDate()
}

/** Mes anterior a 'YYYY-MM'. */
export function mesAnterior(mes: string): string {
  const [anio, m] = String(mes ?? '').split('-').map(Number)
  const fecha = new Date(anio, m - 2, 1)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

/** Mes siguiente a 'YYYY-MM'. */
export function mesSiguiente(mes: string): string {
  const [anio, m] = String(mes ?? '').split('-').map(Number)
  const fecha = new Date(anio, m, 1)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}

/** Lista de meses de `desde` a `hasta`, ambos incluidos. */
export function listaMeses(desde: string, hasta: string): string[] {
  const meses: string[] = []
  let actual = desde
  let vueltas = 0
  // El tope de 600 vueltas (50 años) evita que un dato corrupto cuelgue la app.
  while (actual <= hasta && vueltas < 600) {
    meses.push(actual)
    actual = mesSiguiente(actual)
    vueltas += 1
  }
  return meses
}

/** Dias que han pasado del mes: si es un mes ya cerrado, el mes entero. */
export function diasTranscurridos(mes: string, hoy: string = hoyISO()): number {
  const total = diasDelMes(mes)
  if (mes < mesDe(hoy)) return total
  if (mes > mesDe(hoy)) return 0
  return Number(hoy.slice(8, 10))
}

/** ¿Es el mes en curso? */
export function esMesActual(mes: string, hoy: string = hoyISO()): boolean {
  return mes === mesDe(hoy)
}

/** ¿Es un mes futuro? */
export function esMesFuturo(mes: string, hoy: string = hoyISO()): boolean {
  return mes > mesDe(hoy)
}

/** Dia del mes (1-31) de una fecha ISO. */
export function diaDe(fecha: string): number {
  return Number(String(fecha ?? '').slice(8, 10))
}

/** Diferencia en dias entre dos fechas ISO (b - a). */
export function diferenciaDias(a: string, b: string): number {
  const fa = aFecha(a)
  const fb = aFecha(b)
  if (!fa || !fb) return 0
  return Math.round((fb.getTime() - fa.getTime()) / 86_400_000)
}

/** "Hoy", "Ayer" o la fecha larga. Es lo que se enseña en las listas. */
export function etiquetaDia(fecha: string, hoy: string = hoyISO()): string {
  const diferencia = diferenciaDias(fecha, hoy)
  if (diferencia === 0) return 'Hoy'
  if (diferencia === 1) return 'Ayer'
  if (diferencia === -1) return 'Mañana'
  if (diferencia > 1 && diferencia < 7) return `Hace ${diferencia} días`
  return formateaFechaLarga(fecha)
}

/** Añade (o resta) dias a una fecha ISO. */
export function sumaDias(fecha: string, dias: number): string {
  const d = aFecha(fecha)
  if (!d) return fecha
  d.setDate(d.getDate() + dias)
  return aISO(d)
}

/** El primer dia del mes 'YYYY-MM'. */
export function primerDia(mes: string): string {
  return `${mes}-01`
}

/** El ultimo dia del mes 'YYYY-MM'. */
export function ultimoDia(mes: string): string {
  return `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`
}

/** Lista de meses con algo de actividad, de mas antiguo a mas reciente. */
export function mesesConDatos(fechas: string[]): string[] {
  const set = new Set(fechas.filter(Boolean).map(mesDe))
  return [...set].sort()
}
