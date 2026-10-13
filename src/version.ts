/**
 * La version de la app y lo que ha cambiado.
 *
 * Fuente unica: de aqui salen la pantalla de Ajustes y el `CHANGELOG.md`. Si se cambia algo
 * de la app, se apunta aqui: una version sin su nota es una version que nadie sabe que trae.
 *
 * OJO: al tocar esto hay que subir tambien `VERSION` en `public/sw.js`, o los moviles que ya
 * tienen la app instalada seguirian con la copia vieja en caché.
 */

export const VERSION = '1.2.0'

export const FECHA_VERSION = '2026-10-13'

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
    version: '1.2.0',
    fecha: FECHA_VERSION,
    titulo: 'Las deudas, a la vista y se pueden cambiar',
    cambios: [
      {
        tipo: 'mejorado',
        texto:
          'Las deudas están ahora en la propia pantalla de Patrimonio, con su botón de editar en cada una, en lugar de escondidas detrás de un botón. Se cambian cuando amortizas, y el patrimonio neto se recalcula al momento.',
      },
      {
        tipo: 'nuevo',
        texto:
          'Si el saldo de una deuda tiene más de mes y medio, aparece marcado como «saldo antiguo». Las hipotecas bajan todos los meses y los préstamos se amortizan: un saldo viejo da un patrimonio equivocado, y la app prefiere avisar antes que dar el número por bueno.',
      },
      {
        tipo: 'mejorado',
        texto:
          'El aviso de deudas dice cuántas tienes y te dice dónde están. Y si no has apuntado ninguna, el botón abre directamente el formulario para añadirlas.',
      },
    ],
  },
  {
    version: '1.1.0',
    fecha: FECHA_VERSION,
    titulo: 'La app ya no lleva tus datos dentro (y conviene saber por qué)',
    cambios: [
      {
        tipo: 'mejorado',
        texto:
          'Oikos se publica en internet, así que no puede llevar dentro tus saldos: quien mire el código los vería. Ahora la app trae solo las categorías y seis cuentas genéricas, y tu histórico entra importando tu archivo de copia (Ajustes → Copia de seguridad → Importar una copia). Se hace una vez.',
      },
      {
        tipo: 'nuevo',
        texto:
          'Aviso en Inicio cuando la app está recién instalada: explica por qué está vacía y cómo cargar tus datos, para que no parezca que está rota.',
      },
      {
        tipo: 'mejorado',
        texto:
          'Si no has apuntado ninguna deuda, Patrimonio te avisa de que el «neto» que ves es en realidad el bruto. Sin deudas, ese número engaña exactamente igual que engañaba la hoja de cálculo.',
      },
      {
        tipo: 'mejorado',
        texto: 'La pantalla de bienvenida explica que la app arranca vacía a propósito y cómo cargar los datos.',
      },
      {
        tipo: 'mejorado',
        texto:
          'El botón «Recargar el histórico del Excel» pasa a llamarse «Volver a los datos de partida», que es lo que hace de verdad.',
      },
    ],
  },
  {
    version: '1.0.0',
    fecha: '2026-10-07',
    titulo: 'Oikos nace',
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
          'Patrimonio con las deudas de verdad: se apuntan con su saldo y se restan. El neto puede salir negativo, y ese es el número real.',
      },
      {
        tipo: 'nuevo',
        texto:
          'La app arranca SIN datos personales dentro: se publica en internet, así que no puede llevar tus saldos. Tu histórico entra importando tu archivo de copia.',
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
          'La variación del patrimonio la calcula la app restando fotos consecutivas, en vez de fiarse de una fila de fórmulas de una hoja de cálculo: así no puede descuadrar por una fórmula mal copiada.',
      },
    ],
  },
]

/** Lo que ha cambiado en esta version, para la pantalla de novedades. */
export const ULTIMA_NOTA = NOVEDADES[0]
