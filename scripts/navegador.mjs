/**
 * Utilidades compartidas por las pruebas en navegador.
 *
 * Dos cosas que costaron lo suyo y por eso estan aqui centralizadas:
 *
 * 1. LA RUTA DEL NAVEGADOR. Playwright solo sabe lanzar la version de Chromium que espera su
 *    propia version (`chromium_headless_shell-1248`), y en este equipo hay instaladas otras
 *    (1234 y 1243). En vez de descargar 200 MB, se busca la que ya existe y se le pasa a
 *    Playwright con `executablePath`. Si algun dia falta, el error lo dice claro.
 *
 * 2. EL SERVIDOR. `vite preview` arranca un proceso aparte y hay que esperarlo. Un servidor
 *    de ficheros estaticos en el mismo proceso es mas rapido de arrancar, se puede cerrar
 *    siempre (aunque la prueba falle) y sirve para probar `dist/` tal cual se publica.
 */

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon',
}

/**
 * Busca un Chromium ya instalado y devuelve su ruta, o `undefined` para que Playwright use
 * el suyo.
 *
 * En este portatil (Windows) Playwright solo sabe lanzar la version exacta que espera su
 * propia version (`chromium_headless_shell-1248`) y hay otras instaladas (1234, 1243). En vez
 * de descargar 200 MB se busca la que ya existe y se le pasa con `executablePath`.
 *
 * En Linux (que es donde publica GitHub Actions) los navegadores estan donde Playwright los
 * espera, asi que devolver `undefined` es lo correcto: que los busque el.
 */
export function rutaChromium() {
  if (process.env.OIKOS_CHROMIUM && existsSync(process.env.OIKOS_CHROMIUM)) {
    return process.env.OIKOS_CHROMIUM
  }

  const raiz = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'ms-playwright') : ''
  if (!raiz || !existsSync(raiz)) return undefined

  // Se prefiere el Chromium completo al `headless_shell`: el segundo no soporta del todo la
  // instalacion de la PWA ni algunas capturas.
  const candidatos = []
  for (const entrada of readdirSync(raiz)) {
    if (entrada.startsWith('chromium-')) {
      candidatos.push([entrada, join(raiz, entrada, 'chrome-win64', 'chrome.exe')])
      candidatos.push([entrada, join(raiz, entrada, 'chrome-win', 'chrome.exe')])
    }
  }

  // Se ordenan por numero de version descendente para usar siempre la mas nueva.
  candidatos.sort((a, b) => numeroDeVersion(b[0]) - numeroDeVersion(a[0]))

  for (const [, ruta] of candidatos) {
    if (existsSync(ruta)) return ruta
  }

  // No hay ninguno instalado a mano: se deja que Playwright lo intente con el suyo (y si no
  // esta, su propio error ya dice que hay que ejecutar `npx playwright install chromium`).
  return undefined
}

function numeroDeVersion(nombre) {
  const coincide = /-(\d+)$/.exec(nombre)
  return coincide ? Number(coincide[1]) : 0
}

/**
 * Sirve un directorio por HTTP en 127.0.0.1.
 *
 * `prefijo` permite imitar GitHub Pages, donde la app NO vive en la raiz sino en una
 * subcarpeta (`/oikos/`). Eso cambia las rutas, el ambito del service worker y las
 * navegaciones: es justo el fallo que deja la pagina en blanco al publicar, asi que hay que
 * poder reproducirlo en local.
 *
 * Devuelve la direccion y una funcion para cerrarlo.
 */
