/**
 * Las preguntas de la ayuda.
 *
 * Fuente unica: de aqui salen la pantalla de ayuda y el buscador. Se escribe pensando en lo
 * que de verdad se pregunta al usar la app, y —lo mas importante— diciendo tambien lo que
 * NO se puede hacer y por que. Una ayuda que solo cuenta las virtudes no ayuda.
 */

export interface Pregunta {
  tema: string
  pregunta: string
  respuesta: string
}

export const TEMAS = [
  'Para empezar',
  'El día a día',
  'Los números',
  'Patrimonio y deudas',
  'Tus datos',
  'Si algo va mal',
] as const

export const AYUDA: Pregunta[] = [
  {
    tema: 'Para empezar',
    pregunta: '¿Qué es Oikos y para qué sirve?',
    respuesta:
      'Es tu app de cuentas, en el móvil. Por un lado apuntas los ingresos y los gastos del día a día para ver en qué se te va el dinero; por otro llevas la foto mensual del patrimonio (cuánto hay en cada cuenta y en cada inversión), que es lo que antes hacías en el Excel. Las dos cosas juntas responden a dos preguntas distintas: "¿en qué me gasto el dinero?" y "¿cada vez tengo más o menos?".',
  },
  {
    tema: 'Para empezar',
    pregunta: '¿Por qué la app arranca vacía? ¿No traía mi histórico?',
    respuesta:
      'Sí lo traía, y se quitó a propósito. Oikos se publica en internet, así que todo lo que va dentro de la app lo puede leer cualquiera: si llevara tus saldos, tu nómina o tu hipoteca, los estaría publicando. Ahora la app trae solo lo justo para funcionar (categorías y unas cuentas genéricas) y tu histórico entra desde un archivo tuyo, con Ajustes → Copia de seguridad → Importar una copia, eligiendo «Reemplazar todo por la copia». Se hace una vez y queda igual que antes.',
  },
  {
    tema: 'Para empezar',
    pregunta: '¿Qué datos trae ya dentro cuando la abro?',
    respuesta:
      'Trae las 21 categorías de gasto, ingreso, inversión y amortización, y seis cuentas genéricas (cuenta corriente, cuenta de ahorro, efectivo, fondo de inversión, plan de pensiones y Bitcoin) para que la pantalla de patrimonio tenga sentido desde el primer día. No trae ni un movimiento, ni una foto de patrimonio, ni una deuda: esas se importan de tu archivo o las apuntas tú. Las cuentas y las categorías se renombran, se borran y se añaden desde Ajustes.',
  },
  {
    tema: 'Para empezar',
    pregunta: '¿Los números de mi copia son de fiar?',
    respuesta:
      'Sí, y se comprobó antes de dártela. Las 36 fotos de patrimonio de tu archivo se verifican una a una contra las fórmulas de tu propia hoja de cálculo al generarlo: las sumas cuadran exactamente, sin un solo descuadre, y si alguna no cuadrara el archivo no se generaría. Las compras de Bitcoin también cuadran con la fila de totales de tu registro. Lo único que es una estimación son los saldos de las deudas, porque vienen de un documento tuyo de septiembre de 2026 y cambian cada mes: por eso la app te invita a revisarlas.',
  },
  {
    tema: 'El día a día',
    pregunta: '¿Cómo apunto un gasto rápido?',
    respuesta:
      'En la pestaña Apuntar: escribes el importe con el teclado de la propia app, eliges categoría y pulsas el botón. El concepto es opcional y la fecha ya viene en hoy. Para lo que repites mucho (Mercadona, gasolina, la cuota) hay atajos con los últimos conceptos que has usado: al tocarlos también se rellena la categoría que les pusiste la última vez.',
  },
  {
    tema: 'El día a día',
    pregunta: '¿Por qué el teclado es de la app y no el del móvil?',
    respuesta:
      'Porque el teclado del móvil tapa media pantalla, cambia de sitio según el teléfono y muchas veces no ofrece la coma. Con el de la app, apuntar un gasto son tres toques siempre iguales, sin mirar. Acepta coma y punto, así que da igual cómo tengas configurado el teléfono.',
  },
  {
    tema: 'El día a día',
    pregunta: '¿Qué diferencia hay entre gasto, ingreso, inversión y amortización?',
    respuesta:
      'Gasto es dinero que sale y no vuelve (comida, ocio, gasolina, la cuota de la hipoteca). Ingreso es dinero que entra. Inversión es dinero que sale de la cuenta pero se convierte en patrimonio tuyo (un fondo indexado, un plan de pensiones, criptomonedas). Amortización es dinero que sale pero reduce lo que debes (amortizar hipoteca o préstamo). Invertir y amortizar NO se cuentan como gasto, porque ese dinero no se va: cambia de sitio.',
  },
  {
    tema: 'El día a día',
    pregunta: '¿Puedo apuntar algo de ayer o de la semana pasada?',
    respuesta:
      'Sí. En Apuntar, además de Hoy, Ayer y Anteayer, hay un campo de fecha para elegir cualquier día. Los movimientos se ordenan por la fecha del gasto, no por el día en que los apuntaste, así que el mes sale bien aunque apuntes tarde.',
  },
  {
    tema: 'El día a día',
    pregunta: '¿Puedo corregir o borrar un movimiento?',
    respuesta:
      'Sí. Ve a Movimientos, filtra o busca lo que quieras, y toca la fila: se abre con todos sus datos para editarla. Para borrar, el botón rojo pide confirmación antes de hacer nada.',
  },
  {
    tema: 'Los números',
    pregunta: '¿Qué significa "queda libre"?',
    respuesta:
      'Es lo que entra menos todo lo que sale: ingresos − gastos − inversión − amortización. Es el dinero del que de verdad dispones ese mes. Si inviertes 400 € y lo cuentas como gasto, parece que te queda menos de lo que realmente te queda; por eso se separa.',
  },
  {
    tema: 'Los números',
    pregunta: '¿Qué es la tasa de ahorro?',
    respuesta:
      'El porcentaje de tus ingresos que se va a inversión y amortización. Si ingresas 2.000 € y destinas 300 €, la tasa es del 15 %. Es mejor indicador que "cuánto he ahorrado" en euros, porque no depende de si ese mes hubo un extra.',
  },
  {
    tema: 'Los números',
    pregunta: '¿Cómo se compara el mes con mi media?',
    respuesta:
      'Se coge lo que has gastado en cada categoría en los meses anteriores y se saca la media. Si el mes está en curso, esa media se ajusta a los días que llevas: el día 8 no se compara con un mes entero, sino con la parte proporcional. Si no se ajustara, el día 5 de cada mes la app diría que vas gastando poquísimo, y eso no sería útil, sería mentira.',
  },
  {
    tema: 'Los números',
    pregunta: '¿Qué es un gasto "que se repite" y cómo se detecta?',
    respuesta:
      'Es un cargo que aparece en meses distintos con el mismo concepto y un importe parecido: una suscripción, un seguro, una cuota. Se piden tres meses distintos como mínimo, y como mucho un cargo por mes: así el supermercado (que son varios cargos al mes) no se confunde con una suscripción. También se calcula cada cuánto se paga (mensual, trimestral, anual) y lo que cuesta al año. El mínimo de meses se cambia desde Ajustes.',
  },
  {
    tema: 'Los números',
    pregunta: '¿Cómo funcionan los presupuestos?',
    respuesta:
      'En Presupuestos escribes un tope mensual en las categorías que quieras vigilar. La barra sale verde hasta el 80 %, en ámbar del 80 al 100 % y en rojo al pasarte. Donde dejes el campo vacío, no avisa. Al lado de cada categoría se enseña tu media, que es la referencia buena para decidir el tope.',
  },
  {
    tema: 'Los números',
    pregunta: '¿Por qué el detalle de gastos empieza en marzo de 2026?',
    respuesta:
      'Porque el histórico que importaste solo trae el detalle de los gastos desde la primera fecha que hubiera en tu registro. Muchas personas llevan meses (o años) apuntando el patrimonio mes a mes, pero no cada gasto suelto: de esos meses la app puede enseñar cuánto tenías, pero no en qué se fue el dinero, porque ese dato no existe en ninguna parte. La app no se lo inventa.',
  },
  {
    tema: 'El día a día',
    pregunta: '¿Puedo tener una categoría o una cuenta nueva?',
    respuesta:
      'Sí, en Ajustes. Las categorías se pueden crear, renombrar y desactivar, y las cuentas del patrimonio también. Al renombrar una categoría, la app actualiza todos los movimientos que la usaban (y los presupuestos), así que el histórico no se rompe. Si una categoría tiene movimientos, no deja borrarla: se renombra o se desactiva.',
  },
  {
    tema: 'Patrimonio y deudas',
    pregunta: '¿Por qué mi patrimonio sale negativo?',
    respuesta:
      'Porque es la realidad: debes más de lo que tienes. Durante años llevaste el patrimonio en una hoja de cálculo que sumaba cuentas y fondos y llamaba a eso "VALOR NETO TOTAL", pero no restaba ninguna deuda, así que daba un número mucho más alto y más agradable que el real. Oikos sí las resta, y por eso el neto baja (y puede quedar en negativo, que es lo correcto). Si ves un neto que no cuadra con lo que tú sabes, mira dos cosas: que las deudas estén apuntadas con el saldo al día, y que la última foto del patrimonio incluya todas tus cuentas.',
  },
  {
    tema: 'Patrimonio y deudas',
    pregunta: '¿De dónde salen las deudas que aparecen al cargar mi copia?',
    respuesta:
      'De tu archivo de copia: ahí viajan tus deudas con el saldo que tenían el día que se anotó. Por eso no aparecen hasta que importas la copia, y por eso conviene revisarlas de vez en cuando. Se cambian en Patrimonio → Revisar las deudas, y al corregir un saldo el neto cambia con él. Las que están marcadas como compartidas (las que paga otra persona, pero cuyo riesgo es tuyo) se enseñan aparte y no se restan del neto.',
  },
  {
    tema: 'Patrimonio y deudas',
    pregunta: '¿Cómo hago la foto del mes?',
    respuesta:
      'En Patrimonio, botón «Hacer la foto de hoy». Los campos vienen rellenos con los valores de la última foto, así que casi siempre basta con corregir dos o tres números y guardar. Se guarda con la fecha que elijas; si ya hay una foto de ese día, se reemplaza (y te avisa antes).',
  },
  {
    tema: 'Patrimonio y deudas',
    pregunta: '¿Por qué el gráfico de evolución no descuenta la deuda?',
    respuesta:
      'Porque no se puede saber cuánto debías en cada mes del pasado: tu Excel no registraba la deuda y no hay histórico de saldos de la hipoteca. La línea es patrimonio bruto (cuentas + inversiones), que sí se puede calcular con exactitud. El neto con deuda se enseña para la última foto, que es la que tiene saldos conocidos. Inventar la deuda de 2024 sería peor que no dibujarla.',
  },
  {
    tema: 'Patrimonio y deudas',
    pregunta: '¿Qué es el Bitcoin que sale en el patrimonio?',
    respuesta:
      'Es una cuenta más de tu patrimonio: se valora a precio de mercado en cada foto del mes, así que su valor sube y baja con el precio. Además, si tu copia trae las compras una a una, hay una tarjeta con el total comprado, lo invertido y el precio medio de entrada, que es el dato que de verdad interesa cuando el precio se mueve. Ojo con una cosa: las compras que traiga tu archivo pueden no ser todas (si has comprado en otro sitio o en otras fechas, faltarán), y por eso el total que cuenta para el patrimonio es el que tú pongas en la cuenta Bitcoin al hacer la foto del mes.',
  },
  {
    tema: 'Tus datos',
    pregunta: '¿Dónde se guardan mis datos? ¿Los ve alguien?',
    respuesta:
      'En este móvil, y solo en este móvil. Oikos no tiene servidor ni cuenta de usuario: los datos viven en el almacenamiento del navegador (IndexedDB). Nadie más los ve, y funciona sin cobertura. El precio de esa privacidad es que si borras los datos de navegación o cambias de teléfono, se pierden: por eso la copia de seguridad no es opcional.',
  },
  {
    tema: 'Tus datos',
    pregunta: '¿Qué borra mis datos y qué no?',
    respuesta:
      'Borrar el historial de navegación NO los borra. Borrar la caché tampoco. Lo que sí los borra: borrar «Cookies y datos de sitios», desinstalar el navegador o borrar los datos de todas las aplicaciones, y cambiar de móvil. En iPhone, cuidado con «Ajustes → Safari → Borrar historial y datos»: se lleva por delante también los datos de las apps añadidas a la pantalla de inicio.',
  },
  {
    tema: 'Tus datos',
    pregunta: '¿Cómo hago una copia y cómo la restauro?',
    respuesta:
      'En Ajustes → Copia de seguridad. El botón grande crea el archivo .json y lo comparte (WhatsApp, correo, Drive) o lo descarga. Compartirlo es mejor que descargarlo: una copia dentro del mismo móvil no te protege de perder el móvil. Para restaurar, elige el archivo y decide si quieres combinar (añade lo que falte sin duplicar nada) o reemplazar (deja exactamente lo que trae la copia).',
  },
  {
    tema: 'Tus datos',
    pregunta: '¿Puedo pasarlo al vault de Obsidian?',
    respuesta:
      'Sí, en Ajustes → Exportar al vault. Genera Markdown con tu formato (fechas YYYY-MM-DD, tablas, importes con coma) del mes que quieras y del patrimonio. La app no escribe en el vault por su cuenta: descarga el archivo y lo pegas tú, que es lo prudente cuando hay una carpeta sincronizada de por medio.',
  },
  {
    tema: 'Tus datos',
    pregunta: '¿Cómo la instalo en el móvil?',
    respuesta:
      'Android (Chrome): abre la dirección, menú ⋮ y «Instalar aplicación» (no «Añadir a pantalla de inicio», que solo crea un marcador). iPhone: tiene que ser Safari, y se hace con Compartir → «Añadir a pantalla de inicio». Para comprobar que está instalada de verdad: pon el móvil en modo avión y ábrela; si arranca, está instalada.',
  },
  {
    tema: 'Si algo va mal',
    pregunta: 'He actualizado y no veo los cambios',
    respuesta:
      'Cuando hay una versión nueva, la app avisa arriba con un botón «Actualizar». Si no lo ves, cierra la app del todo y vuelve a abrirla: el service worker pide primero a la red, así que en la segunda apertura suele entrar sola. En Ajustes → Acerca de puedes ver qué versión tienes.',
  },
  {
    tema: 'Si algo va mal',
    pregunta: 'He borrado algo sin querer, ¿se puede recuperar?',
    respuesta:
      'Si tenías una copia, sí: impórtala y elige «Reemplazar» para dejarlo exactamente como estaba, o «Combinar» si solo quieres recuperar lo que falta. Sin copia, no hay forma: no existe una papelera ni una copia en la nube. Es el precio de que la app sea privada y funcione sin conexión.',
  },
  {
    tema: 'Si algo va mal',
    pregunta: 'Quiero volver a empezar de cero',
    respuesta:
      'En Ajustes → Tus datos hay dos botones. «Volver a los datos de partida» deja la app con las categorías y las cuentas genéricas de fábrica, sin nada tuyo. «Borrar todos los datos» la deja vacía del todo. Los dos piden confirmación y los dos borran lo que hayas apuntado o importado, así que guarda antes una copia.',
  },
]

/** Quita tildes y mayusculas, para que el buscador no se pierda con "inversion". */
export function normalizaBusqueda(texto: string): string {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Busca en preguntas y respuestas. Devuelve todas si no hay texto. */
export function buscaEnAyuda(texto: string, lista: Pregunta[] = AYUDA): Pregunta[] {
  const buscado = normalizaBusqueda(texto)
  if (!buscado) return lista
  const palabras = buscado.split(/\s+/).filter(Boolean)
  return lista.filter((entrada) => {
    const heno = normalizaBusqueda(`${entrada.pregunta} ${entrada.respuesta} ${entrada.tema}`)
    return palabras.every((palabra) => heno.includes(palabra))
  })
}
