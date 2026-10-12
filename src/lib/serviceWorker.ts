/**
 * Registro del service worker y aviso de version nueva.
 *
 * Heredado de Kairos, donde este punto dio mas de un disgusto. Lo que se aprendio alli:
 *
 * - El service worker NO se registra en desarrollo. Si se registrara, el navegador seguiria
 *   sirviendo la copia guardada y pareceria que los cambios no se aplican.
 * - Al detectar una version nueva NO se recarga sola: se avisa con un boton. Recargar por
 *   sorpresa mientras alguien esta apuntando un gasto le borraria lo que lleva escrito.
 * - Hay que escuchar `controllerchange` para no recargar dos veces la misma pestana.
 */

let recargando = false

export interface AvisoVersion {
  /** Muestra el aviso de "hay una version nueva". */
  alHaberVersionNueva: (actualizar: () => void) => void
}

export function registraServiceWorker(aviso?: AvisoVersion): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  // En desarrollo NO se registra: Vite sirve con recarga en caliente y un service worker por
  // medio seguiria devolviendo la copia guardada, con lo que pareceria que los cambios no se
  // aplican nunca. `import.meta.env.DEV` lo distingue de forma fiable (y no por el nombre del
  // host, que confundiria la version compilada servida en local con el servidor de desarrollo).
  if (import.meta.env.DEV) return

  /*
   * Detalle a tener en cuenta: NO basta con registrar dentro de un
   * `addEventListener('load')`.
   *
   * La app espera a sembrar el historico del Excel antes de dibujar, y ese `await` puede
   * hacer que `registraServiceWorker()` se ejecute DESPUES de que el suceso `load` ya haya
   * saltado. En ese caso el escucha no se dispararia nunca y la app se quedaria sin service
   * worker: funcionaria, pero sin modo sin conexion, que es justo para lo que existe una PWA.
   * Es una carrera, y se evita mirando `readyState` en lugar de confiar en el orden.
   */
  const registra = () => {
    /*
     * ¿Ya habia un service worker controlando esta pagina?
     *
     * Se mira ANTES de registrarlo, porque el primer dia la respuesta es "no": al instalar el
     * service worker, `clients.claim()` hace que tome el control y el navegador dispara
     * `controllerchange`. Si se recargara siempre, la PRIMERA visita a la app acabaria en una
     * recarga inesperada (y perderia lo que el usuario estuviera escribiendo, ademas de
     * parecer un fallo). Solo interesa recargar cuando el cambio de control viene de una
     * version NUEVA, y eso implica que ya habia un controlador.
     */
    const yaEstabaControlada = Boolean(navigator.serviceWorker.controller)

    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sin service worker la app funciona igual, solo pierde el modo sin conexion */
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!yaEstabaControlada) return
      if (recargando) return
      recargando = true
      location.reload()
    })
  }

  if (document.readyState === 'complete') registra()
  else window.addEventListener('load', registra)

  navigator.serviceWorker.ready.then((registro) => {
    const ofreceActualizar = (trabajador: ServiceWorker | null) => {
      if (!trabajador) return
      const actualizar = () => trabajador.postMessage({ tipo: 'saltar-espera' })
      aviso?.alHaberVersionNueva(actualizar)
      // Si el usuario no responde, se activa solo en la siguiente apertura.
      trabajador.postMessage({ tipo: 'saltar-espera-al-cerrar' })
    }

    if (registro.waiting && navigator.serviceWorker.controller) ofreceActualizar(registro.waiting)

    registro.addEventListener('updatefound', () => {
      const nuevo = registro.installing
      if (!nuevo) return
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          ofreceActualizar(nuevo)
        }
      })
    })
  })
}
