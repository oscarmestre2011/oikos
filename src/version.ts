/**
 * La version de la app y lo que ha cambiado.
 *
 * Fuente unica: de aqui salen la pantalla de Ajustes y el `CHANGELOG.md`. Si se cambia algo
 * de la app, se apunta aqui: una version sin su nota es una version que nadie sabe que trae.
 *
 * OJO: al tocar esto hay que subir tambien `VERSION` en `public/sw.js`, o los moviles que ya
 * tienen la app instalada seguirian con la copia vieja en caché.
 */

export const VERSION = '1.0.0'

export const FECHA_VERSION = '2026-10-07'

export interface Cambio {
  tipo: 'nuevo' | 'mejorado' | 'arreglado'
  texto: string
}

export interface Nota {
  version: string
  fecha: string
  titulo: string
  cambios: Cambio[]
}

export const NOVEDADES: Nota[] = [
  {
    version: '1.0.0',
    fecha: FECHA_VERSION,
    titulo: 'Oikos nace con tu histórico dentro',
    cambios: [
      {
        tipo: 'nuevo',
        texto:
          'Los 36 meses de patrimonio de tu Excel (enero 2024 – septiembre 2026) ya vienen cargados, con la evolución dibujada.',
      },
      {
        tipo: 'nuevo',
        texto:
          'Apuntar un gasto, un ingreso, una inversión o una amortización con teclado propio, en tres toques y sin depender del teclado del móvil.',
      },
      {
        tipo: 'nuevo',
        texto:
          'Invertir y amortizar NO cuentan como gasto: son dinero que cambia de sitio. El resumen del mes los separa.',
      },
      {
        tipo: 'nuevo',
        texto:
          'Patrimonio con las deudas de verdad: hipoteca, préstamo, pignoración y Firefish. El neto sale negativo, y por primera vez es el número real.',
      },
      {
        tipo: 'nuevo',
        texto: 'Presupuesto por categoría con aviso al 80 % y al pasarte, y objetivo mensual de 200 € de inversión + 200 € de amortización.',
      },
      {
        tipo: 'nuevo',
        texto:
          'Comparación del mes con tu media, ajustada a los días que llevas de mes (comparar el día 8 contra un mes entero diría siempre que vas bien).',
      },
      {
        tipo: 'nuevo',
        texto: 'Detección de gastos que se repiten, con el coste fijo mensual y anual.',
      },
      {
        tipo: 'nuevo',
        texto: 'Copia de seguridad en JSON, compartible, y exportación a Markdown con el formato del vault.',
      },
      {
        tipo: 'arreglado',
        texto:
          'La fila de variación de tu Excel tenía las fórmulas mal referenciadas desde julio de 2026: daba +269,64 € en julio cuando fueron +3.157,80 €. La app la calcula sola, bien.',
      },
    ],
  },
]

/** Lo que ha cambiado en esta version, para la pantalla de novedades. */
export const ULTIMA_NOTA = NOVEDADES[0]
