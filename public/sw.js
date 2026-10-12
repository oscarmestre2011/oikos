/* eslint-env serviceworker */
/*
 * Service worker de Oikos.
 *
 * Objetivo: que la app abra SIEMPRE, tambien en el supermercado sin cobertura.
 * Hereda las lecciones aprendidas en Kairos (cada regla de aqui abajo costo una prueba):
 *
 * - Los recursos con hash de Vite (index-XXXX.js, index-XXXX.css) van a CACHE PRIMERO:
 *   su nombre cambia en cada compilacion, asi que servir la copia nunca da codigo viejo.
 * - Las NAVEGACIONES van a RED PRIMERO con un tiempo limite corto: si se sirviera la copia
 *   primero, al abrir la app seguiria saliendo la version anterior y pareceria que el cambio
 *   no ha llegado. Sin conexion se usa la copia y la app arranca igual.
 * - El MANIFIESTO va a red primero: pesa menos de 1 KB y evita que el nombre del icono
 *   instalado se quede con el antiguo.
 * - Las claves de cache se normalizan a una sola por direccion, pero CONSERVANDO lo que va
 *   despues de la interrogacion (`?`): la app pide `index.html?comprobacion=123` para saber
 *   si hay version nueva, y si aqui se borrara el parametro esa peticion devolveria la copia
 *   guardada y el aviso de version nueva no saldria NUNCA.
 *
 * Los DATOS no pasan por aqui: viven en IndexedDB.
 *
 * Al cambiar este archivo, sube VERSION.
 */

const VERSION = 'v1'
const CACHE = `oikos-${VERSION}`
/** Tiempo maximo que se espera a la red al abrir la app, antes de usar la copia. */
const LIMITE_NAVEGACION_MS = 2500

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  // El emblema que se ve dentro de la app: sin el, la cabecera y la bienvenida
  // saldrian sin logo cuando no hay conexion.
  './logo-mark.png',
  './logo-mark-grande.png',
]

/**
 * Saca del HTML los ficheros compilados que hay que guardar.
 *
 * Hace falta porque los nombres llevan un hash (`index-DYed0jWD.js`) que cambia en cada
 * compilacion: no se pueden escribir a mano en la lista de arriba. Se leen del HTML, que es
 * el unico sitio donde aparece el nombre bueno.
 *
 * Sin esto la app SOLO funcionaba sin conexion si el service worker ya controlaba la pagina
 * en la primera visita; si no, el .js no llegaba a guardarse nunca y al abrir sin cobertura
 * el navegador recibia el HTML en lugar del JavaScript ("Expected a JavaScript-or-Wasm
 * module script but the server responded with a MIME type of text/html") y la pantalla se
 * quedaba en blanco. Se descubrio probando el despliegue en subcarpeta.
 */
function extraeRecursos(html) {
  const encontrados = new Set()
  const patron = /(?:src|href)="([^"]+)"/g
  let coincide
  while ((coincide = patron.exec(html)) !== null) {
    const valor = coincide[1]
    if (!valor || valor.startsWith('data:') || valor.startsWith('#') || valor.startsWith('mailto:')) continue
    try {
      const url = new URL(valor, self.location.href)
      // Solo lo del propio sitio: lo de fuera no se puede cachear (ni tiene sentido).
      if (url.origin !== self.location.origin) continue
      encontrados.add(url.pathname + url.search)
    } catch {
      /* una URL que no se entiende se ignora */
    }
  }
  return [...encontrados]
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // addAll falla entero si un solo recurso falla: se piden uno a uno.
      await Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            /* un icono ausente no debe impedir la instalacion */
          }),
        ),
      )

      // Y ademas los ficheros compilados, leidos del propio HTML recien descargado.
      try {
        const respuesta = await fetch('./index.html', { cache: 'no-store' })
        if (respuesta.ok) {
          await cache.put(new Request('./index.html'), respuesta.clone())
          for (const recurso of extraeRecursos(await respuesta.text())) {
            await cache.add(recurso).catch(() => {
              /* si un recurso no se puede guardar, la app sigue funcionando */
            })
          }
        }
      } catch {
        /* sin red en la instalacion: se guardara al abrir la app */
      }

      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

/*
 * Mensajes desde la app.
 *
 * `saltar-espera` es lo que dispara el boton "Actualizar" del aviso de version nueva: el
 * worker nuevo esta instalado pero esperando a que se cierren todas las pestañas. Con
 * skipWaiting entra ya, y el `controllerchange` del lado de la app recarga una sola vez.
 */
