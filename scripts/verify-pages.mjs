/**
 * Verifica el despliegue en SUBCARPETA, como en GitHub Pages.
 *
 * Oikos no se publica en la raiz de un dominio, sino en `https://<usuario>.github.io/oikos/`.
 * Eso cambia tres cosas que, si se hacen mal, dejan la app EN BLANCO al publicar (y en local
 * no se nota, porque en local se sirve desde la raiz):
 *
 *   1. Las rutas de los ficheros compilados.
 *   2. El AMBITO del service worker (tiene que ser `/oikos/`, no `/`).
 *   3. Las navegaciones: abrir `.../oikos/` a secas tiene que servir el index.
 *
 * Esta prueba reproduce las tres. Uso:
 *   $env:OIKOS_BASE='/oikos/'; npm run build
 *   npm run test:pages
 */

import { chromium } from 'playwright'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  creaComprobador,
  entraEnLaApp,
  esperaServiceWorkerActivo,
  rutaChromium,
  sirveDirectorio,
} from './navegador.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const DIST = join(RAIZ, 'dist')
const PREFIJO = '/oikos/'

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Falta dist/. Ejecuta: $env:OIKOS_BASE="/oikos/"; npm run build')
    process.exit(1)
  }

  const comprueba = creaComprobador('Despliegue en subcarpeta (como GitHub Pages)')
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')

  // --- 1. El HTML compilado no puede llevar rutas absolutas a la raiz ---
  comprueba.comprueba(
    !/src="\/assets\//.test(html) && !/href="\/assets\//.test(html),
    'El HTML compilado no pide los recursos desde la raíz del dominio',
  )
  comprueba.comprueba(html.includes('/oikos/assets/'), 'Las rutas llevan el prefijo /oikos/')

  const servidor = await sirveDirectorio(DIST, { prefijo: PREFIJO })
  const navegador = await chromium.launch({ executablePath: rutaChromium() })
  const contexto = await navegador.newContext({ viewport: { width: 412, height: 915 } })
  const pagina = await contexto.newPage()

  const recursosFallidos = []
  pagina.on('response', (respuesta) => {
    if (respuesta.status() >= 400) recursosFallidos.push(`${respuesta.status()} ${respuesta.url()}`)
  })

  try {
    await pagina.goto(servidor.url, { waitUntil: 'domcontentloaded' })
    await pagina.getByRole('button', { name: 'Entrar en la app', exact: true }).waitFor({ timeout: 20_000 })
    comprueba.comprueba(true, `La app arranca desde ${PREFIJO} sin quedarse en blanco`)
    comprueba.comprueba(
      recursosFallidos.length === 0,
      `Ningún recurso da error${recursosFallidos.length ? `: ${recursosFallidos[0]}` : ''}`,
    )

    // --- 2. El service worker tiene que quedar con el ámbito de la subcarpeta ---
    const registro = await esperaServiceWorkerActivo(pagina)

    comprueba.comprueba(registro?.hay === true, 'El service worker se registra en la subcarpeta')
    comprueba.comprueba(
      registro?.activo === 'activated' && registro?.controlada === true,
      'El service worker está activo y controlando la página',
    )
    comprueba.comprueba(
      Boolean(registro?.scope?.endsWith(PREFIJO)),
      `El ámbito del service worker es ${PREFIJO} (no la raíz): ${registro?.scope ?? 'sin registro'}`,
    )

    // --- 3. Y funciona sin conexión desde la subcarpeta ---
    // Hay que salir de la bienvenida ANTES de cortar la conexión: si no, la comprobación
    // buscaría la pantalla de Inicio y encontraría la de bienvenida.
    const habiaBienvenida = await entraEnLaApp(pagina)
    await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
    comprueba.comprueba(habiaBienvenida, 'La bienvenida sale la primera vez y se puede pasar')

    await contexto.setOffline(true)
    let sinConexion = false
    try {
      await pagina.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 })
      await pagina.getByText('Gastado este mes').waitFor({ timeout: 15_000 })
      sinConexion = true
    } catch {
      sinConexion = false
    }
    comprueba.comprueba(sinConexion, 'Abre sin conexión desde la subcarpeta')
    await contexto.setOffline(false)

    // --- 4. Abrir la carpeta sin barra final no debe romper ---
    await pagina.goto(`${servidor.url.replace(/\/$/, '')}`, { waitUntil: 'domcontentloaded' })
    let sinBarraFinal = false
    try {
      await pagina.getByText('Gastado este mes').waitFor({ timeout: 10_000 })
      sinBarraFinal = true
    } catch {
      sinBarraFinal = false
    }
    // GitHub Pages redirige `/oikos` a `/oikos/`, asi que aquí el servidor de pruebas puede
    // no hacerlo: se informa, pero no se cuenta como fallo de la app.
    console.log(
      sinBarraFinal
        ? '  ℹ️  Abrir la carpeta sin barra final también funciona'
        : '  ℹ️  Abrir la carpeta sin barra final necesita la redirección del servidor (GitHub Pages la hace)',
    )
  } finally {
    await navegador.close()
    await servidor.cierra()
  }

  comprueba.resumen()
}

main().catch((error) => {
  console.error('La verificación de subcarpeta ha fallado:', error)
  process.exit(1)
})