export async function sirveDirectorio(directorio, { puerto = 0, prefijo = '/' } = {}) {
  const raiz = resolve(directorio)
  if (!existsSync(raiz)) throw new Error(`No existe el directorio a servir: ${raiz}`)

  const base = prefijo.endsWith('/') ? prefijo : `${prefijo}/`

  const servidor = createServer(async (peticion, respuesta) => {
    try {
      const url = new URL(peticion.url ?? '/', 'http://127.0.0.1')

      // Todo lo que no este bajo el prefijo se rechaza: si la app pidiera una ruta absoluta
      // por error, tiene que fallar aqui y no pasar desapercibido.
      if (!url.pathname.startsWith(base)) {
        respuesta.writeHead(404).end('Fuera del prefijo de la app')
        return
      }

      let ruta = join(raiz, decodeURIComponent(url.pathname.slice(base.length)))
      // Sin salirse de la raiz: una peticion con ".." no debe poder leer otro sitio.
      if (!ruta.startsWith(raiz)) {
        respuesta.writeHead(403).end('Prohibido')
        return
      }

      let contenido
      try {
        contenido = await readFile(ruta)
      } catch {
        // Una ruta sin extension es una navegacion de la app: se sirve el index.
        if (!extname(ruta)) {
          ruta = join(raiz, 'index.html')
          contenido = await readFile(ruta)
        } else {
          respuesta.writeHead(404).end('No encontrado')
          return
        }
      }

      respuesta.writeHead(200, {
        'Content-Type': TIPOS[extname(ruta)] ?? 'application/octet-stream',
        // Sin cache: las pruebas tienen que ver siempre lo ultimo compilado.
        'Cache-Control': 'no-store',
      })
      respuesta.end(contenido)
    } catch (error) {
      respuesta.writeHead(500).end(String(error?.message ?? error))
    }
  })

  await new Promise((listo) => servidor.listen(puerto, '127.0.0.1', listo))
  const direccion = servidor.address()
  const url = `http://127.0.0.1:${direccion.port}${base}`

  return {
    url,
    puerto: direccion.port,
    prefijo: base,
    cierra: () => new Promise((listo) => servidor.close(listo)),
  }
}

/**
 * Espera a que el service worker este ACTIVO y controlando la pagina.
 *
 * Existe porque esperar a que "haya un registro" no basta y da un falso positivo: el registro
 * aparece en cuanto empieza a instalarse, y si en ese momento se corta la conexion, la
 * navegacion todavia no pasa por el service worker y la app falla... pero no por un fallo de
 * la app, sino porque la prueba tenia prisa. Hay que esperar a `activated` Y a que la pagina
 * este controlada.
 *
 * Ademas tolera que la pagina se recargue mientras se sondea: si el service worker toma el
 * control, el contexto de JavaScript se destruye y el `evaluate` falla. Eso no es un error.
 */
export async function esperaServiceWorkerActivo(pagina, { limiteMs = 15_000 } = {}) {
  const limite = Date.now() + limiteMs
  let ultimo = null

  while (Date.now() < limite) {
    try {
      ultimo = await pagina.evaluate(async () => {
        const registros = await navigator.serviceWorker.getRegistrations()
        const registro = registros[0]
        return {
          hay: registros.length > 0,
          scope: registro?.scope ?? null,
          activo: registro?.active?.state ?? null,
          controlada: Boolean(navigator.serviceWorker.controller),
        }
      })
      if (ultimo.hay && ultimo.activo === 'activated' && ultimo.controlada) return ultimo
    } catch {
      // La pagina se esta recargando (el service worker acaba de tomar el control): se reintenta.
    }
    await pagina.waitForTimeout(250)
  }

  return ultimo
}

/**
 * Quita de en medio la pantalla de bienvenida.
 *
 * La bienvenida sale la primera vez (y solo una vez: al salir de ella se guarda un ajuste),
 * asi que cualquier prueba que quiera llegar a Inicio tiene que pasar por aqui. Sin esto, una
 * prueba que busque "Gastado este mes" falla... estando la app perfectamente.
 * Devuelve true si habia bienvenida.
 */
export async function entraEnLaApp(pagina, { destino = 'Entrar en la app', esperaMs = 10_000 } = {}) {
  try {
    const boton = pagina.getByRole('button', { name: destino, exact: true })
    await boton.waitFor({ state: 'visible', timeout: esperaMs })
    await boton.click()
    return true
  } catch {
    return false
  }
}

/** Comprobaciones con contador, para que cada prueba diga cuantas ha pasado. */
export function creaComprobador(nombre) {
  let pasadas = 0
  const fallos = []

  return {
    comprueba(condicion, descripcion) {
      if (condicion) {
        pasadas += 1
        console.log(`  ✅ ${descripcion}`)
      } else {
        fallos.push(descripcion)
        console.log(`  ❌ ${descripcion}`)
      }
    },
    resumen() {
      console.log('')
      console.log(`${nombre}: ${pasadas} comprobaciones correctas, ${fallos.length} fallos`)
      if (fallos.length > 0) {
        console.log('Fallos:')
        for (const fallo of fallos) console.log(`  - ${fallo}`)
        process.exitCode = 1
      }
      return fallos.length === 0
    },
  }
}