self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'saltar-espera') {
    self.skipWaiting()
  }
})

/**
 * Clave con la que se guarda y se busca en la cache.
 * Siempre la misma para una misma direccion, y conservando la query.
 */
function claveDe(request) {
  const url = new URL(request.url)
  return new Request(url.origin + url.pathname + url.search, { method: 'GET' })
}

/** Guarda una respuesta valida en cache sin bloquear la respuesta al cliente. */
async function store(request, response) {
  try {
    const url = new URL(request.url)

    // Las comprobaciones de version NO se guardan: llenarian la cache de copias del
    // mismo index y una de ellas podria devolverse por error.
    if (url.pathname.endsWith('/index.html') && url.search) return

    const cache = await caches.open(CACHE)
    await cache.put(claveDe(request), response)
  } catch {
    /* cuota llena o respuesta no cacheable: no es critico */
  }
}

/** Busca en cache usando siempre la misma clave. */
async function buscar(request) {
  try {
    const cache = await caches.open(CACHE)
    return (await cache.match(claveDe(request))) ?? null
  } catch {
    return null
  }
}

/**
 * Espera una promesa como maximo `ms` milisegundos. Si tarda mas, devuelve null y se
 * sigue por otro camino (la copia guardada), en lugar de dejar al usuario esperando.
 */
function conLimite(promesa, ms) {
  return new Promise((resolve) => {
    const temporizador = setTimeout(() => resolve(null), ms)
    promesa
      .then((valor) => {
        clearTimeout(temporizador)
        resolve(valor)
      })
      .catch(() => {
        clearTimeout(temporizador)
        resolve(null)
      })
  })
}

/**
 * Sirve desde cache y, si hay red, actualiza la copia por detras.
 * La respuesta al cliente sale de inmediato: la app nunca espera al servidor.
 */
async function cacheFirst(request) {
  const cached = await buscar(request)
  const background = fetch(claveDe(request))
    .then(async (response) => {
      if (response && response.ok && response.type !== 'opaque') {
        await store(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    background.catch(() => null)
    return cached
  }

  const fresh = await background
  if (fresh) return fresh

  /*
   * AQUI ESTABA EL FALLO de la pantalla en blanco sin conexion.
   *
   * Antes, si no habia copia y no habia red, se devolvia el `index.html` guardado. Para una
   * NAVEGACION eso es correcto, pero para un `.js` o un `.css` es un envenenamiento: el
   * navegador recibe HTML donde esperaba JavaScript y se niega a ejecutarlo ("Expected a
   * JavaScript-or-Wasm module script... MIME type text/html"), con lo que la app no arranca.
   *
   * Las navegaciones no pasan por aqui (tienen su propio camino en el `fetch`), asi que lo
   * correcto es devolver un error claro: es honesto y no envenena la cache.
   */
  return new Response('Sin conexión y sin copia en caché.', {
    status: 504,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegaciones (abrir la app, recargar): RED PRIMERO, con la copia como respaldo.
  if (request.mode === 'navigate') {
    const indice = new Request('./index.html', { credentials: 'same-origin' })
    event.respondWith(
      (async () => {
        const copia = await buscar(indice)
        const respuestaRed = await conLimite(fetch(claveDe(indice)), LIMITE_NAVEGACION_MS)
        if (respuestaRed && respuestaRed.ok) {
          // Se guarda SIEMPRE bajo la clave canonica de index.html, nunca bajo la
          // direccion concreta de la navegacion. Si no, abrir la app por "/" y por
          // "/index.html" dejaria dos copias de la misma pagina.
          await store(indice, respuestaRed.clone())
          return respuestaRed
        }
        if (copia) return copia
        return (
          respuestaRed ??
          new Response('Sin conexión y sin copia en caché.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        )
      })(),
    )
    return
  }

  // El manifiesto (nombre e iconos) va a RED PRIMERO, con la copia como respaldo.
  if (url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      fetch(claveDe(request))
        .then(async (response) => {
          if (response && response.ok && response.type !== 'opaque') {
            await store(request, response.clone())
          }
          return response
        })
        .catch(async () => {
          const cached = await buscar(request)
          return cached ?? buscar(new Request('./manifest.webmanifest'))
        }),
    )
    return
  }

  // Recursos estaticos: cache primero (llevan hash, o son iconos).
  event.respondWith(cacheFirst(request))
})
