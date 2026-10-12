/**
 * Exportacion a Markdown con el formato del vault de Oscar.
 *
 * La app NO escribe en el vault por su cuenta (no puede, y ademas seria peligroso): genera
 * el texto y Oscar lo pega donde quiera. El formato sigue las reglas de su vault: fechas
 * `YYYY-MM-DD`, tablas y los importes con coma decimal.
 */

import type { ComparativaPresupuesto, FotoPatrimonio, Movimiento, ResumenMes } from '../types'
import type { BloquePatrimonio, Cuenta, Deuda } from '../types'
import { formateaNumero } from './dinero'
import { formateaFecha, nombreMes } from './fechas'

const ETIQUETA_TIPO: Record<string, string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  inversion: 'Inversión',
  amortizacion: 'Amortización',
}

/** Escapa el caracter de tabla, que rompe cualquier fila si aparece en un texto. */
function celda(texto: string): string {
  return String(texto ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
}

/** El resumen de un mes, listo para pegar en el vault. */
export function markdownDelMes(
  mes: string,
  resumen: ResumenMes,
  presupuestos: ComparativaPresupuesto[] = [],
): string {
  const lineas: string[] = []

  lineas.push('---')
  lineas.push('tipo: finanzas')
  lineas.push(`mes: ${mes}`)
  lineas.push(`generado: ${new Date().toISOString().slice(0, 10)}`)
  lineas.push('tags: [finanzas, oikos]')
  lineas.push('---')
  lineas.push('')
  lineas.push(`# Cuentas de ${nombreMes(mes)}`)
  lineas.push('')

  lineas.push('## Resumen')
  lineas.push('')
  lineas.push('| Concepto | Importe |')
  lineas.push('|---|---:|')
  lineas.push(`| Ingresos | ${formateaNumero(resumen.ingresos)} |`)
  lineas.push(`| Gastos | ${formateaNumero(resumen.gastos)} |`)
  lineas.push(`| Inversión | ${formateaNumero(resumen.inversion)} |`)
  lineas.push(`| Amortización | ${formateaNumero(resumen.amortizacion)} |`)
  lineas.push(`| Queda libre | ${formateaNumero(resumen.disponible)} |`)
  lineas.push('')

  if (resumen.gastosPorCategoria.length > 0) {
    lineas.push('## Gastos por categoría')
    lineas.push('')
    lineas.push('| Categoría | Importe | Movimientos |')
    lineas.push('|---|---:|---:|')
    for (const linea of resumen.gastosPorCategoria) {
      lineas.push(`| ${celda(linea.categoria)} | ${formateaNumero(linea.importe)} | ${linea.numero} |`)
    }
    lineas.push('')
  }

  if (presupuestos.length > 0) {
    lineas.push('## Presupuestos')
    lineas.push('')
    lineas.push('| Categoría | Tope | Gastado | Estado |')
    lineas.push('|---|---:|---:|---|')
    for (const linea of presupuestos) {
      lineas.push(
        `| ${celda(linea.categoria)} | ${formateaNumero(linea.presupuesto)} | ${formateaNumero(linea.gastado)} | ${linea.estado} |`,
      )
    }
    lineas.push('')
  }

  if (resumen.movimientos.length > 0) {
    lineas.push('## Movimientos')
    lineas.push('')
    lineas.push('| Fecha | Tipo | Categoría | Concepto | Importe |')
    lineas.push('|---|---|---|---|---:|')
    for (const movimiento of [...resumen.movimientos].reverse()) {
      lineas.push(
        `| ${movimiento.fecha} | ${ETIQUETA_TIPO[movimiento.tipo] ?? movimiento.tipo} | ${celda(movimiento.categoria)} | ${celda(movimiento.concepto)} | ${formateaNumero(movimiento.importe)} |`,
      )
    }
    lineas.push('')
  }

  return lineas.join('\n')
}

const ETIQUETA_BLOQUE: Record<BloquePatrimonio, string> = {
  liquidez: 'Liquidez',
  activo: 'Inversiones',
}

/** El patrimonio y su evolucion, listo para pegar en el vault. */
export function markdownDelPatrimonio(
  fotos: FotoPatrimonio[],
  cuentas: Cuenta[],
  deudas: Deuda[] = [],
): string {
  const lineas: string[] = []
  const ordenadas = [...fotos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  const ultima = ordenadas[ordenadas.length - 1]

  lineas.push('---')
  lineas.push('tipo: finanzas')
  lineas.push('seccion: patrimonio')
  lineas.push(`generado: ${new Date().toISOString().slice(0, 10)}`)
  lineas.push('tags: [finanzas, oikos, patrimonio]')
  lineas.push('---')
  lineas.push('')
  lineas.push('# Patrimonio')
  lineas.push('')

  if (ultima) {
    lineas.push(`## Última foto (${formateaFecha(ultima.fecha)})`)
    lineas.push('')
    lineas.push('| Cuenta | Importe |')
    lineas.push('|---|---:|')
    let total = 0
    for (const bloque of ['liquidez', 'activo'] as BloquePatrimonio[]) {
      const nombres = new Set(cuentas.filter((c) => c.bloque === bloque).map((c) => c.nombre))
      const valores = ultima.valores.filter((v) => nombres.has(v.cuenta))
      if (valores.length === 0) continue
      lineas.push(`| **${ETIQUETA_BLOQUE[bloque]}** | |`)
      for (const valor of valores) {
        lineas.push(`| ${celda(valor.cuenta)} | ${formateaNumero(valor.importe)} |`)
        total += valor.importe
      }
    }
    lineas.push(`| **Patrimonio bruto** | **${formateaNumero(total)}** |`)

    const propias = deudas.filter((d) => d.activa && !d.compartida)
    const compartidas = deudas.filter((d) => d.activa && d.compartida)
    const totalPropias = propias.reduce((t, d) => t + d.saldo, 0)
    const totalCompartidas = compartidas.reduce((t, d) => t + d.saldo, 0)

    if (propias.length > 0) {
      lineas.push('')
      lineas.push('### Deudas')
      lineas.push('')
      lineas.push('| Deuda | Saldo | A fecha de |')
      lineas.push('|---|---:|---|')
      for (const deuda of propias) {
        lineas.push(`| ${celda(deuda.nombre)} | ${formateaNumero(deuda.saldo)} | ${deuda.fechaSaldo} |`)
      }
      lineas.push(`| **Total deuda** | **${formateaNumero(totalPropias)}** | |`)
      lineas.push(`| **Patrimonio neto** | **${formateaNumero(total - totalPropias)}** | |`)
    }

    if (compartidas.length > 0) {
      lineas.push('')
      lineas.push(
        `> Deuda compartida (la paga otra persona, riesgo tuyo): ${formateaNumero(totalCompartidas)}. No entra en el neto.`,
      )
    }
    lineas.push('')
  }

  if (ordenadas.length > 0) {
    lineas.push('## Evolución')
    lineas.push('')
    lineas.push('| Fecha | Liquidez | Inversiones | Bruto |')
    lineas.push('|---|---:|---:|---:|')
    for (const foto of ordenadas) {
      let liquidez = 0
      let activos = 0
      for (const bloque of ['liquidez', 'activo'] as BloquePatrimonio[]) {
        const nombres = new Set(cuentas.filter((c) => c.bloque === bloque).map((c) => c.nombre))
        const suma = foto.valores.filter((v) => nombres.has(v.cuenta)).reduce((t, v) => t + v.importe, 0)
        if (bloque === 'liquidez') liquidez = suma
        else activos = suma
      }
      lineas.push(
        `| ${foto.fecha} | ${formateaNumero(liquidez)} | ${formateaNumero(activos)} | ${formateaNumero(liquidez + activos)} |`,
      )
    }
    lineas.push('')
    lineas.push(
      '> Las fotos anteriores a septiembre de 2026 vienen del Excel y **no incluyen deuda**: el Excel no la registraba.',
    )
    lineas.push('')
  }

  return lineas.join('\n')
}

/** Los movimientos sueltos, por si se quieren pegar en la agenda del dia. */
export function markdownDeMovimientos(movimientos: Movimiento[], titulo: string): string {
  const lineas = [`# ${titulo}`, '', '| Fecha | Tipo | Categoría | Concepto | Importe |', '|---|---|---|---|---:|']
  for (const movimiento of movimientos) {
    lineas.push(
      `| ${movimiento.fecha} | ${ETIQUETA_TIPO[movimiento.tipo] ?? movimiento.tipo} | ${celda(movimiento.categoria)} | ${celda(movimiento.concepto)} | ${formateaNumero(movimiento.importe)} |`,
    )
  }
  lineas.push('')
  return lineas.join('\n')
}
